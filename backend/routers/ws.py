"""
WebSocket 实时推送路由
WS /ws/realtime - 每秒推送最新数据 + AI分析结果
"""
import asyncio
import json
import logging
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from database import SessionLocal, PressData
from routers.data import _record_to_dict, get_jdbc_records, merge_history_records
from ai.anomaly import anomaly_detector
from ai.quality import quality_predictor
from ai.health import health_scorer
from ai.trend import trend_predictor

router = APIRouter(tags=["websocket"])
logger = logging.getLogger(__name__)

# 连接管理
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.append(ws)
        logger.info(f"WebSocket 连接，当前在线: {len(self.active_connections)}")

    def disconnect(self, ws: WebSocket):
        if ws in self.active_connections:
            self.active_connections.remove(ws)
        logger.info(f"WebSocket 断开，当前在线: {len(self.active_connections)}")

    async def broadcast(self, data: dict):
        disconnected = []
        for conn in self.active_connections:
            try:
                await conn.send_text(json.dumps(data, ensure_ascii=False, default=str))
            except Exception:
                disconnected.append(conn)
        for conn in disconnected:
            self.disconnect(conn)


manager = ConnectionManager()


def _build_push_payload(db: Session) -> dict:
    """构建推送给前端的完整数据包"""
    records = get_jdbc_records(limit=100)
    if records:
        latest = records[-1]
    else:
        latest_rec = db.query(PressData).order_by(PressData.id.desc()).first()
        latest = _record_to_dict(latest_rec) if latest_rec else {}
        records = (
            db.query(PressData)
            .order_by(PressData.id.desc())
            .limit(100)
            .all()
        )
        records = [_record_to_dict(r) for r in reversed(records)]
        records = merge_history_records(records)
        if records:
            latest = records[-1]

    # AI 结果
    anomaly = anomaly_detector.predict(records) if records else {}
    quality = quality_predictor.predict(records) if records else {}
    health = health_scorer.score(records) if records else {}
    trend = trend_predictor.predict(records, 10) if records else {}

    return {
        "type": "realtime",
        "latest": latest,
        "ai": {
            "anomaly": anomaly,
            "quality": quality,
            "health": health,
            "trend": trend,
        },
        "history_count": len(records),
    }


@router.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            db = SessionLocal()
            try:
                payload = _build_push_payload(db)
            finally:
                db.close()
            await websocket.send_text(
                json.dumps(payload, ensure_ascii=False, default=str)
            )
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)

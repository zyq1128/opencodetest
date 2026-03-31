"""
FastAPI 主入口
- 注册所有路由
- 配置 CORS
- 初始化数据库
- 提供根路由与设备列表接口
"""
import sys
import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 确保当前目录在路径中
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db
from routers import data as data_router
from routers import ai as ai_router
from routers import ws as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="春保森拉天时 - 工业AI平台 POC",
    description="磨压机(Y4)数据采集与AI分析系统",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS 配置（允许前端跨域访问）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(data_router.router)
app.include_router(ai_router.router)
app.include_router(ws_router.router)


@app.on_event("startup")
async def startup_event():
    init_db()
    data_router.start_mqtt_subscriber()
    logger.info("✅ 数据库初始化完成")
    logger.info("✅ FastAPI 服务启动完成")
    logger.info("📡 WebSocket 端点: ws://localhost:8000/ws/realtime")
    logger.info("📖 API 文档: http://localhost:8000/api/docs")


@app.get("/")
async def root():
    return {
        "project": "春保森拉天时 工业AI平台 POC",
        "device": "磨压机 Y4",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "docs": "/api/docs",
            "data_latest": "/api/data/latest",
            "data_history": "/api/data/history",
            "ai_anomaly": "/api/ai/anomaly",
            "ai_quality": "/api/ai/quality",
            "ai_health": "/api/ai/health",
            "ai_trend": "/api/ai/trend",
            "websocket": "ws://localhost:8000/ws/realtime",
        },
    }


@app.get("/api/devices")
async def get_devices():
    """设备列表（支持多设备扩展）"""
    return {
        "devices": [
            {
                "id": "Y4",
                "name": "磨压机 Y4",
                "type": "PRESS",
                "plc": "基恩士 KV-310",
                "gateway": "IoT Gateway",
                "protocol": "MQTT",
                "status": "online",
                "location": "车间A-02",
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        log_level="info",
    )

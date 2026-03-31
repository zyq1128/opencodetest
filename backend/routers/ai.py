"""
AI 分析接口路由
GET /api/ai/anomaly  - 异常检测
GET /api/ai/quality  - 良率预测
GET /api/ai/health   - 健康评分
GET /api/ai/trend    - 压力趋势预测
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db, PressData
from routers.data import _record_to_dict
from ai.anomaly import anomaly_detector
from ai.quality import quality_predictor
from ai.health import health_scorer
from ai.trend import trend_predictor

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _get_records(db: Session, limit: int = 100):
    records = (
        db.query(PressData)
        .order_by(PressData.id.desc())
        .limit(limit)
        .all()
    )
    return [_record_to_dict(r) for r in reversed(records)]


@router.get("/anomaly")
async def get_anomaly(
    limit: int = Query(default=50, le=500),
    db: Session = Depends(get_db)
):
    """异常检测：基于最近N条数据的 Isolation Forest 结果"""
    records = _get_records(db, limit)
    if not records:
        return {"error": "暂无数据", "is_anomaly": False}
    result = anomaly_detector.predict(records)
    # 顺便增量更新模型
    if len(records) >= 50:
        anomaly_detector.incremental_fit(records)
    return result


@router.get("/quality")
async def get_quality(db: Session = Depends(get_db)):
    """良率预测：基于最新工艺参数"""
    records = _get_records(db, 10)
    if not records:
        return {"error": "暂无数据"}
    return quality_predictor.predict(records)


@router.get("/health")
async def get_health(
    limit: int = Query(default=60, le=500),
    db: Session = Depends(get_db)
):
    """健康评分：基于最近N条数据的综合评分"""
    records = _get_records(db, limit)
    if not records:
        return {"health_score": 100, "level": "优秀", "details": {}}
    return health_scorer.score(records)


@router.get("/trend")
async def get_trend(
    limit: int = Query(default=60, le=500),
    forecast_steps: int = Query(default=10, le=60),
    db: Session = Depends(get_db)
):
    """压力趋势预测：基于历史数据线性回归，预测未来N步"""
    records = _get_records(db, limit)
    return trend_predictor.predict(records, forecast_steps)

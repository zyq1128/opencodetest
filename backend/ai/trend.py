"""
趋势预测模块 - 支持多通道（压力/节拍/上冲电流/中模电流）
使用线性回归，返回各通道的斜率和预测序列
"""
import numpy as np
from sklearn.linear_model import LinearRegression
from typing import List, Dict, Any


CHANNELS = {
    "cxyl":   {"label": "成型压力",     "unit": "MPa", "default": 175.0, "rise_fast": 1.0, "rise_slow": 0.2},
    "cxjp":   {"label": "成型节拍",     "unit": "s",   "default": 3.5,   "rise_fast": 0.5, "rise_slow": 0.1},
    "scsfdl": {"label": "上冲伺服电流", "unit": "A",   "default": 8.0,   "rise_fast": 0.3, "rise_slow": 0.05},
    "zmsfdl": {"label": "中模伺服电流", "unit": "A",   "default": 6.0,   "rise_fast": 0.3, "rise_slow": 0.05},
}


def _get_value(record: Dict[str, Any], key: str, default: float):
    v = record.get(key)
    return default if v is None else v


def _trend_label(slope: float, ch: dict) -> str:
    if slope > ch["rise_fast"]:
        return "快速上升⚠️"
    elif slope > ch["rise_slow"]:
        return "缓慢上升"
    elif slope < -ch["rise_fast"]:
        return "快速下降⚠️"
    elif slope < -ch["rise_slow"]:
        return "缓慢下降"
    return "稳定"


def _predict_channel(records: List[Dict[str, Any]], field: str, forecast_steps: int = 10) -> Dict[str, Any]:
    ch = CHANNELS.get(field, CHANNELS["cxyl"])
    if len(records) < 5:
        return {"forecast": [], "trend": "数据不足", "slope": 0.0}

    vals = np.array([_get_value(r, field, ch["default"]) for r in records])
    n = len(vals)
    X = np.arange(n).reshape(-1, 1)
    reg = LinearRegression().fit(X, vals)
    slope = float(reg.coef_[0])

    future_X = np.arange(n, n + forecast_steps).reshape(-1, 1)
    forecast = [round(max(0, v), 3) for v in reg.predict(future_X).tolist()]

    return {
        "forecast":       forecast,
        "trend":          _trend_label(slope, ch),
        "slope":          round(slope, 4),
        "current_value":  round(float(vals[-1]), 3),
        "predicted_max":  round(max(forecast), 3) if forecast else 0,
        "forecast_steps": forecast_steps,
        "history":        [round(float(v), 3) for v in vals[-20:]],
    }


class TrendPredictor:
    """多通道趋势预测"""

    def predict(self, records: List[Dict[str, Any]], forecast_steps: int = 10) -> Dict[str, Any]:
        result = {}
        for field in CHANNELS:
            result[field] = _predict_channel(records, field, forecast_steps)
        # 向后兼容：保留顶层 trend/slope/forecast/current_pressure 字段（基于 cxyl）
        cxyl = result.get("cxyl", {})
        result["trend"]            = cxyl.get("trend", "稳定")
        result["slope"]            = cxyl.get("slope", 0.0)
        result["forecast"]         = cxyl.get("forecast", [])
        result["current_pressure"] = cxyl.get("current_value", 0.0)
        result["predicted_max"]    = cxyl.get("predicted_max", 0.0)
        return result


# 全局单例
trend_predictor = TrendPredictor()

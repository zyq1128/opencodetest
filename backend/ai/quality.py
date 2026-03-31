"""
AI 良率预测模块 - Random Forest Regressor
输入：实际工艺参数 + 伺服电流 + 称重均值
输出：预测良率（0.0 ~ 1.0）
"""
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

FEATURE_COLS = [
    "tcgd",    # 填充高度
    "yzgd",    # 压制高度
    "cxyl",    # 成型压力
    "bysj",    # 保压时间
    "yzsd",    # 压制速度
    "tmsd",    # 脱模速度
    "cxjp",    # 成型节拍
    "scsfdl",  # 上冲伺服电流
    "zmsfdl",  # 中模伺服电流
    "cz_weight_mean",  # 7路称重均值
]

FEATURE_LABELS = {
    "tcgd":           "填充高度",
    "yzgd":           "压制高度",
    "cxyl":           "成型压力",
    "bysj":           "保压时间",
    "yzsd":           "压制速度",
    "tmsd":           "脱模速度",
    "cxjp":           "成型节拍",
    "scsfdl":         "上冲伺服电流",
    "zmsfdl":         "中模伺服电流",
    "cz_weight_mean": "称重均值",
}


def _get_value(record: Dict[str, Any], key: str, default: float):
    v = record.get(key)
    return default if v is None else v


def _get_weight_mean(r: Dict[str, Any]) -> float:
    w = [_get_value(r, f"czjg{i}", 0.0) for i in range(1, 8)]
    valid = [x for x in w if x > 0]
    return float(np.mean(valid)) if valid else 45.5


class QualityPredictor:
    """良率预测器"""

    def __init__(self):
        self.model = RandomForestRegressor(
            n_estimators=100, max_depth=6, random_state=42
        )
        self.scaler = MinMaxScaler()
        self.is_trained = False
        self._initialize_with_baseline()

    def _initialize_with_baseline(self):
        rng = np.random.default_rng(123)
        n = 1000
        # 正常工况
        X = np.column_stack([
            rng.normal(35.0,   0.5, n),   # tcgd
            rng.normal(20.0,   0.3, n),   # yzgd
            rng.normal(175.0,  5.0, n),   # cxyl
            rng.normal(0.5,    0.05, n),  # bysj
            rng.normal(15.0,   1.0, n),   # yzsd
            rng.normal(10.0,   0.8, n),   # tmsd
            rng.normal(3.5,    0.2, n),   # cxjp
            rng.normal(8.0,    0.5, n),   # scsfdl
            rng.normal(6.0,    0.4, n),   # zmsfdl
            rng.normal(45.5,   0.5, n),   # cz_weight_mean
        ])
        # 良率与关键参数负相关
        press_dev  = np.abs(X[:, 2] - 175.0)
        cycle_dev  = np.abs(X[:, 6] - 3.5)
        servo_dev  = (X[:, 7] - 8.0) + (X[:, 8] - 6.0)
        weight_dev = np.abs(X[:, 9] - 45.5)
        good_rate = np.clip(
            0.97
            - 0.003 * press_dev
            - 0.05  * cycle_dev
            - 0.02  * np.clip(servo_dev, 0, None)
            - 0.015 * weight_dev
            + rng.normal(0, 0.008, n),
            0.5, 1.0
        )
        self.scaler.fit(X)
        self.model.fit(self.scaler.transform(X), good_rate)
        self.is_trained = True
        logger.info("QualityPredictor: 基线预训练完成（10维特征）")

    def predict(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not records:
            return {"predicted_good_rate": 0.95, "predicted_good_rate_pct": 95.0}

        latest = records[-1]
        X = np.array([[
            _get_value(latest, "tcgd",   35.0),
            _get_value(latest, "yzgd",   20.0),
            _get_value(latest, "cxyl",   175.0),
            _get_value(latest, "bysj",   0.5),
            _get_value(latest, "yzsd",   15.0),
            _get_value(latest, "tmsd",   10.0),
            _get_value(latest, "cxjp",   3.5),
            _get_value(latest, "scsfdl", 8.0),
            _get_value(latest, "zmsfdl", 6.0),
            _get_weight_mean(latest),
        ]])
        rate = float(self.model.predict(self.scaler.transform(X))[0])
        rate = max(0.0, min(1.0, rate))

        importances = self.model.feature_importances_
        top_features = sorted(
            zip(FEATURE_COLS, importances), key=lambda x: -x[1]
        )[:4]

        return {
            "predicted_good_rate":     round(rate, 4),
            "predicted_good_rate_pct": round(rate * 100, 2),
            "predicted_bad_rate":      round(1.0 - rate, 4),
            "top_features": [
                {"feature": FEATURE_LABELS.get(f, f), "importance": round(v, 4)}
                for f, v in top_features
            ],
            "quality_level": (
                "优秀" if rate >= 0.95 else
                "良好" if rate >= 0.90 else
                "警告" if rate >= 0.85 else "危险"
            ),
        }


# 全局单例
quality_predictor = QualityPredictor()

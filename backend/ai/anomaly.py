"""
AI 异常检测模块 - Isolation Forest
输入特征（6维）：cxyl, cxjp, scsfdl, zmsfdl, cz_weight_std, cz_weight_mean
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

FEATURE_NAMES = ["cxyl", "cxjp", "scsfdl", "zmsfdl", "cz_weight_std", "cz_weight_mean"]

# 正常工况基准值
BASELINE = {
    "cxyl":            (175.0, 5.0),    # 成型压力 MPa
    "cxjp":            (3.5,   0.2),    # 成型节拍 s
    "scsfdl":          (8.0,   0.5),    # 上冲伺服电流 A
    "zmsfdl":          (6.0,   0.4),    # 中模伺服电流 A
    "cz_weight_std":   (0.3,   0.1),    # 7路称重标准差 g
    "cz_weight_mean":  (45.5,  0.8),    # 7路称重均值 g
}


def _get_value(record: Dict[str, Any], key: str, default: float):
    v = record.get(key)
    return default if v is None else v


def _extract_features(records: List[Dict[str, Any]]) -> np.ndarray:
    rows = []
    for r in records:
        weights = [_get_value(r, f"czjg{i}", 45.5) for i in range(1, 8)]
        valid_w = [w for w in weights if w and w > 0]
        cz_mean = float(np.mean(valid_w)) if valid_w else 45.5
        cz_std  = float(np.std(valid_w))  if len(valid_w) > 1 else 0.3
        rows.append([
            _get_value(r, "cxyl",   175.0),
            _get_value(r, "cxjp",   3.5),
            _get_value(r, "scsfdl", 8.0),
            _get_value(r, "zmsfdl", 6.0),
            cz_std,
            cz_mean,
        ])
    return np.array(rows)


class AnomalyDetector:
    """基于 Isolation Forest 的设备异常检测"""

    def __init__(self, contamination: float = 0.05):
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
        )
        self.is_trained = False
        self._initialize_with_baseline()

    def _initialize_with_baseline(self):
        """用正常工况基线数据预训练，避免冷启动"""
        rng = np.random.default_rng(42)
        n = 600
        X = np.column_stack([
            rng.normal(BASELINE["cxyl"][0],           BASELINE["cxyl"][1],           n),
            rng.normal(BASELINE["cxjp"][0],           BASELINE["cxjp"][1],           n),
            rng.normal(BASELINE["scsfdl"][0],         BASELINE["scsfdl"][1],         n),
            rng.normal(BASELINE["zmsfdl"][0],         BASELINE["zmsfdl"][1],         n),
            np.abs(rng.normal(BASELINE["cz_weight_std"][0],  BASELINE["cz_weight_std"][1],  n)),
            rng.normal(BASELINE["cz_weight_mean"][0], BASELINE["cz_weight_mean"][1], n),
        ])
        # 注入少量异常
        idx = rng.choice(n, 30, replace=False)
        X[idx, 0] += rng.uniform(25, 40, 30)    # 压力突升
        X[idx, 2] += rng.uniform(3, 6, 30)      # 上冲电流异常
        X[idx, 4] += rng.uniform(1, 3, 30)      # 重量离散度大

        self.model.fit(X)
        self.is_trained = True
        logger.info("AnomalyDetector: 基线预训练完成（6维特征）")

    def predict(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not records:
            return {"is_anomaly": False, "anomaly_score": 0.0}

        X = _extract_features(records)
        scores = self.model.score_samples(X)
        labels = self.model.predict(X)

        latest_score = float(scores[-1])
        is_anomaly = int(labels[-1]) == -1
        anomaly_count = int(np.sum(labels == -1))

        latest = records[-1]
        weights = [_get_value(latest, f"czjg{i}", 0.0) for i in range(1, 8)]
        valid_w = [w for w in weights if w > 0]

        return {
            "is_anomaly":    is_anomaly,
            "anomaly_label": int(labels[-1]),
            "anomaly_score": round(latest_score, 4),
            "anomaly_count": anomaly_count,
            "anomaly_rate":  round(anomaly_count / len(labels), 4),
            "sample_size":   len(records),
            "features": {
                "cxyl":           round(float(X[-1, 0]), 2),
                "cxjp":           round(float(X[-1, 1]), 3),
                "scsfdl":         round(float(X[-1, 2]), 2),
                "zmsfdl":         round(float(X[-1, 3]), 2),
                "cz_weight_std":  round(float(X[-1, 4]), 3),
                "cz_weight_mean": round(float(X[-1, 5]), 2),
            },
        }

    def incremental_fit(self, records: List[Dict[str, Any]]):
        if len(records) < 50:
            return
        X = _extract_features(records)
        self.model.fit(X)
        self.is_trained = True


# 全局单例
anomaly_detector = AnomalyDetector()

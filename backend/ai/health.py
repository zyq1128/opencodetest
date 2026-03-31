"""
设备健康评分模块
新增伺服电流监控维度（scsfdl, zmsfdl）
综合评分 → 0~100 健康分
"""
import numpy as np
from typing import List, Dict, Any


class HealthScorer:
    """设备健康评分计算器"""

    SERVO_SC_NORMAL = 8.0    # 上冲伺服电流正常基准(A)
    SERVO_ZM_NORMAL = 6.0    # 中模伺服电流正常基准(A)

    def __init__(self, window: int = 60):
        self.window = window

    def _get_value(self, record: Dict[str, Any], key: str, default: float):
        v = record.get(key)
        return default if v is None else v

    def score(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not records:
            return {"health_score": 100, "level": "优秀", "details": {}}

        recent = records[-self.window:]

        cxyl_vals   = np.array([self._get_value(r, "cxyl",   175.0) for r in recent])
        cxjp_vals   = np.array([self._get_value(r, "cxjp",   3.5)   for r in recent])
        scsfdl_vals = np.array([self._get_value(r, "scsfdl", 8.0)   for r in recent])
        zmsfdl_vals = np.array([self._get_value(r, "zmsfdl", 6.0)   for r in recent])
        alarm_vals  = np.array([
            max(self._get_value(r, "myj_alarm", 0), self._get_value(r, "jxs_alarm", 0))
            for r in recent
        ])

        # 1. 成型压力稳定性
        press_cv    = float(np.std(cxyl_vals) / (np.mean(cxyl_vals) + 1e-6))
        press_score = max(0.0, 100.0 - press_cv * 600)

        # 2. 节拍稳定性
        cycle_cv    = float(np.std(cxjp_vals) / (np.mean(cxjp_vals) + 1e-6))
        cycle_score = max(0.0, 100.0 - cycle_cv * 500)

        # 3. 上冲伺服电流（偏高 = 摩擦/磨损加剧）
        sc_mean  = float(np.mean(scsfdl_vals))
        sc_dev   = max(0.0, sc_mean - self.SERVO_SC_NORMAL)
        sc_score = max(0.0, 100.0 - sc_dev * 12)

        # 4. 中模伺服电流（偏高 = 脱模阻力大）
        zm_mean  = float(np.mean(zmsfdl_vals))
        zm_dev   = max(0.0, zm_mean - self.SERVO_ZM_NORMAL)
        zm_score = max(0.0, 100.0 - zm_dev * 15)

        # 5. 报警惩罚
        alarm_rate  = float(np.mean(alarm_vals))
        alarm_score = max(0.0, 100.0 - alarm_rate * 200)

        # 综合加权
        health_score = (
            press_score  * 0.30
            + cycle_score  * 0.20
            + sc_score     * 0.20
            + zm_score     * 0.15
            + alarm_score  * 0.15
        )
        health_score = round(min(100.0, max(0.0, health_score)), 1)

        # 压力趋势（老化检测）
        if len(cxyl_vals) >= 10:
            trend_slope = float(np.polyfit(range(len(cxyl_vals)), cxyl_vals, 1)[0])
        else:
            trend_slope = 0.0

        # 伺服电流上升趋势（摩擦恶化）
        if len(scsfdl_vals) >= 10:
            sc_slope = float(np.polyfit(range(len(scsfdl_vals)), scsfdl_vals, 1)[0])
        else:
            sc_slope = 0.0

        aging_warning = trend_slope > 0.5 or sc_slope > 0.05

        level = (
            "优秀" if health_score >= 90 else
            "良好" if health_score >= 75 else
            "警告" if health_score >= 55 else "危险"
        )

        return {
            "health_score":  health_score,
            "level":         level,
            "aging_warning": aging_warning,
            "pressure_trend": round(trend_slope, 4),
            "sc_current_trend": round(sc_slope, 4),
            "details": {
                "press_stability_score": round(press_score, 1),
                "cycle_stability_score": round(cycle_score, 1),
                "sc_servo_score":        round(sc_score, 1),
                "zm_servo_score":        round(zm_score, 1),
                "alarm_score":           round(alarm_score, 1),
                "sc_current_mean":       round(sc_mean, 2),
                "zm_current_mean":       round(zm_mean, 2),
                "press_std":             round(float(np.std(cxyl_vals)), 3),
                "cycle_std":             round(float(np.std(cxjp_vals)), 3),
                "alarm_rate":            round(alarm_rate, 4),
                "sample_size":           len(recent),
            },
        }


# 全局单例
health_scorer = HealthScorer()

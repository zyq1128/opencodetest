"""
磨压机设备数据模拟器 - 基于实际采集字段
- 每秒生成一条 MQTT 格式数据
- 模拟：正常生产、压力异常、节拍异常、伺服电流老化、重量离散
- 将数据 POST 到 FastAPI 后端
"""
import time
import math
import random
import logging
from datetime import datetime

try:
    import requests
except ImportError:
    import subprocess, sys
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests"])
    import requests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SIM] %(message)s")
logger = logging.getLogger(__name__)

BACKEND_URL  = "http://localhost:8000/api/data"
GW_ID        = "Y4"
INTERVAL_SEC = 1.0

# ── 工艺基准值 ────────────────────────────────────────────
BASE = {
    "cxyl":   175.0,   # 成型压力 MPa
    "xyyl":   58.0,    # 卸压压力 MPa
    "cxjp":   3.5,     # 成型节拍 s
    "tcgd":   35.0,    # 填充高度 mm
    "xygd":   22.0,    # 卸压高度 mm
    "zfgd":   35.0,    # 装粉高度 mm
    "yzgd":   20.0,    # 压制高度 mm
    "yzsd":   15.0,    # 压制速度 mm/s
    "tmsd":   10.0,    # 脱模速度 mm/s
    "bysj":   0.5,     # 保压时间 s
    "dyjl":   5.0,     # 顶压距离 mm
    "dyzt":   0.2,     # 顶压暂停 s
    "qmpl":   2.0,     # 清模频率 Hz
    "fdl":    0.1,     # 浮动量 mm
    "cpdz":   45.5,    # 产品单重 g
    "scsfdl": 8.0,     # 上冲伺服电流 A
    "zmsfdl": 6.0,     # 中模伺服电流 A
    "wt_low": 42.0,    # 良品重量下限 g
    "wt_high":49.0,    # 良品重量上限 g
}


class DeviceSimulator:
    def __init__(self):
        self.tick           = 0
        self.scsl           = 0      # 生产数量
        self.ok_count       = 0
        self.ng_count       = 0
        # XYZ / 叠炉 计数
        self.x_count        = 0
        self.y_count        = 0
        self.z_count        = 0
        self.dl_y_count     = 0
        self.dl_layer_count = 0

        # 机械手状态
        self.jxs_run     = 1
        self.jxs_standby = 0
        self.jxs_alarm   = 0

        # 异常状态机
        self.in_press_anomaly  = False
        self.press_ticks_left  = 0
        self.in_cycle_anomaly  = False
        self.cycle_ticks_left  = 0

        # 老化累计（压力 & 伺服电流随时间缓慢上升）
        self.aging = 0.0

    def _jxs_state(self):
        """机械手状态随机模拟"""
        r = random.random()
        if r < 0.90:
            self.jxs_run, self.jxs_standby, self.jxs_alarm = 1, 0, 0
        elif r < 0.97:
            self.jxs_run, self.jxs_standby, self.jxs_alarm = 0, 1, 0
        else:
            self.jxs_run, self.jxs_standby, self.jxs_alarm = 0, 0, 1

    def _next_frame(self) -> dict:
        self.tick += 1
        t = self.tick

        # 老化因子（每300帧约 +0.5 MPa 压力 / +0.15 A 电流）
        self.aging += 0.0017

        # 压力异常事件（2% 概率触发）
        if not self.in_press_anomaly and random.random() < 0.02:
            self.in_press_anomaly = True
            self.press_ticks_left = random.randint(5, 20)
            logger.warning(f"⚠️  压力异常 持续{self.press_ticks_left}帧")
        press_boost = 0.0
        if self.in_press_anomaly:
            press_boost = random.uniform(20, 40)
            self.press_ticks_left -= 1
            if self.press_ticks_left <= 0:
                self.in_press_anomaly = False

        # 节拍异常事件（1.5% 概率）
        if not self.in_cycle_anomaly and random.random() < 0.015:
            self.in_cycle_anomaly = True
            self.cycle_ticks_left = random.randint(5, 15)
            logger.warning(f"⚠️  节拍异常 持续{self.cycle_ticks_left}帧")
        cycle_boost = 0.0
        if self.in_cycle_anomaly:
            cycle_boost = random.uniform(1.0, 3.0)
            self.cycle_ticks_left -= 1
            if self.cycle_ticks_left <= 0:
                self.in_cycle_anomaly = False

        # 周期波动
        wave = math.sin(t / 60 * math.pi) * 2.0

        # ── 工艺参数实时值 ────────────────────────────
        cxyl  = BASE["cxyl"]   + self.aging + wave + press_boost + random.gauss(0, 2.5)
        xyyl  = BASE["xyyl"]   + random.gauss(0, 1.5)
        cxjp  = max(1.0, BASE["cxjp"] + cycle_boost + wave * 0.1 + random.gauss(0, 0.15))

        # 伺服电流（老化上升 + 压力异常时上冲电流升高）
        sc_aging = self.aging * 0.08
        scsfdl = BASE["scsfdl"] + sc_aging + (press_boost * 0.12 if press_boost else 0) + random.gauss(0, 0.3)
        zmsfdl = BASE["zmsfdl"] + sc_aging * 0.7 + (cycle_boost * 0.1 if cycle_boost else 0) + random.gauss(0, 0.25)

        # 报警判断
        myj_alarm   = 1 if (cxyl > 205 or cxjp > 5.5 or xyyl > 75) else 0
        myj_run     = 1
        myj_standby = 0
        self._jxs_state()

        # 产量
        self.scsl += 1
        is_bad = (press_boost > 15 and random.random() < 0.6) or (cycle_boost > 2 and random.random() < 0.4)
        if is_bad:
            self.ng_count += 1
        else:
            self.ok_count += 1

        # 计数器
        self.x_count += 1
        if self.x_count % 5 == 0:
            self.y_count += 1
        if self.y_count % 7 == 0:
            self.z_count += 1
        # 叠炉计数（每层5件，每盘4层）
        self.dl_y_count    = (self.scsl % 20)
        self.dl_layer_count = (self.scsl % 4)

        # 7路称重（围绕 cpdz 正态分布，异常时部分偏离）
        def _weight(anomaly=False):
            if anomaly and random.random() < 0.4:
                return round(BASE["cpdz"] + random.uniform(5, 12) * random.choice([-1, 1]), 2)
            return round(BASE["cpdz"] + random.gauss(0, 0.6), 2)

        has_weight_anomaly = is_bad and random.random() < 0.5
        weights = [_weight(has_weight_anomaly) for _ in range(7)]

        reg_val = {
            "jxs_run":     self.jxs_run,
            "jxs_standby": self.jxs_standby,
            "jxs_alarm":   self.jxs_alarm,
            "myj_run":     myj_run,
            "myj_standby": myj_standby,
            "myj_alarm":   myj_alarm,
            "x_count":     self.x_count,
            "y_count":     self.y_count,
            "z_count":     self.z_count,
            "dl_y_count":     self.dl_y_count,
            "dl_layer_count": self.dl_layer_count,
            "scsl":     self.scsl,
            "ok_count": self.ok_count,
            "ng_count": self.ng_count,
            "weight_limit_low":  BASE["wt_low"],
            "weight_limit_high": BASE["wt_high"],
            "czjg1": weights[0], "czjg2": weights[1], "czjg3": weights[2],
            "czjg4": weights[3], "czjg5": weights[4], "czjg6": weights[5],
            "czjg7": weights[6],
            "tcgd": round(BASE["tcgd"] + random.gauss(0, 0.2), 3),
            "cxyl": round(cxyl, 2),
            "xygd": round(BASE["xygd"] + random.gauss(0, 0.1), 3),
            "xyyl": round(xyyl, 2),
            "zfgd": round(BASE["zfgd"] + random.gauss(0, 0.2), 3),
            "yzgd": round(BASE["yzgd"] + random.gauss(0, 0.1), 3),
            "cpdz": BASE["cpdz"],
            "cxjp": round(cxjp, 3),
            "qmpl": round(BASE["qmpl"] + random.gauss(0, 0.05), 2),
            "fdl":  round(BASE["fdl"]  + random.gauss(0, 0.005), 3),
            "yzsd": round(BASE["yzsd"] + random.gauss(0, 0.3), 2),
            "tmsd": round(BASE["tmsd"] + random.gauss(0, 0.2), 2),
            "bysj": round(BASE["bysj"] + random.gauss(0, 0.02), 3),
            "dyjl": round(BASE["dyjl"] + random.gauss(0, 0.05), 3),
            "dyzt": round(BASE["dyzt"] + random.gauss(0, 0.01), 3),
            "scsfdl": round(max(0, scsfdl), 2),
            "zmsfdl": round(max(0, zmsfdl), 2),
        }
        payload = {
            "GwId":     GW_ID,
            "DateTime": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Flag":     "Z",
            "Body":     [{"Module": "Y4_PRESS", "Status": 1, "Reg_Val": reg_val}],
        }
        return payload, cxyl, cxjp, scsfdl, myj_alarm

    def run(self):
        logger.info(f"🚀 模拟器启动 → {BACKEND_URL}")
        while True:
            start = time.monotonic()
            try:
                payload, cxyl, cxjp, scsfdl, alarm = self._next_frame()
                resp = requests.post(BACKEND_URL, json=payload, timeout=3)
                ok   = "✅" if resp.status_code == 200 else f"❌{resp.status_code}"
                logger.info(
                    f"[{self.tick:>5}] {ok} "
                    f"压力={cxyl:.1f}MPa  节拍={cxjp:.2f}s  "
                    f"上冲={scsfdl:.2f}A  "
                    f"良品={self.ok_count}  不良={self.ng_count}  "
                    f"{'🔴报警' if alarm else ''}"
                )
            except requests.exceptions.ConnectionError:
                logger.warning("⚠️  无法连接后端，等待重试...")
            except Exception as e:
                logger.error(f"模拟器错误: {e}")
            elapsed = time.monotonic() - start
            time.sleep(max(0.0, INTERVAL_SEC - elapsed))


if __name__ == "__main__":
    sim = DeviceSimulator()
    try:
        sim.run()
    except KeyboardInterrupt:
        logger.info("模拟器已停止")

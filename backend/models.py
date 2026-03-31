"""
Pydantic 数据模型 - 基于实际设备采集字段
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class RegVal(BaseModel):
    """实际设备采集字段 - 全量"""

    # ── 设备状态 ────────────────────────────────────
    jxs_run:     Optional[int]   = 0      # 机械手运行
    jxs_standby: Optional[int]   = 0      # 机械手待机
    jxs_alarm:   Optional[int]   = 0      # 机械手报警
    myj_run:     Optional[int]   = 1      # 模压机运行
    myj_standby: Optional[int]   = 0      # 模压机待机
    myj_alarm:   Optional[int]   = 0      # 模压机报警

    # ── 方向计数 ─────────────────────────────────────
    x_count:        Optional[int] = 0
    y_count:        Optional[int] = 0
    z_count:        Optional[int] = 0
    dl_y_count:     Optional[int] = 0     # 叠炉摆盘Y计数
    dl_layer_count: Optional[int] = 0     # 叠炉摆盘层计数

    # ── 产量统计 ─────────────────────────────────────
    scsl:             Optional[int]   = 0
    ok_count:         Optional[int]   = 0
    ng_count:         Optional[int]   = 0
    weight_limit_low:  Optional[float] = 42.0   # 设定良品重量下限(g)
    weight_limit_high: Optional[float] = 49.0   # 设定良品重量上限(g)

    # ── 7路电子称重结果 ──────────────────────────────
    czjg1: Optional[float] = 0.0
    czjg2: Optional[float] = 0.0
    czjg3: Optional[float] = 0.0
    czjg4: Optional[float] = 0.0
    czjg5: Optional[float] = 0.0
    czjg6: Optional[float] = 0.0
    czjg7: Optional[float] = 0.0

    # ── 工艺参数 ─────────────────────────────────────
    tcgd:  Optional[float] = 35.0    # 填充高度(mm)
    cxyl:  Optional[float] = 175.0   # 成型压力(MPa)
    xygd:  Optional[float] = 22.0    # 卸压高度(mm)
    xyyl:  Optional[float] = 58.0    # 卸压压力(MPa)
    zfgd:  Optional[float] = 35.0    # 装粉高度(mm)
    yzgd:  Optional[float] = 20.0    # 压制高度(mm)
    cpdz:  Optional[float] = 45.5    # 产品单重(g)
    cxjp:  Optional[float] = 3.5     # 成型节拍(s)
    qmpl:  Optional[float] = 2.0     # 清模频率(Hz)
    fdl:   Optional[float] = 0.1     # 浮动量(mm)
    yzsd:  Optional[float] = 15.0    # 压制速度(mm/s)
    tmsd:  Optional[float] = 10.0    # 脱模速度(mm/s)
    bysj:  Optional[float] = 0.5     # 保压时间(s)
    dyjl:  Optional[float] = 5.0     # 顶压距离(mm)
    dyzt:  Optional[float] = 0.2     # 顶压暂停(s)

    # ── 伺服电流 ─────────────────────────────────────
    scsfdl: Optional[float] = 8.0    # 上冲伺服脱模电流(A)
    zmsfdl: Optional[float] = 6.0    # 中模伺服脱模电流(A)


class MQTTBody(BaseModel):
    Module: str = "Y4_PRESS"
    Status: int = 1
    Reg_Val: RegVal


class MQTTPayload(BaseModel):
    """MQTT 顶层数据格式"""
    GwId:     str = "Y4"
    DateTime: str = ""
    Flag:     str = "Z"
    Body:     List[MQTTBody]


class DataResponse(BaseModel):
    success: bool
    message: str
    id: Optional[int] = None


class HistoryResponse(BaseModel):
    data: List[dict]
    total: int

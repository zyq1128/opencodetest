"""
SQLAlchemy ORM 数据库模型 - 基于实际设备采集字段
"""
from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker
from datetime import datetime

DATABASE_URL = "sqlite:///./industrial_data.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class PressData(Base):
    """磨压机采集数据表 - 全部实际采集字段"""
    __tablename__ = "press_data"

    id = Column(Integer, primary_key=True, index=True)
    gw_id = Column(String, default="Y4")
    recorded_at = Column(DateTime, default=datetime.utcnow, index=True)

    # ── 设备状态 ────────────────────────────────────
    jxs_run     = Column(Integer, default=0)   # 机械手运行
    jxs_standby = Column(Integer, default=0)   # 机械手待机
    jxs_alarm   = Column(Integer, default=0)   # 机械手报警
    myj_run     = Column(Integer, default=1)   # 模压机运行
    myj_standby = Column(Integer, default=0)   # 模压机待机
    myj_alarm   = Column(Integer, default=0)   # 模压机报警

    # ── 方向计数 ─────────────────────────────────────
    x_count      = Column(Integer, default=0)  # X方向当前计数
    y_count      = Column(Integer, default=0)  # Y方向当前计数
    z_count      = Column(Integer, default=0)  # Z方向当前计数
    dl_y_count   = Column(Integer, default=0)  # 叠炉当前摆盘Y计数
    dl_layer_count = Column(Integer, default=0)  # 叠炉当前摆盘层计数

    # ── 产量统计 ─────────────────────────────────────
    scsl        = Column(Integer, default=0)   # 生产数量
    ok_count    = Column(Integer, default=0)   # 合格数量
    ng_count    = Column(Integer, default=0)   # 不良数量
    weight_limit_low  = Column(Float, default=42.0)  # 设定良品重量下限(g)
    weight_limit_high = Column(Float, default=49.0)  # 设定良品重量上限(g)

    # ── 7路电子称重结果 ──────────────────────────────
    czjg1 = Column(Float, default=0.0)   # 1号电子称重结果(g)
    czjg2 = Column(Float, default=0.0)
    czjg3 = Column(Float, default=0.0)
    czjg4 = Column(Float, default=0.0)
    czjg5 = Column(Float, default=0.0)
    czjg6 = Column(Float, default=0.0)
    czjg7 = Column(Float, default=0.0)   # 7号电子称重结果(g)

    # ── 工艺参数 ─────────────────────────────────────
    tcgd  = Column(Float, default=0.0)   # 填充高度(mm)
    cxyl  = Column(Float, default=0.0)   # 成型压力(MPa)
    xygd  = Column(Float, default=0.0)   # 卸压高度(mm)
    xyyl  = Column(Float, default=0.0)   # 卸压压力(MPa)
    zfgd  = Column(Float, default=0.0)   # 装粉高度(mm)
    yzgd  = Column(Float, default=0.0)   # 压制高度(mm)
    cpdz  = Column(Float, default=0.0)   # 产品单重(g)
    cxjp  = Column(Float, default=0.0)   # 成型节拍(s)
    qmpl  = Column(Float, default=0.0)   # 清模频率(Hz)
    fdl   = Column(Float, default=0.0)   # 浮动量(mm)
    yzsd  = Column(Float, default=0.0)   # 压制速度(mm/s)
    tmsd  = Column(Float, default=0.0)   # 脱模速度(mm/s)
    bysj  = Column(Float, default=0.0)   # 保压时间(s)
    dyjl  = Column(Float, default=0.0)   # 顶压距离(mm)
    dyzt  = Column(Float, default=0.0)   # 顶压暂停(s)

    # ── 伺服电流 ─────────────────────────────────────
    scsfdl = Column(Float, default=0.0)  # 上冲伺服脱模电流(A)
    zmsfdl = Column(Float, default=0.0)  # 中模伺服脱模电流(A)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    Base.metadata.create_all(bind=engine)

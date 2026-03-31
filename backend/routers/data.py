"""
数据接收与查询路由 - 基于实际设备字段
POST /api/data        - 接收 MQTT 格式数据并入库
GET  /api/data/latest - 查询最新一条
GET  /api/data/history - 查询历史数据
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db, PressData, SessionLocal
from models import DataResponse
from typing import Any
import logging
import os
import json
import threading
from decimal import Decimal
import jaydebeapi

router = APIRouter(prefix="/api/data", tags=["data"])
logger = logging.getLogger(__name__)

JDBC_DRIVER = "com.splicemachine.db.jdbc.ClientDriver"
JDBC_URL = "jdbc:splice://172.16.1.221:1527/splicedb"
JDBC_USER = "splice"
JDBC_PASSWORD = "admin"
JDBC_JAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "db-client-3.0.3.2403.jar"))
JDBC_SQL = "select * from test.poc_y4 order by ts DESC fetch first {limit} rows only"
JDBC_MAPPING_SQL = 'select "ALIAS" as alias, REAL_NAME as real_name from test.poc_y4_mapping'

FALLBACK_FIELD_MAP = {
    "ts": "recorded_at",
    "flag_": "flag",
    "module": "module",
    "status": "status",
    "jxsyunxing": "jxs_run",
    "jxsdaiji": "jxs_standby",
    "jxsbaoijing": "jxs_alarm",
    "myjyunxing": "myj_run",
    "myjdaiji": "myj_standby",
    "myjbaoijing": "myj_alarm",
    "xkljs": "x_count",
    "ykljs": "y_count",
    "zkljs": "z_count",
    "dlykljs": "dl_y_count",
    "dlckljs": "dl_layer_count",
    "scsl": "scsl",
    "ok": "ok_count",
    "ng": "ng_count",
    "czjg1": "czjg1",
    "czjg2": "czjg2",
    "czjg3": "czjg3",
    "czjg4": "czjg4",
    "czjg5": "czjg5",
    "czjg6": "czjg6",
    "czjg7": "czjg7",
    "tcgd": "tcgd",
    "cxyl": "cxyl",
    "xygd": "xygd",
    "xyyl": "xyyl",
    "zfgd": "zfgd",
    "yzgd": "yzgd",
    "cpdz": "cpdz",
    "cxjp": "cxjp",
    "yzsd": "yzsd",
    "tmsd": "tmsd",
    "bysj": "bysj",
    "dyjl": "dyjl",
    "dyzt": "dyzt",
    "scsfdl": "scsfdl",
    "zmsfdl": "zmsfdl",
    "sn": "gw_id",
}

CHINESE_FIELD_MAP = {
    "填充高度": "tcgd",
    "成型压力": "cxyl",
    "装粉高度": "zfgd",
    "压制高度": "yzgd",
    "产品单重": "cpdz",
    "成型节拍": "cxjp",
    "卸压高度": "xygd",
    "卸压压力": "xyyl",
    "清模频率": "qmpl",
    "浮动量": "fdl",
    "压制速度": "yzsd",
    "脱模速度": "tmsd",
    "保压时间": "bysj",
    "顶压距离": "dyjl",
    "顶压暂停": "dyzt",
    "上冲伺服脱模电流": "scsfdl",
    "中模伺服脱模电流": "zmsfdl",
    "机械手运行": "jxs_run",
    "机械手待机": "jxs_standby",
    "机械手报警": "jxs_alarm",
    "模压机运行": "myj_run",
    "模压机待机": "myj_standby",
    "模压机报警": "myj_alarm",
    "生产数量": "scsl",
    "合格数量": "ok_count",
    "不良数量": "ng_count",
    "设定良品重量下限": "weight_limit_low",
    "设定良品重量上限": "weight_limit_high",
    "1号电子称重结果": "czjg1",
    "2号电子称重结果": "czjg2",
    "3号电子称重结果": "czjg3",
    "4号电子称重结果": "czjg4",
    "5号电子称重结果": "czjg5",
    "6号电子称重结果": "czjg6",
    "7号电子称重结果": "czjg7",
    "x方向当前计数": "x_count",
    "x方向可以当前计数": "x_count",
    "y方向当前计数": "y_count",
    "y方向可以当前计数": "y_count",
    "z方向当前计数": "z_count",
    "z方向可以当前计数": "z_count",
    "叠炉当前摆盘y计数": "dl_y_count",
    "叠炉当前摆盘层计数": "dl_layer_count",
}

PRESS_FIELDS = {c.name for c in PressData.__table__.columns if c.name != "id"}
LATEST_STATE = {}
STATE_LOCK = threading.Lock()

MQTT_BROKER_HOST = os.getenv("MQTT_BROKER_HOST", "172.16.1.221")
MQTT_BROKER_PORT = int(os.getenv("MQTT_BROKER_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "up/senbao/Y4")
MQTT_PARTIAL_THRESHOLD = int(os.getenv("MQTT_PARTIAL_THRESHOLD", "10"))
MQTT_CLIENT = None


def _parse_datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if not value:
        return datetime.utcnow()
    try:
        return datetime.strptime(str(value), "%Y-%m-%d %H:%M:%S")
    except Exception:
        try:
            return datetime.fromisoformat(str(value))
        except Exception:
            return datetime.utcnow()


def _coerce_number(value: Any):
    if value is None:
        return None
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        v = value.strip()
        if v == "" or v.lower() in {"none", "null", "nan"}:
            return None
        try:
            num = float(v)
            if num.is_integer():
                return int(num)
            return num
        except Exception:
            return value
    return value


def _is_empty_value(value: Any):
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    return False


ZERO_ALLOWED_FIELDS = {
    "jxs_run",
    "jxs_standby",
    "jxs_alarm",
    "myj_run",
    "myj_standby",
    "myj_alarm",
    "x_count",
    "y_count",
    "z_count",
    "dl_y_count",
    "dl_layer_count",
    "scsl",
    "ok_count",
    "ng_count",
    "weight_limit_low",
    "weight_limit_high",
}


def _is_zero_like(value: Any):
    return isinstance(value, (int, float)) and value == 0


def _map_reg_val(reg_val: Any, is_partial: bool) -> dict:
    if not isinstance(reg_val, dict):
        return {}
    mapped = {}
    for k, v in reg_val.items():
        key = _normalize_label(k)
        if not key:
            continue
        target = FALLBACK_FIELD_MAP.get(key) or key
        val = _coerce_number(v)
        if val is None:
            continue
        if is_partial and _is_zero_like(val) and target not in ZERO_ALLOWED_FIELDS:
            continue
        mapped[target] = val
    return mapped


def _merge_state(gw_id: str, fields: dict) -> dict:
    with STATE_LOCK:
        base = LATEST_STATE.get(gw_id, {})
        merged = {**base, **fields}
        LATEST_STATE[gw_id] = merged
    return merged


def _extract_payload(payload: Any) -> tuple[str, datetime, dict]:
    if isinstance(payload, dict):
        gw_id = payload.get("GwId") or payload.get("gwid") or payload.get("gw_id") or "Y4"
        recorded_at = _parse_datetime(payload.get("DateTime") or payload.get("datetime"))
        body = payload.get("Body") or payload.get("body") or []
        item = body[0] if isinstance(body, list) and body else body
        reg_val = item.get("Reg_Val") if isinstance(item, dict) else None
    else:
        gw_id = getattr(payload, "GwId", "Y4")
        recorded_at = _parse_datetime(getattr(payload, "DateTime", None))
        body = getattr(payload, "Body", None)
        item = body[0] if isinstance(body, list) and body else body
        reg_val = getattr(item, "Reg_Val", None) if item else None

    is_partial = isinstance(reg_val, dict) and len(reg_val) < MQTT_PARTIAL_THRESHOLD
    fields = _map_reg_val(reg_val or {}, is_partial)
    if "gw_id" in fields and not gw_id:
        gw_id = fields["gw_id"]
    return gw_id or "Y4", recorded_at, fields


def _build_record(gw_id: str, recorded_at: datetime, fields: dict) -> PressData:
    data = {"gw_id": gw_id, "recorded_at": recorded_at}
    for field in PRESS_FIELDS:
        if field in {"gw_id", "recorded_at"}:
            continue
        data[field] = fields.get(field)
    return PressData(**data)


def ingest_payload(payload: Any, db: Session):
    gw_id, recorded_at, fields = _extract_payload(payload)
    if not fields:
        return DataResponse(success=False, message="空Body")
    merged = _merge_state(gw_id, fields)
    record = _build_record(gw_id, recorded_at, merged)
    db.add(record)
    db.commit()
    db.refresh(record)
    return DataResponse(success=True, message="数据入库成功", id=record.id)


def merge_history_records(records: list[dict]) -> list[dict]:
    states: dict[str, dict] = {}
    merged: list[dict] = []
    for record in records:
        gw_id = record.get("gw_id") or record.get("sn") or "Y4"
        state = states.get(gw_id, {})
        for k, v in record.items():
            if k == "id":
                continue
            if _is_empty_value(v):
                continue
            state[k] = v
        states[gw_id] = state
        out = {}
        for field in PRESS_FIELDS:
            if field == "gw_id":
                out[field] = gw_id
            elif field == "recorded_at":
                out[field] = record.get("recorded_at") or state.get("recorded_at")
            else:
                if field in record and not _is_empty_value(record.get(field)):
                    out[field] = record.get(field)
                else:
                    out[field] = state.get(field)
        if "id" in record:
            out["id"] = record["id"]
        merged.append(_ensure_record_identity(out))
    return merged


def start_mqtt_subscriber():
    global MQTT_CLIENT
    if MQTT_CLIENT:
        return MQTT_CLIENT
    try:
        import paho.mqtt.client as mqtt
    except Exception as e:
        logger.error(f"MQTT 初始化失败: {e}")
        return None

    client = mqtt.Client()

    def on_connect(cli, userdata, flags, rc):
        if rc == 0:
            cli.subscribe(MQTT_TOPIC)
            logger.info(f"✅ MQTT 已连接 {MQTT_BROKER_HOST}:{MQTT_BROKER_PORT} 订阅 {MQTT_TOPIC}")
        else:
            logger.error(f"MQTT 连接失败: {rc}")

    def on_message(cli, userdata, msg):
        try:
            raw = msg.payload.decode(errors="ignore")
            payload = json.loads(raw)
        except Exception as e:
            logger.error(f"MQTT 解析失败: {e}")
            return
        db = SessionLocal()
        try:
            ingest_payload(payload, db)
        except Exception as e:
            logger.error(f"MQTT 入库失败: {e}")
            db.rollback()
        finally:
            db.close()

    def on_disconnect(cli, userdata, rc):
        if rc != 0:
            logger.warning("MQTT 连接断开，正在重连")

    client.on_connect = on_connect
    client.on_message = on_message
    client.on_disconnect = on_disconnect
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    client.connect_async(MQTT_BROKER_HOST, MQTT_BROKER_PORT, 60)
    client.loop_start()
    MQTT_CLIENT = client
    return client


@router.post("", response_model=DataResponse)
async def receive_data(payload: dict, db: Session = Depends(get_db)):
    """接收 MQTT 格式数据，解析并入库"""
    try:
        return ingest_payload(payload, db)

    except Exception as e:
        logger.error(f"数据入库失败: {e}")
        db.rollback()
        return DataResponse(success=False, message=str(e))


def _record_to_dict(r: PressData) -> dict:
    return {
        "id":          r.id,
        "gw_id":       r.gw_id,
        "recorded_at": r.recorded_at.isoformat() if r.recorded_at else None,
        # 设备状态
        "jxs_run":     r.jxs_run,
        "jxs_standby": r.jxs_standby,
        "jxs_alarm":   r.jxs_alarm,
        "myj_run":     r.myj_run,
        "myj_standby": r.myj_standby,
        "myj_alarm":   r.myj_alarm,
        # 方向计数
        "x_count":       r.x_count,
        "y_count":       r.y_count,
        "z_count":       r.z_count,
        "dl_y_count":    r.dl_y_count,
        "dl_layer_count": r.dl_layer_count,
        # 产量统计
        "scsl":             r.scsl,
        "ok_count":         r.ok_count,
        "ng_count":         r.ng_count,
        "weight_limit_low":  r.weight_limit_low,
        "weight_limit_high": r.weight_limit_high,
        # 7路称重
        "czjg1": r.czjg1,
        "czjg2": r.czjg2,
        "czjg3": r.czjg3,
        "czjg4": r.czjg4,
        "czjg5": r.czjg5,
        "czjg6": r.czjg6,
        "czjg7": r.czjg7,
        # 工艺参数
        "tcgd": r.tcgd,
        "cxyl": r.cxyl,
        "xygd": r.xygd,
        "xyyl": r.xyyl,
        "zfgd": r.zfgd,
        "yzgd": r.yzgd,
        "cpdz": r.cpdz,
        "cxjp": r.cxjp,
        "qmpl": r.qmpl,
        "fdl":  r.fdl,
        "yzsd": r.yzsd,
        "tmsd": r.tmsd,
        "bysj": r.bysj,
        "dyjl": r.dyjl,
        "dyzt": r.dyzt,
        # 伺服电流
        "scsfdl": r.scsfdl,
        "zmsfdl": r.zmsfdl,
    }


def _normalize_value(v):
    if isinstance(v, Decimal):
        return float(v)
    if hasattr(v, "isoformat"):
        return v.isoformat()
    if isinstance(v, (bytes, bytearray)):
        return v.decode(errors="ignore")
    return v


def _normalize_label(v):
    return str(v).replace(" ", "").replace("\t", "").strip().lower()


def _load_mapping(cur):
    cur.execute(JDBC_MAPPING_SQL)
    rows = cur.fetchall()
    mapping = {}
    display = {}
    for alias, real_name in rows:
        if alias and real_name:
            alias_key = _normalize_label(alias)
            real_raw = str(real_name).strip()
            real_key = _normalize_label(real_raw)
            mapped = CHINESE_FIELD_MAP.get(real_key, real_raw.lower())
            mapping[alias_key] = mapped
            display[alias_key] = real_raw
    return mapping, display


def _ensure_record_identity(item):
    if "recorded_at" in item and isinstance(item["recorded_at"], str):
        try:
            dt = datetime.fromisoformat(item["recorded_at"])
            item["id"] = int(dt.timestamp() * 1000)
        except Exception:
            pass
    if "recorded_at" in item and hasattr(item["recorded_at"], "isoformat"):
        dt = item["recorded_at"]
        item["recorded_at"] = dt.isoformat()
        item["id"] = int(dt.timestamp() * 1000)
    if "id" not in item and "recorded_at" in item and isinstance(item["recorded_at"], str):
        try:
            dt = datetime.strptime(item["recorded_at"], "%Y-%m-%d %H:%M:%S")
            item["recorded_at"] = dt.isoformat()
            item["id"] = int(dt.timestamp() * 1000)
        except Exception:
            pass
    if "gw_id" not in item and "sn" in item:
        item["gw_id"] = item["sn"]
    return item


def _jdbc_fetch(limit: int = 100):
    conn = None
    cur = None
    try:
        conn = jaydebeapi.connect(JDBC_DRIVER, JDBC_URL, [JDBC_USER, JDBC_PASSWORD], JDBC_JAR)
        cur = conn.cursor()
        mapping, display = _load_mapping(cur)
        cur.execute(JDBC_SQL.format(limit=limit))
        rows = cur.fetchall()
        cols = [d[0] for d in cur.description] if cur.description else []
        return cols, rows, mapping, display, None
    except Exception as e:
        logger.error(f"JDBC 查询失败: {e}")
        return [], [], {}, {}, str(e)
    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def get_jdbc_records(limit: int = 100):
    cols, rows, mapping, _, err = _jdbc_fetch(limit=limit)
    if err or not rows:
        return []
    result = []
    for row in rows:
        item = {}
        for i, col in enumerate(cols):
            key = str(col).strip().lower()
            target = mapping.get(key) or FALLBACK_FIELD_MAP.get(key) or key
            item[target] = _normalize_value(row[i])
        result.append(_ensure_record_identity(item))
    result = list(reversed(result))
    return merge_history_records(result)


@router.get("/latest")
async def get_latest(db: Session = Depends(get_db)):
    jdbc_records = get_jdbc_records(limit=1)
    if jdbc_records:
        return {"data": jdbc_records[-1]}
    records = (
        db.query(PressData)
        .order_by(PressData.id.desc())
        .limit(100)
        .all()
    )
    if not records:
        return {"data": None, "message": "暂无数据"}
    records = [_record_to_dict(r) for r in reversed(records)]
    merged = merge_history_records(records)
    return {"data": merged[-1] if merged else None}


@router.get("/history")
async def get_history(
    limit: int = Query(default=100, le=1000),
    db: Session = Depends(get_db)
):
    jdbc_records = get_jdbc_records(limit=limit)
    if jdbc_records:
        return {
            "data": jdbc_records,
            "total": len(jdbc_records),
        }
    records = (
        db.query(PressData)
        .order_by(PressData.id.desc())
        .limit(limit)
        .all()
    )
    records = list(reversed(records))
    records = [_record_to_dict(r) for r in records]
    merged = merge_history_records(records)
    return {
        "data":  merged,
        "total": len(merged),
    }


@router.get("/jdbc")
async def get_jdbc_data():
    cols, rows, mapping, display_headers, err = _jdbc_fetch(limit=100)
    if err:
        return {"columns": [], "rows": [], "error": err, "total": 0, "limit": 100}
    result = []
    for row in rows:
        item = {}
        for i, col in enumerate(cols):
            item[col] = _normalize_value(row[i])
        result.append(item)
    return {
        "columns": cols,
        "headers": display_headers,
        "rows": result,
        "total": len(result),
        "limit": 100,
    }

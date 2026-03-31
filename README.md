# 春保森拉天时 · 工业AI应用平台 POC

> 磨压机 Y4 设备智能监控与AI分析系统 | 智能制造可行性验证项目

---

## 📁 项目结构

```
AI_Demo/
├── backend/                    # FastAPI 后端服务
│   ├── main.py                 # 主入口
│   ├── database.py             # SQLite ORM（模拟 LongDB）
│   ├── models.py               # MQTT 数据格式 Pydantic 模型
│   ├── requirements.txt        # Python 依赖
│   ├── routers/
│   │   ├── data.py             # 数据收发 API（含JDBC查询）
│   │   ├── ai.py               # AI 分析 API
│   │   └── ws.py               # WebSocket 实时推送
│   └── ai/
│       ├── anomaly.py          # Isolation Forest 异常检测（6维特征）
│       ├── quality.py          # RandomForest 良率预测（11维特征）
│       ├── health.py           # 健康评分（规则+统计，4维评分）
│       └── trend.py            # 线性回归趋势预测（4通道）
├── simulator/
│   └── device_simulator.py    # 磨压机PLC数据模拟器
├── frontend/                   # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx             # 主应用（WebSocket + 四导航菜单）
│   │   ├── index.css           # 工业SCADA风深色主题
│   │   └── components/
│   │       ├── Dashboard.jsx   # SVG 仪表盘 + 产量统计
│   │       ├── TrendChart.jsx  # Recharts 实时曲线
│   │       ├── WeightTrendChart.jsx # 重量趋势图
│   │       ├── StatusPanel.jsx # 设备状态 + 健康评分环
│   │       ├── AIResults.jsx   # AI 分析结果面板
│   │       ├── RootCausePanel.jsx # 不良定位与建议
│   │       ├── WeightPanel.jsx # 7路称重面板
│   │       ├── ParetoChart.jsx # 帕累托分析图
│   │       ├── RuleEngineAssistant.jsx # 规则引擎助手
│   │       ├── DeviceListPanel.jsx # 设备列表面板
│   │       └── AlarmPanel.jsx  # 报警记录列表
│   ├── package.json
│   └── vite.config.js
├── start_backend.bat           # ①一键启动后端
├── start_simulator.bat         # ②一键启动模拟器
├── start_frontend.bat          # ③一键启动前端
└── start_all.bat              # 一键启动全部服务
```

---

## 🚀 快速启动（三个独立终端窗口）

### 第①步 - 启动后端
```bash
# 双击 start_backend.bat 或在终端执行：
cd backend
pip install -r requirements.txt
python main.py
```
✅ 后端运行在 **http://localhost:8000**  
📖 API 文档：**http://localhost:8000/api/docs**

### 第②步 - 启动模拟器（后端就绪后）
```bash
# 双击 start_simulator.bat 或：
cd simulator
python device_simulator.py
```
✅ 模拟器每秒向后端 POST 一帧磨压机数据

### 第③步 - 启动前端
```bash
# 双击 start_frontend.bat 或：
cd frontend
npm install
npm run dev
```
✅ 打开浏览器访问 **http://localhost:5173**

---

## 🔌 API 接口清单

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/data` | 接收MQTT格式设备数据 |
| `GET` | `/api/data/latest` | 查询最新一条（优先JDBC） |
| `GET` | `/api/data/history` | 查询历史数据（query: `limit`） |
| `GET` | `/api/data/jdbc` | 查询JDBC实时数据表 |
| `GET` | `/api/ai/anomaly` | Isolation Forest 异常检测 |
| `GET` | `/api/ai/quality` | Random Forest 良率预测 |
| `GET` | `/api/ai/health` | 设备健康评分 |
| `GET` | `/api/ai/trend` | 多通道趋势预测 |
| `GET` | `/api/devices` | 设备列表 |
| `WS` | `/ws/realtime` | WebSocket 实时推送 |

---

## 🧠 AI 模块说明

| 模块 | 算法 | 输入特征 | 输出 |
|------|------|----------|------|
| 异常检测 | Isolation Forest | cxyl, cxjp, scsfdl, zmsfdl, cz_weight_std, cz_weight_mean (6维) | 异常标签(-1/1) + 得分 + 特征值 |
| 良率预测 | Random Forest Regressor | tcgd, yzgd, cxyl, bysj, yzsd, tmsd, cxjp, scsfdl, zmsfdl, cz_weight_mean (10维) | 预测良率(0~1) + 质量等级 + 特征重要性 |
| 健康评分 | 规则+统计 | cxyl稳定性, cxjp稳定性, scsfdl, zmsfdl, 报警率 (5维) | 0~100综合评分 + 老化预警 + 分项得分 |
| 趋势预测 | Linear Regression | cxyl, cxjp, scsfdl, zmsfdl 历史序列 | 未来10步预测值 + 趋势判断 + 斜率 |

### AI模型更新机制

- **增量学习**：异常检测模型在每次分析后自动增量更新（`incremental_fit`）
- **基线预训练**：所有模型在初始化时使用正常工况基线数据预训练，避免冷启动
- **滑动窗口**：健康评分使用最近60条数据，趋势预测支持可变窗口

---

## 📡 数据流链路

```
磨压机Y4（PLC KV-310）/ 实际产线SpliceDB
    ↓ 模拟采集（每秒）/ JDBC实时查询
MQTT Broker / JDBC Server
    ↓ MQTT消息 / JDBC ResultSet
device_simulator.py / data.py(JDBC)
    ↓ HTTP POST /api/data 或 直接JDBC查询
FastAPI 后端
    ├── SQLite 入库（industrial_data.db）
    ├── AI 引擎分析（Isolation Forest / RandomForest / Linear Regression）
    └── WebSocket 推送 → React 前端看板
                              ├── 驾驶舱仪表盘（压力/节拍/伺服电流/称重）
                              ├── 实时趋势曲线（含AI多通道预测叠加）
                              ├── 重量趋势分析（7路称重曲线）
                              ├── 帕累托分析（工艺参数相关性）
                              ├── 规则引擎助手（故障诊断与建议）
                              ├── 设备列表（多设备监控）
                              ├── 健康评分圆环
                              ├── AI 检测结果
                              └── 报警记录
```

---

## 🎨 前端功能

### 导航菜单系统
系统提供四大功能模块：
- **驾驶舱**：核心监控面板，包含仪表盘、趋势图、设备状态、重量趋势
- **数据分析**：帕累托分析、重量趋势图表
- **AI分析场景**：AI结果展示、不良定位与建议、规则引擎助手
- **实时数据表**：JDBC实时数据查询表格

### 核心功能列表
- **工业SCADA风深色主题**（Orbitron字体 + 蓝绿发光效果）
- **SVG半圆仪表盘**（成型压力/单位压力/成型节拍，阈值变红）
- **实时趋势曲线**（可切换4个指标，含AI压力预测叠加）
- **重量趋势图表**（7路称重数据可视化）
- **健康评分圆环**（带分项评分条形图 + 老化预警）
- **不良定位与建议**（AI驱动的根因分析与操作建议）
- **帕累托分析**（80/20法则不良分类统计）
- **规则引擎助手**（基于规则的质量优化建议）
- **实时数据表**（JDBC外部数据库查询）
- **报警记录**（自动滚动，异常高亮闪烁）
- **WebSocket实时更新**（自动重连）

---

## ⚙️ 技术栈

| 层 | 技术 |
|----|------|
| 后端 | Python 3.10+ / FastAPI / Uvicorn |
| 数据库 | SQLite（SQLAlchemy ORM） |
| 外部数据源 | JDBC / jaydebeapi |
| AI | scikit-learn（IsolationForest + RandomForest + LinearRegression） |
| 实时推送 | WebSocket |
| 前端 | React 18 + Vite 5 |
| 图表 | Recharts |

---

*春保森拉天时智能制造POC v2.0*
| JDBC | jaydebeapi + db-client-3.0.3.2403.jar |

---

*春保森拉天时智能制造POC v2.0*

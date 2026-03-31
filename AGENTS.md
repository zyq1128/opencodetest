# 春保森拉天时工业AI平台 Agent 指南

> 磨压机 Y4 设备智能监控与AI分析系统 POC

---

## 项目结构

```
AI_Demo/
├── backend/                    # FastAPI Python 后端
│   ├── main.py                 # FastAPI 入口文件
│   ├── database.py             # SQLAlchemy ORM 模型
│   ├── models.py               # Pydantic 数据模型
│   ├── requirements.txt        # Python 依赖包
│   ├── routers/                # API 路由
│   │   ├── data.py             # 数据接口
│   │   ├── ai.py               # AI 分析接口
│   │   └── ws.py               # WebSocket 接口
│   └── ai/                     # AI 模块
│       ├── anomaly.py          # 孤立森林异常检测
│       ├── quality.py          # 随机森林质量预测
│       ├── health.py           # 健康评分
│       └── trend.py            # 线性回归趋势预测
├── frontend/                   # React + Vite 前端
│   ├── src/
│   │   ├── App.jsx             # 主应用组件
│   │   ├── index.css           # 全局样式（SCADA 主题）
│   │   └── components/         # React 组件
│   ├── package.json
│   └── vite.config.js          # Vite 配置（含代理）
└── simulator/                  # 设备数据模拟器
    └── device_simulator.py
```

---

## 构建/代码检查/测试命令

### 前端（React + Vite）

```bash
cd frontend

# 安装依赖
npm install

# 开发服务器（含后端代理）
npm run dev          # 运行在 http://localhost:5173

# 生产构建
npm run build        # 输出到 dist/ 目录

# 预览生产构建
npm run preview
```

### 后端（FastAPI + Python）

```bash
cd backend

# 创建虚拟环境（如果不存在）
python -m venv .venv

# 激活虚拟环境
# Windows:
.venv\Scripts\activate
# Linux/Mac:
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 运行开发服务器
python main.py       # 运行在 http://localhost:8000

# API 文档地址：
# - http://localhost:8000/api/docs (Swagger UI)
# - http://localhost:8000/api/redoc (ReDoc)
```

### 运行测试

**注意**：本项目目前未配置测试文件。

如果添加了测试：

```bash
# Python 测试（如果配置了 pytest）
pytest

# 前端测试（如果添加了）
npm test
```

---

## 代码风格指南

### Python（后端）

**导入顺序**：按以下顺序分组导入：
1. 标准库（`sys`, `os`, `logging`）
2. 第三方库（`fastapi`, `sqlalchemy`, `pydantic`）
3. 本地模块（来自 `database`, `models`, `routers`）

```python
# 标准库
import sys
import os
import logging
from datetime import datetime

# 第三方库
from fastapi import FastAPI
from sqlalchemy import create_engine
from pydantic import BaseModel

# 本地模块
from database import init_db
from models import RegVal
```

**命名约定**：
- 模块：`snake_case.py`
- 类：`PascalCase`
- 函数/变量：`snake_case`
- 常量：`UPPER_SNAKE_CASE`

**类型提示**：为函数参数和返回值使用类型提示：

```python
def get_mean(arr: list[float]) -> float:
    return sum(arr) / len(arr) if arr else 0.0
```

**文档字符串**：为模块和类使用三引号文档字符串：

```python
"""
AI 异常检测模块
使用孤立森林进行离群点检测。
"""
```

**错误处理**：使用 try/except 捕获特定异常：

```python
try:
    result = risky_operation()
except ValueError as e:
    logger.error(f"无效值：{e}")
    raise
```

### JavaScript/React（前端）

**导入**：使用 ES6 导入，按以下顺序分组：
1. React 和 hooks
2. 第三方库
3. 本地组件
4. 样式文件

```javascript
import React, { useState, useEffect } from 'react'
import { LineChart, Line } from 'recharts'
import Dashboard from './components/Dashboard.jsx'
import './index.css'
```

**命名约定**：
- 组件：`PascalCase.jsx`
- 函数/变量：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- CSS 类：`kebab-case`

**组件结构**：使用带 hooks 的函数组件：

```javascript
export default function Dashboard({ data }) {
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    // 副作用
  }, [data])
  
  return (
    <div className="dashboard">
      {/* JSX */}
    </div>
  )
}
```

**样式**：动态值使用内联样式，静态值使用 CSS 类：

```javascript
// 动态值使用内联样式
<div style={{ color: isAlarm ? '#f87171' : '#34d399' }}>

// 静态值使用 CSS 类（来自 index.css）
<div className="card">
```

**Props 解构**：在函数参数中解构 props：

```javascript
function KpiCard({ label, value, unit, alarm = false })
```

**错误边界**：关键组件使用类组件错误边界：

```javascript
class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError(error) { return { hasError: true } }
  componentDidCatch(error, info) { console.error(error, info) }
  render() { return this.state.hasError ? <Fallback /> : this.props.children }
}
```

---

## 技术栈

### 后端
- **框架**：FastAPI（异步 Python）
- **数据库**：SQLite（通过 SQLAlchemy ORM）
- **AI/机器学习**：scikit-learn（孤立森林、随机森林、线性回归）
- **实时通信**：WebSocket（原生 Python `websockets`）
- **数据验证**：Pydantic v2

### 前端
- **框架**：React 18（函数组件 + hooks）
- **构建工具**：Vite 5
- **图表库**：Recharts
- **样式**：CSS（工业 SCADA 深色主题）
- **HTTP/WebSocket**：原生 fetch + WebSocket API

---

## API 接口

| 方法 | 路径 | 描述 |
|--------|------|-------------|
| `POST` | `/api/data` | 接收设备数据（MQTT 格式） |
| `GET` | `/api/data/latest` | 获取最新数据记录（优先级：JDBC > SQLite） |
| `GET` | `/api/data/history` | 获取历史数据（查询参数：`limit`） |
| `GET` | `/api/data/jdbc` | 查询 JDBC 实时数据表 |
| `GET` | `/api/ai/anomaly` | 异常检测（孤立森林） |
| `GET` | `/api/ai/quality` | 质量预测（随机森林） |
| `GET` | `/api/ai/health` | 健康评分 |
| `GET` | `/api/ai/trend` | 趋势预测（线性回归） |
| `GET` | `/api/devices` | 设备列表 |
| `WS` | `/ws/realtime` | WebSocket 实时流 |

---

## 开发工作流程

### 启动全套服务（Windows）

在 Windows 上，您可以使用提供的批处理文件快速启动：
- `start_backend.bat`：启动后端服务器
- `start_simulator.bat`：启动设备模拟器
- `start_frontend.bat`：启动前端开发服务器
- `start_all.bat`：启动所有服务（需要多个终端）

### 手动启动（跨平台）

1. **后端**（终端 1）：
   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate  # Windows
   # source .venv/bin/activate  # Linux/Mac
   pip install -r requirements.txt
   python main.py
   ```

2. **模拟器**（终端 2 - 可选，用于生成模拟数据）：
   ```bash
   cd simulator
   python device_simulator.py
   ```

3. **前端**（终端 3）：
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

访问应用：`http://localhost:5173`

---

## Agent 注意事项

- **无现有测试套件**：实现新功能时请添加测试
- **未配置代码检查**：考虑为前端添加 ESLint/Prettier，为后端添加 flake8/black
- **SQLite 数据库**：`industrial_data.db` 会在首次运行时自动创建
- **工业 SCADA 主题**：深蓝色（#0b1220 背景）、青色（#38bdf8）强调色、Orbitron 数字字体
- **中文语言**：所有 UI 标签和注释均为中文
- **实时性**：大量使用 WebSocket 进行实时数据传输，使用 React hooks 进行状态管理

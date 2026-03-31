import React, { useState, useEffect, useRef, useCallback, Component } from 'react'
import Dashboard from './components/Dashboard.jsx'
import TrendChart from './components/TrendChart.jsx'
import StatusPanel from './components/StatusPanel.jsx'
import AIResults from './components/AIResults.jsx'
import AlarmPanel from './components/AlarmPanel.jsx'
import WeightPanel from './components/WeightPanel.jsx'
import ParetoChart from './components/ParetoChart.jsx'
import WeightTrendChart from './components/WeightTrendChart.jsx'
import RuleEngineAssistant from './components/RuleEngineAssistant.jsx'

import DeviceListPanel from './components/DeviceListPanel.jsx'

const WS_URL = 'ws://127.0.0.1:8000/ws/realtime'
const API_BASE = 'http://127.0.0.1:8000'
const MAX_HISTORY = 120
const MAX_ALARMS = 50

const getMean = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
const getStd = (arr) => {
    if (arr.length < 2) return 0
    const mean = getMean(arr)
    const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length
    return Math.sqrt(variance)
}
const getSeries = (history, key, limit = 20) => {
    const slice = history.slice(-limit)
    return slice.map(h => h?.[key]).filter(v => v != null && isFinite(v))
}

function RootCausePanel({ latest = {}, history = [], ai = {} }) {
    const prev = history.length > 1 ? history[history.length - 2] : null
    const badIncreased = (latest?.ng_count ?? 0) > (prev?.ng_count ?? 0)
    const predictedBad = (ai?.quality?.predicted_bad_rate ?? 0) >= 0.1
    const anomaly = ai?.anomaly?.is_anomaly === true
    const badFlag = badIncreased || predictedBad || anomaly

    const causes = []
    const actions = new Set()
    const addCause = (title, detail, action) => {
        causes.push({ title, detail })
        if (action) actions.add(action)
    }

    if (isFinite(latest?.cxyl) && latest.cxyl > 205)
        addCause('成型压力偏高', `当前 ${latest.cxyl.toFixed(1)} MPa`, '下调成型压力设定，检查压力传感与闭环控制')
    if (isFinite(latest?.cxjp) && latest.cxjp > 5.5)
        addCause('成型节拍偏高', `当前 ${latest.cxjp.toFixed(2)} s`, '优化节拍与润滑状态，检查送料节奏')

    if (isFinite(latest?.scsfdl) && latest.scsfdl > 12)
        addCause('上冲伺服电流偏高', `当前 ${latest.scsfdl.toFixed(2)} A`, '检查模具磨损与润滑，必要时更换模具')
    if (isFinite(latest?.zmsfdl) && latest.zmsfdl > 10)
        addCause('中模伺服电流偏高', `当前 ${latest.zmsfdl.toFixed(2)} A`, '检查脱模阻力与模具状态，必要时更换模具')

    const weights = [1, 2, 3, 4, 5, 6, 7].map(i => latest?.[`czjg${i}`]).filter(v => v && v > 0 && isFinite(v))
    const meanW = getMean(weights)
    const stdW = getStd(weights)
    const wLow = latest?.weight_limit_low ?? 42
    const wHigh = latest?.weight_limit_high ?? 49
    if (weights.length && (meanW < wLow || meanW > wHigh))
        addCause('称重均值偏离', `均值 ${meanW.toFixed(2)} g`, '调整装粉高度与填充高度，校验称重系统')
    if (weights.length && stdW > 0.6)
        addCause('称重离散偏大', `标准差 ${stdW.toFixed(2)} g`, '检查送料稳定性与模具间隙')

    const addDeviation = (key, label, unit, pct, action) => {
        const series = getSeries(history, key)
        const mean = getMean(series)
        if (!isFinite(latest?.[key]) || !mean) return
        const diff = Math.abs(latest[key] - mean) / mean
        if (diff >= pct)
            addCause(`${label}波动偏大`, `当前 ${latest[key].toFixed(2)} ${unit}`, action)
    }
    addDeviation('tcgd', '填充高度', 'mm', 0.06, '微调填充高度并检查送料一致性')
    addDeviation('zfgd', '装粉高度', 'mm', 0.06, '微调装粉高度并检查送料一致性')
    addDeviation('yzgd', '压制高度', 'mm', 0.06, '校正压制高度设定，检查行程控制')
    addDeviation('cpdz', '产品单重', 'g', 0.05, '校核产品单重与称重系统')

    const topFeatures = ai?.quality?.top_features ?? []
    const actionsList = Array.from(actions)

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">不良定位与建议</span>
                <span style={{ fontSize: 10, color: badFlag ? '#f87171' : '#34d399', fontWeight: 600 }}>
                    {badFlag ? '已触发不良/异常' : '未触发不良'}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {badFlag ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                        {(causes.length ? causes : topFeatures.map(f => ({ title: f.feature, detail: `重要性 ${(f.importance * 100).toFixed(1)}%` }))).slice(0, 4).map(c => (
                            <div key={c.title} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(248,113,113,0.15)' }}>
                                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>{c.title}</div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>{c.detail}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: 11, color: '#4a758f' }}>持续监控中，未检测到不良触发信号。</div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10, color: '#4a758f', fontWeight: 600 }}>建议操作</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {(actionsList.length ? actionsList : ['关注关键参数波动，必要时复核模具与工艺设定']).slice(0, 4).map(a => (
                            <span key={a} style={{ fontSize: 10, color: '#cbd5e1', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 999, padding: '2px 8px' }}>
                                {a}
                            </span>
                        ))}
                    </div>
                </div>

                {topFeatures.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div style={{ fontSize: 10, color: '#4a758f', fontWeight: 600 }}>AI 主要影响因子</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                            {topFeatures.slice(0, 4).map(f => (
                                <div key={f.feature} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#94a3b8' }}>
                                    <span>{f.feature}</span>
                                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>{(f.importance * 100).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

class ErrorBoundary extends Component {
    constructor(props) { super(props); this.state = { hasError: false, error: null } }
    static getDerivedStateFromError(error) { return { hasError: true, error } }
    componentDidCatch(error, info) { console.error('Dashboard error:', error, info) }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    padding: 16, background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)',
                    borderRadius: 8, color: '#f87171', fontSize: 12,
                }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>⚠ 组件渲染错误</div>
                    <div style={{ color: '#64748b', fontSize: 10 }}>{this.state.error?.message}</div>
                </div>
            )
        }
        return this.props.children
    }
}

function useCurrentTime() {
    const [time, setTime] = useState(new Date())
    useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id) }, [])
    return time
}

const EMPTY_AI = { anomaly: {}, quality: {}, health: {}, trend: {} }
const isEmptyValue = (v) => v == null || (typeof v === 'string' && v.trim() === '')
const mergeLatest = (prev, next) => {
    if (!prev || Object.keys(prev).length === 0) return next || {}
    const merged = { ...prev }
    Object.entries(next || {}).forEach(([k, v]) => {
        if (isEmptyValue(v)) return
        merged[k] = v
    })
    return merged
}

export default function App() {
    const [wsStatus, setWsStatus] = useState('connecting')
    const [latest, setLatest] = useState({})
    const [history, setHistory] = useState([])
    const [ai, setAi] = useState(EMPTY_AI)
    const [alarms, setAlarms] = useState([])
    const [jdbcRows, setJdbcRows] = useState([])
    const [jdbcColumns, setJdbcColumns] = useState([])
    const [jdbcLoading, setJdbcLoading] = useState(false)
    const [jdbcError, setJdbcError] = useState('')
    const [jdbcUpdatedAt, setJdbcUpdatedAt] = useState(null)
    const [jdbcHeaders, setJdbcHeaders] = useState({})
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [activeMenu, setActiveMenu] = useState('dashboard')
    const wsRef = useRef(null)
    const reconnectTimer = useRef(null)
    const latestRef = useRef({})
    const now = useCurrentTime()

    const buildAlarms = useCallback((d, newAi) => {
        const msgs = [], t = Date.now()
        // 成型压力超限
        if ((d?.cxyl ?? 0) > 205)
            msgs.push({ time: t, message: `成型压力超限：${(+d.cxyl).toFixed(1)} MPa（上限 205.0 MPa）`, type: 'error' })
        // 节拍超时
        if ((d?.cxjp ?? 0) > 5.5)
            msgs.push({ time: t, message: `成型节拍超时：${(+d.cxjp).toFixed(2)} s（上限 5.50 s）`, type: 'error' })
        // 模压机报警
        if (d?.myj_alarm === 1)
            msgs.push({ time: t, message: '模压机报警触发', type: 'error' })
        // 机械手报警
        if (d?.jxs_alarm === 1)
            msgs.push({ time: t, message: '机械手报警触发', type: 'warning' })
        // 称重超限
        const low = d?.weight_limit_low ?? 42, high = d?.weight_limit_high ?? 49
        for (let i = 1; i <= 7; i++) {
            const w = d?.[`czjg${i}`]
            if (w && w > 0 && (w < low || w > high))
                msgs.push({ time: t, message: `${i}#称重超限：${w.toFixed(1)} g（规格 ${low}~${high} g）`, type: 'warning' })
        }
        // 上冲伺服电流异常
        if ((d?.scsfdl ?? 0) > 12)
            msgs.push({ time: t, message: `上冲伺服电流异常：${(+d.scsfdl).toFixed(2)} A（上限 12.0 A）`, type: 'warning' })
        // AI异常检测
        if (newAi?.anomaly?.is_anomaly)
            msgs.push({ time: t, message: `AI异常检测触发 | 评分 ${Math.abs(newAi.anomaly.anomaly_score ?? 0).toFixed(4)}`, type: 'error' })
        // 老化预警
        if (newAi?.health?.aging_warning)
            msgs.push({ time: t, message: `设备老化预警（斜率 ${(newAi.trend?.slope ?? 0).toFixed(3)} /采样）`, type: 'warning' })
        if (msgs.length > 0)
            setAlarms(prev => [...prev, ...msgs].slice(-MAX_ALARMS))
    }, [])

    const connect = useCallback(() => {
        if (wsRef.current) wsRef.current.close()
        setWsStatus('connecting')
        const ws = new WebSocket(WS_URL)
        wsRef.current = ws
        ws.onopen = () => {
            setWsStatus('connected')
            if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null }
        }
        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data)
                if (data.type !== 'realtime') return
                const newLatest = (data.latest && Object.keys(data.latest).length > 0) ? data.latest : null
                const newAi = data.ai || EMPTY_AI
                if (newLatest) {
                    const mergedLatest = mergeLatest(latestRef.current, newLatest)
                    latestRef.current = mergedLatest
                    setLatest(mergedLatest)
                    setHistory(prev => {
                        if (mergedLatest.id && (prev.length === 0 || prev[prev.length - 1].id !== mergedLatest.id))
                            return [...prev, mergedLatest].slice(-MAX_HISTORY)
                        return prev
                    })
                    buildAlarms(mergedLatest, newAi)
                }
                setAi(newAi)
            } catch (e) { console.error('WS parse error', e) }
        }
        ws.onclose = () => { setWsStatus('disconnected'); reconnectTimer.current = setTimeout(() => connect(), 3000) }
        ws.onerror = () => setWsStatus('disconnected')
    }, [buildAlarms])

    useEffect(() => { connect(); return () => { wsRef.current?.close(); if (reconnectTimer.current) clearTimeout(reconnectTimer.current) } }, [connect])
    useEffect(() => { latestRef.current = latest }, [latest])

    const fetchJdbcData = useCallback(async () => {
        setJdbcLoading(true)
        setJdbcError('')
        try {
            const res = await fetch(`${API_BASE}/api/data/jdbc`)
            const json = await res.json()
            if (!res.ok || json.error) throw new Error(json.error || res.statusText)
            setJdbcColumns(Array.isArray(json.columns) ? json.columns : [])
            setJdbcRows(Array.isArray(json.rows) ? json.rows : [])
            setJdbcHeaders(json.headers && typeof json.headers === 'object' ? json.headers : {})
            setJdbcUpdatedAt(new Date())
        } catch (e) {
            setJdbcError(e?.message || '加载失败')
        } finally {
            setJdbcLoading(false)
        }
    }, [])

    useEffect(() => {
        if (activeMenu !== 'realtime') return
        fetchJdbcData()
        const id = setInterval(fetchJdbcData, 5000)
        return () => clearInterval(id)
    }, [activeMenu, fetchJdbcData])

    const anyAlarm = Number(latest?.myj_alarm ?? 0) === 1 || Number(latest?.jxs_alarm ?? 0) === 1

    const menus = [
        { key: 'dashboard', label: '驾驶舱' },
        { key: 'data', label: '数据分析' },
        { key: 'ai', label: 'AI分析场景' },
        { key: 'realtime', label: '实时数据表' },
    ]

    const renderMainPage = () => (
        <div className="app-body">
            <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr 280px', gap: 14, marginBottom: 14 }}>
                <ErrorBoundary><Dashboard data={latest} /></ErrorBoundary>
                <ErrorBoundary><TrendChart history={history} trend={ai?.trend} /></ErrorBoundary>
                <ErrorBoundary><StatusPanel data={latest} health={ai?.health} /></ErrorBoundary>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 280px', gap: 14 }}>
                <ErrorBoundary><AIResults ai={ai} /></ErrorBoundary>
                <ErrorBoundary><WeightPanel data={latest} /></ErrorBoundary>
                <ErrorBoundary><AlarmPanel alarms={alarms} /></ErrorBoundary>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center', fontSize: 10, color: '#2d4a60', letterSpacing: 0.5 }}>
                春保森拉天时 · 智能制造 POC v2.0 · AI: IsolationForest(6D) + RandomForest(10D) + LinearRegression(4CH)
            </div>
        </div>
    )

    const renderDataPage = () => (
        <div className="app-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <ErrorBoundary><ParetoChart data={latest} history={history} /></ErrorBoundary>
            </div>
        </div>
    )

    const renderAiPage = () => (
        <div className="app-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <ErrorBoundary><AIResults ai={ai} /></ErrorBoundary>
                <ErrorBoundary><RootCausePanel latest={latest} history={history} ai={ai} /></ErrorBoundary>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
                <ErrorBoundary><RuleEngineAssistant latest={latest} history={history} /></ErrorBoundary>
            </div>
        </div>
    )

    const renderRealtimePage = () => (
        <div className="app-body">
            <div className="card">
                <div className="card-header">
                    <span className="card-title">实时数据表</span>
                    <span style={{ fontSize: 10, color: '#4a758f' }}>当前只显示最新的100条数据</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#4a758f' }}>
                        {jdbcUpdatedAt ? `刷新时间 ${jdbcUpdatedAt.toLocaleTimeString('zh-CN')}` : '等待刷新'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {jdbcLoading && <span style={{ fontSize: 10, color: '#94a3b8' }}>加载中...</span>}
                        {jdbcError && <span style={{ fontSize: 10, color: '#f87171' }}>{jdbcError}</span>}
                    </div>
                </div>
                {jdbcColumns.length === 0 ? (
                    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4a758f' }}>
                        暂无数据
                    </div>
                ) : (
                    <div style={{ maxHeight: 520, overflow: 'auto', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 6 }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, tableLayout: 'auto' }}>
                            <thead>
                                <tr>
                                    {jdbcColumns.map(col => (
                                        <th key={col} style={{
                                            position: 'sticky', top: 0, background: '#0d1d30',
                                            textAlign: String(col).trim().toLowerCase() === 'ts' ? 'left' : 'center',
                                            padding: '8px 10px', color: '#94a3b8', whiteSpace: 'nowrap',
                                            borderBottom: '1px solid rgba(255,255,255,0.08)',
                                        }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                <span>{jdbcHeaders?.[String(col).trim().toLowerCase()] ?? col}</span>
                                                <span style={{ fontSize: 9, color: '#4a758f' }}>{String(col).trim()}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {jdbcRows.map((row, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        {jdbcColumns.map(col => (
                                            <td key={col} style={{
                                                padding: '6px 10px', color: '#cbd5e1',
                                                textAlign: String(col).trim().toLowerCase() === 'ts' ? 'left' : 'center',
                                            }}>
                                                {row?.[col] ?? ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )

    const renderDashboardPage = () => (
        <div className="app-body">
            <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr 280px', gap: 14, marginBottom: 14 }}>
                <ErrorBoundary><Dashboard data={latest} showKpi={false} /></ErrorBoundary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <ErrorBoundary><TrendChart history={history} trend={ai?.trend} height={200} /></ErrorBoundary>
                    <ErrorBoundary><WeightTrendChart history={history} latest={latest} height={200} /></ErrorBoundary>
                </div>
                <ErrorBoundary><DeviceListPanel currentDevice={latest} /></ErrorBoundary>
            </div>
        </div>
    )

    return (
        <div className="app-shell">
            <header className="header">
                <div className="header-left">
                    <div style={{ width: 3, height: 32, background: 'linear-gradient(180deg, #38bdf8, #6366f1)', borderRadius: 2 }} />
                    <div>
                        <div className="header-logo">CBCERATIZIT</div>
                        <div className="header-title">工业AI智能监控平台</div>
                    </div>
                </div>
                <div className="header-right">
                    <div className="header-time">{now.toLocaleString('zh-CN', { hour12: false })}</div>
                    <div className={`ws-badge ${wsStatus === 'connected' ? 'connected' : 'disconnected'}`}>
                        <span className="ws-dot" />
                        {wsStatus === 'connected' ? 'LIVE' : wsStatus === 'connecting' ? '连接中...' : '已断线'}
                    </div>
                    {anyAlarm && (
                        <div style={{
                            fontSize: 11, fontWeight: 700, color: '#f87171',
                            background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)',
                            borderRadius: 6, padding: '4px 12px',
                            animation: 'alarm-blink 1s ease-in-out infinite',
                        }}>⚠ ALARM</div>
                    )}
                </div>
            </header>

            <div className={`app-main ${sidebarCollapsed ? 'collapsed' : ''}`}>
                <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
                    <div className="sidebar-header">
                        <span className="sidebar-title">导航</span>
                        <button
                            type="button"
                            className="sidebar-toggle"
                            onClick={() => setSidebarCollapsed(prev => !prev)}
                            aria-label={sidebarCollapsed ? '展开导航' : '收起导航'}
                        >
                            {sidebarCollapsed ? '»' : '«'}
                        </button>
                    </div>
                    <div className="sidebar-menu">
                        {menus.map(menu => (
                            <button
                                key={menu.key}
                                type="button"
                                className={`sidebar-item ${activeMenu === menu.key ? 'active' : ''}`}
                                onClick={() => setActiveMenu(menu.key)}
                            >
                                <span className="sidebar-dot" />
                                <span className="sidebar-label">{menu.label}</span>
                            </button>
                        ))}
                    </div>
                </aside>

                <div className="app-content">
                    {activeMenu === 'dashboard' ? renderDashboardPage() : activeMenu === 'data' ? renderDataPage() : activeMenu === 'ai' ? renderAiPage() : activeMenu === 'realtime' ? renderRealtimePage() : renderMainPage()}
                </div>
            </div>
        </div>
    )
}

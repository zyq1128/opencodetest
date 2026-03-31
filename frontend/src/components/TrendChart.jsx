import React, { useState } from 'react'
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts'

const CHART_OPTIONS = [
    { key: 'cxyl', label: '成型压力', unit: 'MPa', color: '#38bdf8', threshold: 205, yDecimals: 1, default: 175.0 },
    { key: 'cxjp', label: '成型节拍', unit: 's', color: '#a78bfa', threshold: 5.5, yDecimals: 2, default: 3.5 },
    { key: 'scsfdl', label: '上冲伺服电流', unit: 'A', color: '#34d399', threshold: 12.0, yDecimals: 2, default: 8.0 },
    { key: 'zmsfdl', label: '中模伺服电流', unit: 'A', color: '#fb923c', threshold: 10.0, yDecimals: 2, default: 6.0 },
]

const CustomTooltip = ({ active, payload, label, opt }) => {
    if (!active || !payload?.length) return null
    const p = payload[0]
    return (
        <div style={{
            background: '#0d1f35', border: '1px solid #1e3a5f',
            borderRadius: 6, padding: '8px 12px', fontSize: 11,
        }}>
            <div style={{ color: '#6b8fa8', marginBottom: 4, fontSize: 10 }}>{label}</div>
            {p && p.value != null && (
                <div style={{ color: p.color ?? opt.color, fontWeight: 600 }}>
                    实测: {Number(p.value).toFixed(opt.yDecimals)} {opt.unit}
                </div>
            )}
        </div>
    )
}

const yFmt = (dec) => (v) => (v == null || !isFinite(v)) ? '' : Number(v).toFixed(dec)

export default function TrendChart({ history = [], trend = {}, height = 220 }) {
    const [active, setActive] = useState('cxyl')
    const opt = CHART_OPTIONS.find(o => o.key === active) || CHART_OPTIONS[0]

    const recentHistory = history.slice(-60)
    let lastVal = null
    const chartData = recentHistory.map((r, i) => {
        const raw = isFinite(r[active]) ? r[active] : null
        const val = raw == null ? lastVal : raw
        if (val != null && isFinite(val)) lastVal = val
        return {
            ...r,
            time: r.recorded_at
                ? new Date(r.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : `${i + 1}`,
            [active]: isFinite(val) ? val : null,
        }
    })

    const allVals = chartData.map(d => d[active]).filter(v => v != null && isFinite(v))
    let dMin = opt.default * 0.8, dMax = opt.default * 1.2
    if (allVals.length) {
        const mn = Math.min(...allVals), mx = Math.max(...allVals)
        const rng = mx - mn || opt.default * 0.1
        const step = Math.ceil(rng / 4)
        dMin = Math.floor(mn / step) * step - step
        dMax = Math.ceil(mx / step) * step + step
    }
    if (opt.threshold && opt.threshold > dMax) dMax = opt.threshold + 5
    if (opt.threshold && opt.threshold < dMin) dMin = opt.threshold - 5

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
                <span className="card-title">实时趋势曲线</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#6b8fa8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span style={{ width: 14, height: 2, background: opt.color, display: 'inline-block', borderRadius: 1 }} />实测
                        </span>
                    </div>
                </div>
            </div>

            {/* Tab 切换 */}
            <div className="chart-tabs">
                {CHART_OPTIONS.map(o => (
                    <button key={o.key}
                        className={`chart-tab ${active === o.key ? 'active' : ''}`}
                        onClick={() => setActive(o.key)}
                        style={active === o.key ? { borderColor: o.color, color: o.color, background: `${o.color}18` } : {}}>
                        {o.label}（{o.unit}）
                    </button>
                ))}
            </div>

            {/* 图表 */}
            <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 8, right: 52, left: 4, bottom: 0 }}>
                        <defs>
                            <linearGradient id={`grad-${active}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={opt.color} stopOpacity={0.18} />
                                <stop offset="100%" stopColor={opt.color} stopOpacity={0.01} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#4a758f', fontSize: 9 }} tickLine={false}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval="preserveStartEnd" />
                        <YAxis domain={[dMin, dMax]} tickFormatter={yFmt(opt.yDecimals)}
                            tick={{ fill: '#4a758f', fontSize: 9 }} tickLine={false} axisLine={false}
                            width={48} unit={' ' + opt.unit} tickCount={5} />
                        <Tooltip content={<CustomTooltip opt={opt} />} />
                        <Area type="monotone" dataKey={active} stroke={opt.color} strokeWidth={2}
                            fill={`url(#grad-${active})`} dot={false}
                            activeDot={{ r: 4, fill: opt.color, strokeWidth: 0 }} connectNulls={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

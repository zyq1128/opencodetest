import React, { useMemo, useState } from 'react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const SCALE_OPTIONS = [
    { key: 'czjg1', label: '1#', color: '#38bdf8' },
    { key: 'czjg2', label: '2#', color: '#a78bfa' },
    { key: 'czjg3', label: '3#', color: '#34d399' },
    { key: 'czjg4', label: '4#', color: '#fb923c' },
    { key: 'czjg5', label: '5#', color: '#fbbf24' },
    { key: 'czjg6', label: '6#', color: '#60a5fa' },
    { key: 'czjg7', label: '7#', color: '#f87171' },
]

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
        <div style={{
            background: '#0d1f35', border: '1px solid #1e3a5f',
            borderRadius: 6, padding: '8px 12px', fontSize: 11,
        }}>
            <div style={{ color: '#6b8fa8', marginBottom: 4, fontSize: 10 }}>{label}</div>
            {payload.filter(p => p.value != null && isFinite(p.value)).map(p => (
                <div key={p.dataKey} style={{ color: p.color ?? '#94a3b8', fontWeight: 600 }}>
                    {p.name}: {Number(p.value).toFixed(1)} g
                </div>
            ))}
        </div>
    )
}

const yFmt = (dec) => (v) => (v == null || !isFinite(v)) ? '' : Number(v).toFixed(dec)

export default function WeightTrendChart({ history = [], latest = {}, height = 200 }) {
    const [visibleKeys, setVisibleKeys] = useState(SCALE_OPTIONS.map(o => o.key))

    const activeLatest = latest && Object.keys(latest).length ? latest : history[history.length - 1] || {}
    const low = Number(activeLatest?.weight_limit_low ?? 42)
    const high = Number(activeLatest?.weight_limit_high ?? 49)

    const recentHistory = history.slice(-60)
    const lastVals = {}
    const chartData = recentHistory.map((r, i) => {
        const row = {}
        SCALE_OPTIONS.forEach(o => {
            const raw = isFinite(r?.[o.key]) ? r[o.key] : null
            const val = raw == null ? lastVals[o.key] : raw
            if (val != null && isFinite(val)) lastVals[o.key] = val
            row[o.key] = isFinite(val) ? val : null
        })
        return {
            ...r,
            time: r.recorded_at
                ? new Date(r.recorded_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                : `${i + 1}`,
            ...row,
        }
    })

    const activeKeys = visibleKeys.length ? visibleKeys : SCALE_OPTIONS.map(o => o.key)
    const allVals = useMemo(() => {
        const vals = []
        chartData.forEach(d => {
            activeKeys.forEach(k => {
                const v = d[k]
                if (v != null && isFinite(v)) vals.push(v)
            })
        })
        return vals
    }, [chartData, activeKeys])
    const step = 0.02
    const baseMin = Math.min(low, high) - 0.1
    const baseMax = Math.max(low, high) + 0.1
    let dMin = baseMin
    let dMax = baseMax
    if (allVals.length) {
        const mn = Math.min(...allVals), mx = Math.max(...allVals)
        const rng = Math.max(step, mx - mn)
        const pad = Math.max(step * 2, rng * 0.3)
        dMin = Math.min(dMin, mn - pad)
        dMax = Math.max(dMax, mx + pad)
    }
    dMin = Math.floor(dMin / step) * step
    dMax = Math.ceil(dMax / step) * step
    const ticks = []
    for (let v = dMin; v <= dMax + step / 2; v += step) {
        ticks.push(Number(v.toFixed(2)))
    }
    const toggleKey = (key) => {
        setVisibleKeys(prev => {
            if (prev.includes(key)) {
                if (prev.length === 1) return prev
                return prev.filter(k => k !== key)
            }
            return [...prev, key]
        })
    }

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
                <span className="card-title">称重趋势</span>
                <span style={{ fontSize: 10, color: '#4a758f' }}>良品范围 {low} ~ {high} g</span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '0 2px 6px' }}>
                {SCALE_OPTIONS.map(o => {
                    const active = activeKeys.includes(o.key)
                    return (
                        <button
                            key={o.key}
                            type="button"
                            onClick={() => toggleKey(o.key)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                fontSize: 10,
                                padding: '4px 8px',
                                borderRadius: 10,
                                border: `1px solid ${active ? o.color : 'rgba(56,189,248,0.25)'}`,
                                background: active ? `${o.color}18` : 'transparent',
                                color: active ? o.color : '#4a758f',
                                cursor: 'pointer',
                            }}
                        >
                            <span style={{ width: 8, height: 8, borderRadius: 2, background: o.color, opacity: active ? 1 : 0.3 }} />
                            {o.label}称
                        </button>
                    )
                })}
            </div>

            <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 8, right: 48, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis dataKey="time" tick={{ fill: '#4a758f', fontSize: 9 }} tickLine={false}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }} interval="preserveStartEnd" />
                        <YAxis domain={[dMin, dMax]} tickFormatter={yFmt(2)} ticks={ticks}
                            tick={{ fill: '#4a758f', fontSize: 9 }} tickLine={false} axisLine={false}
                            width={48} unit=" g" tickCount={5} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                            y={low}
                            stroke="#fbbf24"
                            strokeDasharray="4 3"
                            strokeOpacity={0.8}
                            label={{ value: `下限 ${low}g`, fill: '#fbbf24', fontSize: 9, position: 'right' }}
                        />
                        <ReferenceLine
                            y={high}
                            stroke="#f87171"
                            strokeDasharray="4 3"
                            strokeOpacity={0.8}
                            label={{ value: `上限 ${high}g`, fill: '#f87171', fontSize: 9, position: 'right' }}
                        />
                        {SCALE_OPTIONS.map(o => (
                            <Line key={o.key}
                                type="monotone"
                                dataKey={o.key}
                                name={`${o.label}称`}
                                stroke={o.color}
                                strokeWidth={2}
                                dot={false}
                                hide={!activeKeys.includes(o.key)}
                                activeDot={{ r: 4, fill: o.color, strokeWidth: 0 }}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}

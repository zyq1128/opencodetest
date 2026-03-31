import React, { useMemo, useState, useEffect } from 'react'
import {
    ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts'

const PARAM_OPTIONS = [
    { key: 'tcgd', name: '填充高度' },
    { key: 'cxyl', name: '成型压力' },
    { key: 'zfgd', name: '装粉高度' },
    { key: 'yzgd', name: '压制高度' },
    { key: 'cpdz', name: '产品单重' },
]

function correlation(x, y) {
    const n = x.length
    if (n < 2) return null
    const mx = x.reduce((s, v) => s + v, 0) / n
    const my = y.reduce((s, v) => s + v, 0) / n
    let num = 0, dx = 0, dy = 0
    for (let i = 0; i < n; i++) {
        const vx = x[i] - mx
        const vy = y[i] - my
        num += vx * vy
        dx += vx * vx
        dy += vy * vy
    }
    const den = Math.sqrt(dx * dy)
    if (!den) return null
    return num / den
}

function stddev(values) {
    const n = values.length
    if (n < 2) return 0
    const mean = values.reduce((s, v) => s + v, 0) / n
    let sum = 0
    for (let i = 0; i < n; i++) {
        const d = values[i] - mean
        sum += d * d
    }
    return Math.sqrt(sum / n)
}

function buildParetoData(samples) {
    if (!samples.length) return []
    const yieldVals = []
    const paramVals = PARAM_OPTIONS.reduce((acc, p) => ({ ...acc, [p.key]: [] }), {})
    samples.forEach(s => {
        const good = s?.ok_count ?? s?.ok ?? 0
        const bad = s?.ng_count ?? s?.ng ?? 0
        const total = s?.scsl ?? s?.total ?? (good + bad)
        if (!total) return
        const rate = good / total
        if (!isFinite(rate)) return
        yieldVals.push(rate)
        PARAM_OPTIONS.forEach(p => {
            const v = s?.[p.key]
            if (isFinite(v)) paramVals[p.key].push(v)
            else paramVals[p.key].push(null)
        })
    })
    const metrics = PARAM_OPTIONS.map(p => {
        const x = []
        const y = []
        const xs = paramVals[p.key]
        for (let i = 0; i < yieldVals.length; i++) {
            const xv = xs[i]
            if (xv == null || !isFinite(xv)) continue
            x.push(xv)
            y.push(yieldVals[i])
        }
        const corr = correlation(x, y)
        const cleanXs = xs.filter(v => v != null && isFinite(v))
        const meanAbs = cleanXs.length ? cleanXs.reduce((s, v) => s + Math.abs(v), 0) / cleanXs.length : 0
        return { name: p.name, score: Math.abs(corr ?? 0), stdev: stddev(cleanXs), meanAbs }
    })
    const totalScore = metrics.reduce((s, m) => s + m.score, 0)
    const useCorr = totalScore > 0
    const raw = metrics.map((m, i) => {
        let value = useCorr ? m.score : (m.stdev > 0 ? m.stdev : m.meanAbs)
        if (!value || !isFinite(value)) value = (PARAM_OPTIONS.length - i) * 0.1
        return { name: m.name, value }
    })
    const total = raw.reduce((s, m) => s + m.value, 0)
    const base = raw.map(m => ({
        name: m.name,
        count: total > 0 ? (m.value / total) * 100 : 0,
    }))
    const sorted = [...base].sort((a, b) => b.count - a.count)
    let cumPct = 0
    return sorted.map(m => {
        cumPct = Math.min(100, cumPct + m.count)
        return {
            name: m.name,
            count: Number(m.count.toFixed(1)),
            cumPct: Number(cumPct.toFixed(1)),
        }
    })
}

const PARETO_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#94a3b8']

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    const p = payload.find(p => p.dataKey === 'count')
    const l = payload.find(p => p.dataKey === 'cumPct')
    return (
        <div style={{
            background: '#0d1f35', border: '1px solid #1e3a5f',
            borderRadius: 6, padding: '8px 12px', fontSize: 11,
        }}>
            <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
            {p && <div style={{ color: '#f87171' }}>贡献度: {p.value}%</div>}
            {l && <div style={{ color: '#fbbf24' }}>累计占比: {l.value?.toFixed(1)}%</div>}
        </div>
    )
}

function buildMockSamples(count = 80) {
    const samples = []
    for (let i = 0; i < count; i++) {
        const tcgd = 46 + Math.sin(i / 6) * 2 + (Math.random() - 0.5) * 1.5
        const cxyl = 190 + Math.cos(i / 5) * 8 + (Math.random() - 0.5) * 4
        const zfgd = 38 + Math.sin(i / 7) * 3 + (Math.random() - 0.5) * 2
        const yzgd = 128 + Math.cos(i / 8) * 5 + (Math.random() - 0.5) * 3
        const cpdz = 45 + Math.sin(i / 9) * 1.2 + (Math.random() - 0.5) * 1.2
        const total = 40 + Math.round(Math.random() * 40)
        const drift = Math.abs(cxyl - 190) * 0.002 + Math.abs(tcgd - 46) * 0.004 + Math.abs(cpdz - 45) * 0.02
        const badRate = Math.min(0.35, 0.05 + drift + Math.random() * 0.05)
        const ng = Math.max(1, Math.round(total * badRate))
        const ok = total - ng
        samples.push({
            tcgd: Number(tcgd.toFixed(2)),
            cxyl: Number(cxyl.toFixed(2)),
            zfgd: Number(zfgd.toFixed(2)),
            yzgd: Number(yzgd.toFixed(2)),
            cpdz: Number(cpdz.toFixed(2)),
            scsl: total,
            ok_count: ok,
            ng_count: ng,
        })
    }
    return samples
}

export default function ParetoChart({ data = {}, history = [] }) {
    const [mode, setMode] = useState('real')
    const [realSamplesDb, setRealSamplesDb] = useState([])
    const [realLoading, setRealLoading] = useState(false)
    const [realError, setRealError] = useState('')
    const fallbackSamples = history.length > 1 ? history : (data && Object.keys(data).length ? [data] : [])
    const realSamples = realSamplesDb.length ? realSamplesDb : fallbackSamples
    const mockSamples = useMemo(() => buildMockSamples(80), [])
    const realPareto = useMemo(() => buildParetoData(realSamples), [realSamples])
    const mockPareto = useMemo(() => buildParetoData(mockSamples), [mockSamples])
    const hasReal = realPareto.length > 0

    const paretoData = mode === 'mock' ? mockPareto : realPareto

    const topDefect = paretoData[0]
    const top2cumPct = paretoData.slice(0, 2).reduce((s, d) => s + (d.count ?? 0), 0)
    const activeSamples = mode === 'mock' ? mockSamples : realSamples
    const activeLatest = activeSamples.length ? activeSamples[activeSamples.length - 1] : data
    const total = activeLatest?.scsl ?? 0
    const good = activeLatest?.ok_count ?? 0
    const currentYield = total > 0 ? (good / total) * 100 : null

    useEffect(() => {
        let cancelled = false
        if (mode !== 'real') return () => { cancelled = true }
        const loadRealSamples = async () => {
            setRealLoading(true)
            setRealError('')
            try {
                const res = await fetch('/api/data/history?limit=200')
                const json = await res.json()
                if (!res.ok || json?.error) throw new Error(json?.error || json?.message || res.statusText)
                const rows = Array.isArray(json?.data) ? json.data : []
                if (!cancelled) setRealSamplesDb(rows)
            } catch (e) {
                if (!cancelled) setRealError(e?.message || '加载失败')
            } finally {
                if (!cancelled) setRealLoading(false)
            }
        }
        loadRealSamples()
        const id = setInterval(loadRealSamples, 10000)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [mode])

    const showNoDiff = mode === 'real' && currentYield === 100

    if (paretoData.length === 0 || showNoDiff) {
        return (
            <div className="card">
                <div className="card-header">
                    <span className="card-title">柏拉图分析</span>
                    <span style={{ fontSize: 10, color: '#4a758f' }}>{mode === 'mock' ? '工艺参数 · 模拟良率关联' : '工艺参数 · 良率关联度'}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[
                        { key: 'real', label: '真实数据' },
                        { key: 'mock', label: '模拟数据' },
                    ].map(opt => (
                            <button
                                key={opt.key}
                                type="button"
                                onClick={() => setMode(opt.key)}
                                style={{
                                    fontSize: 10,
                                    padding: '4px 10px',
                                    borderRadius: 10,
                                    border: `1px solid ${mode === opt.key ? '#38bdf8' : 'rgba(56,189,248,0.25)'}`,
                                    background: mode === opt.key ? 'rgba(56,189,248,0.18)' : 'transparent',
                                    color: mode === opt.key ? '#7dd3fc' : '#4a758f',
                                    cursor: 'pointer',
                                }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 28 }}>✅</div>
                    <div style={{ fontSize: 13, color: '#34d399', fontWeight: 600 }}>
                        {showNoDiff
                            ? '暂无有效差异'
                            : mode === 'mock'
                                ? '模拟样本已准备'
                                : realLoading
                                    ? '真实数据加载中'
                                    : realError
                                        ? '真实数据加载失败'
                                        : '暂无有效样本'}
                    </div>
                    <div style={{ fontSize: 11, color: '#4a758f' }}>
                        {showNoDiff
                            ? '当前良品率为100%，暂无可用差异项'
                            : mode === 'mock'
                                ? '请切换到真实数据查看实际表现'
                                : realError
                                    ? realError
                                    : '可切换到模拟数据预览分析效果'}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">柏拉图分析</span>
                <span style={{ fontSize: 10, color: '#4a758f' }}>{mode === 'mock' ? '工艺参数 · 模拟良率关联' : '工艺参数 · 良率关联度'}</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {[
                        { key: 'real', label: '真实数据' },
                        { key: 'mock', label: '模拟数据' },
                    ].map(opt => (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => setMode(opt.key)}
                            style={{
                                fontSize: 10,
                                padding: '4px 10px',
                                borderRadius: 10,
                                border: `1px solid ${mode === opt.key ? '#38bdf8' : 'rgba(56,189,248,0.25)'}`,
                                background: mode === opt.key ? 'rgba(56,189,248,0.18)' : 'transparent',
                                color: mode === opt.key ? '#7dd3fc' : '#4a758f',
                                cursor: 'pointer',
                            }}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                    { label: '当前良率', value: currentYield != null ? currentYield.toFixed(1) + '%' : '--', color: '#34d399' },
                    { label: '主要因子', value: topDefect?.name ?? '--', color: '#fb923c' },
                    { label: '前2项占比', value: top2cumPct.toFixed(1) + '%', color: '#fbbf24' },
                ].map(k => (
                    <div key={k.label} style={{
                        background: '#07111f', border: '1px solid #1a2d44', borderRadius: 6, padding: '8px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 9, color: '#4a758f', marginBottom: 3 }}>{k.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={paretoData} margin={{ top: 4, right: 44, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                        <XAxis
                            dataKey="name"
                            tick={{ fill: '#4a758f', fontSize: 9 }}
                            tickLine={false}
                            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                        />
                        <YAxis
                            yAxisId="count"
                            orientation="left"
                            tick={{ fill: '#4a758f', fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => v.toFixed(0)}
                            label={{ value: '贡献度(%)', angle: -90, position: 'insideLeft', fill: '#4a758f', fontSize: 9, dx: -2 }}
                        />
                        <YAxis
                            yAxisId="pct"
                            orientation="right"
                            domain={[0, 100]}
                            tick={{ fill: '#4a758f', fontSize: 9 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v) => v.toFixed(0) + '%'}
                            width={44}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                            yAxisId="pct"
                            y={80}
                            stroke="#fbbf24"
                            strokeDasharray="4 3"
                            strokeOpacity={0.7}
                            label={{ value: '80%', fill: '#fbbf24', fontSize: 9, position: 'right' }}
                        />
                        <Bar yAxisId="count" dataKey="count" radius={[3, 3, 0, 0]}>
                            {paretoData.map((_, i) => (
                                <Cell key={i} fill={PARETO_COLORS[i] ?? '#94a3b8'} fillOpacity={0.85} />
                            ))}
                        </Bar>
                        <Line
                            yAxisId="pct"
                            type="monotone"
                            dataKey="cumPct"
                            stroke="#fbbf24"
                            strokeWidth={2}
                            dot={{ fill: '#fbbf24', r: 3, strokeWidth: 0 }}
                            activeDot={{ r: 5, fill: '#fbbf24' }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
                {paretoData.map((d, i) => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: PARETO_COLORS[i], display: 'inline-block' }} />
                        <span style={{ color: '#64748b' }}>{d.name}</span>
                        <span style={{ color: '#94a3b8', fontWeight: 600 }}>{d.count}%</span>
                    </div>
                ))}
            </div>
        </div>
    )
}

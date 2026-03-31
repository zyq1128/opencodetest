import React from 'react'

/**
 * 7路电子称重面板
 * - 显示每路称重值 + 条形可视化
 * - 超限（> weight_limit_high 或 < weight_limit_low）高亮报警
 * - 底部显示均值、标准差、合格率
 */

const SCALE_LABELS = ['1#', '2#', '3#', '4#', '5#', '6#', '7#']

function WeightBar({ index, value, low, high, nominal }) {
    const valid = value != null && value > 0
    const alarm = valid && (value < low || value > high)
    const pct = valid ? Math.min(100, Math.max(0, ((value - (nominal - 10)) / 20) * 100)) : 0
    const color = alarm ? '#f87171' : '#34d399'
    const barColor = alarm ? '#f87171' : '#34d399'

    return (
        <div style={{
            background: alarm ? 'rgba(248,113,113,0.07)' : 'rgba(52,211,153,0.04)',
            border: `1px solid ${alarm ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.15)'}`,
            borderRadius: 7, padding: '8px 10px',
            transition: 'border-color 0.3s',
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 10, color: '#4a758f', fontWeight: 600 }}>
                    {SCALE_LABELS[index]}称
                    {alarm && <span style={{ color: '#f87171', marginLeft: 4 }}>⚠</span>}
                </span>
                <span style={{
                    fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color,
                }}>
                    {valid ? value.toFixed(1) : '—'}
                    <span style={{ fontSize: 8, color: '#4a758f', fontFamily: 'Inter', marginLeft: 2 }}>g</span>
                </span>
            </div>
            {/* 条形 */}
            <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3 }}>
                <div style={{
                    position: 'absolute', left: 0, top: 0, height: '100%',
                    width: `${pct}%`, background: barColor, borderRadius: 3,
                    transition: 'width 0.4s ease',
                }} />
                {/* 下限标线 */}
                <div style={{
                    position: 'absolute', top: -2, bottom: -2,
                    left: `${Math.min(100, Math.max(0, ((low - (nominal - 10)) / 20) * 100))}%`,
                    width: 1.5, background: 'rgba(251,191,36,0.7)',
                }} />
                {/* 上限标线 */}
                <div style={{
                    position: 'absolute', top: -2, bottom: -2,
                    left: `${Math.min(100, Math.max(0, ((high - (nominal - 10)) / 20) * 100))}%`,
                    width: 1.5, background: 'rgba(248,113,113,0.7)',
                }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#2d4a60', marginTop: 3 }}>
                <span style={{ color: 'rgba(251,191,36,0.8)' }}>↑{low}g</span>
                <span style={{ color: 'rgba(248,113,113,0.8)' }}>↑{high}g</span>
            </div>
        </div>
    )
}

export default function WeightPanel({ data = {} }) {
    const low = data.weight_limit_low ?? 42.0
    const high = data.weight_limit_high ?? 49.0
    const nominal = (low + high) / 2

    const keys = ['czjg1', 'czjg2', 'czjg3', 'czjg4', 'czjg5', 'czjg6', 'czjg7']
    const weights = keys.map(k => data[k] ?? 0)
    const valid = weights.filter(w => w > 0)

    const mean = valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0
    const std = valid.length > 1
        ? Math.sqrt(valid.reduce((s, v) => s + (v - mean) ** 2, 0) / valid.length)
        : 0
    const okCount = valid.filter(w => w >= low && w <= high).length
    const okRate = valid.length ? (okCount / valid.length * 100) : 100
    const rateColor = okRate >= 100 ? '#34d399' : okRate >= 85 ? '#fbbf24' : '#f87171'

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">7路电子称重</span>
                <span style={{ fontSize: 10, color: '#4a758f' }}>
                    规格: {low}~{high} g
                </span>
            </div>

            {/* 统计摘要 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
                {[
                    { label: '称重均值', value: mean > 0 ? mean.toFixed(2) + ' g' : '—', color: '#38bdf8' },
                    { label: '重量标准差', value: std > 0 ? std.toFixed(3) + ' g' : '—', color: '#a78bfa' },
                    { label: '本批合格率', value: okRate.toFixed(0) + '%', color: rateColor },
                ].map(s => (
                    <div key={s.label} style={{
                        background: '#07111f', border: '1px solid #1a2d44',
                        borderRadius: 6, padding: '7px 8px', textAlign: 'center',
                    }}>
                        <div style={{ fontSize: 9, color: '#4a758f', marginBottom: 3 }}>{s.label}</div>
                        <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            {/* 7路条形 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                {weights.map((w, i) => (
                    <WeightBar key={i} index={i} value={w} low={low} high={high} nominal={nominal} />
                ))}
            </div>

            {/* 良品上下限说明 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 9, color: '#2d4a60' }}>
                <span style={{ color: 'rgba(251,191,36,0.9)' }}>— 下限 {low} g</span>
                <span style={{ color: 'rgba(248,113,113,0.9)' }}>— 上限 {high} g</span>
            </div>
        </div>
    )
}

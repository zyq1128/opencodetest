import React from 'react'

const fmtPct = (v) => (v != null && isFinite(+v) ? (+v).toFixed(1) : '—')

function AnomalyBadge({ isAnomaly, score, count, rate, sampleSize }) {
    return (
        <div style={{
            background: isAnomaly ? 'rgba(248,113,113,0.08)' : 'rgba(52,211,153,0.06)',
            border: `1px solid ${isAnomaly ? 'rgba(248,113,113,0.35)' : 'rgba(52,211,153,0.2)'}`,
            borderRadius: 8, padding: '12px 14px',
            ...(isAnomaly ? { animation: 'alarm-pulse 1.5s ease-in-out infinite' } : {}),
        }}>
            <div style={{ fontSize: 10, color: '#4a758f', marginBottom: 6, letterSpacing: 0.5 }}>
                ■ 异常检测（Isolation Forest · 6维特征）
            </div>
            <div style={{
                fontSize: 18, fontWeight: 800, color: isAnomaly ? '#f87171' : '#34d399', marginBottom: 8,
                ...(isAnomaly ? { animation: 'alarm-blink 1s ease-in-out infinite' } : {}),
            }}>
                {isAnomaly ? '⚠ 检测到异常' : '✅ 运行正常'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 8 }}>
                {[
                    { label: '异常评分', value: score != null ? Math.abs(+score).toFixed(4) : '—', accent: isAnomaly ? '#f87171' : '#64748b' },
                    { label: '近期异常数', value: count != null ? count + ' 条' : '—', accent: isAnomaly ? '#fb923c' : '#64748b' },
                    { label: '异常率', value: rate != null ? fmtPct(rate * 100) + '%' : '—', accent: isAnomaly ? '#fbbf24' : '#64748b' },
                ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 5, padding: '6px 4px' }}>
                        <div style={{ fontSize: 9, color: '#4a758f', marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: s.accent }}>{s.value}</div>
                    </div>
                ))}
            </div>
            <div style={{ fontSize: 9, color: '#4a758f' }}>
                近 {sampleSize ?? '--'} 条 · 输入特征：成型压力 / 节拍 / 上冲电流 / 中模电流 / 重量均值 / 重量离散
            </div>
        </div>
    )
}

function QualityPanel({ quality }) {
    const rate = quality?.predicted_good_rate_pct ?? 0
    const rateColor = rate >= 95 ? '#34d399' : rate >= 90 ? '#38bdf8' : rate >= 85 ? '#fbbf24' : '#f87171'
    const features = quality?.top_features ?? []

    return (
        <div style={{ background: 'rgba(56,189,248,0.04)', border: '1px solid rgba(56,189,248,0.12)', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: '#4a758f', marginBottom: 8, letterSpacing: 0.5 }}>
                ■ 良率预测（Random Forest · 10维特征）
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 10 }}>
                <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 32, fontWeight: 900, color: rateColor, lineHeight: 1 }}>
                    {fmtPct(rate)}<span style={{ fontSize: 14, fontWeight: 500, marginLeft: 2 }}>%</span>
                </div>
                <div style={{ paddingBottom: 4 }}>
                    <span style={{
                        fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                        background: rateColor + '20', color: rateColor, border: `1px solid ${rateColor}40`,
                    }}>{quality?.quality_level ?? '—'}</span>
                </div>
            </div>
            <div style={{ height: 7, background: 'rgba(255,255,255,0.05)', borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ height: '100%', width: `${rate}%`, background: rateColor, borderRadius: 4, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ fontSize: 10, color: '#4a758f', marginBottom: 8 }}>
                预测不良率: <span style={{ color: '#f87171', fontWeight: 600 }}>{fmtPct((quality?.predicted_bad_rate ?? 0) * 100)}%</span>
                &ensp;|&ensp;样本基准: 1000条历史数据
            </div>
            {features.length > 0 && (
                <>
                    <div style={{ fontSize: 10, color: '#4a758f', marginBottom: 6, fontWeight: 600 }}>
                        主要影响因素（特征重要性）:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {features.map((f, i) => (
                            <div key={f.feature}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginBottom: 2 }}>
                                    <span>{i + 1}. {f.feature}</span>
                                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>{fmtPct(f.importance * 100)}%</span>
                                </div>
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${f.importance * 100}%`, background: '#a78bfa', borderRadius: 2, opacity: 0.8 }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}

export default function AIResults({ ai = {} }) {
    const anomaly = ai.anomaly || {}
    const quality = ai.quality || {}
    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">AI 分析</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#a78bfa' }}>模型状态: 在线</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <AnomalyBadge
                    isAnomaly={anomaly.is_anomaly === true}
                    score={anomaly.anomaly_score}
                    count={anomaly.anomaly_count}
                    rate={anomaly.anomaly_rate}
                    sampleSize={anomaly.sample_size}
                />
                <QualityPanel quality={quality} />
            </div>
        </div>
    )
}

import React from 'react'

const fmt = {
    current: (v) => (v != null && isFinite(+v) ? (+v).toFixed(2) : '—'),
    score: (v) => (v != null && isFinite(+v) ? (+v).toFixed(0) : '—'),
}

function ScoreBar({ value, label, color }) {
    const v = (value != null && isFinite(+value)) ? Math.min(100, Math.max(0, +value)) : 0
    return (
        <div style={{ marginBottom: 7 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a758f', marginBottom: 2 }}>
                <span>{label}</span>
                <span style={{ color, fontWeight: 600 }}>{value != null ? v.toFixed(0) : '--'}</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v}%`, background: color, borderRadius: 2, transition: 'width 0.7s ease' }} />
            </div>
        </div>
    )
}

function HealthRing({ score, level }) {
    const s = (score != null && isFinite(+score)) ? Math.min(100, Math.max(0, +score)) : 100
    const R = 40, C = 2 * Math.PI * R
    const dash = (s / 100) * C
    const color = s >= 90 ? '#34d399' : s >= 75 ? '#38bdf8' : s >= 55 ? '#fbbf24' : '#f87171'
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 0' }}>
            <svg viewBox="0 0 100 100" style={{ width: 100, height: 100 }}>
                <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="9" />
                <circle cx="50" cy="50" r={R} fill="none"
                    stroke={color} strokeWidth="9"
                    strokeDasharray={`${dash} ${C}`}
                    strokeDashoffset={C * 0.25}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 0.8s ease' }}
                />
                <text x="50" y="47" textAnchor="middle" fill={color} fontSize="22" fontWeight="900" fontFamily="Orbitron, monospace">{Math.round(s)}</text>
                <text x="50" y="61" textAnchor="middle" fill="#4a758f" fontSize="9" fontFamily="Inter">{level || '—'}</text>
            </svg>
        </div>
    )
}

function CurrentMeter({ label, value, normal, unit = 'A', warnThreshold }) {
    const v = value ?? normal
    const alarm = v > warnThreshold
    const pct = Math.min(100, (v / (warnThreshold * 1.3)) * 100)
    const color = alarm ? '#f87171' : '#34d399'
    return (
        <div style={{
            background: alarm ? 'rgba(248,113,113,0.07)' : 'rgba(52,211,153,0.04)',
            border: `1px solid ${alarm ? 'rgba(248,113,113,0.3)' : 'rgba(52,211,153,0.12)'}`,
            borderRadius: 7, padding: '8px 10px', marginBottom: 7,
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#4a758f' }}>{label}</span>
                <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 13, fontWeight: 700, color }}>
                    {fmt.current(v)} <span style={{ fontSize: 8, color: '#4a758f', fontFamily: 'Inter' }}>{unit}</span>
                    {alarm && <span style={{ fontSize: 9, color: '#f87171', marginLeft: 4 }}>⚠</span>}
                </span>
            </div>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#2d4a60', marginTop: 2 }}>
                <span>0 {unit}</span>
                <span style={{ color: 'rgba(248,113,113,0.6)' }}>限 {warnThreshold} {unit}</span>
            </div>
        </div>
    )
}

export default function StatusPanel({ data = {}, health = {} }) {
    const score = health.health_score ?? 100
    const details = health.details || {}
    const agingWarn = health.aging_warning
    const scTrend = health.sc_current_trend ?? 0

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
            <div className="card-header">
                <span className="card-title">设备健康</span>
                <span style={{ fontSize: 10, color: '#4a758f' }}>磨压机 Y4</span>
            </div>

            {/* 健康评分环 */}
            <HealthRing score={score} level={health.level} />

            {agingWarn && (
                <div style={{
                    textAlign: 'center', fontSize: 10, fontWeight: 600, color: '#fb923c',
                    background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)',
                    borderRadius: 6, padding: '4px 8px', marginBottom: 10,
                }}>
                    ⚠ 检测到老化趋势
                    {scTrend > 0.05 ? '（伺服电流上升）' : '（压力持续上升）'}
                </div>
            )}

            {/* 伺服电流 */}
            <div style={{ fontSize: 10, color: '#4a758f', letterSpacing: 1, fontWeight: 600, marginBottom: 8, marginTop: 4 }}>
                伺服脱模电流
            </div>
            <CurrentMeter label="上冲伺服电流 (scsfdl)" value={data.scsfdl} normal={8.0} warnThreshold={12.0} />
            <CurrentMeter label="中模伺服电流 (zmsfdl)" value={data.zmsfdl} normal={6.0} warnThreshold={10.0} />

            {/* 健康分项 */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10, marginTop: 4 }}>
                <div style={{ fontSize: 10, color: '#4a758f', letterSpacing: 1, fontWeight: 600, marginBottom: 8 }}>
                    分项健康评分
                </div>
                <ScoreBar value={details.press_stability_score} label="压力稳定性" color="#38bdf8" />
                <ScoreBar value={details.cycle_stability_score} label="节拍稳定性" color="#a78bfa" />
                <ScoreBar value={details.sc_servo_score} label="上冲伺服" color="#34d399" />
                <ScoreBar value={details.zm_servo_score} label="中模伺服" color="#34d399" />
                <ScoreBar value={details.alarm_score} label="报警评分" color="#fbbf24" />
            </div>

            {/* 电流均值小字 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#2d4a60', marginTop: 6 }}>
                <span>上冲均值: {(details.sc_current_mean ?? 0).toFixed(2)} A</span>
                <span>中模均值: {(details.zm_current_mean ?? 0).toFixed(2)} A</span>
            </div>
        </div>
    )
}

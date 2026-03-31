import React from 'react'

const fmt = {
    pressure: (v) => (v != null && isFinite(+v) ? (+v).toFixed(1) : '—'),
    time:     (v) => (v != null && isFinite(+v) ? (+v).toFixed(2) : '—'),
    count:    (v) => (v != null ? (+v).toLocaleString() : '0'),
    mm:       (v) => (v != null && isFinite(+v) ? (+v).toFixed(2) : '—'),
}

function KpiCard({ label, value, unit, alarm, sub }) {
    return (
        <div style={{
            background: alarm ? 'rgba(248,113,113,0.08)' : 'rgba(56,189,248,0.04)',
            border: `1px solid ${alarm ? 'rgba(248,113,113,0.4)' : 'rgba(56,189,248,0.12)'}`,
            borderRadius: 8, padding: '10px 12px',
            display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0,
        }}>
            <div style={{ fontSize: 9, color: '#4a758f', fontWeight: 600, letterSpacing: 0.5 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{
                    fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 900,
                    color: alarm ? '#f87171' : '#38bdf8',
                }}>{value}</span>
                <span style={{ fontSize: 9, color: '#4a758f' }}>{unit}</span>
            </div>
            {sub && <div style={{ fontSize: 9, color: '#4a758f', marginTop: 1 }}>{sub}</div>}
        </div>
    )
}

function DeviceStatusCard({ label, running, standby, alarm }) {
    const state = alarm ? 'alarm' : running ? 'run' : standby ? 'standby' : 'off'
    const colors = { run: '#34d399', standby: '#fbbf24', alarm: '#f87171', off: '#4a758f' }
    const labels = { run: '▶ 运行中', standby: '⏸ 待机', alarm: '🔴 报警', off: '⏹ 待机' }
    const c = colors[state]
    return (
        <div style={{
            flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 7,
            border: `1px solid ${c}40`,
            background: `${c}08`,
            ...(state === 'alarm' ? { animation: 'alarm-pulse 1s ease-in-out infinite' } : {}),
        }}>
            <div style={{ fontSize: 9, color: '#4a758f', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{labels[state]}</div>
        </div>
    )
}

function CounterRow({ label, value, color = '#38bdf8' }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
            <span style={{ fontSize: 10, color: '#4a758f' }}>{label}</span>
            <span style={{ fontFamily: 'Orbitron, monospace', fontSize: 12, fontWeight: 700, color }}>{fmt.count(value)}</span>
        </div>
    )
}

export default function Dashboard({ data, showKpi = true }) {
    const d = data || {}
    const myjRun = d.myj_run === 1 || d.myj_run === true
    const myjAlarm = d.myj_alarm === 1 || d.myj_alarm === true
    const myjStandby = d.myj_standby === 1 || d.myj_standby === true || (!myjRun && !myjAlarm)
    const pressAlarm = (d.cxyl ?? 0) > 205
    const cycleAlarm = (d.cxjp ?? 0) > 5.5
    const ejectAlarm = (d.xyyl ?? 0) > 75
    const ngRate = d.scsl > 0 ? ((d.ng_count / d.scsl) * 100) : 0
    const okRate = d.scsl > 0 ? ((d.ok_count / d.scsl) * 100) : 100
    const rateColor = okRate >= 95 ? '#34d399' : okRate >= 90 ? '#38bdf8' : okRate >= 85 ? '#fbbf24' : '#f87171'

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* ── 双设备状态 ── */}
            <div className="card">
                <div className="card-header">
                    <span className="card-title">设备状态</span>
                    <span style={{ fontSize: 10, color: '#4a758f' }}>
                        {d.recorded_at ? new Date(d.recorded_at).toLocaleTimeString('zh-CN') : '--:--:--'}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <DeviceStatusCard label="机械手" running={d.jxs_run} standby={d.jxs_standby} alarm={d.jxs_alarm} />
                    <DeviceStatusCard label="模压机" running={myjRun} standby={myjStandby} alarm={myjAlarm} />
                </div>
            </div>

            {/* ── 核心工艺指标 ── */}
            {showKpi && (
                <div className="card">
                    <div className="card-header"><span className="card-title">核心指标</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <KpiCard label="成型压力" value={fmt.pressure(d.cxyl)} unit="MPa"
                            alarm={pressAlarm} sub={pressAlarm ? `⚠ 超限 +${fmt.pressure(d.cxyl - 205)} MPa` : `卸压 ${fmt.pressure(d.xyyl)} MPa`} />
                        <KpiCard label="成型节拍" value={fmt.time(d.cxjp)} unit="s/件"
                            alarm={cycleAlarm} sub={cycleAlarm ? '⚠ 节拍偏高' : '节拍正常'} />
                        <KpiCard label="不良率" value={fmt.pressure(ngRate)} unit="%"
                            alarm={ngRate > 5} sub={`产品单重 ${fmt.mm(d.cpdz)} g`} />
                    </div>
                </div>
            )}

            {/* ── 产量统计 ── */}
            <div className="card">
                <div className="card-header"><span className="card-title">产量统计</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                    {[
                        { label: '总产量', value: fmt.count(d.scsl),     color: '#38bdf8' },
                        { label: '合格品', value: fmt.count(d.ok_count), color: '#34d399' },
                        { label: '不良品', value: fmt.count(d.ng_count), color: '#f87171' },
                    ].map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '8px 0' }}>
                            <div style={{ fontSize: 9, color: '#4a758f', marginBottom: 2 }}>{s.label}</div>
                            <div style={{ fontFamily: 'Orbitron, monospace', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                        </div>
                    ))}
                </div>
                {(d.scsl ?? 0) > 0 && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: 10, color: '#4a758f' }}>实际良率</span>
                            <span style={{ fontSize: 12, fontWeight: 700, color: rateColor, fontFamily: 'Orbitron, monospace' }}>{okRate.toFixed(1)}%</span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                            <div style={{ height: '100%', width: `${okRate}%`, background: rateColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                    </>
                )}
            </div>

            {/* ── 工艺参数 ── */}
            <div className="card">
                <div className="card-header"><span className="card-title">工艺参数</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                    {[
                        { label: '填充高度', value: fmt.mm(d.tcgd),       unit: 'mm' },
                        { label: '装粉高度', value: fmt.mm(d.zfgd),       unit: 'mm' },
                        { label: '压制高度', value: fmt.mm(d.yzgd),       unit: 'mm' },
                        { label: '卸压高度', value: fmt.mm(d.xygd),       unit: 'mm' },
                        { label: '保压时间', value: fmt.time(d.bysj),     unit: 's' },
                        { label: '压制速度', value: fmt.mm(d.yzsd),       unit: 'mm/s' },
                        { label: '脱模速度', value: fmt.mm(d.tmsd),       unit: 'mm/s' },
                        { label: '清模频率', value: fmt.time(d.qmpl),     unit: 'Hz' },
                    ].map(p => (
                        <div key={p.label} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)', borderRadius: 5, padding: '5px 10px',
                        }}>
                            <span style={{ fontSize: 10, color: '#4a758f' }}>{p.label}</span>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1', fontFamily: 'Orbitron, monospace' }}>
                                {p.value} <span style={{ fontSize: 9, color: '#4a758f', fontFamily: 'Inter' }}>{p.unit}</span>
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

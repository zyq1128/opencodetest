import React, { useMemo, useState } from 'react'

const getSeries = (history, key, limit = 20) => {
    const slice = history.slice(-limit)
    return slice.map(h => h?.[key]).filter(v => v != null && isFinite(v))
}

const getMean = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0
const getStd = (arr) => {
    if (arr.length < 2) return 0
    const mean = getMean(arr)
    const variance = arr.reduce((s, v) => s + (v - mean) * (v - mean), 0) / arr.length
    return Math.sqrt(variance)
}

const getWeights = (latest) => [1, 2, 3, 4, 5, 6, 7]
    .map(i => latest?.[`czjg${i}`])
    .filter(v => v != null && isFinite(v) && v > 0)

const getWeightMeanSeries = (history, limit = 15) => {
    const slice = history.slice(-limit)
    return slice.map(h => {
        const w = getWeights(h)
        return w.length ? getMean(w) : null
    }).filter(v => v != null && isFinite(v))
}

export default function RuleEngineAssistant({ latest = {}, history = [] }) {
    const [simulate, setSimulate] = useState(false)
    const [simulateKey, setSimulateKey] = useState('pressure_up')
    const low = Number(latest?.weight_limit_low ?? 42)
    const high = Number(latest?.weight_limit_high ?? 49)
    const weights = getWeights(latest)
    const meanW = weights.length ? getMean(weights) : null
    const stdW = weights.length ? getStd(weights) : null

    const prev = history.length > 1 ? history[history.length - 2] : null
    const cxyl = isFinite(latest?.cxyl) ? latest.cxyl : null
    const prevCxyl = isFinite(prev?.cxyl) ? prev.cxyl : null

    const pressureSeries = getSeries(history, 'cxyl', 18)
    const pressureStd = getStd(pressureSeries)

    const meanSeries = getWeightMeanSeries(history, 18)
    const drift = meanSeries.length ? meanSeries[meanSeries.length - 1] - meanSeries[0] : 0

    const rules = useMemo(() => ([
        {
            key: 'pressure_up',
            title: '压力突然升高',
            check: () => cxyl != null && prevCxyl != null && (cxyl - prevCxyl) >= 10,
            causes: [
                '粉末流动性变差或拱桥效应',
                '模壁润滑不足，摩擦增大',
                '料靴或阴模口积粉',
                '上冲或芯棒磨损，间隙过小',
            ],
            actions: [
                '暂停压制，空打清除浮粉',
                '检查送料是否顺畅，有无堆积',
                '检查模壁是否发白或有拉痕',
            ],
        },
        {
            key: 'pressure_down',
            title: '压力突然下降',
            check: () => cxyl != null && prevCxyl != null && (prevCxyl - cxyl) >= 10,
            causes: [
                '粉末填充量不足或断料',
                '阴模或芯棒断裂导致无阻力',
                '液压系统溢流阀故障',
                '上冲压机接头松动',
            ],
            actions: [
                '立即停机避免空打损坏模具',
                '称量当前压坯重量确认异常',
                '观察压力表指针有无抖动',
            ],
        },
        {
            key: 'pressure_wave',
            title: '压力曲线波动大',
            check: () => pressureStd > 5,
            causes: [
                '粉末填充不均匀',
                '排气段参数设置不当',
                '压机活动横梁导向间隙大',
            ],
            actions: [
                '观察保压阶段曲线是否平滑',
                '放慢压制速度观察变化',
                '优化排气次数与排气压力',
            ],
        },
        {
            key: 'weight_outlier',
            title: '单件重量超差',
            check: () => weights.some(w => w < low || w > high),
            causes: [
                '模腔填充量不准',
                '刮平不一致或前后端缺料',
                '阴模深度调节螺丝松动',
            ],
            actions: [
                '微调装料高度，校正阴模位置',
                '检查刮料板磨损并清理模面',
                '连续称重5-10件确认范围',
            ],
        },
        {
            key: 'weight_drift',
            title: '重量持续变大/变小',
            check: () => Math.abs(drift) > 0.15,
            causes: [
                '料斗搭桥，下料不稳定',
                '环境温度变化导致粉末密度变化',
                '模具温度升高导致间隙变化',
            ],
            actions: [
                '敲击料斗或使用震动器疏通',
                '根据趋势反向微调装料高度',
                '记录当前模温与室温',
            ],
        },
        {
            key: 'weight_imbalance',
            title: '同模多腔重量不一致',
            check: () => stdW != null && stdW > 0.25,
            causes: [
                '各模腔填充量不一致',
                '各模腔磨损程度不同',
                '各模腔排气效果不同',
            ],
            actions: [
                '对各模腔产品分别标记称重',
                '对偏差模腔单独微调',
                '检查该模腔送料孔是否堵塞',
            ],
        },
        {
            key: 'pressure_weight_cross',
            title: '压力重量交叉变化',
            check: () => (cxyl != null && prevCxyl != null && Math.abs(cxyl - prevCxyl) >= 10) && (meanW != null && (meanW < low || meanW > high)),
            causes: [
                '微调装料后未同步调整压制压力',
                '粉末粒级分布改变导致压缩比变化',
            ],
            actions: [
                '遵循先调重后调压原则',
                '调整后验证压坯厚度或密度',
            ],
        },
    ]), [cxyl, prevCxyl, pressureStd, weights, low, high, drift, meanW, stdW])

    const hits = rules.filter(r => r.check())
    const simulated = simulate ? (rules.find(r => r.key === simulateKey) || rules[0]) : null
    const displayHits = simulate && simulated ? [simulated] : hits
    const main = displayHits[0]

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">智能诊断助手</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        type="button"
                        onClick={() => setSimulate(v => !v)}
                        style={{
                            fontSize: 10,
                            padding: '4px 10px',
                            borderRadius: 10,
                            border: `1px solid ${simulate ? '#f87171' : 'rgba(56,189,248,0.25)'}`,
                            background: simulate ? 'rgba(248,113,113,0.15)' : 'transparent',
                            color: simulate ? '#f87171' : '#4a758f',
                            cursor: 'pointer',
                        }}
                    >
                        {simulate ? '退出模拟' : '模拟异常'}
                    </button>
                    <span style={{ fontSize: 10, color: displayHits.length ? '#f87171' : '#34d399', fontWeight: 600 }}>
                        {simulate ? '模拟模式' : displayHits.length ? '规则引擎触发' : '未触发异常'}
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 10, color: '#4a758f' }}>基于文档规则 + 阈值判断</div>
                {simulate && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {rules.map(r => (
                            <button
                                key={r.key}
                                type="button"
                                onClick={() => setSimulateKey(r.key)}
                                style={{
                                    fontSize: 10,
                                    padding: '3px 8px',
                                    borderRadius: 10,
                                    border: `1px solid ${simulateKey === r.key ? '#f87171' : 'rgba(56,189,248,0.25)'}`,
                                    background: simulateKey === r.key ? 'rgba(248,113,113,0.15)' : 'transparent',
                                    color: simulateKey === r.key ? '#f87171' : '#4a758f',
                                    cursor: 'pointer',
                                }}
                            >
                                {r.title}
                            </button>
                        ))}
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px', border: '1px solid rgba(56,189,248,0.12)' }}>
                        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>当前异常类型</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: displayHits.length ? '#f87171' : '#34d399' }}>
                            {main?.title ?? '正常'}
                        </div>
                        {displayHits.length > 1 && (
                            <div style={{ marginTop: 4, fontSize: 10, color: '#64748b' }}>
                                其他异常：{displayHits.slice(1).map(h => h.title).join('、')}
                            </div>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10, color: '#4a758f', fontWeight: 600 }}>可能原因</div>
                    {main?.causes?.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {main.causes.map(c => (
                                <div key={c} style={{ fontSize: 11, color: '#cbd5e1' }}>• {c}</div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: '#4a758f' }}>暂无异常触发</div>
                    )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ fontSize: 10, color: '#4a758f', fontWeight: 600 }}>处理建议</div>
                    {main?.actions?.length ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {main.actions.map(a => (
                                <span key={a} style={{ fontSize: 10, color: '#cbd5e1', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 999, padding: '2px 8px' }}>
                                    {a}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: 11, color: '#4a758f' }}>持续监测中</div>
                    )}
                </div>
            </div>
        </div>
    )
}

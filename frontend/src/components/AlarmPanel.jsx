import React, { useEffect, useRef } from 'react'

const MAX_ALARMS = 20

function formatTime(ts) {
    return new Date(ts).toLocaleTimeString('zh-CN')
}

export default function AlarmPanel({ alarms = [] }) {
    const listRef = useRef(null)

    // Auto scroll to bottom
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight
        }
    }, [alarms])

    const recent = alarms.slice(-MAX_ALARMS)

    return (
        <div className="card">
            <div className="card-header">
                <span className="card-title">报警记录</span>
                <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: 10,
                    background: alarms.length > 0 ? 'rgba(255,61,107,0.15)' : 'rgba(0,255,136,0.08)',
                    color: alarms.length > 0 ? 'var(--accent-red)' : 'var(--accent-green)',
                    border: `1px solid ${alarms.length > 0 ? 'rgba(255,61,107,0.3)' : 'rgba(0,255,136,0.15)'}`,
                }}>
                    {alarms.length > 0 ? `${alarms.length} 条报警` : '无报警'}
                </span>
            </div>

            <div className="alarm-list" ref={listRef}>
                {recent.length === 0 ? (
                    <div className="no-alarm">
                        <div className="no-alarm-icon">✅</div>
                        <div>系统运行正常，暂无报警</div>
                    </div>
                ) : (
                    recent.map((a, i) => (
                        <div key={i} className={`alarm-item ${a.type === 'warning' ? 'warning' : ''}`}>
                            <div className="alarm-icon">
                                {a.type === 'warning' ? '⚠️' : '🔴'}
                            </div>
                            <div className="alarm-content">
                                <div className="alarm-msg">{a.message}</div>
                                <div className="alarm-time">{formatTime(a.time)}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

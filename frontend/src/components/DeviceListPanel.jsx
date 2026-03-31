import React from 'react'

const DeviceCard = ({ id, name, status }) => {
    // 状态样式映射
    const statusMap = {
        running: { color: '#34d399', bg: 'rgba(52, 211, 153, 0.1)', border: 'rgba(52, 211, 153, 0.3)', label: '运行中', icon: '▶' },
        standby: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.3)', label: '待机', icon: '⏸' },
        alarm: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', border: 'rgba(248, 113, 113, 0.3)', label: '报警', icon: '🔴' },
        offline: { color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)', label: '离线', icon: '⏹' }
    }

    const s = statusMap[status] || statusMap.offline

    return (
        <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${s.border}`,
            borderRadius: 6,
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            transition: 'all 0.2s ease',
            cursor: 'pointer',
        }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'Orbitron', color: '#cbd5e1' }}>{id}</span>
                <span style={{ fontSize: 10, color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {name}
            </div>
            <div style={{
                marginTop: 2,
                fontSize: 10,
                color: s.color,
                background: s.bg,
                padding: '2px 6px',
                borderRadius: 3,
                textAlign: 'center',
                fontWeight: 600
            }}>
                {s.label}
            </div>
        </div>
    )
}

export default function DeviceListPanel({ currentDevice }) {
    const y4Status = currentDevice?.myj_alarm
        ? 'alarm'
        : currentDevice?.myj_run
            ? 'running'
            : currentDevice?.myj_standby
                ? 'standby'
                : 'standby'
    // 模拟设备列表数据
    // 在真实场景中，这应该来自API或WebSocket
    const devices = [
        { id: 'Y4', name: '磨压机 Y4', status: y4Status },
        { id: 'Y1', name: '磨压机 Y1', status: 'offline' },
        { id: 'Y2', name: '磨压机 Y2', status: 'offline' },
        { id: 'Y3', name: '磨压机 Y3', status: 'offline' },
        { id: 'Y5', name: '磨压机 Y5', status: 'offline' },
        { id: 'Y6', name: '磨压机 Y6', status: 'offline' },
        { id: 'Y7', name: '磨压机 Y7', status: 'offline' },
        { id: 'Y8', name: '磨压机 Y8', status: 'offline' },
        { id: 'P1', name: '烧结炉 P1', status: 'offline' },
        { id: 'P2', name: '烧结炉 P2', status: 'offline' },
        { id: 'M1', name: '机械手 M1', status: 'offline' },
        { id: 'M2', name: '机械手 M2', status: 'offline' },
    ]

    return (
        <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
                <span className="card-title">设备列表</span>
                <span style={{ fontSize: 10, color: '#4a758f' }}>共 {devices.length} 台</span>
            </div>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 8,
                paddingRight: 4, // 留出滚动条空间
                alignContent: 'start' // 防止内容少时拉伸
            }} className="custom-scrollbar">
                {devices.map(dev => (
                    <DeviceCard key={dev.id} {...dev} />
                ))}
            </div>
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.02);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    )
}

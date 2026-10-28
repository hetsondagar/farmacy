import React, { useState } from 'react';
import { useZones } from '../hooks/useData';

export default function ZoneMonitor() {
  const { zones, loading } = useZones();
  const [selectedZone, setSelectedZone] = useState(null);
  const [viewMode, setViewMode] = useState('network'); // 'network' or 'grid'
  
  // Local state to allow user to toggle any node online/offline interactively
  const [nodeOverrides, setNodeOverrides] = useState({});

  if (loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner" />
      </div>
    );
  }

  // Pre-configured node positions around the central gateway (viewBox: 800 x 500)
  const nodePositions = [
    { x: 190, y: 120, emoji: '🌾', label: 'Zone 1' },
    { x: 610, y: 120, emoji: '🥬', label: 'Zone 2' },
    { x: 610, y: 380, emoji: '🌻', label: 'Zone 3' },
    { x: 190, y: 380, emoji: '🌱', label: 'Zone 4' },
  ];

  // Helper to determine if a zone is online (with user override support)
  const isZoneOnline = (zone) => {
    if (nodeOverrides[zone.zone_id] !== undefined) {
      return nodeOverrides[zone.zone_id];
    }
   // console.log('Zone online status:', zone.zone_id, zone.online);

   return zone.zone_id == 'zone-1';
  };

  const toggleZoneStatus = (zoneId) => {
    setNodeOverrides(prev => {
      const current = prev[zoneId] !== undefined ? prev[zoneId] : true;
      return { ...prev, [zoneId]: !current };
    });
  };

  const hubPos = { x: 400, y: 250 };

  const onlineCount = zones.filter(z => isZoneOnline(z)).length;
  const offlineCount = zones.length - onlineCount;

  return (
    <div className="network-card">
      {/* Network Stats & View Switcher */}
      <div className="network-stats-header">
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🌐</span> Farm IoT Sensor Mesh Network
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Micro-farm topology with interactive zone nodes. Click any node to inspect telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className="network-badge-online">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {onlineCount} Online
          </span>

          <span className="network-badge-offline">
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            {offlineCount} Offline
          </span>

          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px' }}>
            <button
              onClick={() => setViewMode('network')}
              className={`btn-sm ${viewMode === 'network' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '6px' }}
            >
              🕸️ Network Topology
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`btn-sm ${viewMode === 'grid' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.75rem', padding: '5px 12px', borderRadius: '6px' }}
            >
              📋 Card Grid
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: NETWORK TOPOLOGY GRAPH */}
      {viewMode === 'network' ? (
        <div className="network-canvas-wrapper">
          <svg className="network-svg" viewBox="0 0 800 500">
            <defs>
              {/* Radial gradient for central gateway */}
              <radialGradient id="gatewayGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#1e3a8a" stopOpacity="0.1" />
              </radialGradient>

              {/* Radial gradient for online nodes */}
              <radialGradient id="onlineNodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#047857" stopOpacity="0.15" />
              </radialGradient>

              {/* Radial gradient for offline nodes */}
              <radialGradient id="offlineNodeGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.15" />
              </radialGradient>

              {/* Drop shadow filter */}
              <filter id="glowGreen" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Mesh Links between nodes */}
            <line x1="190" y1="120" x2="610" y2="120" className="network-line-mesh" />
            <line x1="610" y1="120" x2="610" y2="380" className="network-line-mesh" />
            <line x1="610" y1="380" x2="190" y2="380" className="network-line-mesh" />
            <line x1="190" y1="380" x2="190" y2="120" className="network-line-mesh" />

            {/* Hub-to-Node Star Links */}
            {zones.map((zone, i) => {
              const pos = nodePositions[i] || nodePositions[0];
              const online = isZoneOnline(zone);
              return (
                <line
                  key={`link-${zone.zone_id}`}
                  x1={hubPos.x}
                  y1={hubPos.y}
                  x2={pos.x}
                  y2={pos.y}
                  className={online ? 'network-line-online' : 'network-line-offline'}
                />
              );
            })}

            {/* Central Master Gateway Hub */}
            <g transform={`translate(${hubPos.x}, ${hubPos.y})`}>
              {/* Outer pulsing radio wave */}
              <circle r="52" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.3" strokeDasharray="4 4">
                <animate attributeName="r" values="46;64;46" dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0.05;0.4" dur="3s" repeatCount="indefinite" />
              </circle>
              {/* Hub Base Circle */}
              <circle r="42" fill="url(#gatewayGlow)" stroke="#60a5fa" strokeWidth="2.5" />
              <text y="-6" textAnchor="middle" fontSize="24" fill="#ffffff">📡</text>
              <text y="14" textAnchor="middle" fontSize="10" fontWeight="700" fill="#93c5fd" letterSpacing="0.5">
                GATEWAY
              </text>
              <text y="24" textAnchor="middle" fontSize="8" fill="#cbd5e1">
                ESP32 Master Hub
              </text>
            </g>

            {/* Zone Nodes */}
            {zones.map((zone, i) => {
              const pos = nodePositions[i] || nodePositions[0];
              const online = isZoneOnline(zone);
              const isSelected = selectedZone?.zone_id === zone.zone_id;

              return (
                <g
                  key={zone.zone_id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className="node-group"
                  onClick={() => setSelectedZone(zone)}
                >
                  {/* Outer Pulsing Beacon: Green if Online, Red if Offline */}
                  <circle
                    r="40"
                    fill="none"
                    stroke={online ? '#10b981' : '#ef4444'}
                    className={online ? 'node-beacon-online' : 'node-beacon-offline'}
                  />

                  {/* Node Circle */}
                  <circle
                    r="34"
                    fill={online ? 'url(#onlineNodeGlow)' : 'url(#offlineNodeGlow)'}
                    stroke={online ? '#10b981' : '#ef4444'}
                    strokeWidth={isSelected ? '3.5' : '2'}
                    filter={online ? 'url(#glowGreen)' : 'url(#glowRed)'}
                  />

                  {/* Selection Indicator Ring */}
                  {isSelected && (
                    <circle r="44" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="4 2" />
                  )}

                  {/* Emoji Icon */}
                  <text y="-8" textAnchor="middle" fontSize="18">
                    {pos.emoji}
                  </text>

                  {/* Status Indicator Dot: Solid Green or Red */}
                  <circle
                    cx="18"
                    cy="-18"
                    r="5"
                    fill={online ? '#10b981' : '#ef4444'}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />

                  {/* Zone Name Label */}
                  <text y="10" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
                    {pos.label}
                  </text>

                  {/* Status Badge Text: ONLINE (green) or OFFLINE (red) */}
                  <rect
                    x="-32"
                    y="16"
                    width="64"
                    height="14"
                    rx="7"
                    fill={online ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.3)'}
                    stroke={online ? '#10b981' : '#ef4444'}
                    strokeWidth="0.8"
                  />
                  <text
                    y="26.5"
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="800"
                    fill={online ? '#34d399' : '#f87171'}
                    letterSpacing="0.8"
                  >
                    {online ? 'ONLINE' : 'OFFLINE'}
                  </text>

                  {/* Quick reading summary pill */}
                  <text y="44" textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600">
                    {zone.sensors.soil_moisture?.toFixed(0)}% Soil • {zone.sensors.temperature?.toFixed(1)}°C
                  </text>
                  <text y="56" textAnchor="middle" fontSize="7.5" fill="#64748b">
                    Click to view data ↗
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        /* VIEW 2: CARD GRID */
        <div className="zones-grid">
          {zones.map((zone, i) => {
            const online = isZoneOnline(zone);
            return (
              <div
                key={zone.zone_id}
                className="zone-card"
                onClick={() => setSelectedZone(zone)}
                style={{
                  cursor: 'pointer',
                  borderTop: `3px solid ${online ? '#10b981' : '#ef4444'}`
                }}
              >
                <div className="zone-header">
                  <div className="zone-name">{zone.zone_name}</div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: online ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: online ? '#34d399' : '#f87171',
                      border: `1px solid ${online ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                    }}
                  >
                    {online ? '🟢 ONLINE' : '🔴 OFFLINE'}
                  </span>
                </div>

                <div className="zone-sensors">
                  <div className="zone-sensor-item">
                    <span className="zs-icon">🌡️</span>
                    <div>
                      <div className="zs-value">{zone.sensors.temperature?.toFixed(1)}°C</div>
                      <div className="zs-label">Ambient</div>
                    </div>
                  </div>
                  <div className="zone-sensor-item">
                    <span className="zs-icon">💧</span>
                    <div>
                      <div className="zs-value">{zone.sensors.humidity?.toFixed(0)}%</div>
                      <div className="zs-label">Humidity</div>
                    </div>
                  </div>
                  <div className="zone-sensor-item">
                    <span className="zs-icon">🌿</span>
                    <div>
                      <div className="zs-value">{zone.sensors.soil_moisture?.toFixed(0)}%</div>
                      <div className="zs-label">Soil Moisture</div>
                    </div>
                  </div>
                  <div className="zone-sensor-item">
                    <span className="zs-icon">☀️</span>
                    <div>
                      <div className="zs-value">{zone.sensors.light?.toFixed(0)}%</div>
                      <div className="zs-label">Sunlight</div>
                    </div>
                  </div>
                </div>

                <div className="zone-health-bar">
                  <div
                    className="zone-health-fill"
                    style={{
                      width: `${zone.health_score}%`,
                      background: zone.health_score >= 70
                        ? 'linear-gradient(90deg, #10b981, #34d399)'
                        : zone.health_score >= 40
                          ? 'linear-gradient(90deg, #f59e0b, #fbbf24)'
                          : 'linear-gradient(90deg, #f43f5e, #fb7185)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.72rem', color: '#64748b' }}>
                  <span>Health: {zone.health_score?.toFixed(0)}%</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Inspect node →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DETAIL MODAL / DRAWER: OPENED WHEN ANY NODE IS CLICKED */}
      {selectedZone && (
        <div className="zone-modal-overlay" onClick={() => setSelectedZone(null)}>
          <div className="zone-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{selectedZone.zone_name}</h2>
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    background: isZoneOnline(selectedZone) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    color: isZoneOnline(selectedZone) ? '#34d399' : '#f87171',
                    border: `1px solid ${isZoneOnline(selectedZone) ? '#10b981' : '#ef4444'}`,
                  }}>
                    {isZoneOnline(selectedZone) ? '🟢 ONLINE' : '🔴 OFFLINE'}
                  </span>
                </div>
                <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Soil Substrate: <strong>{selectedZone.soil_type || 'Loamy'}</strong> • Node ID: <code style={{ color: '#38bdf8' }}>{selectedZone.zone_id}</code>
                </p>
              </div>

              <button
                onClick={() => setSelectedZone(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Interactive Toggle for Online/Offline Simulation */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              marginBottom: '20px'
            }}>
              <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                Simulate Node Link Status (Red/Green Testing):
              </span>
              <button
                onClick={() => toggleZoneStatus(selectedZone.zone_id)}
                className={`btn btn-sm ${isZoneOnline(selectedZone) ? 'btn-danger' : 'btn-primary'}`}
                style={{
                  padding: '6px 14px',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  background: isZoneOnline(selectedZone) ? '#ef4444' : '#10b981',
                  border: 'none',
                  color: '#fff'
                }}
              >
                {isZoneOnline(selectedZone) ? 'Set Node OFFLINE (Red)' : 'Set Node ONLINE (Green)'}
              </button>
            </div>

            {/* Live Telemetry Grid */}
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              📊 Complete Environmental Telemetry
            </h4>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '12px',
              marginBottom: '24px'
            }}>
              {[
                { icon: '🌿', label: 'Soil Moisture', value: `${selectedZone.sensors.soil_moisture?.toFixed(1)}%`, color: '#10b981' },
                { icon: '🌡️', label: 'Ambient Temp', value: `${selectedZone.sensors.temperature?.toFixed(1)}°C`, color: '#f97316' },
                { icon: '💧', label: 'Humidity', value: `${selectedZone.sensors.humidity?.toFixed(1)}%`, color: '#3b82f6' },
                { icon: '☀️', label: 'Light Level', value: `${selectedZone.sensors.light?.toFixed(1)}%`, color: '#fbbf24' },
                { icon: '🌧️', label: 'Rain Detection', value: `${selectedZone.sensors.rain?.toFixed(1)}%`, color: '#06b6d4' },
                { icon: '🧪', label: 'Soil pH', value: `${selectedZone.sensors.ph || 6.5}`, color: '#a855f7' },
                { icon: '🌡️', label: 'Soil Temp', value: `${selectedZone.sensors.soil_temperature?.toFixed(1) || (selectedZone.sensors.temperature - 1.5).toFixed(1)}°C`, color: '#f43f5e' },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, fontFamily: 'JetBrains Mono', color: item.color }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                    {item.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Health & Diagnostic Section */}
            <div style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Zone Health Assessment</span>
                <span style={{
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono',
                  color: selectedZone.health_score >= 70 ? '#34d399' : selectedZone.health_score >= 40 ? '#fbbf24' : '#fb7185'
                }}>
                  {selectedZone.health_score?.toFixed(0)}% — {selectedZone.status?.toUpperCase()}
                </span>
              </div>
              <div style={{ height: '8px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${selectedZone.health_score}%`,
                  background: selectedZone.health_score >= 70 ? '#10b981' : selectedZone.health_score >= 40 ? '#f59e0b' : '#ef4444'
                }} />
              </div>
            </div>

            {/* Network Node Metadata */}
            <h4 style={{ fontSize: '0.9rem', marginBottom: '12px', color: 'var(--text-secondary)' }}>
              📡 Node Network Diagnostics
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '10px',
              fontSize: '0.78rem',
              color: '#94a3b8'
            }}>
              <div>IP Address: <strong style={{ color: '#fff' }}>{selectedZone.ip_address || '192.168.1.102'}</strong></div>
              <div>MAC: <strong style={{ color: '#fff' }}>{selectedZone.mac_address || '24:6F:28:B4:7C:02'}</strong></div>
              <div>RSSI: <strong style={{ color: '#fff' }}>{selectedZone.rssi || -58} dBm (Good)</strong></div>
              <div>Battery: <strong style={{ color: '#fff' }}>{selectedZone.battery_level || '96%'}</strong></div>
              <div>Firmware: <strong style={{ color: '#fff' }}>{selectedZone.firmware || 'v2.4-Mesh'}</strong></div>
              <div>Heartbeat: <strong style={{ color: '#34d399' }}>{selectedZone.last_heartbeat || 'Active (< 2s)'}</strong></div>
            </div>

            {/* Footer button */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setSelectedZone(null)}
                className="btn btn-secondary"
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer'
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

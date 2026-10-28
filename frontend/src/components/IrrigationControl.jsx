import React, { useState, useEffect } from 'react';
import { fetchIrrigationStatus, controlIrrigation, fetchIrrigationHistory } from '../api';

export default function IrrigationControl() {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      fetchIrrigationStatus(),
      fetchIrrigationHistory(20),
    ]).then(([statusData, histData]) => {
      setStatus(statusData);
      setHistory(histData.history || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleRelay = async (relay) => {
    const newState = relay === 'relay1' ? !status.relay1_active : !status.relay2_active;
    await controlIrrigation({ [relay]: newState });
    loadData();
  };

  const toggleAuto = async () => {
    await controlIrrigation({ auto: !status.auto_mode });
    loadData();
  };

  if (loading || !status) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  return (
    <div>
      {/* Auto Mode Toggle */}
      <div className="auto-mode-card">
        <div className="auto-mode-info">
          <span className="mode-icon">🤖</span>
          <div>
            <h3>Automatic Irrigation</h3>
            <p>System will irrigate based on soil moisture and rain data</p>
          </div>
        </div>
        <button className={`switch ${status.auto_mode ? 'active' : ''}`} onClick={toggleAuto}>
          <div className="switch-knob" />
        </button>
      </div>

      {/* Relay Controls */}
      <div className="irrigation-grid">
        <div className={`relay-card ${status.relay1_active ? 'active' : ''}`}>
          <div className="relay-icon">🚰</div>
          <div className="relay-name">Water Pump (Relay 1)</div>
          <div className={`relay-status ${status.relay1_active ? 'on' : 'off'}`}>
            {status.relay1_active ? '● ACTIVE' : '○ INACTIVE'}
          </div>
          {!status.auto_mode && (
            <button
              className={`toggle-btn ${status.relay1_active ? 'on' : 'off'}`}
              onClick={() => toggleRelay('relay1')}
            >
              {status.relay1_active ? 'Turn OFF' : 'Turn ON'}
            </button>
          )}
          {status.auto_mode && (
            <div style={{ fontSize: '0.78rem', color: '#484f58' }}>
              Controlled automatically
            </div>
          )}
        </div>

        <div className={`relay-card ${status.relay2_active ? 'active' : ''}`}>
          <div className="relay-icon">🔌</div>
          <div className="relay-name">Solenoid Valve (Relay 2)</div>
          <div className={`relay-status ${status.relay2_active ? 'on' : 'off'}`}>
            {status.relay2_active ? '● ACTIVE' : '○ INACTIVE'}
          </div>
          {!status.auto_mode && (
            <button
              className={`toggle-btn ${status.relay2_active ? 'on' : 'off'}`}
              onClick={() => toggleRelay('relay2')}
            >
              {status.relay2_active ? 'Turn OFF' : 'Turn ON'}
            </button>
          )}
          {status.auto_mode && (
            <div style={{ fontSize: '0.78rem', color: '#484f58' }}>
              Controlled automatically
            </div>
          )}
        </div>

        <div className="relay-card">
          <div className="relay-icon">📋</div>
          <div className="relay-name">Decision Engine</div>
          {status.decision && (
            <div className="decision-card" style={{ border: 'none', padding: '0', marginTop: '8px' }}>
              <div className="decision-text">
                <strong>{status.decision.should_irrigate ? '💧 Irrigation Needed' : '✅ No Irrigation Needed'}</strong>
                <br />
                {status.decision.reason}
              </div>
              <div style={{
                marginTop: '12px', display: 'flex', gap: '16px',
                fontSize: '0.78rem', color: '#8b949e',
              }}>
                <span>Soil: <strong style={{ color: '#e6edf3' }}>{status.decision.soil_moisture?.toFixed(0)}%</strong></span>
                <span>Threshold: <strong style={{ color: '#e6edf3' }}>{status.decision.threshold?.toFixed(0)}%</strong></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📜 Irrigation History</span>
          <span className="card-badge" style={{
            background: 'rgba(6, 182, 212, 0.1)',
            color: '#22d3ee',
          }}>
            {history.length} events
          </span>
        </div>
        <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {history.length === 0 ? (
            <div style={{ color: '#484f58', fontSize: '0.85rem', padding: '20px', textAlign: 'center' }}>
              No irrigation events yet
            </div>
          ) : (
            history.map((event, i) => (
              <div key={event.id || i} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                fontSize: '0.82rem',
              }}>
                <span style={{ fontSize: '1rem' }}>
                  {event.relay1 ? '💧' : '⏸️'}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#e6edf3', fontWeight: 500 }}>
                    {event.relay1 ? 'Irrigation ON' : 'Irrigation OFF'}
                    {event.auto_mode ? ' (Auto)' : ' (Manual)'}
                  </div>
                  <div style={{ color: '#484f58', fontSize: '0.75rem', marginTop: '2px' }}>
                    {event.reason}
                  </div>
                </div>
                <div style={{ color: '#484f58', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
                  {new Date(event.timestamp).toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

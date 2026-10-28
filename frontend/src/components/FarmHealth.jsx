import React from 'react';

export default function FarmHealth({ health }) {
  if (!health) return null;

  const { overall_score, status, alerts } = health;

  // SVG ring calculations
  const radius = 68;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (overall_score / 100) * circumference;

  const ringColor = () => {
    if (overall_score >= 85) return '#4ade80';
    if (overall_score >= 70) return '#34d399';
    if (overall_score >= 50) return '#fbbf24';
    if (overall_score >= 30) return '#f59e0b';
    return '#fb7185';
  };

  const statusIcons = {
    temperature_status: { icon: '🌡️', label: 'Temperature' },
    humidity_status: { icon: '💧', label: 'Humidity' },
    soil_moisture_status: { icon: '🌿', label: 'Soil Moisture' },
    light_status: { icon: '☀️', label: 'Light' },
    rain_status: { icon: '🌧️', label: 'Rain' },
  };

  return (
    <div className="health-container">
      <div className="health-score-card">
        <div className="health-ring">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle className="health-ring-bg" cx="80" cy="80" r={radius} />
            <circle
              className="health-ring-fill"
              cx="80" cy="80" r={radius}
              stroke={ringColor()}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="health-ring-value" style={{ color: ringColor() }}>
            {Math.round(overall_score)}
          </div>
        </div>
        <div className={`health-status-label ${status}`}>
          {status}
        </div>
        <div style={{ marginTop: '16px' }}>
          {Object.entries(statusIcons).map(([key, { icon, label }]) => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '0.82rem', marginBottom: '6px',
              color: health[key] === 'good' ? '#4ade80' : health[key] === 'warning' ? '#fbbf24' : '#fb7185'
            }}>
              <span>{icon}</span>
              <span>{label}</span>
              <span style={{ marginLeft: 'auto', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                {health[key]}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="alerts-card">
        <div className="card-header">
          <span className="card-title">⚡ Alerts & Notifications</span>
          <span className="card-badge" style={{
            background: alerts.length ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)',
            color: alerts.length ? '#fbbf24' : '#4ade80',
          }}>
            {alerts.length || 0}
          </span>
        </div>
        {alerts.length > 0 ? (
          alerts.map((alert, i) => (
            <div key={i} className={`alert-item ${alert.includes('🚨') || alert.includes('critical') ? 'critical' : ''}`}>
              {alert}
            </div>
          ))
        ) : (
          <div className="no-alerts">
            <span className="check-icon">✅</span>
            All systems are operating normally.
          </div>
        )}
      </div>
    </div>
  );
}

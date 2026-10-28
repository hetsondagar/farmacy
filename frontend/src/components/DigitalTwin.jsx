import React from 'react';
import { useZones } from '../hooks/useData';

const ZONE_CONFIG = [
  { emoji: '🌾', color: '#10b981' },
  { emoji: '🥬', color: '#3b82f6' },
  { emoji: '🌻', color: '#f59e0b' },
  { emoji: '🌱', color: '#a855f7' },
];

export default function DigitalTwin({ sensorData }) {
  const { zones } = useZones();

  return (
    <div className="digital-twin-container">
      <div className="twin-bg-glow" />

      <div className="card-header">
        <span className="card-title">🏡 Digital Twin — Farm Overview</span>
        <span className="card-badge" style={{
          background: 'rgba(16, 185, 129, 0.1)',
          color: '#34d399',
        }}>
          LIVE
        </span>
      </div>

      <div className="twin-farm-visual">
        {zones.length > 0 ? zones.map((zone, i) => {
          const config = ZONE_CONFIG[i] || ZONE_CONFIG[0];
          return (
            <div key={zone.zone_id} className="twin-zone">
              <span className="twin-zone-emoji">{config.emoji}</span>
              <div className="twin-zone-name">{zone.zone_name}</div>
              <div className="twin-zone-stat">
                🌡️ <span className="value">{zone.sensors.temperature?.toFixed(1)}°C</span>
              </div>
              <div className="twin-zone-stat">
                🌿 <span className="value">{zone.sensors.soil_moisture?.toFixed(0)}%</span>
              </div>
              <div className="twin-zone-stat">
                ☀️ <span className="value">{zone.sensors.light?.toFixed(0)}%</span>
              </div>
              <div style={{
                marginTop: '10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: zone.health_score >= 70 ? '#4ade80' : zone.health_score >= 40 ? '#fbbf24' : '#fb7185',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {zone.status} — {zone.health_score?.toFixed(0)}%
              </div>
            </div>
          );
        }) : (
          // Fallback with raw sensor data
          ZONE_CONFIG.map((config, i) => (
            <div key={i} className="twin-zone">
              <span className="twin-zone-emoji">{config.emoji}</span>
              <div className="twin-zone-name">Zone {i + 1}</div>
              {sensorData && (
                <>
                  <div className="twin-zone-stat">
                    🌡️ <span className="value">{sensorData.temperature?.toFixed(1)}°C</span>
                  </div>
                  <div className="twin-zone-stat">
                    🌿 <span className="value">{sensorData.soil_moisture?.toFixed(0)}%</span>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Live summary bar */}
      {sensorData && (
        <div style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'center',
          gap: '32px',
          padding: '16px',
          background: 'rgba(255,255,255,0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.04)',
        }}>
          {[
            { icon: '🌡️', label: 'Temp', value: `${sensorData.temperature?.toFixed(1)}°C` },
            { icon: '💧', label: 'Humidity', value: `${sensorData.humidity?.toFixed(0)}%` },
            { icon: '🌿', label: 'Soil', value: `${sensorData.soil_moisture?.toFixed(0)}%` },
            { icon: '☀️', label: 'Light', value: `${sensorData.light?.toFixed(0)}%` },
            { icon: '🌧️', label: 'Rain', value: `${sensorData.rain?.toFixed(0)}%` },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.3rem', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{
                fontSize: '1rem', fontWeight: 700,
                fontFamily: 'JetBrains Mono', color: '#e6edf3',
              }}>
                {item.value}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#484f58', marginTop: '2px' }}>
                {item.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

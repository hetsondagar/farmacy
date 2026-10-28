import React from 'react';

const SENSOR_CONFIG = [
  {
    key: 'temperature',
    label: 'Temperature',
    icon: '🌡️',
    unit: '°C',
    cssClass: 'temperature',
    maxVal: 50,
    format: v => v?.toFixed(1),
  },
  {
    key: 'humidity',
    label: 'Humidity',
    icon: '💧',
    unit: '%',
    cssClass: 'humidity',
    maxVal: 100,
    format: v => v?.toFixed(1),
  },
  {
    key: 'soil_moisture',
    label: 'Soil Moisture',
    icon: '🌿',
    unit: '%',
    cssClass: 'soil',
    maxVal: 100,
    format: v => v?.toFixed(1),
  },
  {
    key: 'light',
    label: 'Light Intensity',
    icon: '☀️',
    unit: '%',
    cssClass: 'light',
    maxVal: 100,
    format: v => v?.toFixed(1),
  },
  {
    key: 'rain',
    label: 'Rain Intensity',
    icon: '🌧️',
    unit: '%',
    cssClass: 'rain',
    maxVal: 100,
    format: v => v?.toFixed(1),
  },
];

export default function SensorGauges({ data }) {
  if (!data) {
    return (
      <div className="sensor-grid">
        {SENSOR_CONFIG.map(s => (
          <div key={s.key} className={`sensor-card ${s.cssClass}`}>
            <span className="sensor-icon">{s.icon}</span>
            <div className="sensor-label">{s.label}</div>
            <div className="sensor-value">--<span className="unit">{s.unit}</span></div>
            <div className="sensor-bar">
              <div className={`sensor-bar-fill ${s.cssClass}`} style={{ width: '0%' }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="sensor-grid">
      {SENSOR_CONFIG.map(sensor => {
        const value = data[sensor.key];
        const displayVal = sensor.format(value);
        const barWidth = Math.min(100, Math.max(0, (value / sensor.maxVal) * 100));

        return (
          <div key={sensor.key} className={`sensor-card ${sensor.cssClass}`}>
            <span className="sensor-icon">{sensor.icon}</span>
            <div className="sensor-label">{sensor.label}</div>
            <div className="sensor-value">
              {displayVal}<span className="unit">{sensor.unit}</span>
            </div>
            <div className="sensor-bar">
              <div
                className={`sensor-bar-fill ${sensor.cssClass}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

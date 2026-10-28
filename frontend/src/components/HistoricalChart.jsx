import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, Legend
} from 'recharts';
import { useHistory } from '../hooks/useData';

const COLORS = {
  temperature: '#f97316',
  humidity: '#3b82f6',
  soil_moisture: '#10b981',
  light: '#eab308',
  rain: '#06b6d4',
};

const LABELS = {
  temperature: 'Temperature (°C)',
  humidity: 'Humidity (%)',
  soil_moisture: 'Soil Moisture (%)',
  light: 'Light (%)',
  rain: 'Rain (%)',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div style={{
      background: 'rgba(13, 17, 23, 0.95)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '14px 16px',
      backdropFilter: 'blur(8px)',
      fontSize: '0.82rem',
    }}>
      <div style={{ color: '#8b949e', marginBottom: '8px', fontSize: '0.75rem' }}>
        {label}
      </div>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color }} />
          <span style={{ color: '#8b949e' }}>{LABELS[entry.dataKey] || entry.dataKey}:</span>
          <span style={{ color: '#e6edf3', fontWeight: 600, fontFamily: 'JetBrains Mono' }}>
            {entry.value?.toFixed(1)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function HistoricalChart() {
  const [hours, setHours] = useState(24);
  const [visibleLines, setVisibleLines] = useState({
    temperature: true,
    humidity: true,
    soil_moisture: true,
    light: true,
    rain: true,
  });
  const { history, loading, refresh } = useHistory(hours);

  const timeOptions = [
    { label: '1H', value: 1 },
    { label: '6H', value: 6 },
    { label: '12H', value: 12 },
    { label: '24H', value: 24 },
    { label: '48H', value: 48 },
    { label: '7D', value: 168 },
  ];

  const toggleLine = (key) => {
    setVisibleLines(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Format timestamps for display
  const chartData = history.map(r => ({
    ...r,
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));

  // Downsample if too many points
  const maxPoints = 200;
  const step = Math.max(1, Math.floor(chartData.length / maxPoints));
  const sampledData = chartData.filter((_, i) => i % step === 0);

  return (
    <div className="chart-container card">
      <div className="card-header">
        <span className="card-title">📈 Historical Analytics</span>
        <div className="chart-controls">
          {timeOptions.map(opt => (
            <button
              key={opt.value}
              className={`chart-btn ${hours === opt.value ? 'active' : ''}`}
              onClick={() => { setHours(opt.value); refresh(opt.value); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensor toggles */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
        {Object.entries(LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => toggleLine(key)}
            style={{
              padding: '4px 12px',
              borderRadius: '9999px',
              border: `1px solid ${visibleLines[key] ? COLORS[key] : 'rgba(255,255,255,0.08)'}`,
              background: visibleLines[key] ? `${COLORS[key]}15` : 'transparent',
              color: visibleLines[key] ? COLORS[key] : '#484f58',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              transition: 'all 0.2s ease',
            }}
          >
            {label.split(' (')[0]}
          </button>
        ))}
      </div>

      <div className="chart-wrapper">
        {loading ? (
          <div className="loading-spinner"><div className="spinner" /></div>
        ) : sampledData.length === 0 ? (
          <div className="no-alerts" style={{ height: '100%' }}>
            <span style={{ fontSize: '2rem', marginBottom: '8px' }}>📊</span>
            No historical data yet. Data will appear as sensors report.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sampledData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                {Object.entries(COLORS).map(([key, color]) => (
                  <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 11, fill: '#484f58' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#484f58' }}
                axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(COLORS).map(([key, color]) =>
                visibleLines[key] && (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={color}
                    strokeWidth={2}
                    fill={`url(#grad-${key})`}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 2, fill: '#0d1117' }}
                  />
                )
              )}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import SensorGauges from './components/SensorGauges';
import FarmHealth from './components/FarmHealth';
import HistoricalChart from './components/HistoricalChart';
import CropRecommendations from './components/CropRecommendations';
import IrrigationControl from './components/IrrigationControl';
import ZoneMonitor from './components/ZoneMonitor';
import DigitalTwin from './components/DigitalTwin';
import ReverseCropChecker from './components/ReverseCropChecker';
import { useLiveData, useStats } from './hooks/useData';
import './App.css';

const PAGE_CONFIG = {
  dashboard: {
    title: '📊 Dashboard',
    subtitle: 'Real-time overview of your smart farm',
  },
  sensors: {
    title: '📡 Live Sensors',
    subtitle: 'Real-time sensor readings from your Arduino',
  },
  analytics: {
    title: '📈 Analytics',
    subtitle: 'Historical sensor data and trends',
  },
  crops: {
    title: '🌾 Crop Advisory',
    subtitle: 'AI-powered crop suitability recommendations',
  },
  checker: {
    title: '🔍 Reverse Crop Condition Checker',
    subtitle: 'Evaluate farm microclimate similarity against crop_data.csv baseline',
  },
  irrigation: {
    title: '💧 Irrigation Control',
    subtitle: 'Manage water pump and solenoid valve',
  },
  zones: {
    title: '🗺️ Farm Zones & Mesh Network',
    subtitle: 'Interactive IoT network topology with node-level telemetry and status indicators',
  },
  twin: {
    title: '🏡 Digital Twin',
    subtitle: 'Virtual representation of your physical farm',
  },
};

function StatsBar({ stats }) {
  if (!stats) return null;
  return (
    <div className="stats-bar">
      <div className="stat-item">
        <span className="stat-value">{stats.total_readings?.toLocaleString() || 0}</span>
        <span className="stat-label">Total Readings</span>
      </div>
      <div className="stat-item">
        <span className="stat-value">{stats.readings_last_hour || 0}</span>
        <span className="stat-label">Last Hour</span>
      </div>
      {stats.avg_temperature !== undefined && (
        <>
          <div className="stat-item">
            <span className="stat-value">{stats.avg_temperature}°C</span>
            <span className="stat-label">Avg Temp</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.avg_humidity}%</span>
            <span className="stat-label">Avg Humidity</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{stats.avg_soil_moisture}%</span>
            <span className="stat-label">Avg Soil</span>
          </div>
        </>
      )}
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { sensorData, healthData, irrigationData, connected } = useLiveData();
  const stats = useStats();

  const page = PAGE_CONFIG[activeTab];

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} connected={connected} />

      <main className="main-content">
        <div className="page-header">
          <h2>{page.title}</h2>
          <p>{page.subtitle}</p>
        </div>

        {/* ========== DASHBOARD ========== */}
        {activeTab === 'dashboard' && (
          <>
            <StatsBar stats={stats} />
            <SensorGauges data={sensorData} />
            <FarmHealth health={healthData} />
            <DigitalTwin sensorData={sensorData} />
            <HistoricalChart />
          </>
        )}

        {/* ========== SENSORS ========== */}
        {activeTab === 'sensors' && (
          <>
            <SensorGauges data={sensorData} />
            <div className="card" style={{ marginTop: '20px' }}>
              <div className="card-header">
                <span className="card-title">📋 Raw Sensor Data</span>
                <span className="card-badge" style={{
                  background: connected ? 'rgba(34,197,94,0.1)' : 'rgba(244,63,94,0.1)',
                  color: connected ? '#4ade80' : '#fb7185',
                }}>
                  {connected ? 'LIVE' : 'OFFLINE'}
                </span>
              </div>
              {sensorData && (
                <div style={{
                  fontFamily: 'JetBrains Mono', fontSize: '0.85rem',
                  background: 'rgba(0,0,0,0.3)', borderRadius: '8px',
                  padding: '16px', lineHeight: 2,
                }}>
                  <pre style={{ color: '#8b949e', margin: 0 }}>
{`{
  "soil_moisture": ${sensorData.soil_moisture?.toFixed(1)}%,
  "temperature":   ${sensorData.temperature?.toFixed(1)}°C,
  "humidity":      ${sensorData.humidity?.toFixed(1)}%,
  "light":         ${sensorData.light?.toFixed(1)}%,
  "rain":          ${sensorData.rain?.toFixed(1)}%,
  "timestamp":     "${sensorData.timestamp}"
}`}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== ANALYTICS ========== */}
        {activeTab === 'analytics' && (
          <>
            <StatsBar stats={stats} />
            <HistoricalChart />
          </>
        )}

        {/* ========== CROPS ========== */}
        {activeTab === 'crops' && (
          <>
            <CropRecommendations />
            <div style={{ marginTop: '28px' }}>
              <ReverseCropChecker sensorData={sensorData} />
            </div>
          </>
        )}

        {/* ========== REVERSE CROP CHECKER ========== */}
        {activeTab === 'checker' && <ReverseCropChecker sensorData={sensorData} />}

        {/* ========== IRRIGATION ========== */}
        {activeTab === 'irrigation' && <IrrigationControl />}

        {/* ========== ZONES ========== */}
        {activeTab === 'zones' && <ZoneMonitor />}

        {/* ========== DIGITAL TWIN ========== */}
        {activeTab === 'twin' && <DigitalTwin sensorData={sensorData} />}
      </main>
    </div>
  );
}

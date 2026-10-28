import React from 'react';
import farmacyLogo from '../assets/farmacy.png';

const NAV_ITEMS = [
  { id: 'dashboard', icon: '📊', label: 'Dashboard' },
  { id: 'sensors', icon: '📡', label: 'Live Sensors' },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
  { id: 'crops', icon: '🌾', label: 'Crop Advisory' },
  { id: 'checker', icon: '🔍', label: 'Condition Checker' },
  { id: 'irrigation', icon: '💧', label: 'Irrigation' },
  { id: 'zones', icon: '🗺️', label: 'Farm Zones' },
  { id: 'twin', icon: '🏡', label: 'Digital Twin' },
];

export default function Sidebar({ activeTab, onTabChange, connected }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <img src={farmacyLogo} alt="FARMACY Logo" className="sidebar-logo-img" />
        <div>
          <h1>FARMACY</h1>
          <span>Smart Farming IoT</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(item => (
          <div
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onTabChange(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="connection-badge">
          <div className={`connection-dot ${connected ? 'connected' : ''}`} />
          {connected ? 'Live — Connected' : 'Connecting...'}
        </div>
      </div>
    </aside>
  );
}

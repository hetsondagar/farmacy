import React, { useState, useEffect } from 'react';
import { fetchReverseCheckCrops, fetchReverseCheck, checkCustomConditions, saveCropData } from '../api';

export default function ReverseCropChecker({ sensorData }) {
  const [crops, setCrops] = useState([]);
  const [selectedCrop, setSelectedCrop] = useState('tomato');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [mode, setMode] = useState('live'); // 'live' or 'custom'

  // Custom inputs for simulation
  const [customInputs, setCustomInputs] = useState({
    temperature_c: 24.5,
    humidity_percent: 60.0,
    ldr_adc: 700,
    rain_sensor_adc: 850,
  });

  // Load available crops on mount
  useEffect(() => {
    fetchReverseCheckCrops()
      .then(res => {
        if (res.crops && res.crops.length > 0) {
          setCrops(res.crops);
          if (!res.crops.includes(selectedCrop)) {
            setSelectedCrop(res.crops[0]);
          }
        }
      })
      .catch(err => console.error('Failed to load crops list:', err));
  }, []);

  // Run analysis when crop or live sensor data changes
  useEffect(() => {
    if (!selectedCrop) return;

    if (mode === 'live') {
      setLoading(true);
      fetchReverseCheck(selectedCrop)
        .then(res => {
          setAnalysis(res);
          setLoading(false);
        })
        .catch(err => {
          console.error('Reverse check failed:', err);
          setLoading(false);
        });
    } else {
      setLoading(true);
      checkCustomConditions({
        crop: selectedCrop,
        ...customInputs,
      })
        .then(res => {
          setAnalysis(res);
          setLoading(false);
        })
        .catch(err => {
          console.error('Custom reverse check failed:', err);
          setLoading(false);
        });
    }
  }, [selectedCrop, mode, sensorData?.temperature, sensorData?.humidity, sensorData?.light, sensorData?.rain]);

  // Handle custom input change
  const handleCustomChange = (field, val) => {
    const updated = { ...customInputs, [field]: parseFloat(val) || 0 };
    setCustomInputs(updated);
    checkCustomConditions({
      crop: selectedCrop,
      ...updated,
    }).then(res => setAnalysis(res));
  };

  // Save current condition to crop_data.csv
  const handleSaveToCsv = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const payload = {
        crop_label: selectedCrop,
        temperature_c: mode === 'live' ? sensorData?.temperature : customInputs.temperature_c,
        humidity_percent: mode === 'live' ? sensorData?.humidity : customInputs.humidity_percent,
        ldr_adc: mode === 'live' ? ((sensorData?.light || 70) / 100) * 1023 : customInputs.ldr_adc,
        rain_sensor_adc: mode === 'live' ? ((100 - (sensorData?.rain || 0)) / 100) * 1023 : customInputs.rain_sensor_adc,
      };

      const res = await saveCropData(payload);
      if (res.status === 'success') {
        setSaveMessage({ type: 'success', text: `Saved sample for '${selectedCrop}' into crop_data.csv!` });
        // Re-run check to update sample counts
        fetchReverseCheck(selectedCrop).then(setAnalysis);
      } else {
        setSaveMessage({ type: 'error', text: res.message || 'Failed to save data' });
      }
    } catch (e) {
      setSaveMessage({ type: 'error', text: 'Error saving to crop_data.csv' });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  };

  return (
    <div className="reverse-checker-container card">
      {/* Header */}
      <div className="card-header" style={{ marginBottom: '16px' }}>
        <div>
          <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🔍</span> Reverse Crop Condition Checker
          </span>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
            Compares live or simulated farm conditions against historical baseline distributions in <code style={{ color: 'var(--primary)', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>crop_data.csv</code>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div className="mode-toggle" style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px' }}>
            <button
              className={`btn-sm ${mode === 'live' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('live')}
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px' }}
            >
              📡 Live Farm
            </button>
            <button
              className={`btn-sm ${mode === 'custom' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setMode('custom')}
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px' }}
            >
              🎛️ Simulation
            </button>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      <div style={{
        padding: '10px 14px',
        background: 'rgba(59, 130, 246, 0.08)',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '8px',
        fontSize: '0.75rem',
        color: '#93c5fd',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span>ℹ️</span>
        <span>
          <strong>Reference Model:</strong> Measures statistical similarity (median, 10th-90th percentiles, σ deviation) to historical records in <code>crop_data.csv</code>. Does not diagnose plant pathology.
        </span>
      </div>

      {/* Control Bar: Crop Selector & Save Button */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '24px',
        padding: '14px 18px',
        background: 'var(--bg-glass)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Select Target Crop:
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              textTransform: 'capitalize'
            }}
          >
            {crops.map(c => (
              <option key={c} value={c}>
                {c.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleSaveToCsv}
            disabled={saving}
            className="btn btn-primary"
            style={{
              fontSize: '0.82rem',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {saving ? 'Saving...' : '💾 Save Data to crop_data.csv'}
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {saveMessage && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          marginBottom: '16px',
          background: saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${saveMessage.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
          color: saveMessage.type === 'success' ? '#34d399' : '#f87171',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span>{saveMessage.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{saveMessage.text}</span>
        </div>
      )}

      {/* Simulation Sliders (If custom mode is active) */}
      {mode === 'custom' && (
        <div style={{
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '0.85rem', marginBottom: '12px', color: 'var(--text-primary)' }}>
            🎛️ Adjust Simulation Microclimate Inputs:
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Temperature: <strong>{customInputs.temperature_c}°C</strong>
              </label>
              <input
                type="range"
                min="5"
                max="45"
                step="0.5"
                value={customInputs.temperature_c}
                onChange={(e) => handleCustomChange('temperature_c', e.target.value)}
                style={{ width: '100%', accentColor: '#f97316' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Humidity: <strong>{customInputs.humidity_percent}%</strong>
              </label>
              <input
                type="range"
                min="10"
                max="95"
                step="1"
                value={customInputs.humidity_percent}
                onChange={(e) => handleCustomChange('humidity_percent', e.target.value)}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                LDR Light ADC: <strong>{customInputs.ldr_adc}</strong>
              </label>
              <input
                type="range"
                min="100"
                max="1023"
                step="10"
                value={customInputs.ldr_adc}
                onChange={(e) => handleCustomChange('ldr_adc', e.target.value)}
                style={{ width: '100%', accentColor: '#fbbf24' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Rain Sensor ADC: <strong>{customInputs.rain_sensor_adc}</strong>
              </label>
              <input
                type="range"
                min="100"
                max="1023"
                step="10"
                value={customInputs.rain_sensor_adc}
                onChange={(e) => handleCustomChange('rain_sensor_adc', e.target.value)}
                style={{ width: '100%', accentColor: '#06b6d4' }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Analysis Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          <div className="spinner" style={{ margin: '0 auto 12px' }} />
          Computing condition affinity against crop_data.csv baseline...
        </div>
      ) : analysis && !analysis.error ? (
        <div>
          {/* Top Score Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '16px',
            marginBottom: '24px'
          }}>
            <div style={{
              background: 'var(--bg-glass)',
              border: `1px solid ${analysis.verdict_color || '#10b981'}40`,
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              boxShadow: `0 4px 20px ${analysis.verdict_color || '#10b981'}15`
            }}>
              <div style={{
                width: '74px',
                height: '74px',
                borderRadius: '50%',
                background: `conic-gradient(${analysis.verdict_color || '#10b981'} ${analysis.match_score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: 'var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  color: analysis.verdict_color || '#10b981'
                }}>
                  {analysis.match_score?.toFixed(0)}%
                </div>
              </div>
              <div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: analysis.verdict_color || '#10b981',
                  background: `${analysis.verdict_color || '#10b981'}15`,
                  padding: '3px 8px',
                  borderRadius: '4px'
                }}>
                  {analysis.verdict}
                </span>
                <h3 style={{ fontSize: '1.2rem', margin: '6px 0 2px 0', textTransform: 'capitalize' }}>
                  {analysis.crop_name?.replace('_', ' ')} Profile Match
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Based on {analysis.sample_count} historical observations in crop_data.csv
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center'
            }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Statistical Synthesis:
              </div>
              <p style={{ fontSize: '0.88rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                {analysis.explanation}
              </p>
              <div style={{ fontSize: '0.72rem', color: '#8b949e', marginTop: '8px' }}>
                Mean normalized σ deviation: <strong>{analysis.mean_deviation_std} std devs</strong>
              </div>
            </div>
          </div>

          {/* Features Comparison Breakdown */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.82rem',
              textAlign: 'left',
              background: 'var(--bg-glass)',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Environmental Metric</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Current Reading</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Historical Median</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Normal Envelope [P10 - P90]</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>Status Assessment</th>
                </tr>
              </thead>
              <tbody>
                {analysis.features?.map((f, i) => (
                  <tr key={f.feature} style={{ borderBottom: i < analysis.features.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      <div>{f.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{f.feature} ({f.unit})</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {f.current} <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{f.unit}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', color: '#8b949e' }}>
                      {f.typical_median}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'JetBrains Mono', color: '#8b949e' }}>
                      [{f.p10} — {f.p90}]
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: f.status_code === 'optimal'
                          ? 'rgba(16, 185, 129, 0.12)'
                          : 'rgba(245, 158, 11, 0.12)',
                        color: f.status_code === 'optimal' ? '#34d399' : '#fbbf24',
                        border: `1px solid ${f.status_code === 'optimal' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      }}>
                        {f.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div style={{ padding: '20px', color: '#ef4444', textAlign: 'center' }}>
          {analysis?.error || 'Unable to retrieve crop condition profile.'}
        </div>
      )}
    </div>
  );
}

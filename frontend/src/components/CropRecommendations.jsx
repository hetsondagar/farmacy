import React from 'react';
import { useCropRecommendations } from '../hooks/useData';

export default function CropRecommendations() {
  const { recommendations, mlPrediction, loading } = useCropRecommendations();

  if (loading) {
    return <div className="loading-spinner"><div className="spinner" /></div>;
  }

  const scoreClass = (score) => {
    if (score >= 70) return 'high';
    if (score >= 45) return 'medium';
    return 'low';
  };

  return (
    <div>
      {mlPrediction && (
        <div className="ml-prediction-banner">
          <span className="ml-icon">🤖</span>
          <div>
            <h3>ML Model Prediction: {mlPrediction}</h3>
            <p>Based on current sensor conditions, the machine learning model recommends this crop.</p>
          </div>
        </div>
      )}

      <div className="crop-grid">
        {recommendations.slice(0, 12).map((crop, i) => (
          <div key={crop.crop_name} className="crop-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="crop-card-header">
              <div className="crop-name">{crop.crop_name}</div>
              <div className={`crop-score ${scoreClass(crop.suitability_score)}`}>
                {crop.suitability_score.toFixed(0)}%
              </div>
            </div>

            <div className="crop-description">{crop.description}</div>

            <div className="crop-conditions">
              {Object.entries(crop.conditions_met).map(([key, met]) => (
                <span key={key} className={`condition-tag ${met ? 'met' : 'unmet'}`}>
                  {met ? '✓' : '✗'} {key.replace('_', ' ')}
                </span>
              ))}
            </div>

            <div className="crop-details">
              <span>🌱 {crop.requirements.season}</span>
              <span>💧 {crop.requirements.water_req}</span>
              <span>🌍 {crop.requirements.soil_type}</span>
              <span>🌡️ {crop.requirements.temperature.min}-{crop.requirements.temperature.max}°C</span>
            </div>

            {crop.explanation.length > 0 && !crop.explanation[0].includes('All conditions') && (
              <div style={{
                marginTop: '12px', padding: '10px 12px',
                background: 'rgba(245, 158, 11, 0.05)',
                borderRadius: '8px', fontSize: '0.75rem',
                color: '#8b949e', lineHeight: 1.5,
              }}>
                {crop.explanation.map((e, j) => <div key={j}>• {e}</div>)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

"""
FARMACY — Crop Recommendation & Farm Health Engine
Compares live sensor data against crop requirements to generate
suitability scores and explainable recommendations across all 7 farm sensors.
"""
import os
import joblib
import numpy as np
from crop_data import CROP_DATABASE
from config import MODEL_PATH


# Try to load the ML model
ml_model = None
ml_features = ['rain_sensor_adc', 'ldr_adc', 'temperature_c', 'humidity_percent']
try:
    if os.path.exists(MODEL_PATH):
        loaded = joblib.load(MODEL_PATH)
        if isinstance(loaded, dict):
            ml_model = loaded.get('model')
            ml_features = loaded.get('features', ml_features)
        else:
            ml_model = loaded
        print(f"[MODEL] Loaded crop model from {MODEL_PATH} with features {ml_features}")
except Exception as e:
    print(f"[MODEL] Could not load model: {e}")
    ml_model = None


def _score_parameter(value: float, req_min: float, req_max: float) -> tuple[float, str]:
    """
    Score how well a sensor value fits a crop's required range.
    Returns (score 0-100, explanation string).
    """
    if req_min <= value <= req_max:
        mid = (req_min + req_max) / 2
        half_range = (req_max - req_min) / 2
        if half_range == 0:
            return 100.0, "Perfect match"
        distance = abs(value - mid) / half_range
        score = 100.0 * (1.0 - distance * 0.3)
        return round(score, 1), "Within optimal range"

    elif value < req_min:
        deficit = req_min - value
        max_deficit = req_min if req_min > 0 else 1.0
        score = max(0, 60.0 * (1.0 - deficit / max_deficit))
        return round(score, 1), f"Too low (need {req_min}-{req_max}, got {value:.1f})"

    else:
        excess = value - req_max
        max_excess = 14.0 - req_max if req_max <= 14.0 else (100.0 - req_max if req_max < 100 else 20.0)
        if max_excess <= 0:
            max_excess = 1.0
        score = max(0, 60.0 * (1.0 - excess / max_excess))
        return round(score, 1), f"Too high (need {req_min}-{req_max}, got {value:.1f})"


def get_recommendations(soil_moisture: float, temperature: float,
                        humidity: float, light: float, rain: float,
                        ph: float = 6.5, soil_temperature: float = None,
                        water_level: float = 80.0) -> list[dict]:
    """
    Generate crop recommendations based on current sensor values.
    """
    results = []

    for crop in CROP_DATABASE:
        scores = {}
        explanations = []
        conditions_met = {}

        params = [
            ("temperature", temperature, crop["temperature"]),
            ("humidity", humidity, crop["humidity"]),
            ("soil_moisture", soil_moisture, crop["soil_moisture"]),
            ("light", light, crop["light"]),
            ("rain", rain, crop["rain"]),
        ]

        if "ph" in crop and ph is not None:
            params.append(("ph", ph, crop["ph"]))

        for param_name, value, req in params:
            score, explanation = _score_parameter(value, req["min"], req["max"])
            scores[param_name] = score
            met = req["min"] <= value <= req["max"]
            conditions_met[param_name] = met
            if not met:
                explanations.append(f"{param_name.replace('_', ' ').title()}: {explanation}")

        # Weighted score
        weights = {
            "temperature": 0.20,
            "humidity": 0.15,
            "soil_moisture": 0.25,
            "light": 0.15,
            "rain": 0.10,
            "ph": 0.15,
        }
        total_weight = sum(weights[k] for k in scores if k in weights)
        overall = sum(scores[k] * weights.get(k, 0.1) for k in scores) / (total_weight if total_weight > 0 else 1)

        if not explanations:
            explanations.append("All conditions are within optimal range!")

        req_dict = {
            "temperature": crop["temperature"],
            "humidity": crop["humidity"],
            "soil_moisture": crop["soil_moisture"],
            "light": crop["light"],
            "rain": crop["rain"],
            "soil_type": crop.get("soil_type", "Loamy"),
            "water_req": crop.get("water_req", "Moderate"),
            "season": crop.get("season", "All-season"),
        }
        if "ph" in crop:
            req_dict["ph"] = crop["ph"]

        results.append({
            "crop_name": crop["name"],
            "suitability_score": round(overall, 1),
            "explanation": explanations,
            "requirements": req_dict,
            "conditions_met": conditions_met,
            "description": crop.get("description", ""),
        })

    results.sort(key=lambda x: x["suitability_score"], reverse=True)
    return results


def get_ml_prediction(soil_moisture: float, temperature: float,
                      humidity: float, light: float, rain: float,
                      raw_rain: float = None, raw_light: float = None) -> str | None:
    """
    Use the ML model trained on Arduino sensor readings:
    Features: ['rain_sensor_adc', 'ldr_adc', 'temperature_c', 'humidity_percent']
    """
    if ml_model is None:
        return None

    try:
        import pandas as pd
        # Invert percentage back to ADC if raw not provided
        rain_adc = raw_rain if raw_rain is not None else max(0.0, min(1023.0, (100.0 - rain) / 100.0 * 1023.0))
        ldr_adc = raw_light if raw_light is not None else max(0.0, min(1023.0, (light / 100.0) * 1023.0))

        feat_map = {
            'rain_sensor_adc': float(rain_adc),
            'ldr_adc': float(ldr_adc),
            'temperature_c': float(temperature),
            'humidity_percent': float(humidity),
        }
        df = pd.DataFrame([[feat_map.get(col, 0.0) for col in ml_features]], columns=ml_features)
        pred = ml_model.predict(df)
        return str(pred[0]).replace('_', ' ').title()
    except Exception as e:
        print(f"[MODEL] Prediction error: {e}")
        return None


def compute_farm_health(soil_moisture: float, temperature: float,
                        humidity: float, light: float, rain: float,
                        ph: float = 6.5, soil_temperature: float = None,
                        water_level: float = 80.0) -> dict:
    """
    Compute overall farm health assessment across all sensors.
    """
    alerts = []

    def assess(value, low, optimal_low, optimal_high, high, name):
        if value < low:
            return "critical", f"{name} critically low ({value:.1f})"
        elif value < optimal_low:
            return "warning", f"{name} below optimal ({value:.1f})"
        elif value <= optimal_high:
            return "good", None
        elif value <= high:
            return "warning", f"{name} above optimal ({value:.1f})"
        else:
            return "critical", f"{name} critically high ({value:.1f})"

    temp_status, temp_alert = assess(temperature, 5, 15, 35, 45, "Ambient Temperature")
    humid_status, humid_alert = assess(humidity, 10, 30, 80, 95, "Humidity")
    soil_status, soil_alert = assess(soil_moisture, 10, 30, 80, 95, "Soil Moisture")
    light_status, light_alert = assess(light, 5, 20, 85, 100, "Light")
    rain_status, rain_alert = assess(rain, 0, 0, 70, 100, "Rain Intensity")
    ph_status, ph_alert = assess(ph, 4.5, 6.0, 7.5, 8.5, "Soil pH")

    soil_temp_status, soil_temp_alert = "good", None
    if soil_temperature is not None:
        soil_temp_status, soil_temp_alert = assess(soil_temperature, 8, 15, 30, 40, "Soil Temperature (DS18B20)")

    water_status, water_alert = "good", None
    if water_level is not None:
        if water_level < 10:
            water_status = "critical"
            water_alert = f"Water Tank critically low ({water_level:.0f}%)"
        elif water_level < 25:
            water_status = "warning"
            water_alert = f"Water Tank low ({water_level:.0f}%)"

    for alert in [temp_alert, humid_alert, soil_alert, light_alert, rain_alert, ph_alert, soil_temp_alert, water_alert]:
        if alert:
            alerts.append(alert)

    # Irrigation alert
    if soil_moisture < 30:
        alerts.append("⚠️ Soil is dry — irrigation recommended!")
    if soil_moisture < 15:
        alerts.append("🚨 Soil critically dry — immediate irrigation needed!")
    if water_level is not None and water_level < 15:
        alerts.append("🚨 Water reservoir depleted — refill tank immediately!")

    status_scores = {"good": 100, "warning": 60, "critical": 20}
    statuses = [temp_status, humid_status, soil_status, light_status, rain_status, ph_status]
    if water_level is not None:
        statuses.append(water_status)
    if soil_temperature is not None:
        statuses.append(soil_temp_status)

    overall = sum(status_scores.get(s, 50) for s in statuses) / len(statuses)

    if overall >= 85:
        overall_status = "excellent"
    elif overall >= 70:
        overall_status = "good"
    elif overall >= 50:
        overall_status = "fair"
    elif overall >= 30:
        overall_status = "poor"
    else:
        overall_status = "critical"

    return {
        "overall_score": round(overall, 1),
        "status": overall_status,
        "temperature_status": temp_status,
        "humidity_status": humid_status,
        "soil_moisture_status": soil_status,
        "light_status": light_status,
        "rain_status": rain_status,
        "ph_status": ph_status,
        "soil_temperature_status": soil_temp_status,
        "water_level_status": water_status,
        "alerts": alerts,
    }


def should_irrigate(soil_moisture: float, rain: float,
                    water_level: float = 80.0,
                    threshold: float = 35.0) -> dict:
    """
    Decide whether to irrigate based on soil moisture, rain, and water level safety.
    """
    if water_level is not None and water_level < 10:
        return {
            "should_irrigate": False,
            "reason": f"Water tank critically low ({water_level:.0f}%). Pump blocked to prevent dry run.",
            "soil_moisture": soil_moisture,
            "threshold": threshold,
            "water_level": water_level,
        }

    is_raining = rain > 30
    needs_water = soil_moisture < threshold

    if is_raining:
        return {
            "should_irrigate": False,
            "reason": f"Rain detected ({rain:.0f}%). Skipping irrigation.",
            "soil_moisture": soil_moisture,
            "threshold": threshold,
            "water_level": water_level,
        }
    elif needs_water:
        return {
            "should_irrigate": True,
            "reason": f"Soil moisture ({soil_moisture:.0f}%) below threshold ({threshold:.0f}%). Irrigation needed.",
            "soil_moisture": soil_moisture,
            "threshold": threshold,
            "water_level": water_level,
        }
    else:
        return {
            "should_irrigate": False,
            "reason": f"Soil moisture ({soil_moisture:.0f}%) is adequate. No irrigation needed.",
            "soil_moisture": soil_moisture,
            "threshold": threshold,
            "water_level": water_level,
        }

"""
Reverse Crop Condition Checker
Uses the same crop_data.csv columns:
rain_sensor_adc, ldr_adc, temperature_c, humidity_percent, crop_label

Important:
- This measures similarity to historical readings for a crop.
- It does NOT diagnose plant disease or establish scientifically ideal conditions.
- Run this script with crop_data.csv in the same directory.
"""

import numpy as np
import pandas as pd
from pathlib import Path

DATA_FILE = "crop_data.csv"
FEATURES = [
    "rain_sensor_adc",
    "ldr_adc",
    "temperature_c",
    "humidity_percent",
]
TARGET = "crop_label"


def resolve_data_path(path=DATA_FILE):
    """Find crop_data.csv in current directory or parent directory."""
    p = Path(path)
    if p.exists():
        return p
    parent_p = Path("..") / path
    if parent_p.exists():
        return parent_p
    backend_p = Path("backend") / path
    if backend_p.exists():
        return backend_p
    return p


def load_data(path=DATA_FILE):
    resolved = resolve_data_path(path)
    if not resolved.exists():
        raise FileNotFoundError(f"Dataset {path} not found.")

    df = pd.read_csv(resolved)

    required = FEATURES + [TARGET]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    for col in FEATURES:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    df[TARGET] = df[TARGET].astype("string").str.strip()
    df = df.dropna(subset=FEATURES + [TARGET])
    df = df[df[TARGET] != ""].copy()

    if df.empty:
        raise ValueError("No valid rows found in the dataset.")

    return df


def crop_profile(df, crop_name):
    names = df[TARGET].str.casefold()
    matches = df[names == crop_name.strip().casefold()]

    if matches.empty:
        available = sorted(df[TARGET].unique().tolist())
        raise ValueError(
            f"Crop '{crop_name}' was not found. Available crops: "
            + ", ".join(available)
        )

    values = matches[FEATURES]
    profile = pd.DataFrame({
        "typical_median": values.median(),
        "p10": values.quantile(0.10),
        "p90": values.quantile(0.90),
        "std": values.std(ddof=0),
        "sample_count": len(values),
    })

    # Avoid division by zero for constant/nearly constant features.
    global_std = df[FEATURES].std(ddof=0)
    for feature in FEATURES:
        if not np.isfinite(profile.loc[feature, "std"]) or profile.loc[feature, "std"] < 1e-9:
            profile.loc[feature, "std"] = max(
                float(global_std[feature]) if np.isfinite(global_std[feature]) else 0.0,
                1.0
            )

    return profile


def check_conditions(df, crop_name, readings):
    profile = crop_profile(df, crop_name)

    rows = []
    normalized_deviations = []

    labels = {
        "rain_sensor_adc": "Precipitation / Rain Level",
        "ldr_adc": "Ambient Solar Radiation (LDR)",
        "temperature_c": "Ambient Temperature",
        "humidity_percent": "Relative Humidity",
    }
    units = {
        "rain_sensor_adc": "ADC (Dry:1023 Wet:0)",
        "ldr_adc": "ADC (0-1023)",
        "temperature_c": "°C",
        "humidity_percent": "%",
    }

    for feature in FEATURES:
        current = float(readings[feature])
        median = float(profile.loc[feature, "typical_median"])
        low = float(profile.loc[feature, "p10"])
        high = float(profile.loc[feature, "p90"])
        std = float(profile.loc[feature, "std"])

        deviation_std = abs(current - median) / std if std > 0 else 0.0
        normalized_deviations.append(deviation_std)

        if low <= current <= high:
            status = "Within historical range"
            status_code = "optimal"
        elif current < low:
            status = f"Lower than historical typical (P10: {low:.1f})"
            status_code = "low"
        else:
            status = f"Higher than historical typical (P90: {high:.1f})"
            status_code = "high"

        rows.append({
            "feature": feature,
            "label": labels.get(feature, feature),
            "unit": units.get(feature, ""),
            "current": round(current, 1),
            "typical_median": round(median, 1),
            "p10": round(low, 1),
            "p90": round(high, 1),
            "std": round(std, 1),
            "deviation_std": round(deviation_std, 2),
            "status": status,
            "status_code": status_code,
        })

    # Overall similarity score (0 to 100%)
    mean_dev = float(np.mean(normalized_deviations))
    # Gaussian/Exponential affinity curve: 1.0 dev -> ~65%, 2.0 dev -> ~40%, 0 dev -> 100%
    similarity = max(0.0, min(100.0, 100.0 * np.exp(-mean_dev / 1.6)))

    if similarity >= 80:
        verdict = "Excellent Match"
        verdict_color = "#10b981"
        explanation = f"Current microclimate closely replicates historical conditions recorded for {crop_name}."
    elif similarity >= 60:
        verdict = "Good Match"
        verdict_color = "#3b82f6"
        explanation = f"Conditions are broadly suitable for {crop_name}, with minor variance from historical median."
    elif similarity >= 40:
        verdict = "Moderate Deviation"
        verdict_color = "#f59e0b"
        explanation = f"Several parameters diverge from normal ranges documented for {crop_name}."
    else:
        verdict = "Significant Deviation"
        verdict_color = "#ef4444"
        explanation = f"Current microclimate is significantly outside historical norms for {crop_name}."

    return {
        "crop_name": crop_name,
        "match_score": round(float(similarity), 1),
        "verdict": verdict,
        "verdict_color": verdict_color,
        "explanation": explanation,
        "mean_deviation_std": round(mean_dev, 2),
        "features": rows,
        "sample_count": int(profile["sample_count"].iloc[0]),
    }


def save_reading_to_csv(readings: dict, crop_label: str, path=DATA_FILE):
    """Save a sensor reading row to crop_data.csv."""
    resolved = resolve_data_path(path)
    new_row = pd.DataFrame([{
        "rain_sensor_adc": float(readings["rain_sensor_adc"]),
        "ldr_adc": float(readings["ldr_adc"]),
        "temperature_c": float(readings["temperature_c"]),
        "humidity_percent": float(readings["humidity_percent"]),
        "crop_label": crop_label.strip().lower(),
    }])

    possible_targets = [
        resolved,
        Path("crop_data.csv"),
        Path("..") / "crop_data.csv",
        Path("backend") / "crop_data.csv"
    ]
    seen = set()
    for target in possible_targets:
        try:
            if target.parent.exists() and target.resolve() not in seen:
                seen.add(target.resolve())
                new_row.to_csv(target, mode="a", header=not target.exists(), index=False)
        except Exception:
            pass

    return True


def get_available_crops(path=DATA_FILE):
    df = load_data(path)
    return sorted(df[TARGET].unique().tolist())


if __name__ == "__main__":
    df = load_data()
    print("Available crops in dataset:", get_available_crops())
    sample = {
        "rain_sensor_adc": 850,
        "ldr_adc": 700,
        "temperature_c": 24.5,
        "humidity_percent": 55.0
    }
    result = check_conditions(df, "tomato", sample)
    print("\nResult for Tomato:", result)

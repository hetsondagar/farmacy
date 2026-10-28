"""
FARMACY — Pydantic Models
Matches the Arduino CSV output: soil_moisture, temperature, humidity, light, rain
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class SensorData(BaseModel):
    """Matches the 5 CSV fields from the Arduino"""
    soil_moisture: float = 0.0       # Raw analog 0-1023, mapped to 0-100%
    temperature: float = 0.0         # DHT11 °C
    humidity: float = 0.0            # DHT11 %
    light: float = 0.0               # LDR analog 0-1023, mapped to 0-100%
    rain: float = 0.0                # Rain sensor analog 0-1023, mapped to 0-100%


class SensorReading(BaseModel):
    """A timestamped sensor snapshot"""
    id: Optional[int] = None
    timestamp: datetime
    soil_moisture: float
    temperature: float
    humidity: float
    light: float
    rain: float


class FarmHealth(BaseModel):
    overall_score: float              # 0-100
    status: str                       # excellent, good, fair, poor, critical
    temperature_status: str
    humidity_status: str
    soil_moisture_status: str
    light_status: str
    rain_status: str
    alerts: list[str]


class CropRecommendation(BaseModel):
    crop_name: str
    suitability_score: float          # 0-100
    explanation: list[str]
    requirements: dict
    conditions_met: dict


class IrrigationControl(BaseModel):
    relay1: Optional[bool] = None     # Relay 1 on pin 7
    relay2: Optional[bool] = None     # Relay 2 on pin 8


class IrrigationStatus(BaseModel):
    relay1_active: bool = False
    relay2_active: bool = False
    auto_mode: bool = True
    should_irrigate: bool = False
    reason: str = ""


class ZoneData(BaseModel):
    zone_id: str
    zone_name: str
    sensors: SensorData
    health_score: float
    status: str
    crop: Optional[str] = None

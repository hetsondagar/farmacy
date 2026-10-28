"""
FARMACY Backend Configuration
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Serial port for Arduino connection
SERIAL_PORT = os.getenv("SERIAL_PORT", "COM3")
SERIAL_BAUD = int(os.getenv("SERIAL_BAUD", "9600"))

# Database
DATABASE_PATH = os.getenv("DATABASE_PATH", "farmacy.db")

# Crop model
MODEL_PATH = os.getenv("MODEL_PATH", "../crop_model.joblib")

# Simulation mode (when no Arduino is connected)
SIMULATION_MODE = os.getenv("SIMULATION_MODE", "true").lower() == "true"

# API
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# MQTT Configuration (for ESP32 Wi-Fi / MQTT telemetry)
MQTT_ENABLED = os.getenv("MQTT_ENABLED", "false").lower() == "true"
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_DATA = os.getenv("MQTT_TOPIC_DATA", "farmacy/sensors/data")
MQTT_TOPIC_CONTROL = os.getenv("MQTT_TOPIC_CONTROL", "farmacy/control/irrigation")
MQTT_CLIENT_ID = os.getenv("MQTT_CLIENT_ID", "farmacy_backend")

# Sensor value ranges (for normalization/mapping)
# Arduino analog reads are 0-1023
SOIL_MOISTURE_DRY = 1023  # dry = high analog value
SOIL_MOISTURE_WET = 300   # wet = low analog value
LIGHT_MAX = 1023
RAIN_DRY = 1023           # no rain = high analog value
RAIN_WET = 0              # heavy rain = low analog value

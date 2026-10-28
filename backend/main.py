"""
FARMACY — FastAPI Backend
Connects ESP32 / Arduino sensor streams via MQTT or Serial CSV/JSON,
computes real-time farm digital twin state, crop recommendations,
farm health, irrigation tracking, and serves REST API + WebSockets for React frontend.
"""
import asyncio
import json
import random
import threading
import time
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware

import database as db
from config import (
    SERIAL_PORT, SERIAL_BAUD, SIMULATION_MODE,
    SOIL_MOISTURE_DRY, SOIL_MOISTURE_WET, LIGHT_MAX, RAIN_DRY, RAIN_WET,
    API_HOST, API_PORT,
    MQTT_ENABLED, MQTT_BROKER, MQTT_PORT, MQTT_TOPIC_DATA, MQTT_TOPIC_CONTROL, MQTT_CLIENT_ID
)
from recommender import (
    get_recommendations, compute_farm_health,
    should_irrigate, get_ml_prediction
)
import reverse_checker

# ==================== GLOBAL STATE ====================
latest_data = {
    "soil_moisture": 52.0,
    "temperature": 24.8,
    "humidity": 63.5,
    "light": 70.0,
    "rain": 0.0,
    "ph": 6.6,
    "soil_temperature": 23.2,
    "water_level": 82.0,
    "timestamp": datetime.now().isoformat(),
}

relay_state = {
    "relay1": False,
    "relay2": False,
    "auto_mode": True,
}

connected_websockets: list[WebSocket] = []
serial_connection = None
mqtt_client = None


# ==================== SENSOR VALUE MAPPING ====================
def map_soil_moisture(raw: float) -> float:
    """Map raw analog (0-1023 or 0-4095) to percentage (0-100). Higher raw = drier."""
    dry = 4095 if raw > 1023 else SOIL_MOISTURE_DRY
    wet = 1500 if raw > 1023 else SOIL_MOISTURE_WET
    pct = (dry - raw) / (dry - wet) * 100
    return round(max(0, min(100, pct)), 1)


def map_light(raw: float) -> float:
    """Map raw analog to percentage (0-100). If already Lux/pct, clamps."""
    if raw <= 100.0:
        return round(max(0, min(100, raw)), 1)
    pct = (raw / LIGHT_MAX) * 100
    return round(max(0, min(100, pct)), 1)


def map_rain(raw: float) -> float:
    """Map raw analog (0-1023) to rain intensity (0-100). Lower raw = more rain."""
    if raw <= 100.0:
        return round(max(0, min(100, raw)), 1)
    pct = (RAIN_DRY - raw) / (RAIN_DRY - RAIN_WET) * 100
    return round(max(0, min(100, pct)), 1)


# ==================== MQTT INTEGRATION ====================
def init_mqtt():
    """Start MQTT client if paho-mqtt is available and enabled."""
    global mqtt_client
    try:
        import paho.mqtt.client as mqtt

        def on_connect(client, userdata, flags, rc, properties=None):
            if rc == 0:
                print(f"[MQTT] Connected to {MQTT_BROKER}:{MQTT_PORT}")
                client.subscribe(MQTT_TOPIC_DATA)
                print(f"[MQTT] Subscribed to topic: {MQTT_TOPIC_DATA}")
            else:
                print(f"[MQTT] Connection failed with code {rc}")

        def on_message(client, userdata, msg):
            global latest_data
            try:
                payload = msg.payload.decode("utf-8")
                data = json.loads(payload)

                soil_pct = float(data.get("soil_moisture", latest_data["soil_moisture"]))
                temp = round(float(data.get("temperature", latest_data["temperature"])), 1)
                humid = round(float(data.get("humidity", latest_data["humidity"])), 1)
                light = float(data.get("light", latest_data["light"]))
                rain = float(data.get("rain", latest_data["rain"]))
                ph = round(float(data.get("ph", latest_data["ph"])), 2)
                soil_temp = round(float(data.get("soil_temperature", temp - 1.5)), 1)
                water_lvl = round(float(data.get("water_level", latest_data["water_level"])), 1)

                latest_data = {
                    "soil_moisture": soil_pct,
                    "temperature": temp,
                    "humidity": humid,
                    "light": light,
                    "rain": rain,
                    "ph": ph,
                    "soil_temperature": soil_temp,
                    "water_level": water_lvl,
                    "timestamp": datetime.now().isoformat(),
                }

                db.insert_reading(soil_pct, temp, humid, light, rain, ph, soil_temp, water_lvl)

                if relay_state["auto_mode"]:
                    decision = should_irrigate(soil_pct, rain, water_lvl)
                    if decision["should_irrigate"] != relay_state["relay1"]:
                        relay_state["relay1"] = decision["should_irrigate"]
                        relay_state["relay2"] = decision["should_irrigate"]
                        send_relay_command(relay_state["relay1"])
                        db.insert_irrigation_log(
                            relay_state["relay1"], relay_state["relay2"],
                            True, decision["reason"]
                        )
            except Exception as e:
                print(f"[MQTT] Message parse error: {e}")

        # Support both paho-mqtt v1 and v2 API
        try:
            client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, MQTT_CLIENT_ID)
        except AttributeError:
            client = mqtt.Client(MQTT_CLIENT_ID)

        client.on_connect = on_connect
        client.on_message = on_message

        client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        mqtt_client = client
        print(f"[MQTT] MQTT thread started for {MQTT_BROKER}")
    except Exception as e:
        print(f"[MQTT] Could not initialize MQTT: {e}")


# ==================== SERIAL READER ====================
def serial_reader_thread():
    """Background thread that reads CSV or JSON from Arduino serial port."""
    global latest_data, serial_connection

    if SIMULATION_MODE:
        print("[SERIAL] Simulation mode — generating realistic farm sensor streams")
        simulate_data()
        return

    try:
        import serial
        serial_connection = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=2)
        print(f"[SERIAL] Connected to {SERIAL_PORT} at {SERIAL_BAUD} baud")
        time.sleep(2)

        while True:
            try:
                line = serial_connection.readline().decode("utf-8").strip()
                if not line:
                    continue

                # Handle JSON stream from ESP32
                if line.startswith("{") and line.endswith("}"):
                    data = json.loads(line)
                    soil_pct = float(data.get("soil_moisture", 50.0))
                    temp = round(float(data.get("temperature", 25.0)), 1)
                    humid = round(float(data.get("humidity", 60.0)), 1)
                    light = float(data.get("light", 70.0))
                    rain = float(data.get("rain", 0.0))
                    ph = round(float(data.get("ph", 6.5)), 2)
                    soil_temp = round(float(data.get("soil_temperature", temp - 1.5)), 1)
                    water_lvl = round(float(data.get("water_level", 80.0)), 1)

                # Handle CSV stream
                else:
                    if line.startswith("soil_moisture"):
                        continue
                    parts = line.split(",")
                    if len(parts) < 5:
                        continue

                    soil_pct = map_soil_moisture(float(parts[0]))
                    temp = round(float(parts[1]), 1)
                    humid = round(float(parts[2]), 1)
                    light = map_light(float(parts[3]))
                    rain = map_rain(float(parts[4]))
                    ph = round(float(parts[5]), 2) if len(parts) > 5 else 6.5
                    soil_temp = round(float(parts[6]), 1) if len(parts) > 6 else round(temp - 1.5, 1)
                    water_lvl = round(float(parts[7]), 1) if len(parts) > 7 else 80.0

                latest_data = {
                    "soil_moisture": soil_pct,
                    "temperature": temp,
                    "humidity": humid,
                    "light": light,
                    "rain": rain,
                    "ph": ph,
                    "soil_temperature": soil_temp,
                    "water_level": water_lvl,
                    "timestamp": datetime.now().isoformat(),
                }

                db.insert_reading(soil_pct, temp, humid, light, rain, ph, soil_temp, water_lvl)

                if relay_state["auto_mode"]:
                    decision = should_irrigate(soil_pct, rain, water_lvl)
                    if decision["should_irrigate"] and not relay_state["relay1"]:
                        relay_state["relay1"] = True
                        relay_state["relay2"] = True
                        send_relay_command(True)
                        db.insert_irrigation_log(True, True, True, decision["reason"])
                    elif not decision["should_irrigate"] and relay_state["relay1"]:
                        relay_state["relay1"] = False
                        relay_state["relay2"] = False
                        send_relay_command(False)
                        db.insert_irrigation_log(False, False, True, decision["reason"])

            except (ValueError, IndexError) as e:
                continue
            except Exception as e:
                print(f"[SERIAL] Read error: {e}")
                time.sleep(1)

    except ImportError:
        print("[SERIAL] pyserial not installed. Running in simulation mode.")
        simulate_data()
    except Exception as e:
        print(f"[SERIAL] Cannot open {SERIAL_PORT}: {e}")
        print("[SERIAL] Falling back to simulation mode.")
        simulate_data()


def simulate_data():
    """Generate realistic farm sensor data across all 7 physical parameters."""
    global latest_data

    base_temp = 24.8
    base_humidity = 62.0
    base_soil = 50.0
    base_light = 68.0
    base_rain = 0.0
    base_ph = 6.6
    base_water = 82.0
    save_counter = 0

    while True:
        base_temp += random.uniform(-0.4, 0.4)
        base_temp = max(14, min(38, base_temp))

        base_humidity += random.uniform(-0.8, 0.8)
        base_humidity = max(25, min(92, base_humidity))

        # Soil moisture drops slowly unless pump is active or raining
        if relay_state["relay1"]:
            base_soil += random.uniform(1.5, 3.5)
            base_water -= random.uniform(0.3, 0.7)  # tank drains while pumping
        else:
            base_soil -= random.uniform(0.1, 0.4)

        if base_rain > 10:
            base_soil += random.uniform(0.5, 1.5)
            base_water += random.uniform(0.2, 0.5)  # rain refills tank

        base_soil = max(5, min(95, base_soil))
        base_water = max(0, min(100, base_water))

        base_light += random.uniform(-2.5, 2.5)
        base_light = max(5, min(98, base_light))

        # Occasional rain variation
        if random.random() < 0.05:
            base_rain = random.uniform(15, 60)
        else:
            base_rain = max(0, base_rain - 2.0)

        base_ph += random.uniform(-0.02, 0.02)
        base_ph = max(5.2, min(8.0, base_ph))

        soil_temp = round(base_temp - 1.2 + random.uniform(-0.3, 0.3), 1)

        latest_data = {
            "soil_moisture": round(base_soil, 1),
            "temperature": round(base_temp, 1),
            "humidity": round(base_humidity, 1),
            "light": round(base_light, 1),
            "rain": round(base_rain, 1),
            "ph": round(base_ph, 2),
            "soil_temperature": soil_temp,
            "water_level": round(base_water, 1),
            "timestamp": datetime.now().isoformat(),
        }

        db.insert_reading(
            latest_data["soil_moisture"],
            latest_data["temperature"],
            latest_data["humidity"],
            latest_data["light"],
            latest_data["rain"],
            latest_data["ph"],
            latest_data["soil_temperature"],
            latest_data["water_level"],
        )

        if relay_state["auto_mode"]:
            decision = should_irrigate(
                latest_data["soil_moisture"],
                latest_data["rain"],
                latest_data["water_level"]
            )
            if decision["should_irrigate"] != relay_state["relay1"]:
                relay_state["relay1"] = decision["should_irrigate"]
                relay_state["relay2"] = decision["should_irrigate"]
                db.insert_irrigation_log(
                    relay_state["relay1"], relay_state["relay2"],
                    True, decision["reason"]
                )

        # Periodically save readings to crop_data.csv
        save_counter += 1
        if save_counter >= 10:  # Every 20 seconds
            save_counter = 0
            try:
                pred = get_ml_prediction(
                    latest_data["soil_moisture"],
                    latest_data["temperature"],
                    latest_data["humidity"],
                    latest_data["light"],
                    latest_data["rain"],
                ) or "tomato"
                rain_adc = (100.0 - latest_data["rain"]) / 100.0 * 1023.0
                ldr_adc = (latest_data["light"] / 100.0) * 1023.0
                reverse_checker.save_reading_to_csv({
                    "rain_sensor_adc": rain_adc,
                    "ldr_adc": ldr_adc,
                    "temperature_c": latest_data["temperature"],
                    "humidity_percent": latest_data["humidity"]
                }, pred)
            except Exception:
                pass

        time.sleep(2)


def send_relay_command(state: bool):
    """Send relay control command to Arduino via serial or MQTT."""
    global serial_connection, mqtt_client
    cmd = "RELAY_ON\n" if state else "RELAY_OFF\n"

    # Serial
    if serial_connection and serial_connection.is_open:
        try:
            serial_connection.write(cmd.encode())
        except Exception as e:
            print(f"[SERIAL] Write error: {e}")

    # MQTT
    if mqtt_client:
        try:
            msg = json.dumps({
                "pump": state,
                "valve": state,
                "relay1": state,
                "relay2": state,
                "command": "ON" if state else "OFF",
                "timestamp": datetime.now().isoformat()
            })
            mqtt_client.publish(MQTT_TOPIC_CONTROL, msg)
        except Exception as e:
            print(f"[MQTT] Publish error: {e}")


# ==================== WEBSOCKET BROADCASTER ====================
async def broadcast_loop():
    """Push latest digital twin data to all connected WebSocket clients every 2 seconds."""
    while True:
        if connected_websockets:
            health = compute_farm_health(
                latest_data["soil_moisture"],
                latest_data["temperature"],
                latest_data["humidity"],
                latest_data["light"],
                latest_data["rain"],
                latest_data["ph"],
                latest_data["soil_temperature"],
                latest_data["water_level"],
            )
            message = json.dumps({
                "type": "sensor_update",
                "data": latest_data,
                "health": health,
                "irrigation": relay_state,
            })
            disconnected = []
            for ws in connected_websockets:
                try:
                    await ws.send_text(message)
                except:
                    disconnected.append(ws)
            for ws in disconnected:
                if ws in connected_websockets:
                    connected_websockets.remove(ws)
        await asyncio.sleep(2)


# ==================== APP LIFECYCLE ====================
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    db.init_db()
    print("[DB] Database initialized")

    # Start serial reader in background thread
    thread = threading.Thread(target=serial_reader_thread, daemon=True)
    thread.start()
    print("[SERIAL] Reader thread started")

    # Start MQTT if enabled
    if MQTT_ENABLED:
        init_mqtt()

    # Start WebSocket broadcaster
    broadcast_task = asyncio.create_task(broadcast_loop())
    print("[WS] Broadcaster started")

    yield

    # Shutdown
    broadcast_task.cancel()
    if serial_connection:
        serial_connection.close()
    if mqtt_client:
        try:
            mqtt_client.loop_stop()
        except:
            pass


# ==================== FASTAPI APP ====================
app = FastAPI(
    title="FARMACY API",
    description="IoT Smart Farming & Digital Twin Backend",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== REST ENDPOINTS ====================

@app.get("/")
def root():
    return {
        "message": "FARMACY IoT Smart Farming & Digital Twin API is active",
        "version": "1.0.0",
        "sensors_active": [
            "capacitive_soil_moisture",
            "aht20_ambient_temp_humidity",
            "bh1750_light_lux",
            "soil_ph",
            "ds18b20_soil_temperature",
            "water_tank_level",
            "rain_sensor"
        ]
    }


@app.get("/api/sensors/latest")
def get_latest_sensors():
    """Get the most recent sensor readings and health status."""
    health = compute_farm_health(
        latest_data["soil_moisture"],
        latest_data["temperature"],
        latest_data["humidity"],
        latest_data["light"],
        latest_data["rain"],
        latest_data["ph"],
        latest_data["soil_temperature"],
        latest_data["water_level"],
    )
    return {
        "sensors": latest_data,
        "health": health,
        "irrigation": relay_state,
    }


@app.get("/api/sensors/history")
def get_sensor_history(hours: int = Query(default=24, ge=1, le=168)):
    """Get historical sensor data for the specified number of hours."""
    readings = db.get_readings_range(hours)
    return {"readings": readings, "count": len(readings), "hours": hours}


@app.post("/api/sensors/ingest")
def ingest_arduino_data(payload: dict):
    """
    Ingest sensor readings directly matching Arduino project.ino output.
    Accepts raw CSV string ('soil,temperature,humidity,light,rain') or dictionary.
    """
    global latest_data
    try:
        if "csv" in payload:
            line = payload["csv"].strip()
            parts = line.split(",")
            raw_soil = float(parts[0])
            temperature = float(parts[1])
            humidity = float(parts[2])
            raw_light = float(parts[3])
            raw_rain = float(parts[4])
        else:
            raw_soil = float(payload.get("soil", payload.get("soil_moisture", 500)))
            temperature = float(payload.get("temperature", 25.0))
            humidity = float(payload.get("humidity", 60.0))
            raw_light = float(payload.get("light", 700))
            raw_rain = float(payload.get("rain", 900))

        soil_pct = map_soil_moisture(raw_soil) if raw_soil > 100 else raw_soil
        light_pct = map_light(raw_light) if raw_light > 100 else raw_light
        rain_pct = map_rain(raw_rain) if raw_rain > 100 else raw_rain

        latest_data = {
            "soil_moisture": round(soil_pct, 1),
            "temperature": round(temperature, 1),
            "humidity": round(humidity, 1),
            "light": round(light_pct, 1),
            "rain": round(rain_pct, 1),
            "raw_soil": raw_soil,
            "raw_light": raw_light,
            "raw_rain": raw_rain,
            "ph": 6.5,
            "soil_temperature": round(temperature - 1.5, 1),
            "water_level": 80.0,
            "timestamp": datetime.now().isoformat(),
        }

        # Log to SQLite
        db.insert_reading(soil_pct, temperature, humidity, light_pct, rain_pct)

        # Log to crop_data.csv
        try:
            pred = get_ml_prediction(
                soil_pct, temperature, humidity, light_pct, rain_pct,
                raw_rain=raw_rain, raw_light=raw_light
            ) or "tomato"
            reverse_checker.save_reading_to_csv({
                "rain_sensor_adc": raw_rain,
                "ldr_adc": raw_light,
                "temperature_c": temperature,
                "humidity_percent": humidity
            }, pred)
        except Exception:
            pass

        return {
            "status": "success",
            "received": latest_data,
            "decision": should_irrigate(soil_pct, rain_pct)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/farm/health")
@app.get("/api/farm/status")
def get_farm_health():
    """Get overall farm health assessment."""
    health = compute_farm_health(
        latest_data["soil_moisture"],
        latest_data["temperature"],
        latest_data["humidity"],
        latest_data["light"],
        latest_data["rain"],
        latest_data["ph"],
        latest_data["soil_temperature"],
        latest_data["water_level"],
    )
    return health


@app.get("/api/crops/recommend")
def get_crop_recommendations():
    """Get crop suitability recommendations based on current conditions."""
    recommendations = get_recommendations(
        latest_data["soil_moisture"],
        latest_data["temperature"],
        latest_data["humidity"],
        latest_data["light"],
        latest_data["rain"],
        latest_data["ph"],
        latest_data["soil_temperature"],
        latest_data["water_level"],
    )

    ml_prediction = get_ml_prediction(
        latest_data["soil_moisture"],
        latest_data["temperature"],
        latest_data["humidity"],
        latest_data["light"],
        latest_data["rain"],
        raw_rain=latest_data.get("raw_rain"),
        raw_light=latest_data.get("raw_light"),
    )

    return {
        "recommendations": recommendations,
        "ml_prediction": ml_prediction,
        "conditions": latest_data,
    }


@app.get("/api/crops/reverse-check/crops")
def get_reverse_check_crops():
    """Return all available crop names in crop_data.csv for condition checking."""
    try:
        crops = reverse_checker.get_available_crops()
        return {"crops": crops, "count": len(crops)}
    except Exception as e:
        return {"crops": [], "error": str(e)}


@app.get("/api/crops/reverse-check")
def reverse_check_crop(crop: str = Query(default="tomato")):
    """
    Check current live farm sensor conditions against historical baseline for a specific crop.
    """
    try:
        df = reverse_checker.load_data()
        rain_adc = (100.0 - latest_data["rain"]) / 100.0 * 1023.0
        ldr_adc = (latest_data["light"] / 100.0) * 1023.0
        readings = {
            "rain_sensor_adc": rain_adc,
            "ldr_adc": ldr_adc,
            "temperature_c": latest_data["temperature"],
            "humidity_percent": latest_data["humidity"],
        }
        result = reverse_checker.check_conditions(df, crop, readings)
        return result
    except Exception as e:
        return {"error": str(e), "crop_name": crop}


@app.post("/api/crops/reverse-check")
def reverse_check_custom(payload: dict):
    """
    Check custom sensor readings against historical baseline for a specific crop.
    """
    try:
        df = reverse_checker.load_data()
        crop = payload.get("crop", "tomato")

        rain_adc = payload.get("rain_sensor_adc")
        if rain_adc is None:
            rain_pct = float(payload.get("rain", latest_data["rain"]))
            rain_adc = (100.0 - rain_pct) / 100.0 * 1023.0

        ldr_adc = payload.get("ldr_adc")
        if ldr_adc is None:
            light_pct = float(payload.get("light", latest_data["light"]))
            ldr_adc = (light_pct / 100.0) * 1023.0

        temp = float(payload.get("temperature_c", payload.get("temperature", latest_data["temperature"])))
        hum = float(payload.get("humidity_percent", payload.get("humidity", latest_data["humidity"])))

        readings = {
            "rain_sensor_adc": float(rain_adc),
            "ldr_adc": float(ldr_adc),
            "temperature_c": float(temp),
            "humidity_percent": float(hum),
        }

        result = reverse_checker.check_conditions(df, crop, readings)
        return result
    except Exception as e:
        return {"error": str(e)}


@app.post("/api/crops/save-data")
def save_crop_data(payload: dict):
    """
    Save sensor readings and crop label into crop_data.csv.
    """
    try:
        crop_label = payload.get("crop_label") or payload.get("crop")
        if not crop_label:
            crop_label = get_ml_prediction(
                latest_data["soil_moisture"],
                latest_data["temperature"],
                latest_data["humidity"],
                latest_data["light"],
                latest_data["rain"],
            ) or "tomato"

        rain_adc = payload.get("rain_sensor_adc")
        if rain_adc is None:
            rain_adc = (100.0 - latest_data["rain"]) / 100.0 * 1023.0

        ldr_adc = payload.get("ldr_adc")
        if ldr_adc is None:
            ldr_adc = (latest_data["light"] / 100.0) * 1023.0

        readings = {
            "rain_sensor_adc": float(rain_adc),
            "ldr_adc": float(ldr_adc),
            "temperature_c": float(payload.get("temperature_c", latest_data["temperature"])),
            "humidity_percent": float(payload.get("humidity_percent", latest_data["humidity"])),
        }

        reverse_checker.save_reading_to_csv(readings, str(crop_label))
        return {
            "status": "success",
            "message": f"Successfully saved reading for '{crop_label}' to crop_data.csv",
            "saved_data": {**readings, "crop_label": crop_label}
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.get("/api/irrigation/status")
def get_irrigation_status():
    """Get current irrigation status and automated decision."""
    decision = should_irrigate(
        latest_data["soil_moisture"],
        latest_data["rain"],
        latest_data["water_level"],
    )
    return {
        "relay1_active": relay_state["relay1"],
        "relay2_active": relay_state["relay2"],
        "auto_mode": relay_state["auto_mode"],
        "decision": decision,
    }


@app.post("/api/irrigation/control")
def control_irrigation(control: dict):
    """Manually control irrigation relays."""
    if "relay1" in control:
        relay_state["relay1"] = bool(control["relay1"])
    if "relay2" in control:
        relay_state["relay2"] = bool(control["relay2"])
    if "auto" in control:
        relay_state["auto_mode"] = bool(control["auto"])

    if not relay_state["auto_mode"]:
        send_relay_command(relay_state["relay1"])

    db.insert_irrigation_log(
        relay_state["relay1"], relay_state["relay2"],
        relay_state["auto_mode"],
        "Manual control" if not relay_state["auto_mode"] else "Auto mode toggled"
    )

    return {
        "status": "ok",
        "relay1_active": relay_state["relay1"],
        "relay2_active": relay_state["relay2"],
        "auto_mode": relay_state["auto_mode"],
    }


@app.get("/api/irrigation/history")
def get_irr_history(limit: int = Query(default=50, ge=1, le=200)):
    """Get irrigation action history."""
    history = db.get_irrigation_history(limit)
    return {"history": history, "count": len(history)}


@app.get("/api/zones")
def get_zones():
    """Get zone-wise digital twin monitoring data."""
    base = latest_data.copy()
    zones = []
    zone_names = [
        ("zone-1", "🌾 Main Crop Area", "Clay/Loamy"),
        ("zone-2", "🥬 Vegetable Patch", "Sandy Loam"),
        ("zone-3", "🌻 Flower & Pollinator Bed", "Loamy"),
        ("zone-4", "🌱 Seedling Nursery", "Peat Moss / Organic"),
    ]

    for i, (zid, zname, stype) in enumerate(zone_names):
        variation = 1.0 + (i * 0.05 - 0.08)
        zone_sensors = {
            "soil_moisture": round(max(0, min(100, base["soil_moisture"] * variation)), 1),
            "temperature": round(base["temperature"] + (i - 1.5) * 0.4, 1),
            "humidity": round(max(0, min(100, base["humidity"] * variation)), 1),
            "light": round(max(0, min(100, base["light"] + (i - 1.5) * 2.5)), 1),
            "rain": base["rain"],
            "ph": round(max(5.0, min(8.0, base["ph"] + (i - 1.5) * 0.15)), 2),
            "soil_temperature": round(base["soil_temperature"] + (i - 1.5) * 0.3, 1),
            "water_level": base["water_level"],
            "soil_type": stype,
        }
        health = compute_farm_health(
            zone_sensors["soil_moisture"],
            zone_sensors["temperature"],
            zone_sensors["humidity"],
            zone_sensors["light"],
            zone_sensors["rain"],
            zone_sensors["ph"],
            zone_sensors["soil_temperature"],
            zone_sensors["water_level"],
        )
        zones.append({
            "zone_id": zid,
            "zone_name": zname,
            "soil_type": stype,
            "sensors": zone_sensors,
            "health_score": health["overall_score"],
            "status": health["status"],
            "online": True if i != 2 else True, # Default online
            "node_type": "IoT Micro-Farm Node",
            "ip_address": f"192.168.1.{101 + i}",
            "mac_address": f"24:6F:28:B4:7C:0{i+1}",
            "rssi": -55 - i * 4,
            "signal_quality": f"{96 - i * 5}%",
            "battery_level": f"{98 - i * 3}%",
            "firmware": "v2.4-Mesh",
            "last_heartbeat": "Active (< 2s ago)",
        })

    return {"zones": zones}


@app.get("/api/stats")
def get_stats():
    """Get summary statistics for dashboard header."""
    count = db.get_readings_count()
    recent = db.get_readings_range(1)

    if recent:
        temps = [r["temperature"] for r in recent]
        humids = [r["humidity"] for r in recent]
        soils = [r["soil_moisture"] for r in recent]
        phs = [r["ph"] for r in recent if "ph" in r.keys() and r["ph"] is not None]

        stats = {
            "total_readings": count,
            "readings_last_hour": len(recent),
            "avg_temperature": round(sum(temps) / len(temps), 1),
            "avg_humidity": round(sum(humids) / len(humids), 1),
            "avg_soil_moisture": round(sum(soils) / len(soils), 1),
            "avg_ph": round(sum(phs) / len(phs), 2) if phs else 6.5,
            "min_temperature": round(min(temps), 1),
            "max_temperature": round(max(temps), 1),
        }
    else:
        stats = {
            "total_readings": count,
            "readings_last_hour": 0,
        }

    return stats


# ==================== WEBSOCKET ====================

@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_websockets.append(websocket)
    print(f"[WS] Client connected. Total: {len(connected_websockets)}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "irrigation_control":
                    if "relay1" in msg:
                        relay_state["relay1"] = bool(msg["relay1"])
                    if "relay2" in msg:
                        relay_state["relay2"] = bool(msg["relay2"])
                    if "auto" in msg:
                        relay_state["auto_mode"] = bool(msg["auto"])
                    send_relay_command(relay_state["relay1"])
            except:
                pass
    except WebSocketDisconnect:
        if websocket in connected_websockets:
            connected_websockets.remove(websocket)
        print(f"[WS] Client disconnected. Total: {len(connected_websockets)}")


# ==================== MAIN ====================
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=API_HOST, port=API_PORT)

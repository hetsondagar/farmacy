"""
FARMACY — SQLite Database Layer
"""
import sqlite3
import os
from datetime import datetime, timedelta
from config import DATABASE_PATH


def get_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            soil_moisture REAL NOT NULL,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL,
            light REAL NOT NULL,
            rain REAL NOT NULL,
            ph REAL DEFAULT 6.5,
            soil_temperature REAL DEFAULT 22.0,
            water_level REAL DEFAULT 80.0
        )
    """)

    # Migrate columns if upgrading existing table
    cursor.execute("PRAGMA table_info(sensor_readings)")
    existing_cols = [col[1] for col in cursor.fetchall()]
    if "ph" not in existing_cols:
        cursor.execute("ALTER TABLE sensor_readings ADD COLUMN ph REAL DEFAULT 6.5")
    if "soil_temperature" not in existing_cols:
        cursor.execute("ALTER TABLE sensor_readings ADD COLUMN soil_temperature REAL DEFAULT 22.0")
    if "water_level" not in existing_cols:
        cursor.execute("ALTER TABLE sensor_readings ADD COLUMN water_level REAL DEFAULT 80.0")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS irrigation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            relay1 INTEGER NOT NULL,
            relay2 INTEGER NOT NULL,
            auto_mode INTEGER NOT NULL,
            reason TEXT
        )
    """)

    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_readings_timestamp
        ON sensor_readings(timestamp)
    """)

    conn.commit()
    conn.close()


def insert_reading(soil_moisture: float, temperature: float, humidity: float,
                   light: float, rain: float, ph: float = 6.5,
                   soil_temperature: float = None, water_level: float = 80.0):
    conn = get_connection()
    cursor = conn.cursor()
    if soil_temperature is None:
        soil_temperature = max(10.0, temperature - 1.5)
    cursor.execute("""
        INSERT INTO sensor_readings (
            timestamp, soil_moisture, temperature, humidity, light, rain,
            ph, soil_temperature, water_level
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (datetime.now().isoformat(), soil_moisture, temperature, humidity, light, rain, ph, soil_temperature, water_level))
    conn.commit()
    conn.close()


def get_latest_readings(limit: int = 1):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM sensor_readings ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_readings_range(hours: int = 24):
    conn = get_connection()
    cursor = conn.cursor()
    since = (datetime.now() - timedelta(hours=hours)).isoformat()
    cursor.execute("""
        SELECT * FROM sensor_readings WHERE timestamp >= ? ORDER BY timestamp ASC
    """, (since,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_readings_count():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) as count FROM sensor_readings")
    result = cursor.fetchone()
    conn.close()
    return result["count"]


def insert_irrigation_log(relay1: bool, relay2: bool, auto_mode: bool, reason: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO irrigation_log (timestamp, relay1, relay2, auto_mode, reason)
        VALUES (?, ?, ?, ?, ?)
    """, (datetime.now().isoformat(), int(relay1), int(relay2), int(auto_mode), reason))
    conn.commit()
    conn.close()


def get_irrigation_history(limit: int = 50):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM irrigation_log ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

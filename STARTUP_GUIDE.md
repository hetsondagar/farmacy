# 🌱 FARMACY — Quick Start & Deployment Guide

This guide contains complete instructions for running the **FARMACY** IoT Smart Farming and Digital Twin platform.

---

## 🏗️ System Overview

The application consists of three main components:
1. **Hardware Layer ([project/project.ino](./project/project.ino))**: Arduino sketch collecting data from Soil Moisture (A0), DHT11 (Pin 2), LDR (A1), and Rain sensor (A2), driving Relays on pins 7 & 8.
2. **Backend Server ([backend/](./backend/))**: FastAPI REST API + WebSockets, SQLite database, AI Crop Model (`crop_model.joblib`), and Reverse Crop Condition Checker (`crop_data.csv`).
3. **Frontend Dashboard ([frontend/](./frontend/))**: React + Vite responsive dark-themed dashboard with real-time gauges, digital twin map, and crop advisory.

---

## ⚡ 1-Click Startup (Windows)

Double-click `start.bat` in the project root, or execute it in PowerShell:

```powershell
.\start.bat
```

This launches both the FastAPI backend and Vite React frontend concurrently in dedicated terminal windows.

---

## 🛠️ Manual Startup Instructions

### Step 1: Prerequisites
Ensure you have the following installed on your computer:
- **Python 3.10+** (with pip)
- **Node.js 18+** (with npm)
- **Arduino IDE** (only needed if uploading to a physical Arduino board)

---

### Step 2: Start the Backend (FastAPI)

1. Open a terminal and navigate to the `backend` folder:
   ```powershell
   Set-Location "<path-to-farmacy>\backend"
   ```

2. *(First time only)* Install Python requirements:
   ```powershell
   pip install -r requirements.txt
   ```

3. Launch the FastAPI server:
   ```powershell
   python main.py
   ```

- **Backend URL**: `http://localhost:8000`
- **Interactive API Documentation (Swagger)**: `http://localhost:8000/docs`
- **WebSocket Endpoint**: `ws://localhost:8000/ws/live`

> **Note on data mode:** The backend uses real sensor data by default. To generate mock sensor readings, create or update `backend/.env` and set `SIMULATION_MODE=true`, then restart the backend. Set it to `false` (or omit it) to use real sensor data. In real-data mode, the configured hardware must be available; the backend will report connection errors rather than silently switching to mock data.

---

### Step 3: Start the Frontend (React + Vite)

1. Open a second terminal and navigate to the `frontend` folder:
   ```powershell
   Set-Location "<path-to-farmacy>\frontend"
   ```

2. *(First time only)* Install node modules:
   ```powershell
   npm install
   ```

3. Launch the Vite development server:
   ```powershell
   npm run dev
   ```

- **Dashboard UI URL**: **`http://localhost:5173/`**

---

### Step 4: Connecting a Physical Arduino (Optional)

If you are connecting physical micro-farm hardware:
1. Connect your Arduino board via USB.
2. Open [project/project.ino](./project/project.ino) in the Arduino IDE. The sketch is inside the `project` folder; open the `.ino` file rather than the repository root.
3. Select your board (e.g. *Arduino Uno*) and Port (e.g. *COM3*).
4. Click **Upload**.
5. Close the Arduino IDE Serial Monitor so the backend can access the board's COM port.
6. Create or update `backend/.env` with the matching COM port:
   ```env
   SERIAL_PORT=COM3
   SERIAL_BAUD=9600
   SIMULATION_MODE=false
   ```
7. Restart the backend server. Sensor readings stream to the dashboard, and irrigation controls send relay commands back to the Arduino.

The sketch sends labeled sensor readings over USB serial once per second (soil ADC, temperature, humidity, light ADC, and rain ADC). The backend accepts this labeled format as well as positional CSV, converts the analog readings, and broadcasts updates to the frontend over WebSocket. Relay 1 controls the pump and Relay 2 controls the valve; automatic irrigation decisions are made by the backend. In the frontend, set `VITE_API_BASE_URL` (and optionally `VITE_WS_BASE_URL`) only when the API is hosted somewhere other than the same origin. During local Vite development, `/api` and `/ws` are proxied to `http://localhost:8000`.

---

## 🌐 Application URL Reference

| Service | Address | Description |
|---|---|---|
| **Web Dashboard** | [http://localhost:5173/](http://localhost:5173/) | Real-time React user interface |
| **API Server** | [http://localhost:8000/](http://localhost:8000/) | FastAPI root endpoint |
| **Swagger API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) | Interactive testing for all endpoints |
| **WebSocket Stream** | `ws://localhost:8000/ws/live` | Live telemetry broadcast every 2s |

---

## 🧭 Dashboard Features & Views

- **📊 Dashboard**: Live sensor gauges, farm health score, quick stats, and virtual overview.
- **📡 Live Sensors**: Real-time gauge metrics and live JSON telemetry inspector.
- **📈 Analytics**: Historical multi-parameter sensor trend charts (1h, 6h, 24h, 7d).
- **🌾 Crop Advisory**: AI suitability scoring and ML predictions (`crop_model.joblib`).
- **🔍 Condition Checker**: Reverse Crop Condition Checker comparing live microclimates against historical envelopes in `crop_data.csv`. Includes a button to save new readings to `crop_data.csv`.
- **💧 Irrigation Control**: Auto/manual pump & valve relay control with actuation logs.
- **🗺️ Farm Zones**: Zone-by-zone digital twin monitoring (Crop Area, Veg Patch, Flower Bed, Nursery).
- **🏡 Digital Twin**: Visual representation of the physical micro-farm.

---

## 📁 Key File Locations

- [project/project.ino](./project/project.ino) — Arduino source sketch
- [farmacy.png](./farmacy.png) — Official brand logo
- [crop_model.joblib](./crop_model.joblib) — Trained crop prediction model
- [crop_data.csv](./crop_data.csv) — Historical crop baseline dataset
- [reverse_checker.py](./reverse_checker.py) — Standalone Reverse Crop Condition Checker script
- [backend/main.py](./backend/main.py) — FastAPI backend application
- [backend/database.py](./backend/database.py) — SQLite database schema & queries
- [backend/farmacy.db](./backend/farmacy.db) — SQLite database file
- [frontend/src/App.jsx](./frontend/src/App.jsx) — Main frontend application

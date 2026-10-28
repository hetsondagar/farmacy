# 🌱 FARMACY — IoT Smart Farming & Digital Twin System

> **FARMACY** connects a miniature physical farm with a software platform to monitor, analyze, and manage crop-growing conditions in real time.

---

## 🚀 How to Start the Application

For complete, detailed instructions, see the **[STARTUP_GUIDE.md](file:///e:/farmacy/STARTUP_GUIDE.md)**.

### Quick Start (1-Click)
- **Windows Batch**: Double-click `start.bat` or run `.\start.bat`
- **PowerShell**: Run `.\start.ps1`

### Manual Start
1. **Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python main.py
   ```
   Runs at: [http://localhost:8000/](http://localhost:8000/) (API Docs: [http://localhost:8000/docs](http://localhost:8000/docs))

2. **Frontend**:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Runs at: [http://localhost:5173/](http://localhost:5173/)

3. **Arduino Hardware**:
   Upload [project.ino](file:///e:/farmacy/project.ino) to your Arduino board via Arduino IDE.

---

## 📊 Core Features

- **Digital Twin**: Virtual real-time replica of the physical micro-farm zones.
- **Sensor Gauges**: Live telemetry (soil moisture, temperature, humidity, light intensity, rain intensity).
- **AI Crop Recommendations**: Machine learning suitability engine driven by `crop_model.joblib`.
- **Reverse Crop Condition Checker**: Evaluates microclimate similarity against historical envelopes in `crop_data.csv`.
- **Automated Irrigation Control**: Automated and manual pump & valve actuation with safety rules and logging.
- **Historical Analytics**: SQLite-backed time-series graphs (1h, 6h, 24h, 7d).

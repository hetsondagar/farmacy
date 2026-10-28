@echo off
title FARMACY Launcher
echo ========================================================
echo       FARMACY - IoT Smart Farming Platform Launcher
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on port 8000...
start "FARMACY Backend" cmd /k "cd /d %~dp0backend && python main.py"

echo [2/2] Starting React Vite Frontend on port 5173...
start "FARMACY Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================================
echo   Services are starting up!
echo   - Web Dashboard:  http://localhost:5173/
echo   - API Swagger:    http://localhost:8000/docs
echo ========================================================
echo.
timeout /t 5 >nul
start http://localhost:5173/

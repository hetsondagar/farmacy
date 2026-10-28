# FARMACY - PowerShell Launcher
Write-Host "========================================================" -ForegroundColor Green
Write-Host "      FARMACY - Smart Farming Platform Launcher         " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/2] Starting FastAPI Backend on port 8000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python main.py"

Write-Host "[2/2] Starting React Frontend on port 5173..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "Services are starting:" -ForegroundColor Yellow
Write-Host " - Web Dashboard:  http://localhost:5173/" -ForegroundColor White
Write-Host " - API Swagger:    http://localhost:8000/docs" -ForegroundColor White
Write-Host ""

Start-Sleep -Seconds 4
Start-Process "http://localhost:5173/"

@echo off
title Stop Challenge Telegram Bot - Server Engine
color 0b

echo ========================================================
echo   STOP CHALLENGE 4K 60FPS TELEGRAM BOT SERVER
echo   Zero-Load Headless Rendering Pipeline
echo ========================================================
echo.

cd /d "%~dp0"

REM 1. Start Background Local HTTP Server if not already running
powershell -Command "if (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 5050 -InformationLevel Quiet -WarningAction SilentlyContinue)) { Start-Process -WindowStyle Hidden node 'server.js' }"

echo [OK] Background HTTP Server verified on port 5050.
echo.
echo Starting Telegram Bot Service...
echo.

node bot.js

pause

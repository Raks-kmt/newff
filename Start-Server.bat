@echo off
title STOP CHALLENGE STUDIO - LIVE SERVER CONSOLE
color 0B
cd /d "%~dp0"
cls
echo ========================================================
echo   STOP CHALLENGE PRO STUDIO - LIVE SERVER CONSOLE
echo ========================================================
echo.

REM Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

REM Install dependencies if node_modules is missing or incomplete
if not exist "node_modules\mp4-muxer" (
    echo Installing dependencies...
    npm install --production
    echo.
)

echo   Local Address:  http://localhost:5050
echo   Export Folder:  %~dp0exports
echo.
echo   Live video render progress will be displayed below:
echo ========================================================
echo.
node server.js
pause

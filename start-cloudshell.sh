#!/bin/bash
# -------------------------------------------------------------
# Stop Challenge Pro - Google Cloud Shell 1-Command Startup
# Provides free 8GB-16GB RAM cloud runner for 4K video rendering
# -------------------------------------------------------------

set -e

echo "=========================================================="
echo "🎬 Stop Challenge Pro — Google Cloud Runner (4K 60FPS)"
echo "=========================================================="

# Check RAM
echo "[SYSTEM] Checking available RAM..."
free -h

# Install FFmpeg if not installed
if ! command -v ffmpeg &> /dev/null; then
    echo "[INSTALL] Installing FFmpeg..."
    sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg
fi

# Install Python requirements
echo "[INSTALL] Installing Python dependencies..."
pip install -q -r requirements.txt

# Ensure .env exists
if [ ! -f .env ]; then
    echo "TELEGRAM_BOT_TOKEN=7908781006:AAEg56zICsqbLCxLNjhTLVxrm0bx1PwFmO0" > .env
    echo "PORT=5050" >> .env
fi

echo "[READY] Starting Telegram Bot in True 4K Mode..."
python3 bot.py

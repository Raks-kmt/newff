#!/bin/bash
# Stop Challenge Telegram Bot - Linux VPS Setup & Run Script
# Usage: chmod +x start-bot.sh && ./start-bot.sh

echo "========================================================"
echo "  STOP CHALLENGE 4K 60FPS TELEGRAM BOT (LINUX VPS)"
echo "========================================================"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

# 1. Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed! Please install Node.js 18+ (e.g. curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs)"
    exit 1
fi

# 2. Check Chromium / Google Chrome
if ! command -v google-chrome &> /dev/null && ! command -v chromium &> /dev/null && ! command -v chromium-browser &> /dev/null; then
    echo "⚠️ Headless Chromium not found. Installing chromium-browser..."
    sudo apt-get update && sudo apt-get install -y chromium-browser || sudo apt-get install -y chromium || sudo apt-get install -y google-chrome-stable
fi

# 3. Check dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi

# 4. Start local HTTP server in background
if ! nc -z 127.0.0.1 5050 2>/dev/null; then
    echo "🚀 Starting background static server on port 5050..."
    node server.js > server.log 2>&1 &
    sleep 2
fi

# 5. Start Bot
echo "🤖 Starting Stop Challenge Telegram Bot..."
node bot.js

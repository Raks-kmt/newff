# =============================================================
# STOP CHALLENGE 4K 60FPS STUDIO — DOCKERFILE FOR RENDER.COM
# Includes Official Google Chrome Stable, FFmpeg, and Node.js
# =============================================================

FROM node:20-bullseye-slim

# Prevent prompts during package installations
ENV DEBIAN_FRONTEND=noninteractive

# 1. Install Google Chrome Stable, FFmpeg, Unicode Fonts & Graphics Dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    gnupg \
    ca-certificates \
    ffmpeg \
    fonts-liberation \
    fonts-freefont-ttf \
    fonts-noto-color-emoji \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | gpg --dearmor -o /usr/share/keyrings/googlechrome-linux-keyring.gpg \
    && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/googlechrome-linux-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends google-chrome-stable \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 2. Configure Environment
ENV CHROME_PATH=/usr/bin/google-chrome-stable
ENV NODE_ENV=production
ENV PORT=10000

# 3. Set Working Directory
WORKDIR /app

# 4. Install Dependencies
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

# 5. Copy Application Source Code
COPY . .

# 6. Ensure runtime directories exist
RUN mkdir -p exports temp

# 7. Expose Render HTTP Port
EXPOSE 10000

# 8. Start Unified Server and Telegram Bot
CMD ["npm", "start"]

# =============================================================
# STOP CHALLENGE 4K 60FPS STUDIO — DOCKERFILE FOR RENDER.COM
# Uses Official Chromium, FFmpeg & Xvfb Virtual Framebuffer
# =============================================================

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install Chromium, FFmpeg, Unicode & Emoji Fonts, and Xvfb Virtual Display
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    xvfb \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=10000
ENV DISPLAY=:99

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

COPY . .

RUN mkdir -p exports temp assets/bg_previews /tmp/.X11-unix

EXPOSE 10000

# Start Xvfb Virtual Display Server in background, wait 1s, then start Web Server and Telegram Bot
CMD ["sh", "-c", "Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset & sleep 1 && npm start"]

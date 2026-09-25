# =============================================================
# STOP CHALLENGE 4K 60FPS STUDIO — DOCKERFILE FOR RENDER.COM
# Uses Official Chromium & FFmpeg from Debian Linux
# =============================================================

FROM node:20-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# Install Chromium, FFmpeg, and Unicode & Emoji Fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ffmpeg \
    fonts-liberation \
    fonts-noto-color-emoji \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium
ENV NODE_ENV=production
ENV PORT=10000

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

COPY . .

RUN mkdir -p exports temp

EXPOSE 10000

CMD ["npm", "start"]

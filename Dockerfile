# =============================================================
# STOP CHALLENGE 4K 60FPS STUDIO — 100% PYTHON DOCKERFILE
# Ultra-lightweight, 100% reliable, zero Chromium/Xvfb overhead!
# =============================================================

FROM python:3.12-slim-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PORT=10000

# Install FFmpeg and crisp Unicode fonts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    fonts-liberation \
    fonts-dejavu \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p exports temp assets/bg_previews

EXPOSE 10000

CMD ["python", "bot.py"]

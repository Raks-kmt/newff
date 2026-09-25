# 🚀 How to Deploy Stop Challenge Studio to Render.com (Hindi / English Guide)

Yeh guide aapko Stop Challenge 4K 60FPS Video Studio ko **Render.com** par 100% Free me 24/7 chalane ke liye step-by-step batati hai.

---

## 📋 Prerequisites (Zaroorat)
1. **GitHub Account**: [github.com](https://github.com)
2. **Render Account**: [render.com](https://render.com) (Free account banayein)
3. **Telegram Bot Token**: [@BotFather](https://t.me/BotFather) se mila hua token.

---

## ⚡ Method 1: 1-Click Blueprint Deploy (Recommended / Sabse Aasan)

Is repository me already `render.yaml` aur `Dockerfile` configured hai.

### Step 1: GitHub par Code Push Karein
Apne project folder me command prompt ya terminal kholein:
```bash
git init
git add .
git commit -m "Deploy Stop Challenge Studio to Render"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### Step 2: Render.com par Project Connect Karein
1. [Render Dashboard](https://dashboard.render.com/) par login karein.
2. **New +** button par click karein aur **Blueprint** chunein (ya **Web Service**).
3. Apni GitHub repository select karein (`Connect repository`).
4. Render automatic detect karega `render.yaml` aur `Dockerfile`.
5. **Environment Variables** me:
   - `TELEGRAM_BOT_TOKEN`: Apna Telegram bot token paste karein (e.g. `123456789:ABCdefGhI...`).
6. **Apply** ya **Create Web Service** par click karein!

Render automatic:
- Docker container build karega
- Google Chrome Stable & FFmpeg install karega
- Web Server + Telegram Bot ek sath start karega
- Health check `/api/status` verify karke bot live kar dega!

---

## 🛠️ Method 2: Manual Web Service Setup (Agar Blueprint na use karna ho)

1. Render Dashboard me **New +** ➔ **Web Service** par click karein.
2. Apni GitHub repository choose karein.
3. Form me ye details bharein:
   - **Name**: `stop-challenge-studio`
   - **Region**: `Oregon (US West)` ya `Frankfurt (EU)`
   - **Language / Environment**: `Docker` (⚠️ **Zaroori**: Docker chunein taaki Chrome & GPU pipeline smoothly chale bina library error ke!)
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: `Free`
4. **Environment Variables** section me "Add Environment Variable" click karein:
   - Key: `TELEGRAM_BOT_TOKEN`
   - Value: `<Aapka_Bot_Token>`
   - Key: `NODE_ENV`
   - Value: `production`
5. **Create Web Service** par click karein.

---

## 🔍 How to Verify Deployment (Check Kaise Karein)
1. Render ke logs me dekhein:
   ```text
   ✅ Web Server active on port 10000
   🤖 TELEGRAM_BOT_TOKEN detected! Initializing Bot Engine...
   🚀 Headless Chrome Renderer Engine Ready for Jobs!
   ✅ Telegram Bot polling and ready for requests!
   ```
2. Render aapko ek live URL dega (e.g., `https://stop-challenge-studio.onrender.com`).
3. Telegram par apne bot ko `/start` bhejein — Bot turant reply karega! 🎬⚡

---

## 💡 Important Tips for Render Free Tier:
- **Zero Sleep / Always-On**: Render free web services 15 minutes inactive hone par sleep me chale jaate hain. Bot ko 24/7 active rakhne ke liye aap [cron-job.org](https://cron-job.org) ya [UptimeRobot](https://uptimerobot.com) par free account banakar apni Render URL (e.g. `https://your-app.onrender.com/health`) ko har 10 minute me ping kara sakte hain.

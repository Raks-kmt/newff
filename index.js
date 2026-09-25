/**
 * STOP CHALLENGE STUDIO — PRODUCTION & CLOUD ENTRY POINT
 * Designed for 1-Click Deployment on Render.com, Railway, Docker, or Local PC.
 * 
 * Functions:
 * 1. Launches HTTP Web Server on process.env.PORT (5050 locally / 10000 on Render)
 * 2. Satisfies Render HTTP Health Checks (/api/status & /health)
 * 3. Launches Telegram Bot Engine with 60 FPS WebCodecs GPU Pipeline
 */

require('dotenv').config();
const { startServer } = require('./server');

const PORT = process.env.PORT || 5050;

async function bootstrap() {
  console.log('====================================================');
  console.log('⚡ STOP CHALLENGE 4K 60FPS STUDIO — STARTING UP');
  console.log('====================================================');
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'production'}`);
  console.log(`💻 Platform: ${process.platform} (${process.arch})`);

  // 1. Start HTTP Server for Web UI & Headless Chrome Worker
  await startServer(PORT);
  console.log(`✅ Web Server active on port ${PORT}`);

  // 2. Start Telegram Bot if Token is provided
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log('🤖 TELEGRAM_BOT_TOKEN detected! Initializing Bot Engine...');
    try {
      require('./bot.js');
      console.log('✅ Telegram Bot polling and ready for requests!');
    } catch (botErr) {
      console.error('❌ Failed to start Telegram Bot:', botErr);
    }
  } else {
    console.warn('⚠️  TELEGRAM_BOT_TOKEN is not set in environment variables.');
    console.warn('👉 Web Studio is running. To activate the Telegram Bot, add TELEGRAM_BOT_TOKEN in Render Dashboard.');
  }

  console.log('🚀 Studio Ready for Workloads!\n');
}

// Graceful termination handling for Docker / Cloud platforms
function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  process.exit(0);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

bootstrap().catch(err => {
  console.error('❌ Fatal error during bootstrap:', err);
  process.exit(1);
});

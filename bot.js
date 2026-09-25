/**
 * STOP CHALLENGE TELEGRAM BOT (OFFLINE SERVER ENGINE)
 * Full-featured Telegram Bot for creating 60 FPS Stop Challenge Videos
 * Runs 100% on the server — Zero load on user PC!
 */

require('dotenv').config();
process.env.NTBA_FIX_350 = 1;
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const ServerRenderer = require('./serverRenderer');
const AdmZip = require('adm-zip');
const { Transform } = require('stream');

// All 20 Curated 4K Studio Gradients
const BG_PRESETS = {
  'cyberpunk': '🌆 Cyber Night Grid',
  'neon-city': '🌃 Synthwave Neon City',
  'gaming-rgb': '🎮 Gaming Hex Mesh',
  'laser-matrix': '⚡ Hyper Blue Lasers',
  'vaporwave': '🌸 Sunset Vaporwave',
  'inferno': '🔥 Inferno Lava Fire',
  'luxury-gold': '👑 24K Luxury Gold',
  'midnight-diamond': '💎 Midnight Sapphire',
  'emerald-noir': '🌲 Imperial Emerald',
  'rose-gold': '🍾 Rose Gold Champagne',
  'deep-space': '🌌 Deep Space Nebula',
  'supernova': '🌟 Supernova Flare',
  'aurora': '✨ Aurora Borealis',
  'dark-matter': '🔮 Dark Matter Vortex',
  'studio-dark': '🎬 Studio Charcoal Dark',
  'viral-split': '🩷 TikTok Split Neon',
  'electric-violet': '💜 Electric Violet',
  'acid-lime': '💚 Acid Lime High-Voltage',
  'pure-oled': '🖤 Pure OLED True Black',
  'pastel-creator': '🧁 Pastel Aesthetic'
};

function getPngScaleLabel(percent) {
  const p = percent || 100;
  if (p <= 55) return 'Very Small 🔬';
  if (p <= 75) return 'Compact 📱';
  if (p <= 90) return 'Medium 📐';
  if (p <= 105) return 'Normal (Default) 🎯';
  if (p <= 125) return 'Large 🔍';
  if (p <= 155) return 'Extra Large 💥';
  return 'Giant 🦖';
}

function getScaleBar(percent) {
  const p = Math.max(30, Math.min(180, percent || 100));
  const filled = Math.max(1, Math.min(10, Math.round(((p - 30) / 150) * 10)));
  const empty = 10 - filled;
  return '■'.repeat(filled) + '□'.repeat(empty);
}

/**
 * Accurately extracts container duration from MP4 file header (moov -> mvhd atom)
 * Runs in under 1 millisecond. Guarantees 100% accurate duration for Telegram player.
 */
function getMp4Duration(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(128 * 1024);
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);

    let pos = 0;
    while (pos + 8 <= bytesRead) {
      const size = buf.readUInt32BE(pos);
      const type = buf.toString('ascii', pos + 4, pos + 8);
      if (size === 0) break;
      if (type === 'moov') {
        let mPos = pos + 8;
        const mEnd = pos + size;
        while (mPos + 8 <= mEnd && mPos + 8 <= bytesRead) {
          const subSize = buf.readUInt32BE(mPos);
          const subType = buf.toString('ascii', mPos + 4, mPos + 8);
          if (subSize === 0) break;
          if (subType === 'mvhd') {
            const vPos = mPos + 8;
            const version = buf.readUInt8(vPos);
            let timescale, durVal;
            if (version === 1) {
              timescale = buf.readUInt32BE(vPos + 20);
              durVal = Number(buf.readBigUInt64BE(vPos + 24));
            } else {
              timescale = buf.readUInt32BE(vPos + 12);
              durVal = buf.readUInt32BE(vPos + 16);
            }
            if (timescale > 0) {
              return durVal / timescale;
            }
          }
          mPos += subSize;
        }
      }
      pos += size;
    }
  } catch (e) {}
  return null;
}

/**
 * Direct Telegram Video Uploader using Native Fetch & FormData
 * Bypasses node-telegram-bot-api request streaming bottlenecks.
 * Guarantees correct duration metadata (fixes 0:00 bug), correct aspect ratio, and fast upload.
 */
async function sendTelegramVideoDirect({
  token,
  chatId,
  filePath,
  caption,
  duration,
  width,
  height
}) {
  const buffer = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('caption', caption || '');
  formData.append('parse_mode', 'Markdown');
  formData.append('supports_streaming', 'true');

  // Extract exact duration from MP4 file or fallback to parameter
  const fileDur = getMp4Duration(filePath);
  const effectiveDuration = Math.max(1, Math.round(fileDur || duration || 1));
  formData.append('duration', String(effectiveDuration));

  if (width && height) {
    formData.append('width', String(Math.round(width)));
    formData.append('height', String(Math.round(height)));
  }

  const fileName = path.basename(filePath);
  formData.append('video', new Blob([buffer], { type: 'video/mp4' }), fileName);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram API error ${data.error_code}`);
  }
  return data.result;
}

/**
 * Direct Telegram Document Uploader using Native Fetch & FormData
 */
async function sendTelegramDocumentDirect({
  token,
  chatId,
  filePath,
  caption,
  fileName
}) {
  const buffer = fs.readFileSync(filePath);
  const formData = new FormData();
  formData.append('chat_id', String(chatId));
  formData.append('caption', caption || '');
  formData.append('parse_mode', 'Markdown');

  const outName = fileName || path.basename(filePath);
  formData.append('document', new Blob([buffer], { type: 'application/zip' }), outName);

  const res = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram API error ${data.error_code}`);
  }
  return data.result;
}

/**
/**
 * Ultra-Modern Telegram Progress Card (Mirror-Leech / Cyberpunk Studio Style)
 */
function buildProgressMessage({
  stageIcon = '📥',
  stageName = 'Downloading Asset',
  itemName = '',
  percent = 0,
  currentQty = 0,
  totalQty = 0,
  qtyUnit = 'MB',
  startTime = Date.now(),
  extraLines = []
}) {
  const p = Math.max(0, Math.min(100, Math.round(percent * 10) / 10));
  const totalBlocks = 10;
  const filled = Math.min(totalBlocks, Math.round((p / 100) * totalBlocks));
  const empty = totalBlocks - filled;
  const bar = '▰'.repeat(filled) + '▱'.repeat(empty);

  const now = Date.now();
  const elapsedSec = Math.max(1, Math.round((now - startTime) / 1000));
  const speed = currentQty > 0 ? (currentQty / elapsedSec) : 0;

  let etaText = 'Calculating...';
  if (p > 3 && p < 100 && speed > 0 && totalQty > currentQty) {
    const remainingSec = Math.round((totalQty - currentQty) / speed);
    const m = Math.floor(remainingSec / 60);
    const s = remainingSec % 60;
    etaText = m > 0 ? `${m}m ${s}s` : `${s}s`;
  } else if (p >= 100) {
    etaText = '0s (Done ✅)';
  }

  const elapsedM = Math.floor(elapsedSec / 60);
  const elapsedS = elapsedSec % 60;
  const elapsedText = elapsedM > 0 ? `${elapsedM}m ${elapsedS}s` : `${elapsedS}s`;

  let qtyLine = '';
  if (totalQty > 0) {
    if (qtyUnit === 'MB') {
      qtyLine = `📊 *Processed*: \`${currentQty.toFixed(1)} MB / ${totalQty.toFixed(1)} MB\`\n`;
    } else if (qtyUnit === 'KB') {
      qtyLine = `📊 *Processed*: \`${Math.round(currentQty)} KB / ${Math.round(totalQty)} KB\`\n`;
    } else if (qtyUnit === 'frames') {
      qtyLine = `📊 *Frames*: \`${Math.round(currentQty)} / ${Math.round(totalQty)} Frames\`\n`;
    } else if (qtyUnit === 'files') {
      qtyLine = `📊 *Batch Items*: \`${Math.round(currentQty)} / ${Math.round(totalQty)} Files\`\n`;
    } else {
      qtyLine = `📊 *Processed*: \`${currentQty.toFixed(1)} / ${totalQty.toFixed(1)} ${qtyUnit}\`\n`;
    }
  }

  let speedText = 'Processing...';
  if (speed > 0) {
    if (qtyUnit === 'MB') speedText = `${speed.toFixed(2)} MB/s`;
    else if (qtyUnit === 'frames') speedText = `${speed.toFixed(1)} FPS`;
    else speedText = `${speed.toFixed(1)} items/s`;
  }

  const cleanItem = (itemName || 'item').length > 24
    ? (itemName || 'item').substring(0, 21) + '...'
    : (itemName || 'item');

  let text = `⚡ *Studio Engine*\n` +
    `${stageIcon} *${stageName}*\n` +
    `📁 \`${cleanItem}\`\n\n` +
    `${bar} *${p.toFixed(0)}%*\n\n`;

  if (qtyLine) {
    text += qtyLine;
  }
  text += `⚡ *Speed*: \`${speedText}\` • ⏱️ *ETA*: \`${etaText}\`\n` +
    `⏱️ *Elapsed*: \`${elapsedText}\`\n`;

  if (extraLines && extraLines.length > 0) {
    text += `\n` + extraLines.join('\n') + '\n';
  }

  return text;
}

/**
 * Resilient Telegram File Downloader using Node.js native https & stream piping.
 * Features:
 * - Direct-to-disk streaming (zero RAM bottleneck)
 * - Real-time byte tracking (% + elapsed time + ETA + MB quantity)
 * - Automatic retry on socket reset / network termination (fixes UND_ERR_SOCKET "terminated" bug)
 */
async function downloadTelegramFileToDisk(botInstance, fileId, destPath, onProgress, maxRetries = 3) {
  const fileUrl = await botInstance.getFileLink(fileId);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(destPath);
        let receivedBytes = 0;
        const startTime = Date.now();
        let lastReport = 0;

        function doRequest(targetUrl) {
          const req = https.get(targetUrl, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              return doRequest(res.headers.location);
            }
            if (res.statusCode !== 200) {
              fileStream.close();
              return reject(new Error(`Telegram download HTTP ${res.statusCode} ${res.statusMessage || ''}`));
            }

            const totalBytes = parseInt(res.headers['content-length'] || '0', 10);

            res.on('data', (chunk) => {
              receivedBytes += chunk.length;
              const now = Date.now();
              if ((now - lastReport >= 2000 && totalBytes > 0) || (totalBytes > 0 && receivedBytes === totalBytes)) {
                lastReport = now;
                const percent = Math.min(100, Math.round((receivedBytes / totalBytes) * 100));
                if (typeof onProgress === 'function') {
                  onProgress({ percent, receivedBytes, totalBytes, startTime });
                }
              }
            });

            res.pipe(fileStream);

            fileStream.on('finish', () => {
              fileStream.close();
              resolve();
            });

            res.on('error', (resErr) => {
              fileStream.close();
              try { fs.unlinkSync(destPath); } catch(e) {}
              reject(resErr);
            });
          });

          req.on('error', (reqErr) => {
            fileStream.close();
            try { fs.unlinkSync(destPath); } catch(e) {}
            reject(reqErr);
          });

          req.setTimeout(90000, () => {
            req.destroy(new Error('Telegram download timeout (90s)'));
          });
        }

        doRequest(fileUrl);
      });

      if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
        return destPath;
      }
      throw new Error('Downloaded file is empty (0 bytes)');
    } catch (err) {
      console.warn(`[DOWNLOAD ATTEMPT ${attempt}/${maxRetries} FAILED]:`, err.message || err);
      if (attempt >= maxRetries) {
        throw new Error(`Telegram download failed after ${maxRetries} attempts: ${err.message || err}`);
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }
}

/**
 * Downloads a file to an in-memory Buffer with progress tracking and retry protection
 */
async function downloadTelegramFileToBuffer(botInstance, fileId, onProgress, maxRetries = 3) {
  const tempFile = path.join(TEMP_DIR, `temp_dl_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  try {
    await downloadTelegramFileToDisk(botInstance, fileId, tempFile, onProgress, maxRetries);
    const buf = fs.readFileSync(tempFile);
    try { fs.unlinkSync(tempFile); } catch(e) {}
    return buf;
  } catch (err) {
    try { if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile); } catch(e) {}
    throw err;
  }
}

const downloadFileWithProgress = downloadTelegramFileToBuffer;

// Directories
const EXPORTS_DIR = path.join(__dirname, 'exports');
const TEMP_DIR = path.join(__dirname, 'temp');
const SESSIONS_FILE = path.join(__dirname, 'sessions.json');

if (!fs.existsSync(EXPORTS_DIR)) fs.mkdirSync(EXPORTS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Load / Save Sessions
let userSessions = {};
if (fs.existsSync(SESSIONS_FILE)) {
  try {
    userSessions = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
  } catch (e) {
    userSessions = {};
  }
}

function saveSessions() {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(userSessions, null, 2), 'utf8');
  } catch (e) {}
}

const DEFAULT_SETTINGS = {
  motionType: 'spin',      // 'spin' | 'pendulum' | 'zigzag' | 'bounce' | 'orbit' | 'slide'
  speed: 1.0,
  duration: 3,             // 3s default for fast generation
  fps: 60,
  resolution: '720p',      // 720p default for super-fast mobile delivery
  aspectRatio: '9:16',     // 9:16 Shorts/Reels
  headerText: 'CAN YOU STOP THIS? 🛑',
  headerColor: '#ffe600',
  subText: 'PAUSE EXACTLY IN THE OUTLINE! 🎯',
  outlineColor: '#00f3ff',
  outlineWidth: 8,
  bgGradient: 'cyberpunk',
  audioPreset: 'none',     // 'none' | 'electronicBeat' | 'synthwave' | 'hiphop' | 'random_pool'
  customAudioFile: null,
  customAudioFiles: [],    // Multi-track Audio Pool for Random Soundtrack Selection
  batchMode: false,
  autoDeleteUploads: true, // Auto-delete user uploaded files from Telegram chat
  pngScale: 100,           // 100% standard size (0.72x base scale factor)

  // Atmosphere & Floating Glow Particles
  showSparkles: true,       // Floating Glow Sparkles in 3D depth
  particleCount: 90,        // Particle density (10 to 120, default 90 as requested)
  particleSpeed: 3.0,       // Drift speed multiplier (0.2x to 5.0x, default 3.0x as requested)
  particleColor: '#00f3ff', // Sparkle color ('#00f3ff', '#ffe600', '#ff007f', '#00ff88', '#ffffff', 'multi')

  lastBgPreviewMsgId: null,
  lastScalePreviewMsgId: null,
  lastParticlesPreviewMsgId: null,
  awaitingCustomText: false,
  awaitingSpeedInput: false,
  awaitingScaleInput: false,
  awaitingDensityInput: false,
  awaitingDriftSpeedInput: false
};

function getUserSession(chatId) {
  if (!userSessions[chatId]) {
    userSessions[chatId] = { ...DEFAULT_SETTINGS, customAudioFiles: [] };
    saveSessions();
  } else {
    if (!Array.isArray(userSessions[chatId].customAudioFiles)) {
      userSessions[chatId].customAudioFiles = userSessions[chatId].customAudioFile
        ? [{ name: path.basename(userSessions[chatId].customAudioFile), path: userSessions[chatId].customAudioFile }]
        : [];
    }
    if (userSessions[chatId].autoDeleteUploads === undefined) {
      userSessions[chatId].autoDeleteUploads = true;
    }
    if (userSessions[chatId].pngScale === undefined) {
      userSessions[chatId].pngScale = 100;
    }
    if (userSessions[chatId].showSparkles === undefined) {
      userSessions[chatId].showSparkles = true;
    }
    if (userSessions[chatId].particleCount === undefined) {
      userSessions[chatId].particleCount = 90;
    }
    if (userSessions[chatId].particleSpeed === undefined) {
      userSessions[chatId].particleSpeed = 3.0;
    }
    if (userSessions[chatId].particleColor === undefined) {
      userSessions[chatId].particleColor = '#00f3ff';
    }
  }
  return userSessions[chatId];
}

// Bot Token Check
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TOKEN || TOKEN === 'YOUR_TELEGRAM_BOT_TOKEN_HERE') {
  console.error('\n❌ ERROR: TELEGRAM_BOT_TOKEN is missing or not set in .env file!');
  console.log('\n📝 How to set up your bot token:');
  console.log('1. Open Telegram and search for @BotFather');
  console.log('2. Send "/newbot" and follow prompts to get your API Token');
  console.log('3. Put your token in .env:');
  console.log('   TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRstuVWXyz');
  console.log('4. Run "npm run bot" or "node bot.js"\n');
  process.exit(1);
}

// Global process error guards to prevent bot termination
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason || '');
  if (msg.includes('message is not modified')) return;
  console.warn('⚠️ [UNHANDLED REJECTION]:', msg);
});

process.on('uncaughtException', (err) => {
  console.error('❌ [UNCAUGHT EXCEPTION]:', err?.message || err);
});

// Initialize Telegram Bot
const bot = new TelegramBot(TOKEN, { polling: true });
console.log('🤖 Telegram Bot Service Started (Polling Mode)...');

// Polling and network error safety handlers
bot.on('polling_error', (error) => {
  const msg = error?.message || String(error || '');
  if (msg.includes('EFATAL') || msg.includes('ETELEGRAM')) {
    console.warn('⚠️ [POLLING WARNING]:', msg);
  } else {
    console.warn('⚠️ [POLLING ERROR]:', msg);
  }
});

bot.on('error', (error) => {
  console.warn('⚠️ [BOT GENERAL ERROR]:', error?.message || error);
});

// Gracefully intercept editMessageText & editMessageReplyMarkup so Telegram's
// 'message is not modified' error never causes unhandled exceptions
const origEditMessageText = bot.editMessageText.bind(bot);
bot.editMessageText = async function(...args) {
  try {
    return await origEditMessageText(...args);
  } catch (err) {
    if (err && err.message && err.message.includes('message is not modified')) {
      return null;
    }
    console.warn('[EDIT MESSAGE ERROR]:', err?.message || err);
    return null;
  }
};

const origEditMessageReplyMarkup = bot.editMessageReplyMarkup.bind(bot);
bot.editMessageReplyMarkup = async function(...args) {
  try {
    return await origEditMessageReplyMarkup(...args);
  } catch (err) {
    if (err && err.message && err.message.includes('message is not modified')) {
      return null;
    }
    console.warn('[EDIT REPLY MARKUP ERROR]:', err?.message || err);
    return null;
  }
};

const origAnswerCallbackQuery = bot.answerCallbackQuery.bind(bot);
bot.answerCallbackQuery = async function(...args) {
  try {
    return await origAnswerCallbackQuery(...args);
  } catch (err) {
    return null;
  }
};

const SERVER_PORT = process.env.PORT || 5050;
const SERVER_URL = process.env.SERVER_URL || `http://127.0.0.1:${SERVER_PORT}`;

// Initialize Headless Renderer
const renderer = new ServerRenderer({
  port: parseInt(process.env.CHROME_DEBUG_PORT || '9225', 10),
  serverUrl: SERVER_URL
});

// Start Headless Chrome in background
renderer.start().then(() => {
  console.log('🚀 Headless Chrome Renderer Engine Ready for Jobs!');
}).catch(err => {
  console.warn('⚠️ Headless Chrome will initialize on first render:', err.message);
});

/**
 * Real-time Background Preview with auto-deletion of previous preview
 */
async function sendOrUpdateBgPreview(chatId, bgKey) {
  const session = getUserSession(chatId);
  const keys = Object.keys(BG_PRESETS);
  const currentIndex = keys.indexOf(bgKey) !== -1 ? keys.indexOf(bgKey) : 0;
  const currentKey = keys[currentIndex];
  const bgName = BG_PRESETS[currentKey] || currentKey;

  const prevKey = keys[(currentIndex - 1 + keys.length) % keys.length];
  const nextKey = keys[(currentIndex + 1) % keys.length];

  const assetFile = path.join(__dirname, 'assets', 'bg_previews', `${currentKey}.jpg`);
  const tempFile = path.join(__dirname, 'temp', 'bg_previews', `${currentKey}.jpg`);
  const previewFile = fs.existsSync(assetFile) ? assetFile : tempFile;
  const isCurrentActive = session.bgGradient === currentKey;

  const caption = `🎨 *Background Visual Preview*\n\n` +
    `• 🌟 *Name*: \`${bgName}\`\n` +
    `• 📊 *Index*: \`${currentIndex + 1} / ${keys.length}\`\n` +
    `• 📌 *Status*: ${isCurrentActive ? '✅ *Currently Active*' : '⚪ *Not Selected*'}\n\n` +
    `_Tip: Click "✨ Set this BG" to apply, or use arrows to view other backgrounds._`;

  const inline_keyboard = [
    [
      { text: `⬅️ Prev (${BG_PRESETS[prevKey].split(' ')[0]})`, callback_data: `view:bg:${prevKey}` },
      { text: isCurrentActive ? `✅ Active BG` : `✨ Set this BG`, callback_data: `apply:bg:${currentKey}` },
      { text: `Next (${BG_PRESETS[nextKey].split(' ')[0]}) ➡️`, callback_data: `view:bg:${nextKey}` }
    ],
    [
      { text: `📋 Background List`, callback_data: `menu:bg` },
      { text: `🗑️ Close Preview`, callback_data: `close:bg_preview` }
    ]
  ];

  // Auto-delete previous preview message if one is already open in chat
  if (session.lastBgPreviewMsgId) {
    bot.deleteMessage(chatId, session.lastBgPreviewMsgId).catch(() => {});
    session.lastBgPreviewMsgId = null;
  }

  if (fs.existsSync(previewFile)) {
    const sentMsg = await bot.sendPhoto(chatId, previewFile, {
      caption: caption,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
    session.lastBgPreviewMsgId = sentMsg.message_id;
    saveSessions();
  } else {
    const sentMsg = await bot.sendMessage(chatId, caption, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
    session.lastBgPreviewMsgId = sentMsg.message_id;
    saveSessions();
  }
}

/**
 * Real-time Live PNG Size Preview with auto-deletion of previous preview
 */
async function sendScalePreview(chatId) {
  const session = getUserSession(chatId);
  const curScale = session.pngScale || 100;
  const bgKey = session.bgGradient || 'cyberpunk';

  if (session.lastScalePreviewMsgId) {
    bot.deleteMessage(chatId, session.lastScalePreviewMsgId).catch(() => {});
    session.lastScalePreviewMsgId = null;
    saveSessions();
  }

  const status = await bot.sendMessage(chatId, `⏳ *Generating live scale preview (${curScale}%)...*`, { parse_mode: 'Markdown' });

  try {
    const scaleFactor = 0.72 * (curScale / 100);
    const expr = `(function() {
      try {
        const cvs = document.createElement('canvas');
        cvs.width = 540;
        cvs.height = 960;
        const ctx = cvs.getContext('2d');
        canvasEngine.config.bgType = 'gradient';
        canvasEngine.config.bgGradient = '${bgKey}';
        canvasEngine.renderBackground(ctx, 540, 960, 0);

        const cx = 270;
        const cy = 480;
        const boxSize = Math.round(280 * ${scaleFactor});

        ctx.strokeStyle = '${session.outlineColor || '#00f3ff'}';
        ctx.lineWidth = 6;
        ctx.shadowColor = '${session.outlineColor || '#00f3ff'}';
        ctx.shadowBlur = 15;
        ctx.strokeRect(cx - boxSize/2, cy - boxSize/2, boxSize, boxSize);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(cx - boxSize/2, cy - boxSize/2, boxSize, boxSize);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('PNG SIZE: ${curScale}%', cx, cy);

        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('CAN YOU STOP THIS? 🛑', cx, 80);

        return cvs.toDataURL('image/jpeg', 0.85);
      } catch(e) {
        return null;
      }
    })()`;

    const dataUrl = await renderer.eval(expr);
    bot.deleteMessage(chatId, status.message_id).catch(() => {});

    if (dataUrl && dataUrl.startsWith('data:image/jpeg;base64,')) {
      const buf = Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
      const previewPath = path.join(TEMP_DIR, `scale_preview_${chatId}.jpg`);
      fs.writeFileSync(previewPath, buf);

      const inline_keyboard = [
        [
          { text: '➖ -10%', callback_data: 'step:scale:-10' },
          { text: `🎯 ${curScale}%`, callback_data: 'scale:info' },
          { text: '➕ +10%', callback_data: 'step:scale:+10' }
        ],
        [
          { text: '📐 Adjust in Settings', callback_data: 'menu:scale' },
          { text: '🗑️ Close Preview', callback_data: 'close:scale_preview' }
        ]
      ];

      const sent = await bot.sendPhoto(chatId, previewPath, {
        caption: `📐 *Live Realtime PNG Size Preview: ${curScale}%*\n` +
          `• Label: *${getPngScaleLabel(curScale)}*\n` +
          `• Target Size: \`~${Math.round(280 * scaleFactor)}x${Math.round(280 * scaleFactor)} px\`\n` +
          `• Background: \`${BG_PRESETS[bgKey] || bgKey}\`\n\n` +
          `_Tip: Click -10% or +10% to change size in real time!_`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard }
      });
      session.lastScalePreviewMsgId = sent.message_id;
      saveSessions();
    }
  } catch (err) {
    bot.deleteMessage(chatId, status.message_id).catch(() => {});
  }
}

/**
 * Real-time Live Atmosphere & 3D Glow Particles Preview with auto-deletion
 */
async function sendAtmospherePreview(chatId) {
  const session = getUserSession(chatId);
  const count = session.particleCount || 90;
  const speed = (session.particleSpeed || 3.0).toFixed(1);
  const color = session.particleColor || '#00f3ff';
  const bgKey = session.bgGradient || 'cyberpunk';
  const isEnabled = session.showSparkles !== false;

  if (session.lastParticlesPreviewMsgId) {
    bot.deleteMessage(chatId, session.lastParticlesPreviewMsgId).catch(() => {});
    session.lastParticlesPreviewMsgId = null;
    saveSessions();
  }

  const status = await bot.sendMessage(chatId, `⏳ *Rendering atmosphere & particles preview (${count} density @ ${speed}x drift)...*`, { parse_mode: 'Markdown' });

  try {
    const expr = `(function() {
      try {
        const cvs = document.createElement('canvas');
        cvs.width = 540;
        cvs.height = 960;
        const ctx = cvs.getContext('2d');
        canvasEngine.config.bgType = 'gradient';
        canvasEngine.config.bgGradient = '${bgKey}';
        canvasEngine.renderBackground(ctx, 540, 960, 0);

        canvasEngine.config.showSparkles = ${isEnabled};
        canvasEngine.config.particleSpeed = ${parseFloat(speed)};
        canvasEngine.config.particleColor = '${color}';
        canvasEngine.initParticles(${count});
        canvasEngine.renderParticles(ctx, 540, 960, 1.2);

        // Header & silhouette box
        const cx = 270;
        const cy = 480;
        const boxSize = 180;

        ctx.strokeStyle = '${session.outlineColor || '#00f3ff'}';
        ctx.lineWidth = 6;
        ctx.shadowColor = '${session.outlineColor || '#00f3ff'}';
        ctx.shadowBlur = 15;
        ctx.strokeRect(cx - boxSize/2, cy - boxSize/2, boxSize, boxSize);

        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffe600';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FLOATING GLOW SPARKLES ✨', cx, 80);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText('${count} DENSITY • ${speed}x DRIFT', cx, cy);

        return cvs.toDataURL('image/jpeg', 0.85);
      } catch(e) {
        return null;
      }
    })()`;

    const dataUrl = await renderer.eval(expr);
    bot.deleteMessage(chatId, status.message_id).catch(() => {});

    if (dataUrl && dataUrl.startsWith('data:image/jpeg;base64,')) {
      const buf = Buffer.from(dataUrl.replace(/^data:image\/jpeg;base64,/, ''), 'base64');
      const previewPath = path.join(TEMP_DIR, `particles_preview_${chatId}.jpg`);
      fs.writeFileSync(previewPath, buf);

      const inline_keyboard = [
        [
          { text: '➖ -10 Density', callback_data: 'step:density:-10' },
          { text: `🌌 ${count}`, callback_data: 'density:info' },
          { text: '➕ +10 Density', callback_data: 'step:density:+10' }
        ],
        [
          { text: '➖ -0.5x Speed', callback_data: 'step:driftspeed:-0.5' },
          { text: `⚡ ${speed}x`, callback_data: 'driftspeed:info' },
          { text: '➕ +0.5x Speed', callback_data: 'step:driftspeed:+0.5' }
        ],
        [
          { text: '⚙️ Particle Settings', callback_data: 'menu:particles' },
          { text: '🗑️ Close Preview', callback_data: 'close:particles_preview' }
        ]
      ];

      const sent = await bot.sendPhoto(chatId, previewPath, {
        caption: `✨ *Atmosphere & Floating Glow Particles Preview*\n\n` +
          `• 🌌 *Particle Density*: \`${count}\`\n` +
          `• ⚡ *Drift Speed*: \`${speed}x\`\n` +
          `• 🎨 *Sparkle Color*: \`${color}\`\n` +
          `• 🖼️ *Background*: \`${BG_PRESETS[bgKey] || bgKey}\`\n\n` +
          `_Tip: Click buttons below to adjust density & drift speed in real time!_`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard }
      });
      session.lastParticlesPreviewMsgId = sent.message_id;
      saveSessions();
    }
  } catch (err) {
    bot.deleteMessage(chatId, status.message_id).catch(() => {});
  }
}

// UI Helper: Speed Selection Keyboard
function getSpeedMenuKeyboard(session) {
  const curSpeed = (session.speed || 1.0).toFixed(2);
  return {
    inline_keyboard: [
      [
        { text: '➖ -0.1x', callback_data: 'step:speed:-0.1' },
        { text: `⚡ Current: ${curSpeed}x`, callback_data: 'prompt:custom_speed' },
        { text: '➕ +0.1x', callback_data: 'step:speed:+0.1' }
      ],
      [
        { text: '🐢 0.25x', callback_data: 'set:speed:0.25' },
        { text: '🐢 0.5x', callback_data: 'set:speed:0.5' },
        { text: '🚶 0.75x', callback_data: 'set:speed:0.75' }
      ],
      [
        { text: '⚡ 1.0x', callback_data: 'set:speed:1.0' },
        { text: '🏃 1.25x', callback_data: 'set:speed:1.25' },
        { text: '🔥 1.5x', callback_data: 'set:speed:1.5' }
      ],
      [
        { text: '🚀 1.75x', callback_data: 'set:speed:1.75' },
        { text: '⚡ 2.0x', callback_data: 'set:speed:2.0' },
        { text: '💥 2.5x', callback_data: 'set:speed:2.5' }
      ],
      [
        { text: '✏️ Type Exact Custom Speed', callback_data: 'prompt:custom_speed' }
      ],
      [{ text: '« Back to Settings', callback_data: 'menu:main' }]
    ]
  };
}

// UI Helper: PNG Scale / Size Selection Keyboard
function getScaleMenuKeyboard(session) {
  const curScale = session.pngScale || 100;
  return {
    inline_keyboard: [
      [
        { text: '➖ -10%', callback_data: 'step:scale:-10' },
        { text: `🎯 Size: ${curScale}%`, callback_data: 'prompt:custom_scale' },
        { text: '➕ +10%', callback_data: 'step:scale:+10' }
      ],
      [
        { text: `🔬 50% ${curScale === 50 ? '✅' : ''}`, callback_data: 'set:scale:50' },
        { text: `📱 75% ${curScale === 75 ? '✅' : ''}`, callback_data: 'set:scale:75' },
        { text: `🎯 100% ${curScale === 100 ? '✅' : ''}`, callback_data: 'set:scale:100' }
      ],
      [
        { text: `🔍 125% ${curScale === 125 ? '✅' : ''}`, callback_data: 'set:scale:125' },
        { text: `💥 150% ${curScale === 150 ? '✅' : ''}`, callback_data: 'set:scale:150' },
        { text: `⚡ 175% ${curScale === 175 ? '✅' : ''}`, callback_data: 'set:scale:175' }
      ],
      [
        { text: '👁️ Live Visual Preview of Size', callback_data: 'preview:scale' }
      ],
      [
        { text: '✏️ Type Exact Custom Size', callback_data: 'prompt:custom_scale' }
      ],
      [{ text: '« Back to Settings', callback_data: 'menu:main' }]
    ]
  };
}

// UI Helper: Atmosphere & Floating Glow Particles Menu Keyboard
function getParticlesMenuKeyboard(session) {
  const isEnabled = session.showSparkles !== false;
  const count = session.particleCount || 90;
  const speed = (session.particleSpeed || 3.0).toFixed(1);
  const color = session.particleColor || '#00f3ff';

  const colorLabels = {
    '#00f3ff': '🩵 Cyan',
    '#ffe600': '💛 Gold',
    '#ff007f': '🩷 Pink',
    '#00ff88': '💚 Lime',
    '#ffffff': '🤍 White',
    'multi': '🌈 Rainbow'
  };

  return {
    inline_keyboard: [
      [
        { text: isEnabled ? '✨ Floating Particles: ON ✅' : '✨ Floating Particles: OFF ❌', callback_data: 'toggle:particles' }
      ],
      [
        { text: '➖ -10 Density', callback_data: 'step:density:-10' },
        { text: `🌌 Density: ${count}`, callback_data: 'prompt:custom_density' },
        { text: '➕ +10 Density', callback_data: 'step:density:+10' }
      ],
      [
        { text: `20 ${count === 20 ? '✅' : ''}`, callback_data: 'set:density:20' },
        { text: `40 ${count === 40 ? '✅' : ''}`, callback_data: 'set:density:40' },
        { text: `60 ${count === 60 ? '✅' : ''}`, callback_data: 'set:density:60' },
        { text: `90 ${count === 90 ? '✅' : ''}`, callback_data: 'set:density:90' },
        { text: `120 ${count === 120 ? '✅' : ''}`, callback_data: 'set:density:120' }
      ],
      [
        { text: '➖ -0.5x Speed', callback_data: 'step:driftspeed:-0.5' },
        { text: `⚡ Drift: ${speed}x`, callback_data: 'prompt:custom_driftspeed' },
        { text: '➕ +0.5x Speed', callback_data: 'step:driftspeed:+0.5' }
      ],
      [
        { text: `0.5x ${speed === '0.5' ? '✅' : ''}`, callback_data: 'set:driftspeed:0.5' },
        { text: `1.0x ${speed === '1.0' ? '✅' : ''}`, callback_data: 'set:driftspeed:1.0' },
        { text: `2.0x ${speed === '2.0' ? '✅' : ''}`, callback_data: 'set:driftspeed:2.0' },
        { text: `3.0x ${speed === '3.0' ? '✅' : ''}`, callback_data: 'set:driftspeed:3.0' },
        { text: `4.0x ${speed === '4.0' ? '✅' : ''}`, callback_data: 'set:driftspeed:4.0' }
      ],
      [
        { text: `🩵 Cyan ${color === '#00f3ff' ? '✅' : ''}`, callback_data: 'set:pcolor:#00f3ff' },
        { text: `💛 Gold ${color === '#ffe600' ? '✅' : ''}`, callback_data: 'set:pcolor:#ffe600' },
        { text: `🩷 Pink ${color === '#ff007f' ? '✅' : ''}`, callback_data: 'set:pcolor:#ff007f' }
      ],
      [
        { text: `💚 Lime ${color === '#00ff88' ? '✅' : ''}`, callback_data: 'set:pcolor:#00ff88' },
        { text: `🤍 White ${color === '#ffffff' ? '✅' : ''}`, callback_data: 'set:pcolor:#ffffff' },
        { text: `🌈 Rainbow ${color === 'multi' ? '✅' : ''}`, callback_data: 'set:pcolor:multi' }
      ],
      [
        { text: '👁️ Live Visual Preview of Atmosphere', callback_data: 'preview:particles' }
      ],
      [
        { text: '« Back to Settings', callback_data: 'menu:main' }
      ]
    ]
  };
}

// UI Helper: Main Settings Keyboards
function getSettingsKeyboard(session) {
  const motionIcons = {
    spin: '🔄 360° Spin',
    pendulum: '🔔 Pendulum',
    zigzag: '⚡ ZigZag',
    bounce: '🏀 Bounce',
    orbit: '🌀 Orbit',
    slide: '↔️ Slide'
  };

  const ratioIcons = {
    '9:16': '📱 9:16 (Shorts)',
    '1:1': '⬛ 1:1 (Square)',
    '16:9': '🖥️ 16:9 (Cinema)'
  };

  const outlineIcons = {
    '#00f3ff': '🩵 Cyan',
    '#ff007f': '🩷 Pink',
    '#ffe600': '💛 Yellow',
    '#00ff88': '💚 Green',
    '#ffffff': '🤍 White'
  };

  const poolCount = Array.isArray(session.customAudioFiles) ? session.customAudioFiles.length : 0;
  let audioLabel = 'Mute';
  if (session.audioPreset === 'random_pool' || (poolCount > 0 && (session.audioPreset === 'none' || session.audioPreset === 'custom'))) {
    audioLabel = `🎲 Pool (${poolCount})`;
  } else if (session.audioPreset !== 'none') {
    audioLabel = session.audioPreset;
  } else if (session.customAudioFile) {
    audioLabel = 'Custom Track';
  }

  const particlesLabel = session.showSparkles !== false
    ? `✨ ${session.particleCount || 90} (${(session.particleSpeed || 3.0).toFixed(1)}x)`
    : 'OFF ❌';

  return {
    inline_keyboard: [
      [
        { text: `🎬 Motion: ${motionIcons[session.motionType] || session.motionType}`, callback_data: 'menu:motion' },
        { text: `🎨 BG: ${BG_PRESETS[session.bgGradient] || 'Cyberpunk'}`, callback_data: 'menu:bg' }
      ],
      [
        { text: `⚡ Speed: ${session.speed}x`, callback_data: 'menu:speed' },
        { text: `📐 PNG Size: ${session.pngScale || 100}%`, callback_data: 'menu:scale' }
      ],
      [
        { text: `✨ Particles: ${particlesLabel}`, callback_data: 'menu:particles' },
        { text: `🎯 Outline: ${outlineIcons[session.outlineColor] || session.outlineColor}`, callback_data: 'menu:outline' }
      ],
      [
        { text: `⏱️ Duration: ${session.duration}s`, callback_data: 'menu:duration' },
        { text: `📐 Ratio: ${ratioIcons[session.aspectRatio] || session.aspectRatio}`, callback_data: 'menu:ratio' }
      ],
      [
        { text: `💎 Res: ${session.resolution.toUpperCase()} (${session.fps}FPS)`, callback_data: 'menu:resolution' },
        { text: `🎵 Audio: ${audioLabel}`, callback_data: 'menu:audio' }
      ],
      [
        { text: `📝 Hook: "${session.headerText.substring(0, 14)}..."`, callback_data: 'menu:hook' },
        { text: session.batchMode ? '🏭 Batch: ON ✅' : '🏭 Batch: OFF', callback_data: 'toggle:batch' }
      ],
      [
        { text: session.autoDeleteUploads !== false ? '🗑️ Auto-Delete: ON ✅' : '🗑️ Auto-Delete: OFF', callback_data: 'toggle:autodelete' },
        { text: 'ℹ️ How to Generate', callback_data: 'menu:help' }
      ]
    ]
  };
}

function getSettingsSummaryText(session) {
  const poolCount = Array.isArray(session.customAudioFiles) ? session.customAudioFiles.length : 0;
  let audioSummary = 'None (Silent)';
  if (session.audioPreset === 'random_pool' || (poolCount > 0 && (session.audioPreset === 'none' || session.audioPreset === 'custom'))) {
    audioSummary = `Random Pool (${poolCount} tracks)`;
  } else if (session.audioPreset !== 'none') {
    audioSummary = session.audioPreset;
  } else if (session.customAudioFile) {
    audioSummary = path.basename(session.customAudioFile);
  }

  const pColorLabel = {
    '#00f3ff': 'Cyan',
    '#ffe600': 'Gold',
    '#ff007f': 'Pink',
    '#00ff88': 'Lime',
    '#ffffff': 'White',
    'multi': 'Rainbow'
  }[session.particleColor || '#00f3ff'] || 'Cyan';

  return `⚙️ *Studio Configuration*:\n\n` +
    `🎬 *Motion*: \`${session.motionType.toUpperCase()}\` (${session.speed}x)\n` +
    `🎨 *Canvas*: \`${BG_PRESETS[session.bgGradient] || session.bgGradient}\`\n` +
    `📐 *Size*: \`${session.pngScale || 100}%\` (${getPngScaleLabel(session.pngScale || 100)})\n` +
    `✨ *Atmosphere*: \`${session.showSparkles !== false ? `${session.particleCount || 90} Pts @ ${(session.particleSpeed || 3.0).toFixed(1)}x (${pColorLabel})` : 'Off'}\`\n` +
    `⏱️ *Render*: \`${session.duration}s\` @ \`${session.fps} FPS\` • \`${session.resolution.toUpperCase()}\`\n` +
    `📱 *Format*: \`${session.aspectRatio}\` • 🎯 \`${session.outlineColor}\`\n` +
    `🎵 *Audio*: \`${audioSummary}\`\n` +
    `🏭 *Queue*: \`${session.batchMode ? 'Batch' : 'Single'}\` • 🗑️ *Cleanup*: \`${session.autoDeleteUploads !== false ? 'Instant' : 'Off'}\`\n\n` +
    `👉 _Send any transparent PNG or ZIP to render!_`;
}

// -------------------------------------------------------------
// COMMANDS
// -------------------------------------------------------------

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);

  const welcomeText = `👋 *Welcome to Stop Challenge 4K 60FPS Video Studio!* 🎬\n\n` +
    `Generate viral **Stop / Pause Challenge Videos** directly from Telegram!\n` +
    `⚡ *100% Server Rendered* — Zero load on your phone or PC.\n\n` +
    `📌 *How to use*:\n` +
    `1️⃣ Send any **Transparent PNG Image**.\n` +
    `2️⃣ The server renders 60 FPS motion & neon outline.\n` +
    `3️⃣ You receive a finished **.mp4** video in seconds!\n\n` +
    `Use the buttons below to customize your animations & settings:`;

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: getSettingsKeyboard(session)
  });
});

bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);

  bot.sendMessage(chatId, getSettingsSummaryText(session), {
    parse_mode: 'Markdown',
    reply_markup: getSettingsKeyboard(session)
  });
});

bot.onText(/\/batch/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  session.batchMode = true;
  saveSessions();

  bot.sendMessage(chatId, `🏭 *Batch Mode Activated!*\n\n` +
    `Send multiple PNG images (or documents) one by one or in a group.\n` +
    `The bot will queue all images and render them sequentially into 60 FPS MP4 videos!\n\n` +
    `To turn off batch mode, type /single or click the button in /settings.`, {
    parse_mode: 'Markdown'
  });
});

bot.onText(/\/single/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  session.batchMode = false;
  saveSessions();

  bot.sendMessage(chatId, `🎬 *Single Video Mode Activated.*\nEach PNG you send will render a standalone video immediately.`, {
    parse_mode: 'Markdown'
  });
});

bot.onText(/\/speed(?:\s+([\d.]+))?/i, (msg, match) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const val = match[1];
  if (val) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.1 && num <= 10.0) {
      session.speed = Math.round(num * 100) / 100;
      session.awaitingSpeedInput = false;
      saveSessions();
      return bot.sendMessage(chatId, `⚡ *Speed Multiplier Updated!*: \`${session.speed}x\``, {
        parse_mode: 'Markdown',
        reply_markup: getSettingsKeyboard(session)
      });
    }
  }

  const curSpeed = (session.speed || 1.0).toFixed(2);
  bot.sendMessage(chatId, `⚡ *Select Motion Speed Multiplier*:\n\nCurrent Speed: *${curSpeed}x*\nFine-tune with -0.1x / +0.1x, choose a preset, or send any custom number:`, {
    parse_mode: 'Markdown',
    reply_markup: getSpeedMenuKeyboard(session)
  });
});

bot.onText(/\/(?:size|scale)(?:\s+([\d.]+))?/i, (msg, match) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const val = match[1];

  if (val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 25 && num <= 250) {
      session.pngScale = num;
      session.awaitingScaleInput = false;
      saveSessions();

      if (session.autoDeleteUploads !== false) {
        bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      }

      return bot.sendMessage(
        chatId,
        `📐 *PNG Size Multiplier Set to*: \`${session.pngScale}%\` (${getPngScaleLabel(session.pngScale)})\nScale Factor: \`${(0.72 * (session.pngScale / 100)).toFixed(3)}x\`\nGauge: \`[${getScaleBar(session.pngScale)}]\``,
        {
          parse_mode: 'Markdown',
          reply_markup: getSettingsKeyboard(session)
        }
      );
    }
  }

  const curScale = session.pngScale || 100;
  const bar = getScaleBar(curScale);
  const label = getPngScaleLabel(curScale);

  bot.sendMessage(chatId, `📐 *Adjust PNG Object Size & Scale*:\n\n` +
    `• Current Size: *${curScale}%* (${label})\n` +
    `• Scale Gauge: \`[${bar}]\`\n` +
    `• Base Multiplier: \`${(0.72 * (curScale / 100)).toFixed(3)}x\`\n\n` +
    `💡 _Click **+ / -** to adjust in real time, pick a preset button, or type:_ \`/size ${curScale}\``, {
    parse_mode: 'Markdown',
    reply_markup: getScaleMenuKeyboard(session)
  });
});

bot.onText(/\/(?:particles|atmosphere|sparkles)/i, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  bot.sendMessage(chatId, `✨ *Atmosphere & Floating Glow Particles*:\n\n` +
    `• Density: *${session.particleCount || 90}*\n` +
    `• Drift Speed: *${(session.particleSpeed || 3.0).toFixed(1)}x*\n` +
    `• Sparkle Color: *${session.particleColor || '#00f3ff'}*\n` +
    `• Status: *${session.showSparkles !== false ? 'Enabled ✅' : 'Disabled ❌'}*\n\n` +
    `Use the buttons below to tune density, speed, and colors:`, {
    parse_mode: 'Markdown',
    reply_markup: getParticlesMenuKeyboard(session)
  });
});

bot.onText(/\/density(?:\s+(\d+))?/i, (msg, match) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const val = match[1];
  if (val) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 10 && num <= 150) {
      session.particleCount = num;
      session.awaitingDensityInput = false;
      saveSessions();
      return bot.sendMessage(chatId, `🌌 *Particle Density Updated!*: \`${session.particleCount}\``, {
        parse_mode: 'Markdown',
        reply_markup: getParticlesMenuKeyboard(session)
      });
    }
  }
  bot.sendMessage(chatId, `🌌 *Adjust Particle Density (Atmosphere)*:\nCurrent: *${session.particleCount || 90}*`, {
    parse_mode: 'Markdown',
    reply_markup: getParticlesMenuKeyboard(session)
  });
});

bot.onText(/\/(?:driftspeed|particlespeed)(?:\s+([\d.]+))?/i, (msg, match) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const val = match[1];
  if (val) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.2 && num <= 6.0) {
      session.particleSpeed = Math.round(num * 10) / 10;
      session.awaitingDriftSpeedInput = false;
      saveSessions();
      return bot.sendMessage(chatId, `⚡ *Particle Drift Speed Updated!*: \`${session.particleSpeed}x\``, {
        parse_mode: 'Markdown',
        reply_markup: getParticlesMenuKeyboard(session)
      });
    }
  }
  bot.sendMessage(chatId, `⚡ *Adjust Particle Drift Speed*:\nCurrent: *${(session.particleSpeed || 3.0).toFixed(1)}x*`, {
    parse_mode: 'Markdown',
    reply_markup: getParticlesMenuKeyboard(session)
  });
});

bot.onText(/\/(?:bg|backgrounds|gallery)/i, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  if (session.autoDeleteUploads !== false) {
    bot.deleteMessage(chatId, msg.message_id).catch(() => {});
  }
  sendOrUpdateBgPreview(chatId, session.bgGradient || 'cyberpunk');
});

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  const helpText = `📖 *Stop Challenge Studio Telegram Guide*:\n\n` +
    `• 📸 *Sending Images*: Send any transparent PNG (as photo or uncompressed file/document).\n` +
    `• 🎬 *Animations*: Choose from 360° Spin, Clock Pendulum, Fast ZigZag, DVD Bounce, 3D Orbit, or Slide.\n` +
    `• ⚡ *Speed*: Use /speed or click Speed in /settings (from 0.1x up to 10.0x)!\n` +
    `• 🎨 *Backgrounds*: Choose from 15 high-contrast gradient presets in /settings!\n` +
    `• 🗑️ *Auto-Delete*: Automatically deletes uploaded files from chat after receipt to keep chat clean.\n` +
    `• 📝 *Custom Text*: Click "Hook" in /settings or send any text starting with \`hook: Your Text Here\`.\n` +
    `• 🎵 *Custom Audio*: Send multiple MP3s or voice notes to use random pool background music.\n` +
    `• ⏱️ *Durations*: 3s (Ultra Fast), 5s (Standard), 10s.\n` +
    `• 🏭 *Batch*: Send /batch to create multiple videos at once, or send a ZIP of PNG images!\n\n` +
    `Commands:\n` +
    `/settings — Configure video & animation settings\n` +
    `/speed [val] — View or set custom motion speed\n` +
    `/pool — View or manage your audio soundtrack pool\n` +
    `/batch — Enable batch queue mode\n` +
    `/single — Switch back to single video mode\n` +
    `/status — Check server rendering health`;

  bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/status/, (msg) => {
  const chatId = msg.chat.id;
  const statusText = `🖥️ *Server Render Engine Status*:\n\n` +
    `• Engine: \`WebCodecs 60.000 FPS Zero-Drop Pipeline\`\n` +
    `• Renderer Status: \`${renderer.isReady ? 'Active & Ready ⚡' : 'Standby / Initializing'}\`\n` +
    `• Queue Length: \`${renderer.queue.length} jobs pending\`\n` +
    `• Active Rendering: \`${renderer.isRendering ? 'Yes (Processing frame stream)' : 'Idle'}\`\n` +
    `• Exports Directory: \`${EXPORTS_DIR}\``;

  bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
});

// Custom hook text handler
bot.onText(/^hook:\s*(.+)/i, (msg, match) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const newText = match[1].trim();

  session.headerText = newText;
  session.awaitingCustomText = false;
  saveSessions();

  bot.sendMessage(chatId, `✅ *Hook Text Updated!*:\n"${newText}"`, {
    parse_mode: 'Markdown',
    reply_markup: getSettingsKeyboard(session)
  });
});

// -------------------------------------------------------------
// INLINE BUTTON CALLBACKS
// -------------------------------------------------------------

bot.on('callback_query', async (query) => {
  try {
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const data = query.data;
    const session = getUserSession(chatId);

  // --- Sub-menus ---
  if (data === 'menu:main') {
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:motion') {
    const kb = {
      inline_keyboard: [
        [
          { text: '🔄 360° Spin', callback_data: 'set:motion:spin' },
          { text: '🔔 Pendulum Swing', callback_data: 'set:motion:pendulum' }
        ],
        [
          { text: '⚡ Fast ZigZag', callback_data: 'set:motion:zigzag' },
          { text: '🏀 DVD Bounce', callback_data: 'set:motion:bounce' }
        ],
        [
          { text: '🌀 3D Orbit', callback_data: 'set:motion:orbit' },
          { text: '↔️ Horizontal Slide', callback_data: 'set:motion:slide' }
        ],
        [{ text: '« Back to Settings', callback_data: 'menu:main' }]
      ]
    };
    await bot.editMessageText('🎬 *Select Motion Animation Style*:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:ratio') {
    const kb = {
      inline_keyboard: [
        [{ text: '📱 9:16 (YouTube Shorts / Reels / TikTok)', callback_data: 'set:ratio:9:16' }],
        [{ text: '⬛ 1:1 (Instagram Square Post)', callback_data: 'set:ratio:1:1' }],
        [{ text: '🖥️ 16:9 (Cinema / YouTube Landscape)', callback_data: 'set:ratio:16:9' }],
        [{ text: '« Back to Settings', callback_data: 'menu:main' }]
      ]
    };
    await bot.editMessageText('📐 *Select Aspect Ratio*:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:duration') {
    const kb = {
      inline_keyboard: [
        [
          { text: '⚡ 3 Seconds (Super Fast Render)', callback_data: 'set:duration:3' },
          { text: '⏱️ 5 Seconds (Standard)', callback_data: 'set:duration:5' }
        ],
        [
          { text: '⏳ 7 Seconds', callback_data: 'set:duration:7' },
          { text: '🎬 10 Seconds (Full Reel)', callback_data: 'set:duration:10' }
        ],
        [{ text: '« Back to Settings', callback_data: 'menu:main' }]
      ]
    };
    await bot.editMessageText('⏱️ *Select Video Duration*:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:speed') {
    const curSpeed = (session.speed || 1.0).toFixed(2);
    await bot.editMessageText(`⚡ *Select Motion Speed Multiplier*:\n\nCurrent Speed: *${curSpeed}x*\nFine-tune with -0.1x / +0.1x, choose a preset, or type exact speed:`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSpeedMenuKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('step:speed:')) {
    const delta = parseFloat(data.replace('step:speed:', ''));
    let newSpeed = Math.round(((session.speed || 1.0) + delta) * 100) / 100;
    newSpeed = Math.max(0.1, Math.min(10.0, newSpeed));
    session.speed = newSpeed;
    saveSessions();

    const curSpeed = newSpeed.toFixed(2);
    await bot.editMessageText(`⚡ *Select Motion Speed Multiplier*:\n\nCurrent Speed: *${curSpeed}x*\nFine-tune with -0.1x / +0.1x, choose a preset, or type exact speed:`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSpeedMenuKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Speed: ${curSpeed}x` });
  }

  if (data === 'prompt:custom_speed') {
    session.awaitingSpeedInput = true;
    saveSessions();
    await bot.sendMessage(chatId, `✏️ *Enter your desired speed multiplier*:\n(Send a number like \`0.85\` or \`1.3\` or type \`/speed 1.2\`)`, {
      parse_mode: 'Markdown'
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:bg') {
    const inline_keyboard = [];
    inline_keyboard.push([
      { text: '📸 👁️ Visual Gallery (Browse All Backgrounds)', callback_data: `view:bg:${session.bgGradient || 'cyberpunk'}` }
    ]);

    const keys = Object.keys(BG_PRESETS);
    for (let i = 0; i < keys.length; i += 2) {
      const row = [];
      const k1 = keys[i];
      const isCur1 = session.bgGradient === k1;
      row.push({ text: `${BG_PRESETS[k1]} ${isCur1 ? '✅' : ''}`, callback_data: `view:bg:${k1}` });
      if (i + 1 < keys.length) {
        const k2 = keys[i + 1];
        const isCur2 = session.bgGradient === k2;
        row.push({ text: `${BG_PRESETS[k2]} ${isCur2 ? '✅' : ''}`, callback_data: `view:bg:${k2}` });
      }
      inline_keyboard.push(row);
    }
    inline_keyboard.push([{ text: '« Back to Settings', callback_data: 'menu:main' }]);

    await bot.editMessageText('🎨 *Background Visual Gallery & Presets*:\nClick any background below to view its visual preview and apply it, or browse full gallery:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:scale') {
    const curScale = session.pngScale || 100;
    const bar = getScaleBar(curScale);
    const label = getPngScaleLabel(curScale);

    await bot.editMessageText(`📐 *Adjust PNG Object Size & Scale*:\n\n` +
      `• Current Size: *${curScale}%* (${label})\n` +
      `• Scale Gauge: \`[${bar}]\`\n` +
      `• Base Multiplier: \`${(0.72 * (curScale / 100)).toFixed(3)}x\`\n\n` +
      `💡 _Click **+ / -** to adjust in real time, pick a preset button, or type:_ \`/size ${curScale}\``, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getScaleMenuKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('step:scale:')) {
    const delta = parseInt(data.replace('step:scale:', ''), 10);
    let curScale = session.pngScale || 100;
    curScale = Math.max(30, Math.min(220, curScale + delta));
    session.pngScale = curScale;
    saveSessions();

    const bar = getScaleBar(curScale);
    const label = getPngScaleLabel(curScale);

    if (session.lastScalePreviewMsgId && session.lastScalePreviewMsgId === messageId) {
      await sendScalePreview(chatId);
      return bot.answerCallbackQuery(query.id, { text: `Size: ${curScale}% (${label})` });
    }

    try {
      await bot.editMessageText(`📐 *Adjust PNG Object Size & Scale*:\n\n` +
        `• Current Size: *${curScale}%* (${label})\n` +
        `• Scale Gauge: \`[${bar}]\`\n` +
        `• Base Multiplier: \`${(0.72 * (curScale / 100)).toFixed(3)}x\`\n\n` +
        `💡 _Click **+ / -** to adjust in real time, pick a preset button, or type:_ \`/size ${curScale}\``, {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: getScaleMenuKeyboard(session)
      });
    } catch(e) {}
    return bot.answerCallbackQuery(query.id, { text: `Size: ${curScale}% (${label})` });
  }

  if (data === 'scale:info') {
    return bot.answerCallbackQuery(query.id, { text: `Current size: ${session.pngScale || 100}%` });
  }

  if (data.startsWith('set:scale:')) {
    const val = parseInt(data.replace('set:scale:', ''), 10);
    session.pngScale = val;
    saveSessions();

    const bar = getScaleBar(val);
    const label = getPngScaleLabel(val);

    await bot.editMessageText(`📐 *Adjust PNG Object Size & Scale*:\n\n` +
      `• Current Size: *${val}%* (${label})\n` +
      `• Scale Gauge: \`[${bar}]\`\n` +
      `• Base Multiplier: \`${(0.72 * (val / 100)).toFixed(3)}x\`\n\n` +
      `💡 _Click **+ / -** to adjust in real time, pick a preset button, or type:_ \`/size ${val}\``, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getScaleMenuKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Size set to ${val}% (${label})` });
  }

  if (data === 'prompt:custom_scale') {
    session.awaitingScaleInput = true;
    saveSessions();
    await bot.sendMessage(chatId, `✏️ *Enter your desired PNG size percentage*:\n(Send a number like \`85\` or \`120\` or type \`/size 110\`)`, {
      parse_mode: 'Markdown'
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'preview:scale') {
    await sendScalePreview(chatId);
    return bot.answerCallbackQuery(query.id, { text: 'Rendering live scale preview...' });
  }

  // --- Particles & Atmosphere Sub-menu & Controls ---
  if (data === 'menu:particles') {
    const count = session.particleCount || 90;
    const speed = (session.particleSpeed || 3.0).toFixed(1);
    const color = session.particleColor || '#00f3ff';
    const isEnabled = session.showSparkles !== false;
    await bot.editMessageText(`✨ *Atmosphere & Floating Glow Particles*:\n\n` +
      `• Status: *${isEnabled ? 'Enabled ✅' : 'Disabled ❌'}*\n` +
      `• Particle Density: *${count}*\n` +
      `• Drift Speed: *${speed}x*\n` +
      `• Sparkle Color: *${color}*\n\n` +
      `Drifting particles rendered in 3D depth with twinkling glow and radial flare:`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getParticlesMenuKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'toggle:particles') {
    session.showSparkles = session.showSparkles === false ? true : false;
    saveSessions();
    await bot.editMessageReplyMarkup(getParticlesMenuKeyboard(session), {
      chat_id: chatId,
      message_id: messageId
    });
    return bot.answerCallbackQuery(query.id, {
      text: session.showSparkles ? 'Particles: Enabled ✅' : 'Particles: Disabled ❌'
    });
  }

  if (data.startsWith('step:density:')) {
    const delta = parseInt(data.replace('step:density:', ''), 10);
    let count = (session.particleCount || 90) + delta;
    count = Math.max(10, Math.min(150, count));
    session.particleCount = count;
    saveSessions();

    if (session.lastParticlesPreviewMsgId && session.lastParticlesPreviewMsgId === messageId) {
      await sendAtmospherePreview(chatId);
      return bot.answerCallbackQuery(query.id, { text: `Density: ${count}` });
    }

    try {
      await bot.editMessageReplyMarkup(getParticlesMenuKeyboard(session), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch(e) {}
    return bot.answerCallbackQuery(query.id, { text: `Density: ${count}` });
  }

  if (data.startsWith('set:density:')) {
    const val = parseInt(data.replace('set:density:', ''), 10);
    session.particleCount = val;
    saveSessions();

    if (session.lastParticlesPreviewMsgId && session.lastParticlesPreviewMsgId === messageId) {
      await sendAtmospherePreview(chatId);
      return bot.answerCallbackQuery(query.id, { text: `Density: ${val}` });
    }

    try {
      await bot.editMessageReplyMarkup(getParticlesMenuKeyboard(session), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch(e) {}
    return bot.answerCallbackQuery(query.id, { text: `Density set to ${val}` });
  }

  if (data === 'density:info') {
    return bot.answerCallbackQuery(query.id, { text: `Current density: ${session.particleCount || 90}` });
  }

  if (data === 'prompt:custom_density') {
    session.awaitingDensityInput = true;
    saveSessions();
    await bot.sendMessage(chatId, `✏️ *Enter your desired particle density* (10 to 150):\n(e.g. \`90\` or \`120\` or type \`/density 90\`)`, {
      parse_mode: 'Markdown'
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('step:driftspeed:')) {
    const delta = parseFloat(data.replace('step:driftspeed:', ''));
    let sp = Math.round(((session.particleSpeed || 3.0) + delta) * 10) / 10;
    sp = Math.max(0.2, Math.min(6.0, sp));
    session.particleSpeed = sp;
    saveSessions();

    if (session.lastParticlesPreviewMsgId && session.lastParticlesPreviewMsgId === messageId) {
      await sendAtmospherePreview(chatId);
      return bot.answerCallbackQuery(query.id, { text: `Drift Speed: ${sp.toFixed(1)}x` });
    }

    try {
      await bot.editMessageReplyMarkup(getParticlesMenuKeyboard(session), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch(e) {}
    return bot.answerCallbackQuery(query.id, { text: `Drift Speed: ${sp.toFixed(1)}x` });
  }

  if (data.startsWith('set:driftspeed:')) {
    const val = parseFloat(data.replace('set:driftspeed:', ''));
    session.particleSpeed = val;
    saveSessions();

    if (session.lastParticlesPreviewMsgId && session.lastParticlesPreviewMsgId === messageId) {
      await sendAtmospherePreview(chatId);
      return bot.answerCallbackQuery(query.id, { text: `Drift Speed: ${val.toFixed(1)}x` });
    }

    try {
      await bot.editMessageReplyMarkup(getParticlesMenuKeyboard(session), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch(e) {}
    return bot.answerCallbackQuery(query.id, { text: `Drift Speed set to ${val.toFixed(1)}x` });
  }

  if (data === 'driftspeed:info') {
    return bot.answerCallbackQuery(query.id, { text: `Drift speed: ${(session.particleSpeed || 3.0).toFixed(1)}x` });
  }

  if (data === 'prompt:custom_driftspeed') {
    session.awaitingDriftSpeedInput = true;
    saveSessions();
    await bot.sendMessage(chatId, `✏️ *Enter your desired particle drift speed* (0.2x to 6.0x):\n(e.g. \`3.0\` or \`2.5\` or type \`/driftspeed 3.0\`)`, {
      parse_mode: 'Markdown'
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('set:pcolor:')) {
    const color = data.replace('set:pcolor:', '');
    session.particleColor = color;
    saveSessions();

    if (session.lastParticlesPreviewMsgId && session.lastParticlesPreviewMsgId === messageId) {
      await sendAtmospherePreview(chatId);
      return bot.answerCallbackQuery(query.id, { text: `Color: ${color}` });
    }

    try {
      await bot.editMessageReplyMarkup(getParticlesMenuKeyboard(session), {
        chat_id: chatId,
        message_id: messageId
      });
    } catch(e) {}
    return bot.answerCallbackQuery(query.id, { text: `Sparkle color updated: ${color}` });
  }

  if (data === 'preview:particles') {
    await sendAtmospherePreview(chatId);
    return bot.answerCallbackQuery(query.id, { text: 'Rendering 3D atmosphere preview...' });
  }

  if (data === 'close:particles_preview') {
    if (session.lastParticlesPreviewMsgId) {
      bot.deleteMessage(chatId, session.lastParticlesPreviewMsgId).catch(() => {});
      session.lastParticlesPreviewMsgId = null;
      saveSessions();
    }
    return bot.answerCallbackQuery(query.id, { text: 'Preview closed' });
  }

  if (data === 'menu:outline') {
    const kb = {
      inline_keyboard: [
        [
          { text: '🩵 Neon Cyan', callback_data: 'set:outline:#00f3ff' },
          { text: '🩷 Hot Pink', callback_data: 'set:outline:#ff007f' }
        ],
        [
          { text: '💛 Electric Yellow', callback_data: 'set:outline:#ffe600' },
          { text: '💚 Acid Green', callback_data: 'set:outline:#00ff88' }
        ],
        [
          { text: '🤍 Pure White', callback_data: 'set:outline:#ffffff' }
        ],
        [{ text: '« Back to Settings', callback_data: 'menu:main' }]
      ]
    };
    await bot.editMessageText('🎯 *Select Target Outline Neon Color*:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:resolution') {
    const kb = {
      inline_keyboard: [
        [{ text: '⚡ 720p HD (60 FPS — Fastest Mobile Upload)', callback_data: 'set:res:720p' }],
        [{ text: '💎 1080p Full HD (60 FPS — Standard Quality)', callback_data: 'set:res:1080p' }],
        [{ text: '🌟 4K Ultra HD (60 FPS — Maximum Fidelity)', callback_data: 'set:res:4k' }],
        [{ text: '« Back to Settings', callback_data: 'menu:main' }]
      ]
    };
    await bot.editMessageText('💎 *Select Export Quality Resolution*:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:hook') {
    const kb = {
      inline_keyboard: [
        [{ text: '🛑 CAN YOU STOP THIS? 🛑', callback_data: 'set:hook:CAN YOU STOP THIS? 🛑' }],
        [{ text: '🎯 PAUSE AT 100% TO WIN! 🎯', callback_data: 'set:hook:PAUSE AT 100% TO WIN! 🎯' }],
        [{ text: '⚡ ONLY 1% CAN DO THIS ⚡', callback_data: 'set:hook:ONLY 1% CAN DO THIS ⚡' }],
        [{ text: '🛑 STOP THE ITEM! 🛑', callback_data: 'set:hook:STOP THE ITEM! 🛑' }],
        [{ text: '✏️ Type Custom Text', callback_data: 'prompt:custom_text' }],
        [{ text: '« Back to Settings', callback_data: 'menu:main' }]
      ]
    };
    await bot.editMessageText('📝 *Choose Hook Text Preset or Send Custom Text*:', {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: kb
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'prompt:custom_text') {
    session.awaitingCustomText = true;
    saveSessions();
    await bot.sendMessage(chatId, `✏️ *Send your custom hook text now*:\n(Or send \`hook: Your Hook Message\`)`, {
      parse_mode: 'Markdown'
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:audio') {
    const poolCount = Array.isArray(session.customAudioFiles) ? session.customAudioFiles.length : 0;
    const isPoolActive = session.audioPreset === 'random_pool' || (poolCount > 0 && session.audioPreset === 'none');

    const inline_keyboard = [];
    if (poolCount > 0) {
      inline_keyboard.push([
        { text: `🎲 Random from Audio Pool (${poolCount} Tracks) ${isPoolActive ? '✅' : ''}`, callback_data: 'set:audio:random_pool' }
      ]);
    }
    inline_keyboard.push([
      { text: `🔇 Mute / Silent ${session.audioPreset === 'none' && !isPoolActive ? '✅' : ''}`, callback_data: 'set:audio:none' },
      { text: `🎵 Electronic Beat ${session.audioPreset === 'electronicBeat' ? '✅' : ''}`, callback_data: 'set:audio:electronicBeat' }
    ]);
    inline_keyboard.push([
      { text: `🎹 Synthwave ${session.audioPreset === 'synthwave' ? '✅' : ''}`, callback_data: 'set:audio:synthwave' },
      { text: `🎧 Hiphop Loop ${session.audioPreset === 'hiphop' ? '✅' : ''}`, callback_data: 'set:audio:hiphop' }
    ]);
    if (poolCount > 0) {
      inline_keyboard.push([
        { text: `📋 View Pool Tracks (${poolCount})`, callback_data: 'menu:view_pool' },
        { text: '🗑️ Clear Audio Pool', callback_data: 'action:clear_pool' }
      ]);
    }
    inline_keyboard.push([{ text: '« Back to Settings', callback_data: 'menu:main' }]);

    const text = `🎵 *Audio Soundtrack & Pool Settings*:\n\n` +
      (poolCount > 0
        ? `📚 *Current Audio Pool*: **${poolCount} track(s) uploaded**\n` +
          `🎲 *Status*: ${isPoolActive ? '*Random Audio Selection Active ✅*' : 'Preset Selected'}\n\n` +
          `💡 *Send multiple audio files anytime* to add more tracks to your pool!\n\n`
        : `*No custom audio uploaded yet.*\n\n` +
          `💡 *Bulk Audio Upload*: Send multiple MP3, WAV or Audio files (all at once)!\n` +
          `The bot will automatically build an Audio Pool and pick a **random soundtrack** for each generated video!\n\n`) +
      `Choose soundtrack or preset below:`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'menu:view_pool') {
    const pool = session.customAudioFiles || [];
    let listText = `📋 *Your Uploaded Audio Pool* (${pool.length} tracks):\n\n`;
    if (pool.length === 0) {
      listText += `_Your pool is currently empty._\nSend any MP3 or audio files to add tracks!`;
    } else {
      pool.forEach((t, i) => {
        listText += `${i + 1}. 🎵 \`${t.name}\`\n`;
      });
      listText += `\n🎲 *Random mode is ACTIVE!* Each video will pick one of these tracks at random.`;
    }

    await bot.editMessageText(listText, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '🗑️ Clear Pool', callback_data: 'action:clear_pool' },
            { text: '« Back to Audio Menu', callback_data: 'menu:audio' }
          ]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'action:clear_pool') {
    if (Array.isArray(session.customAudioFiles)) {
      session.customAudioFiles.forEach(t => {
        try { if (t.path && fs.existsSync(t.path)) fs.unlinkSync(t.path); } catch(e) {}
      });
    }
    session.customAudioFiles = [];
    session.customAudioFile = null;
    session.audioPreset = 'none';
    saveSessions();

    await bot.editMessageText(`🗑️ *Audio Pool Cleared!*\n\nAll custom soundtracks have been deleted. Audio is now Muted. You can upload new tracks anytime!`, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '« Back to Settings', callback_data: 'menu:main' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id, { text: 'Audio pool cleared!' });
  }

  if (data === 'toggle:batch') {
    session.batchMode = !session.batchMode;
    saveSessions();
    await bot.editMessageReplyMarkup(getSettingsKeyboard(session), {
      chat_id: chatId,
      message_id: messageId
    });
    return bot.answerCallbackQuery(query.id, {
      text: session.batchMode ? 'Batch Mode Enabled!' : 'Single Mode Enabled!'
    });
  }

  // --- Setting updates ---
  if (data.startsWith('set:motion:')) {
    session.motionType = data.replace('set:motion:', '');
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Motion: ${session.motionType}` });
  }

  if (data.startsWith('set:ratio:')) {
    session.aspectRatio = data.replace('set:ratio:', '');
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Ratio: ${session.aspectRatio}` });
  }

  if (data.startsWith('set:duration:')) {
    session.duration = parseInt(data.replace('set:duration:', ''));
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Duration: ${session.duration}s` });
  }

  if (data.startsWith('set:speed:')) {
    session.speed = parseFloat(data.replace('set:speed:', ''));
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Speed: ${session.speed}x` });
  }

  if (data.startsWith('set:outline:')) {
    session.outlineColor = data.replace('set:outline:', '');
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Outline: ${session.outlineColor}` });
  }

  if (data.startsWith('set:res:')) {
    session.resolution = data.replace('set:res:', '');
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Resolution: ${session.resolution}` });
  }

  if (data.startsWith('set:hook:')) {
    session.headerText = data.replace('set:hook:', '');
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `Hook updated!` });
  }

  if (data.startsWith('view:bg:')) {
    const bgKey = data.replace('view:bg:', '');
    await sendOrUpdateBgPreview(chatId, bgKey);
    return bot.answerCallbackQuery(query.id, { text: `Previewing ${BG_PRESETS[bgKey] || bgKey}` });
  }

  if (data.startsWith('apply:bg:')) {
    const chosenBg = data.replace('apply:bg:', '');
    session.bgGradient = chosenBg;
    saveSessions();

    // Auto-delete preview photo immediately upon setting!
    if (session.lastBgPreviewMsgId) {
      bot.deleteMessage(chatId, session.lastBgPreviewMsgId).catch(() => {});
      session.lastBgPreviewMsgId = null;
      saveSessions();
    }

    const confMsg = await bot.sendMessage(chatId, `✅ *Background Updated!*\nActive: \`${BG_PRESETS[chosenBg] || chosenBg}\``, {
      parse_mode: 'Markdown'
    });
    setTimeout(() => bot.deleteMessage(chatId, confMsg.message_id).catch(() => {}), 3500);

    return bot.answerCallbackQuery(query.id, { text: `✅ Active: ${BG_PRESETS[chosenBg] || chosenBg}` });
  }

  if (data.startsWith('set:bg:')) {
    session.bgGradient = data.replace('set:bg:', '');
    if (session.lastBgPreviewMsgId) {
      bot.deleteMessage(chatId, session.lastBgPreviewMsgId).catch(() => {});
      session.lastBgPreviewMsgId = null;
    }
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, { text: `BG: ${BG_PRESETS[session.bgGradient] || session.bgGradient}` });
  }

  if (data === 'close:bg_preview') {
    if (session.lastBgPreviewMsgId) {
      bot.deleteMessage(chatId, session.lastBgPreviewMsgId).catch(() => {});
      session.lastBgPreviewMsgId = null;
      saveSessions();
    }
    return bot.answerCallbackQuery(query.id, { text: 'Preview closed' });
  }

  if (data === 'close:scale_preview') {
    if (session.lastScalePreviewMsgId) {
      bot.deleteMessage(chatId, session.lastScalePreviewMsgId).catch(() => {});
      session.lastScalePreviewMsgId = null;
      saveSessions();
    }
    return bot.answerCallbackQuery(query.id, { text: 'Preview closed' });
  }

  if (data === 'toggle:autodelete') {
    session.autoDeleteUploads = session.autoDeleteUploads === false;
    saveSessions();
    await bot.editMessageReplyMarkup(getSettingsKeyboard(session), {
      chat_id: chatId,
      message_id: messageId
    });
    return bot.answerCallbackQuery(query.id, {
      text: session.autoDeleteUploads !== false ? 'Auto-Delete Uploads: ON ✅' : 'Auto-Delete Uploads: OFF'
    });
  }

  if (data.startsWith('set:audio:')) {
    const val = data.replace('set:audio:', '');
    session.audioPreset = val;
    if (val !== 'random_pool' && val !== 'custom') {
      session.customAudioFile = null;
    }
    saveSessions();
    await bot.editMessageText(getSettingsSummaryText(session), {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
    return bot.answerCallbackQuery(query.id, {
      text: val === 'random_pool' ? '🎲 Random Audio Pool Activated!' : `Audio: ${session.audioPreset}`
    });
  }
  } catch (err) {
    console.error('⚠️ [CALLBACK QUERY ERROR]:', err?.message || err);
    try { await bot.answerCallbackQuery(query.id); } catch(e) {}
  }
});

// -------------------------------------------------------------
// TEXT MESSAGE HANDLER (Custom Text / Inputs)
// -------------------------------------------------------------

bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;

  const chatId = msg.chat.id;
  const session = getUserSession(chatId);

  if (session.awaitingSpeedInput) {
    const num = parseFloat(msg.text.trim());
    if (!isNaN(num) && num >= 0.1 && num <= 10.0) {
      session.speed = Math.round(num * 100) / 100;
      session.awaitingSpeedInput = false;
      saveSessions();

      bot.sendMessage(chatId, `✅ *Speed Multiplier Set to*:\n\`${session.speed}x\``, {
        parse_mode: 'Markdown',
        reply_markup: getSettingsKeyboard(session)
      });
      return;
    } else {
      bot.sendMessage(chatId, `⚠️ Please enter a valid speed number between \`0.1\` and \`10.0\` (e.g. \`0.85\` or \`1.3\`).`);
      return;
    }
  }

  if (session.awaitingScaleInput) {
    const num = parseInt(msg.text.trim(), 10);
    if (!isNaN(num) && num >= 25 && num <= 250) {
      session.pngScale = num;
      session.awaitingScaleInput = false;
      saveSessions();

      if (session.autoDeleteUploads !== false) {
        bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      }

      bot.sendMessage(chatId, `📐 *PNG Size Multiplier Set to*:\n\`${session.pngScale}%\` (${getPngScaleLabel(session.pngScale)})\nScale Factor: \`${(0.72 * (session.pngScale / 100)).toFixed(3)}x\`\nGauge: \`[${getScaleBar(session.pngScale)}]\``, {
        parse_mode: 'Markdown',
        reply_markup: getSettingsKeyboard(session)
      });
      return;
    } else {
      bot.sendMessage(chatId, `⚠️ Please enter a valid size percentage between \`25\` and \`250\` (e.g. \`85\` or \`120\`).`);
      return;
    }
  }

  if (session.awaitingDensityInput) {
    const num = parseInt(msg.text.trim(), 10);
    if (!isNaN(num) && num >= 10 && num <= 150) {
      session.particleCount = num;
      session.awaitingDensityInput = false;
      saveSessions();

      if (session.autoDeleteUploads !== false) {
        bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      }

      bot.sendMessage(chatId, `🌌 *Particle Density Set to*: \`${session.particleCount}\``, {
        parse_mode: 'Markdown',
        reply_markup: getParticlesMenuKeyboard(session)
      });
      return;
    } else {
      bot.sendMessage(chatId, `⚠️ Please enter a density number between \`10\` and \`150\` (e.g. \`90\`).`);
      return;
    }
  }

  if (session.awaitingDriftSpeedInput) {
    const num = parseFloat(msg.text.trim());
    if (!isNaN(num) && num >= 0.2 && num <= 6.0) {
      session.particleSpeed = Math.round(num * 10) / 10;
      session.awaitingDriftSpeedInput = false;
      saveSessions();

      if (session.autoDeleteUploads !== false) {
        bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      }

      bot.sendMessage(chatId, `⚡ *Particle Drift Speed Set to*: \`${session.particleSpeed}x\``, {
        parse_mode: 'Markdown',
        reply_markup: getParticlesMenuKeyboard(session)
      });
      return;
    } else {
      bot.sendMessage(chatId, `⚠️ Please enter a speed number between \`0.2\` and \`6.0\` (e.g. \`3.0\`).`);
      return;
    }
  }

  if (session.awaitingCustomText) {
    session.headerText = msg.text.trim();
    session.awaitingCustomText = false;
    saveSessions();

    bot.sendMessage(chatId, `✅ *Hook Text Set to*:\n"${session.headerText}"`, {
      parse_mode: 'Markdown',
      reply_markup: getSettingsKeyboard(session)
    });
  }
});

// -------------------------------------------------------------
// AUDIO UPLOAD HANDLER & BATCH AUDIO POOL (MP3 / WAV / Voice)
// -------------------------------------------------------------

const audioUploadDebounceTimers = new Map();
const audioUploadCounters = new Map();

async function handleAudioUpload(chatId, fileId, originalName = 'soundtrack.mp3', userMessageId = null) {
  const session = getUserSession(chatId);
  if (!Array.isArray(session.customAudioFiles)) {
    session.customAudioFiles = [];
  }

  try {
    const safeFileName = path.basename(originalName).replace(/[^\w\d_.-]/g, '_') || `audio_${Date.now()}.mp3`;
    const localAudioPath = path.join(TEMP_DIR, `${chatId}_${Date.now()}_${safeFileName}`);

    // Download audio file directly to disk with retry resilience
    await downloadTelegramFileToDisk(bot, fileId, localAudioPath);

    // Auto-delete user's sent audio message on Telegram
    if (userMessageId && session.autoDeleteUploads !== false) {
      bot.deleteMessage(chatId, userMessageId).catch(() => {});
    }

    if (fs.existsSync(localAudioPath) && fs.statSync(localAudioPath).size > 0) {
      session.customAudioFiles.push({
        name: safeFileName,
        path: localAudioPath,
        addedAt: Date.now()
      });
      session.customAudioFile = localAudioPath;
      session.audioPreset = 'random_pool';
      saveSessions();

      const currentCount = (audioUploadCounters.get(chatId) || 0) + 1;
      audioUploadCounters.set(chatId, currentCount);

      if (audioUploadDebounceTimers.has(chatId)) {
        clearTimeout(audioUploadDebounceTimers.get(chatId));
      }

      audioUploadDebounceTimers.set(chatId, setTimeout(async () => {
        const added = audioUploadCounters.get(chatId) || 1;
        audioUploadCounters.delete(chatId);
        audioUploadDebounceTimers.delete(chatId);

        const totalPool = session.customAudioFiles.length;
        const trackListPreview = session.customAudioFiles
          .slice(-6)
          .map((t, idx) => `• 🎵 \`${t.name}\``)
          .join('\n');

        const msg = `🎵 *${added > 1 ? `${added} Audio Tracks Added to Pool!` : 'Audio Track Added to Pool!'}*\n\n` +
          `📚 *Total Audio Pool*: **${totalPool} tracks**\n` +
          `🎲 *Random Audio Mode*: **ACTIVE ✅**\n\n` +
          `*Recent tracks*:\n${trackListPreview}\n\n` +
          `✨ *Every video you render (single or batch) will automatically pick a random soundtrack from this pool!*\n` +
          `To view all tracks or clear the pool, use /settings ➔ Audio or /pool.`;

        await bot.sendMessage(chatId, msg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: `🎲 Pool Active (${totalPool} tracks)`, callback_data: 'menu:audio' },
                { text: '🗑️ Clear Audio Pool', callback_data: 'action:clear_pool' }
              ]
            ]
          }
        });
      }, 700));
    }
  } catch (err) {
    console.error('[AUDIO UPLOAD ERROR]:', err);
    bot.sendMessage(chatId, `❌ Failed to save audio track: ${err.message || err}`);
  }
}

bot.on('audio', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const fileId = msg.audio.file_id;
    const fileName = msg.audio.file_name || `audio_${Date.now()}.mp3`;
    await handleAudioUpload(chatId, fileId, fileName, msg.message_id);
  } catch (e) {
    console.error('Audio event error:', e);
  }
});

bot.on('voice', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const fileId = msg.voice.file_id;
    const fileName = `voice_${Date.now()}.ogg`;
    await handleAudioUpload(chatId, fileId, fileName, msg.message_id);
  } catch (e) {
    console.error('Voice event error:', e);
  }
});

bot.onText(/\/pool|\/audios/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  const pool = session.customAudioFiles || [];

  if (pool.length === 0) {
    return bot.sendMessage(chatId, `🎵 *Your Audio Pool is Empty*\n\nSend multiple MP3 or audio tracks to this chat anytime!\nEach video generated will automatically select a random track.`, {
      parse_mode: 'Markdown'
    });
  }

  let text = `🎵 *Your Audio Pool (${pool.length} tracks)*:\n\n`;
  pool.forEach((t, i) => {
    text += `${i + 1}. 🎶 \`${t.name}\`\n`;
  });
  text += `\n🎲 *Random Soundtrack Mode*: **${session.audioPreset === 'random_pool' || session.audioPreset === 'none' ? 'ACTIVE ✅' : 'INACTIVE'}**\n`;
  text += `Type /clearpool to remove all tracks.`;

  bot.sendMessage(chatId, text, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🎲 Set Random Mode Active', callback_data: 'set:audio:random_pool' },
          { text: '🗑️ Clear Audio Pool', callback_data: 'action:clear_pool' }
        ]
      ]
    }
  });
});

bot.onText(/\/clearpool/, (msg) => {
  const chatId = msg.chat.id;
  const session = getUserSession(chatId);
  if (Array.isArray(session.customAudioFiles)) {
    session.customAudioFiles.forEach(t => {
      try { if (t.path && fs.existsSync(t.path)) fs.unlinkSync(t.path); } catch(e) {}
    });
  }
  session.customAudioFiles = [];
  session.customAudioFile = null;
  session.audioPreset = 'none';
  saveSessions();

  bot.sendMessage(chatId, `🗑️ *Audio Pool Cleared!*\n\nAll custom soundtracks have been deleted from the pool.`, {
    parse_mode: 'Markdown'
  });
});

// -------------------------------------------------------------
// IMAGE & VIDEO GENERATION HANDLER (Photo / PNG Document)
// -------------------------------------------------------------

async function handleImageFile(chatId, fileId, originalName = 'ChallengeItem', userMessageId = null) {
  const session = getUserSession(chatId);

  const statusMsg = await bot.sendMessage(
    chatId,
    `⏳ *Initializing render for "${originalName}"...*\n` +
    `🚀 _Starting 60 FPS GPU pipeline..._`,
    { parse_mode: 'Markdown' }
  );

  try {
    // 1. Download file from Telegram with live %, Time, and Quantity tracking
    const buffer = await downloadFileWithProgress(bot, fileId, (p) => {
      bot.editMessageText(buildProgressMessage({
        stageIcon: '📥',
        stageName: 'Downloading Image',
        itemName: originalName,
        percent: p.percent,
        currentQty: p.receivedBytes / (1024 * 1024),
        totalQty: p.totalBytes / (1024 * 1024),
        qtyUnit: 'MB',
        startTime: p.startTime
      }), {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      }).catch(() => {});
    });

    // Auto-delete user's uploaded file message from Telegram chat immediately after receiving
    if (userMessageId && session.autoDeleteUploads !== false) {
      bot.deleteMessage(chatId, userMessageId).catch(() => {});
    }

    // Convert to Data URL
    const mime = originalName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`;

    // 2. Prepare Render Config
    const cleanName = path.basename(originalName, path.extname(originalName)) || 'item';
    const filename = `challenge_${cleanName}_${session.resolution.toUpperCase()}_${Date.now()}.mp4`;

    // Audio Selection: Random from pool or preset
    let customAudioDataUrl = null;
    let chosenAudioName = null;

    const hasPool = Array.isArray(session.customAudioFiles) && session.customAudioFiles.length > 0;
    const shouldUsePool = session.audioPreset === 'random_pool' ||
      (hasPool && (session.audioPreset === 'custom' || !['electronicBeat', 'synthwave', 'hiphop', 'none'].includes(session.audioPreset)));

    if (hasPool && shouldUsePool) {
      const validTracks = session.customAudioFiles.filter(t => t && t.path && fs.existsSync(t.path));
      if (validTracks.length > 0) {
        const randomIdx = Math.floor(Math.random() * validTracks.length);
        const selectedTrack = validTracks[randomIdx];
        try {
          const audioBuf = fs.readFileSync(selectedTrack.path);
          customAudioDataUrl = `data:audio/mpeg;base64,${audioBuf.toString('base64')}`;
          chosenAudioName = selectedTrack.name;
        } catch (e) {
          console.warn('[AUDIO LOAD ERROR]:', e.message);
        }
      }
    } else if (session.customAudioFile && fs.existsSync(session.customAudioFile)) {
      try {
        const audioBuf = fs.readFileSync(session.customAudioFile);
        customAudioDataUrl = `data:audio/mpeg;base64,${audioBuf.toString('base64')}`;
        chosenAudioName = path.basename(session.customAudioFile);
      } catch (e) {}
    }

    // Auto-match video length to audio length! (e.g. If audio is 10 sec, video is 10 sec)
    let videoDuration = session.duration || 3;
    if (customAudioDataUrl) {
      const detectedDur = await renderer.getAudioDuration(customAudioDataUrl);
      if (detectedDur && detectedDur > 0) {
        videoDuration = detectedDur;
        console.log(`[BOT] Matched video duration to audio track length: ${videoDuration}s`);
      }
    }

    const renderConfig = {
      imageUrl: dataUrl,
      imageName: cleanName,
      motionType: session.motionType,
      speed: session.speed,
      duration: videoDuration,
      fps: session.fps,
      resolution: session.resolution,
      aspectRatio: session.aspectRatio,
      headerText: session.headerText,
      headerColor: session.headerColor,
      subText: session.subText,
      outlineColor: session.outlineColor,
      outlineWidth: session.outlineWidth,
      bgGradient: session.bgGradient,
      audioPreset: customAudioDataUrl ? 'none' : session.audioPreset,
      customAudioUrl: customAudioDataUrl,
      imageScale: 0.72 * ((session.pngScale || 100) / 100),
      showSparkles: session.showSparkles !== false,
      particleCount: session.particleCount || 90,
      particleSpeed: session.particleSpeed || 3.0,
      particleColor: session.particleColor || '#00f3ff',
      filename: filename
    };

    let lastProgressUpdate = 0;
    const renderStartTime = Date.now();

    // 3. Queue & Render on Server with %, Time, and Quantity (Frames)
    const result = await renderer.queueRender(renderConfig, (prog) => {
      const now = Date.now();
      if ((now - lastProgressUpdate > 2000 && prog.percent > 0) || prog.percent === 100) {
        lastProgressUpdate = now;
        bot.editMessageText(buildProgressMessage({
          stageIcon: '🎬',
          stageName: 'Rendering 60 FPS Video',
          itemName: cleanName,
          percent: prog.percent,
          currentQty: prog.currentFrame,
          totalQty: prog.totalFrames,
          qtyUnit: 'frames',
          startTime: renderStartTime,
          extraLines: [
            `🎨 \`${BG_PRESETS[session.bgGradient] || session.bgGradient}\` • 📐 \`${session.pngScale || 100}%\``,
            `🎬 \`${session.motionType.toUpperCase()} (${session.speed}x)\`${session.showSparkles !== false ? ` • ✨ \`${session.particleCount || 90} Pts\`` : ''}`
          ]
        }), {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {});
      }
    });

    // 4. Send Video to User with live upload %, Time, and Quantity (MB)
    const videoFilePath = result.path || path.join(EXPORTS_DIR, result.filename);
    const videoFileSize = fs.statSync(videoFilePath).size;
    const uploadStartTime = Date.now();

    const dimensions = {
      '4k': { '9:16': [2160, 3840], '1:1': [2160, 2160], '16:9': [3840, 2160] },
      '2k': { '9:16': [1440, 2560], '1:1': [1440, 1440], '16:9': [2560, 1440] },
      '1080p': { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] },
      '720p': { '9:16': [720, 1280], '1:1': [720, 720], '16:9': [1280, 720] }
    }[session.resolution]?.[session.aspectRatio] || [720, 1280];

    let audioCaption = `\`${session.audioPreset}\``;
    if (chosenAudioName) {
      const cleanAudio = chosenAudioName.length > 20 ? chosenAudioName.substring(0, 17) + '...' : chosenAudioName;
      audioCaption = `\`${cleanAudio}\``;
    } else if (session.audioPreset === 'none') {
      audioCaption = '`None (Silent)`';
    }

    const particleDesc = session.showSparkles !== false
      ? `${session.particleCount || 90} Sparkles @ ${(session.particleSpeed || 3.0).toFixed(1)}x`
      : 'Off';

    const caption = `🎬 *Video Ready!* ⚡\n` +
      `🛑 *"${session.headerText}"*\n` +
      `🎯 _${session.subText || 'Pause to Win!' }_\n\n` +
      `📁 \`${path.basename(videoFilePath)}\` • \`${(videoFileSize / (1024 * 1024)).toFixed(1)} MB\`\n` +
      `⏱️ \`${videoDuration}s\` @ \`60 FPS\` • \`${session.resolution.toUpperCase()}\`\n` +
      `🎨 \`${BG_PRESETS[session.bgGradient] || session.bgGradient}\` • 📐 \`${session.pngScale || 100}%\`\n` +
      `✨ \`${particleDesc}\`\n` +
      `🎵 ${audioCaption}\n\n` +
      `🔥 #StopChallenge #Reels #Shorts #60FPS`;

    if (videoFileSize < 49.5 * 1024 * 1024) {
      let uploadPercent = 90;
      const progressTimer = setInterval(() => {
        uploadPercent = Math.min(99, uploadPercent + 1);
        bot.editMessageText(buildProgressMessage({
          stageIcon: '🚀',
          stageName: 'Uploading Video to Telegram',
          itemName: path.basename(videoFilePath),
          percent: uploadPercent,
          currentQty: (videoFileSize / (1024 * 1024)) * (uploadPercent / 100),
          totalQty: videoFileSize / (1024 * 1024),
          qtyUnit: 'MB',
          startTime: uploadStartTime
        }), {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {});
      }, 2000);

      try {
        await sendTelegramVideoDirect({
          token: TOKEN,
          chatId,
          filePath: videoFilePath,
          caption: caption,
          duration: videoDuration,
          width: dimensions[0],
          height: dimensions[1]
        });
      } finally {
        clearInterval(progressTimer);
      }

      // Clean up status message
      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    } else {
      await bot.editMessageText(
        caption + `\n\n⚠️ *Notice*: Video size (${(videoFileSize / (1024 * 1024)).toFixed(1)} MB) exceeds Telegram's 50MB bot upload limit. The file is saved directly on your desktop PC at:\n\`${videoFilePath}\`\n\n💡 Tip: Choose 1080p or 720p in /settings for instant Telegram delivery!`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
    }

  } catch (err) {
    console.error('[BOT ERROR] Render failed:', err);
    bot.editMessageText(`❌ *Render Error*: ${err.message || err}`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown'
    });
  }
}

// -------------------------------------------------------------
// ZIP BATCH PROCESSING ENGINE (PNGs ZIP ➔ Random Audio ➔ Output Videos ZIP)
// -------------------------------------------------------------

async function handleZipBatchFile(chatId, fileId, zipFileName = 'batch_images.zip', userMessageId = null) {
  const session = getUserSession(chatId);
  const batchId = Date.now();
  const batchWorkDir = path.join(TEMP_DIR, `zip_batch_${chatId}_${batchId}`);
  const extractDir = path.join(batchWorkDir, 'extracted');
  const localZipPath = path.join(batchWorkDir, zipFileName);

  fs.mkdirSync(extractDir, { recursive: true });

  const statusMsg = await bot.sendMessage(
    chatId,
    `📦 *Extracting "${zipFileName}"...*\n` +
    `⏳ _Preparing batch queue..._`,
    { parse_mode: 'Markdown' }
  );

  try {
    // 1. Download ZIP file from Telegram directly to disk with live %, Time, and Quantity tracking
    await downloadTelegramFileToDisk(bot, fileId, localZipPath, (p) => {
      bot.editMessageText(buildProgressMessage({
        stageIcon: '📥',
        stageName: 'Downloading ZIP Archive',
        itemName: zipFileName,
        percent: p.percent,
        currentQty: p.receivedBytes / (1024 * 1024),
        totalQty: p.totalBytes / (1024 * 1024),
        qtyUnit: 'MB',
        startTime: p.startTime
      }), {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      }).catch(() => {});
    });

    // Auto-delete user's uploaded ZIP message from Telegram chat immediately after download
    if (userMessageId && session.autoDeleteUploads !== false) {
      bot.deleteMessage(chatId, userMessageId).catch(() => {});
    }

    // 2. Extract ZIP
    const zip = new AdmZip(localZipPath);
    zip.extractAllTo(extractDir, true);

    // 3. Scan extracted directory recursively
    function scanDir(dir) {
      let files = [];
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          if (!item.includes('__MACOSX')) {
            files = files.concat(scanDir(fullPath));
          }
        } else if (stat.isFile()) {
          if (!item.startsWith('.') && !item.startsWith('._')) {
            files.push(fullPath);
          }
        }
      }
      return files;
    }

    const allFiles = scanDir(extractDir);

    // Filter valid image files and audio tracks
    const imageFiles = allFiles.filter(f => /\.(png|jpe?g|webp)$/i.test(f));
    const audioFilesInZip = allFiles.filter(f => /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f));

    // If ZIP contains audio files, auto-add them to user's Audio Pool
    if (audioFilesInZip.length > 0) {
      if (!Array.isArray(session.customAudioFiles)) session.customAudioFiles = [];
      for (const aPath of audioFilesInZip) {
        const aName = path.basename(aPath);
        const persistentPath = path.join(TEMP_DIR, `${chatId}_${Date.now()}_${aName}`);
        try {
          fs.copyFileSync(aPath, persistentPath);
          session.customAudioFiles.push({
            name: aName,
            path: persistentPath,
            addedAt: Date.now()
          });
        } catch (e) {}
      }
      session.audioPreset = 'random_pool';
      saveSessions();
    }

    if (imageFiles.length === 0) {
      return bot.editMessageText(
        `❌ *No PNG Images Found in "${zipFileName}"!*\n\n` +
        `Please ensure the ZIP file contains transparent .png image files.`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
    }

    // Natural sort: 1.png, 2.png, ... 10.png
    imageFiles.sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: 'base' })
    );

    const totalImages = imageFiles.length;
    const poolCount = Array.isArray(session.customAudioFiles) ? session.customAudioFiles.length : 0;

    await bot.editMessageText(
      `🏭 *Batch Started (${totalImages} Videos)*\n\n` +
      `⚡ \`${session.resolution.toUpperCase()}\` @ \`60 FPS\` • \`${session.motionType.toUpperCase()}\`\n` +
      `🎵 \`${poolCount > 0 ? `${poolCount} Pool Tracks` : session.audioPreset}\`\n` +
      `✨ \`${session.showSparkles !== false ? `${session.particleCount || 90} Pts` : 'Clean'}\` • 📐 \`${session.pngScale || 100}%\`\n\n` +
      `⏳ _Rendering videos sequentially..._`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    const renderedVideos = [];
    let completedCount = 0;
    let failedCount = 0;

    // 4. Render each image sequentially
    for (let i = 0; i < totalImages; i++) {
      const imgPath = imageFiles[i];
      const origBaseName = path.basename(imgPath, path.extname(imgPath));
      const cleanName = origBaseName.replace(/[^\w\d_.-]/g, '_') || `item_${i + 1}`;

      try {
        const imgBuffer = fs.readFileSync(imgPath);
        const mime = imgPath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${imgBuffer.toString('base64')}`;

        // Select random audio from pool
        let customAudioDataUrl = null;
        let chosenAudioName = null;

        const hasPool = Array.isArray(session.customAudioFiles) && session.customAudioFiles.length > 0;
        const shouldUsePool = session.audioPreset === 'random_pool' ||
          (hasPool && (session.audioPreset === 'custom' || !['electronicBeat', 'synthwave', 'hiphop', 'none'].includes(session.audioPreset)));

        if (hasPool && shouldUsePool) {
          const validPool = session.customAudioFiles.filter(t => t && t.path && fs.existsSync(t.path));
          if (validPool.length > 0) {
            const randomIdx = Math.floor(Math.random() * validPool.length);
            const chosenTrack = validPool[randomIdx];
            try {
              const audioBuf = fs.readFileSync(chosenTrack.path);
              customAudioDataUrl = `data:audio/mpeg;base64,${audioBuf.toString('base64')}`;
              chosenAudioName = chosenTrack.name;
            } catch (e) {}
          }
        } else if (session.customAudioFile && fs.existsSync(session.customAudioFile)) {
          try {
            const audioBuf = fs.readFileSync(session.customAudioFile);
            customAudioDataUrl = `data:audio/mpeg;base64,${audioBuf.toString('base64')}`;
            chosenAudioName = path.basename(session.customAudioFile);
          } catch (e) {}
        }

        // Match video length to audio length! (If audio is 10s, video is 10s)
        let itemDuration = session.duration || 3;
        if (customAudioDataUrl) {
          const detectedDur = await renderer.getAudioDuration(customAudioDataUrl);
          if (detectedDur && detectedDur > 0) {
            itemDuration = detectedDur;
            console.log(`[ZIP BATCH] Matched duration to audio for "${cleanName}": ${itemDuration}s`);
          }
        }

        const outVideoFilename = `challenge_${cleanName}_${session.resolution.toUpperCase()}_${Date.now()}.mp4`;

        const renderConfig = {
          imageUrl: dataUrl,
          imageName: cleanName,
          motionType: session.motionType,
          speed: session.speed,
          duration: itemDuration,
          fps: session.fps,
          resolution: session.resolution,
          aspectRatio: session.aspectRatio,
          headerText: session.headerText,
          headerColor: session.headerColor,
          subText: session.subText,
          outlineColor: session.outlineColor,
          outlineWidth: session.outlineWidth,
          bgGradient: session.bgGradient,
          audioPreset: customAudioDataUrl ? 'none' : session.audioPreset,
          customAudioUrl: customAudioDataUrl,
          imageScale: 0.72 * ((session.pngScale || 100) / 100),
          showSparkles: session.showSparkles !== false,
          particleCount: session.particleCount || 90,
          particleSpeed: session.particleSpeed || 3.0,
          particleColor: session.particleColor || '#00f3ff',
          filename: outVideoFilename
        };

        let lastProg = 0;
        const itemRenderStartTime = Date.now();
        const result = await renderer.queueRender(renderConfig, (prog) => {
          const now = Date.now();
          if ((now - lastProg > 2000 && prog.percent > 0) || prog.percent === 100) {
            lastProg = now;
            bot.editMessageText(buildProgressMessage({
              stageIcon: '🎬',
              stageName: `ZIP Batch [${i + 1} / ${totalImages}]`,
              itemName: cleanName,
              percent: prog.percent,
              currentQty: prog.currentFrame,
              totalQty: prog.totalFrames,
              qtyUnit: 'frames',
              startTime: itemRenderStartTime,
              extraLines: [
                `🎵 \`${chosenAudioName ? (chosenAudioName.length > 18 ? chosenAudioName.substring(0, 15) + '...' : chosenAudioName) : session.audioPreset}\``,
                `🎨 \`${BG_PRESETS[session.bgGradient] || session.bgGradient}\` • 📐 \`${session.pngScale || 100}%\``,
                `🏭 *Queue*: \`${completedCount} / ${totalImages} Ready\``
              ]
            }), {
              chat_id: chatId,
              message_id: statusMsg.message_id,
              parse_mode: 'Markdown'
            }).catch(() => {});
          }
        });

        const createdVideoPath = result.path || path.join(EXPORTS_DIR, result.filename);
        if (fs.existsSync(createdVideoPath)) {
          renderedVideos.push({
            name: `${String(i + 1).padStart(2, '0')}_${cleanName}_StopChallenge.mp4`,
            path: createdVideoPath,
            audio: chosenAudioName || session.audioPreset,
            duration: itemDuration,
            sizeKB: result.sizeKB || Math.round(fs.statSync(createdVideoPath).size / 1024)
          });
          completedCount++;
        } else {
          failedCount++;
        }

      } catch (itemErr) {
        console.error(`[ZIP BATCH ITEM ERROR] (${cleanName}):`, itemErr);
        failedCount++;
      }
    }

    if (renderedVideos.length === 0) {
      return bot.editMessageText(`❌ *Batch Rendering Failed*: None of the videos could be completed.`, {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      });
    }

    // 5. Package all rendered MP4s into a single ZIP archive
    await bot.editMessageText(
      `📦 *Packaging ${renderedVideos.length} Videos into ZIP Archive...*`,
      {
        chat_id: chatId,
        message_id: statusMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    const outZipName = `StopChallenge_Batch_${completedCount}_Videos_${Date.now()}.zip`;
    const outZipPath = path.join(EXPORTS_DIR, outZipName);
    const finalZip = new AdmZip();

    for (const v of renderedVideos) {
      finalZip.addLocalFile(v.path, '', v.name);
    }

    finalZip.writeZip(outZipPath);

    const zipStats = fs.statSync(outZipPath);
    const zipSizeMB = (zipStats.size / (1024 * 1024)).toFixed(1);
    const zipUploadStartTime = Date.now();

    // 6. Send the ZIP to User with live upload %, Time, and Quantity (MB)
    const zipParticleDesc = session.showSparkles !== false
      ? `${session.particleCount || 90} Sparkles @ ${(session.particleSpeed || 3.0).toFixed(1)}x`
      : 'Off';

    const caption = `🎉 *ZIP Batch Complete!* 📦\n` +
      `📁 \`${completedCount} Videos Ready\` • \`${zipSizeMB} MB\`${failedCount > 0 ? ` (${failedCount} failed)` : ''}\n\n` +
      `⚙️ *Batch Specs*:\n` +
      `⏱️ \`60 FPS\` • \`${session.resolution.toUpperCase()}\` • \`${session.motionType.toUpperCase()} (${session.speed}x)\`\n` +
      `🎨 \`${BG_PRESETS[session.bgGradient] || session.bgGradient}\` • 📐 \`${session.pngScale || 100}%\`\n` +
      `✨ \`${zipParticleDesc}\`\n` +
      `🎵 \`Random Pool Tracks\`\n\n` +
      `📂 *Desktop Path*:\n` +
      `\`prompt maker\\exports\\${outZipName}\`\n\n` +
      `🔥 #StopChallenge #Batch #Shorts #Reels`;

    // Check if zip size is within Telegram bot 50MB file transfer limit
    if (zipStats.size < 49.5 * 1024 * 1024) {
      let uploadPercent = 90;
      const progressTimer = setInterval(() => {
        uploadPercent = Math.min(99, uploadPercent + 1);
        bot.editMessageText(buildProgressMessage({
          stageIcon: '🚀',
          stageName: 'Uploading ZIP Archive',
          itemName: outZipName,
          percent: uploadPercent,
          currentQty: (zipStats.size / (1024 * 1024)) * (uploadPercent / 100),
          totalQty: zipStats.size / (1024 * 1024),
          qtyUnit: 'MB',
          startTime: zipUploadStartTime
        }), {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }).catch(() => {});
      }, 2000);

      try {
        await sendTelegramDocumentDirect({
          token: TOKEN,
          chatId,
          filePath: outZipPath,
          caption: caption,
          fileName: outZipName
        });
      } finally {
        clearInterval(progressTimer);
      }

      bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});
    } else {
      await bot.editMessageText(
        caption + `\n\n⚠️ *Note*: ZIP size exceeds Telegram's 50MB bot upload limit. The file is saved directly on your desktop PC at the path above!`,
        {
          chat_id: chatId,
          message_id: statusMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
    }

    // Clean up temporary extracted folder
    try {
      fs.rmSync(batchWorkDir, { recursive: true, force: true });
    } catch (e) {}

  } catch (err) {
    console.error('[ZIP BATCH FATAL ERROR]:', err);
    bot.editMessageText(`❌ *ZIP Processing Error*: ${err.message || err}`, {
      chat_id: chatId,
      message_id: statusMsg.message_id,
      parse_mode: 'Markdown'
    });
    try {
      fs.rmSync(batchWorkDir, { recursive: true, force: true });
    } catch (e) {}
  }
}

// User sends Photo (e.g. from mobile gallery)
bot.on('photo', async (msg) => {
  try {
    const chatId = msg.chat.id;
    // Get highest resolution photo
    const photo = msg.photo[msg.photo.length - 1];
    await handleImageFile(chatId, photo.file_id, 'ChallengePhoto.png', msg.message_id);
  } catch (e) {
    console.error('Error handling photo:', e?.message || e);
  }
});

// User sends Audio (via Telegram music/audio attachment)
bot.on('audio', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const audio = msg.audio;
    const fileName = audio.file_name || (audio.title ? `${audio.title}.mp3` : `track_${Date.now()}.mp3`);
    await handleAudioUpload(chatId, audio.file_id, fileName, msg.message_id);
  } catch (e) {
    console.error('Error handling audio:', e?.message || e);
  }
});

// User sends Voice note
bot.on('voice', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const voice = msg.voice;
    const fileName = `voice_${Date.now()}.ogg`;
    await handleAudioUpload(chatId, voice.file_id, fileName, msg.message_id);
  } catch (e) {
    console.error('Error handling voice:', e?.message || e);
  }
});

// User sends Document (ZIP of PNGs / Images / MP3 Audio in bulk)
bot.on('document', async (msg) => {
  try {
    const chatId = msg.chat.id;
    const session = getUserSession(chatId);
    const doc = msg.document;
    const fileName = doc.file_name || 'document';

    const isZip = fileName.toLowerCase().endsWith('.zip') ||
                  doc.mime_type === 'application/zip' ||
                  doc.mime_type === 'application/x-zip-compressed';
    const isImage = (doc.mime_type && doc.mime_type.startsWith('image/')) ||
                    /\.(png|jpe?g|webp)$/i.test(fileName);
    const isAudio = (doc.mime_type && doc.mime_type.startsWith('audio/')) ||
                    /\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i.test(fileName);

    if (isZip) {
      await handleZipBatchFile(chatId, doc.file_id, fileName, msg.message_id);
    } else if (isAudio) {
      await handleAudioUpload(chatId, doc.file_id, fileName, msg.message_id);
    } else if (isImage) {
      await handleImageFile(chatId, doc.file_id, fileName, msg.message_id);
    } else {
      if (session.autoDeleteUploads !== false) {
        bot.deleteMessage(chatId, msg.message_id).catch(() => {});
      }
      bot.sendMessage(chatId, `⚠️ *Unsupported Document Format*\n\nPlease send:\n• 📦 **ZIP Archive** containing PNG images for bulk video generation\n• 🖼️ **Transparent PNG** for a single video\n• 🎵 **MP3 / Audio Files** for random background music!`, {
        parse_mode: 'Markdown'
      });
    }
  } catch (e) {
    console.error('Error handling document:', e?.message || e);
  }
});

console.log('✅ Stop Challenge Telegram Bot is fully active and listening for messages!');

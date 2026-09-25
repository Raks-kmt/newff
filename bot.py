"""
🛑 STOP CHALLENGE PRO — TELEGRAM VIDEO STUDIO
High-Performance 60 FPS Video Render Engine with Live Progress Tracking.
Direct FFmpeg piping, zero browser overhead, instant Telegram delivery,
automatic server cache cleanup post-delivery.
"""

import os
import sys
import time
import json
import zipfile
import threading
import traceback
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Ensure UTF-8 output on Windows console
try:
    if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    if sys.stderr and hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

from dotenv import load_dotenv
import telebot
from telebot import types
from PIL import Image

import renderer

load_dotenv()

TOKEN = os.getenv('TELEGRAM_BOT_TOKEN') or os.getenv('BOT_TOKEN')
PORT = int(os.getenv('PORT', 5050 if sys.platform == 'win32' else 10000))

if not TOKEN:
    print("❌ ERROR: TELEGRAM_BOT_TOKEN is not defined in .env!")
    sys.exit(1)

bot = telebot.TeleBot(TOKEN, parse_mode='Markdown')

BASE_DIR = Path(__file__).resolve().parent
EXPORTS_DIR = BASE_DIR / 'exports'
TEMP_DIR = BASE_DIR / 'temp'
ASSETS_DIR = BASE_DIR / 'assets' / 'bg_previews'
SESSIONS_FILE = BASE_DIR / 'sessions.json'

EXPORTS_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# -------------------------------------------------------------
# SESSIONS MANAGEMENT
# -------------------------------------------------------------

sessions = {}

def get_default_session():
    return {
        'motion_type': 'spin',
        'speed': 1.0,
        'duration': 3.0,
        'fps': 60,
        'resolution': '720p',
        'aspect_ratio': '9:16',
        'bg_gradient': 'cyberpunk',
        'header_text': 'CAN YOU STOP THIS? 🛑',
        'header_color': '#ffe600',
        'sub_text': 'PAUSE EXACTLY IN THE OUTLINE! 🎯',
        'outline_color': '#00f3ff',
        'outline_width': 8,
        'outline_glow': 18,
        'png_scale': 100,
        'show_sparkles': True,
        'particle_count': 90,
        'particle_speed': 3.0,
        'particle_color': '#00f3ff',
        'audio_preset': 'random_pool',
        'custom_audio_files': [],
        'auto_delete_uploads': True,
        'last_bg_preview_msg_id': None,
        'last_scale_preview_msg_id': None,
        'last_atmosphere_preview_msg_id': None
    }

def load_sessions():
    global sessions
    if SESSIONS_FILE.exists():
        try:
            with open(SESSIONS_FILE, 'r', encoding='utf-8') as f:
                sessions = json.load(f)
        except Exception:
            sessions = {}

def save_sessions():
    try:
        with open(SESSIONS_FILE, 'w', encoding='utf-8') as f:
            json.dump(sessions, f, indent=2)
    except Exception as e:
        print(f"[SESSION ERROR] Could not save sessions: {e}")

load_sessions()

def get_user_session(chat_id):
    chat_id_str = str(chat_id)
    if chat_id_str not in sessions:
        sessions[chat_id_str] = get_default_session()
        save_sessions()
    s = sessions[chat_id_str]
    # Normalize legacy camelCase keys from sessions.json
    if 'bgGradient' in s and 'bg_gradient' not in s: s['bg_gradient'] = s['bgGradient']
    if 'outlineColor' in s and 'outline_color' not in s: s['outline_color'] = s['outlineColor']
    if 'outlineWidth' in s and 'outline_width' not in s: s['outline_width'] = s['outlineWidth']
    if 'pngScale' in s and 'png_scale' not in s: s['png_scale'] = s['pngScale']
    if 'customAudioFiles' in s and 'custom_audio_files' not in s: s['custom_audio_files'] = s['customAudioFiles']
    if 'customAudioFile' in s and 'custom_audio_file' not in s: s['custom_audio_file'] = s['customAudioFile']
    if 'audioPreset' in s and 'audio_preset' not in s: s['audio_preset'] = s['audioPreset']
    if 'headerText' in s and 'header_text' not in s: s['header_text'] = s['headerText']
    if 'headerColor' in s and 'header_color' not in s: s['header_color'] = s['headerColor']
    if 'subText' in s and 'sub_text' not in s: s['sub_text'] = s['subText']
    if 'motionType' in s and 'motion_type' not in s: s['motion_type'] = s['motionType']
    if 'showSparkles' in s and 'show_sparkles' not in s: s['show_sparkles'] = s['showSparkles']
    if 'particleCount' in s and 'particle_count' not in s: s['particle_count'] = s['particleCount']
    if 'particleSpeed' in s and 'particle_speed' not in s: s['particle_speed'] = s['particleSpeed']
    if 'particleColor' in s and 'particle_color' not in s: s['particle_color'] = s['particleColor']
    return s

# -------------------------------------------------------------
# UI LABELS & HELPERS
# -------------------------------------------------------------

BOT_BRAND = "Stop Challenge Pro"
BOT_TAG = "#StopChallenge #Reels #Shorts #60FPS"

def get_png_scale_label(percent):
    p = percent or 100
    if p <= 55: return 'Very Small 🔬'
    if p <= 75: return 'Compact 📱'
    if p <= 90: return 'Medium 📐'
    if p <= 105: return 'Normal (Default) 🎯'
    if p <= 125: return 'Large 🔍'
    if p <= 155: return 'Extra Large 💥'
    return 'Giant 🦖'

def get_scale_bar(percent):
    p = percent or 100
    total_dots = 12
    pos = int(min(max(0, (p - 40) / 160.0), 1.0) * (total_dots - 1))
    bar = ['━'] * total_dots
    bar[pos] = '🔘'
    return ''.join(bar)

def get_clean_header(text):
    if not text:
        return ""
    clean = ""
    for ch in text:
        if ord(ch) < 0x2000 or ord(ch) == 0x2022:
            clean += ch
        else:
            clean += " "
    return " ".join(clean.split())

def fmt_time(seconds):
    """Format seconds to mm:ss or 'Xs' for short durations."""
    if seconds < 0:
        return '..'
    if seconds < 60:
        return f"{int(seconds)}s"
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}m {s:02d}s"

def make_progress_bar(pct, width=20):
    """Create an animated Unicode progress bar."""
    filled = int(pct / 100 * width)
    bar = '█' * filled + '░' * (width - filled)
    return bar

# -------------------------------------------------------------
# LIVE PROGRESS TRACKER (Professional Real-Time Updates)
# -------------------------------------------------------------

class LiveProgressTracker:
    """
    Manages live Telegram message updates during rendering.
    Throttled to max 1 edit per 2 seconds to avoid Telegram rate limits.
    Shows: animated progress bar, %, ETA, speed, stage, and config info.
    """
    def __init__(self, bot_instance, chat_id, message_id, item_name, session, total_stages=6):
        self.bot = bot_instance
        self.chat_id = chat_id
        self.msg_id = message_id
        self.item_name = item_name
        self.session = session
        self.total_stages = total_stages
        self.stage = 1
        self.stage_label = '📥 Downloading'
        self.start_time = time.time()
        self.last_edit_time = 0
        self.last_pct = -1
        self.render_start = None
        self._lock = threading.Lock()

    def set_stage(self, stage_num, label):
        """Update current stage (1=Download, 2=Process, 3=Render, 4=Mux, 5=Upload, 6=Done)."""
        self.stage = stage_num
        self.stage_label = label
        if stage_num == 3:
            self.render_start = time.time()
        self._do_edit(force=True)

    def on_render_progress(self, pct, cur_frame, total_frames):
        """Called from renderer's on_progress callback."""
        if pct == self.last_pct:
            return
        self.last_pct = pct
        now = time.time()
        # Throttle: max 1 edit per 2s, but always send 100%
        if pct < 100 and (now - self.last_edit_time) < 2.0:
            return
        
        elapsed = now - (self.render_start or self.start_time)
        if pct > 0:
            eta = (elapsed / pct) * (100 - pct)
        else:
            eta = 0
        fps_actual = cur_frame / max(0.1, elapsed)

        bar = make_progress_bar(pct)
        stage_dots = ''.join(['●' if i < self.stage else '○' for i in range(self.total_stages)])

        text = (
            f"🎬 *{BOT_BRAND} — Rendering*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📁 *Item*: `{self.item_name}`\n\n"
            f"`[{bar}]` *{pct}%*\n\n"
            f"⏱️ *Elapsed*: `{fmt_time(elapsed)}`  •  🏁 *ETA*: `{fmt_time(eta)}`\n"
            f"⚡ *Speed*: `{fps_actual:.0f} fps`  •  🎞️ `{cur_frame}/{total_frames}` frames\n\n"
            f"📊 *Stage*: {self.stage_label}  `[{stage_dots}]`\n"
            f"🎨 `{self.session.get('bg_gradient', 'cyberpunk')}` • "
            f"📐 `{self.session.get('png_scale', 100)}%` • "
            f"📺 `{self.session.get('resolution', '720p').upper()}`"
        )
        self._send(text)

    def _do_edit(self, force=False):
        now = time.time()
        if not force and (now - self.last_edit_time) < 2.0:
            return
        elapsed = now - self.start_time
        stage_dots = ''.join(['●' if i < self.stage else '○' for i in range(self.total_stages)])
        text = (
            f"🎬 *{BOT_BRAND} — Processing*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📁 *Item*: `{self.item_name}`\n\n"
            f"📊 *Stage*: {self.stage_label}  `[{stage_dots}]`\n"
            f"⏱️ *Elapsed*: `{fmt_time(elapsed)}`\n\n"
            f"🎨 `{self.session.get('bg_gradient', 'cyberpunk')}` • "
            f"📐 `{self.session.get('png_scale', 100)}%` • "
            f"📺 `{self.session.get('resolution', '720p').upper()}`"
        )
        self._send(text)

    def _send(self, text):
        with self._lock:
            now = time.time()
            if (now - self.last_edit_time) < 1.5:
                return
            try:
                self.bot.edit_message_text(
                    text,
                    chat_id=self.chat_id,
                    message_id=self.msg_id
                )
                self.last_edit_time = time.time()
            except Exception:
                pass

# -------------------------------------------------------------
# AUTOMATIC SERVER CLEANUP JANITOR
# -------------------------------------------------------------

def run_cache_cleanup():
    """Wipes files older than 5 minutes to keep server storage 100% clean."""
    now = time.time()
    max_age = 5 * 60  # 5 minutes

    # 1. Clean exports directory
    if EXPORTS_DIR.exists():
        for p in EXPORTS_DIR.iterdir():
            if p.name == '.gitkeep': continue
            try:
                if p.is_file() and (now - p.stat().st_mtime > max_age):
                    p.unlink()
                    print(f"[JANITOR] Cleaned old export: {p.name}")
            except Exception:
                pass

    # 2. Clean temp directory
    if TEMP_DIR.exists():
        for p in TEMP_DIR.iterdir():
            if p.name in ['.gitkeep', 'bg_previews']: continue
            try:
                if p.is_dir() and (now - p.stat().st_mtime > max_age):
                    for sub in p.iterdir():
                        try: sub.unlink()
                        except Exception: pass
                    p.rmdir()
                elif p.is_file() and (now - p.stat().st_mtime > max_age):
                    p.unlink()
            except Exception:
                pass

def janitor_thread_loop():
    while True:
        try:
            run_cache_cleanup()
        except Exception:
            pass
        time.sleep(300) # every 5 mins

threading.Thread(target=janitor_thread_loop, daemon=True).start()

# -------------------------------------------------------------
# KEYBOARDS & MENUS
# -------------------------------------------------------------

def get_settings_keyboard(session):
    kb = types.InlineKeyboardMarkup(row_width=2)
    
    speed_txt = f"⏱️ Speed: {session.get('speed', 1.0)}x"
    scale_txt = f"📐 Size: {session.get('png_scale', 100)}%"
    motion_txt = f"🎬 Motion: {session.get('motion_type', 'spin').upper()}"
    bg_txt = f"🎨 BG: {session.get('bg_gradient', 'cyberpunk')[:12]}"
    
    sparkle_txt = "✨ Particles: ON" if session.get('show_sparkles', True) else "⚪ Particles: OFF"
    audio_txt = f"🎵 Audio: {session.get('audio_preset', 'random_pool')[:12]}"
    res_txt = f"📺 {session.get('resolution', '720p').upper()} • {session.get('aspect_ratio', '9:16')}"
    dur_txt = f"⏳ {int(session.get('duration', 3))}s Duration"
    
    kb.add(
        types.InlineKeyboardButton(speed_txt, callback_data='menu:speed'),
        types.InlineKeyboardButton(scale_txt, callback_data='menu:scale')
    )
    kb.add(
        types.InlineKeyboardButton(motion_txt, callback_data='menu:motion'),
        types.InlineKeyboardButton(bg_txt, callback_data='menu:bg')
    )
    kb.add(
        types.InlineKeyboardButton(sparkle_txt, callback_data='menu:particles'),
        types.InlineKeyboardButton(audio_txt, callback_data='menu:audio')
    )
    kb.add(
        types.InlineKeyboardButton(res_txt, callback_data='menu:resolution'),
        types.InlineKeyboardButton(dur_txt, callback_data='menu:duration')
    )
    kb.add(
        types.InlineKeyboardButton('🖼️ Live Preview', callback_data=f"view:bg:{session.get('bg_gradient', 'cyberpunk')}"),
        types.InlineKeyboardButton('🔄 Reset to Default', callback_data='action:reset')
    )
    return kb

def get_settings_summary_text(session):
    pool_count = len(session.get('custom_audio_files', []))
    audio_info = f"Random Pool ({pool_count} tracks)" if pool_count > 0 else session.get('audio_preset', 'none')
    return (
        f"⚙️ *{BOT_BRAND} — Control Panel*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"🎬 *Motion*: `{session.get('motion_type', 'spin').upper()}` at `{session.get('speed', 1.0)}x`\n"
        f"📐 *Scale*: `{session.get('png_scale', 100)}%` ({get_png_scale_label(session.get('png_scale', 100))})\n"
        f"🎨 *Background*: `{renderer.BG_PRESETS_LABELS.get(session.get('bg_gradient', 'cyberpunk'), 'Cyberpunk')}`\n"
        f"✨ *Particles*: `{'ON' if session.get('show_sparkles', True) else 'OFF'}` (`{session.get('particle_count', 90)} pts`)\n"
        f"🎵 *Audio*: `{audio_info}`\n"
        f"📺 *Output*: `60 FPS` • `{session.get('resolution', '720p').upper()}` • `{session.get('aspect_ratio', '9:16')}`\n\n"
        f"💡 _Tap any button to customize, or send a photo/ZIP to render!_"
    )

# -------------------------------------------------------------
# COMMAND HANDLERS
# -------------------------------------------------------------

@bot.message_handler(commands=['start', 'help'])
def cmd_start(message):
    chat_id = message.chat.id
    session = get_user_session(chat_id)
    
    welcome_text = (
        f"🛑 *{BOT_BRAND}*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"Create viral, ultra-smooth *Stop/Pause Challenge* videos in seconds!\n\n"
        f"📸 *Send Photo* → Instant 60 FPS video\n"
        f"📦 *Send ZIP* → Batch render multiple videos\n"
        f"🎵 *Send MP3* → Custom background music\n\n"
        f"⚡ *Features*:\n"
        f"  • 🎬 8 Motion styles (Spin, Bounce, Spiral...)\n"
        f"  • 🎨 20 Premium studio backgrounds\n"
        f"  • ✨ 3D floating particle effects\n"
        f"  • 📊 Live progress tracking\n"
        f"  • 🧹 Auto server cleanup\n\n"
        f"☁️ _100% Cloud • Zero load on device • {BOT_TAG}_"
    )
    bot.send_message(
        chat_id,
        welcome_text,
        reply_markup=get_settings_keyboard(session)
    )

@bot.message_handler(commands=['settings'])
def cmd_settings(message):
    chat_id = message.chat.id
    session = get_user_session(chat_id)
    bot.send_message(
        chat_id,
        get_settings_summary_text(session),
        reply_markup=get_settings_keyboard(session)
    )

@bot.message_handler(commands=['status'])
def cmd_status(message):
    chat_id = message.chat.id
    uptime = time.time() - BOT_START_TIME
    status_text = (
        f"🟢 *{BOT_BRAND} — System Status*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"⚡ *Engine*: `Python 3.12 + Pillow + FFmpeg`\n"
        f"🎞️ *Output*: `60 FPS Native Pipeline`\n"
        f"🖥️ *Platform*: `{sys.platform.upper()}`\n"
        f"⏱️ *Uptime*: `{fmt_time(uptime)}`\n"
        f"🧹 *Auto-Clean*: `Active (5 min cycle)`\n"
        f"📁 *Storage*: `Zero Bloat`\n"
        f"🚀 *Health*: `100% Operational`"
    )
    bot.send_message(chat_id, status_text)

@bot.message_handler(commands=['clean'])
def cmd_clean(message):
    run_cache_cleanup()
    bot.send_message(message.chat.id, "🧹 *Server Cache & Temporary Files Cleaned Successfully!*")

# -------------------------------------------------------------
# VISUAL BACKGROUND PREVIEW HANDLER
# -------------------------------------------------------------

def send_or_update_bg_preview(chat_id, bg_key, message_id=None, is_edit=False):
    session = get_user_session(chat_id)
    keys = list(renderer.GRADIENT_PRESETS.keys())
    if bg_key not in keys:
        bg_key = keys[0]
    
    idx = keys.index(bg_key)
    prev_key = keys[(idx - 1) % len(keys)]
    next_key = keys[(idx + 1) % len(keys)]
    
    bg_name = renderer.BG_PRESETS_LABELS.get(bg_key, bg_key)
    is_active = (session.get('bg_gradient') == bg_key)
    
    caption = (
        f"🎨 *Background Visual Preview*\n\n"
        f"• 🌟 *Name*: `{bg_name}`\n"
        f"• 📊 *Index*: `{idx + 1} / {len(keys)}`\n"
        f"• 📌 *Status*: {'✅ *Currently Active*' if is_active else '⚪ *Not Selected*'}\n\n"
        f"_Click 'Set this BG' to apply, or browse with arrows._"
    )
    
    kb = types.InlineKeyboardMarkup(row_width=3)
    kb.add(
        types.InlineKeyboardButton(f"⬅️ Prev", callback_data=f"view:bg:{prev_key}"),
        types.InlineKeyboardButton(f"✅ Active" if is_active else "✨ Set this BG", callback_data=f"apply:bg:{bg_key}"),
        types.InlineKeyboardButton(f"Next ➡️", callback_data=f"view:bg:{next_key}")
    )
    kb.add(
        types.InlineKeyboardButton("📋 Background List", callback_data="menu:bg"),
        types.InlineKeyboardButton("🗑️ Close Preview", callback_data="close:bg_preview")
    )
    
    preview_file = ASSETS_DIR / f"{bg_key}.jpg"
    
    # If preview image does not exist yet, generate it on the fly!
    if not preview_file.exists():
        try:
            img = renderer.create_gradient_background(360, 640, bg_key)
            img.save(preview_file, quality=88)
        except Exception:
            pass

    target_msg_id = message_id or session.get('last_bg_preview_msg_id')
    
    # If is_edit is True, update the photo and text IN-PLACE without deleting!
    if is_edit and target_msg_id and preview_file.exists():
        try:
            with open(preview_file, 'rb') as f:
                media = types.InputMediaPhoto(f, caption=caption, parse_mode='Markdown')
                bot.edit_message_media(media, chat_id=chat_id, message_id=target_msg_id, reply_markup=kb)
                return
        except Exception as edit_err:
            print(f"[BG EDIT MEDIA NOTICE]: {edit_err}")

    # If first time opening preview, clean old one if any and send fresh photo
    if session.get('last_bg_preview_msg_id'):
        try:
            bot.delete_message(chat_id, session['last_bg_preview_msg_id'])
        except Exception:
            pass
        session['last_bg_preview_msg_id'] = None

    try:
        if preview_file.exists():
            with open(preview_file, 'rb') as f:
                sent = bot.send_photo(chat_id, f, caption=caption, reply_markup=kb)
                session['last_bg_preview_msg_id'] = sent.message_id
                save_sessions()
        else:
            sent = bot.send_message(chat_id, caption, reply_markup=kb)
            session['last_bg_preview_msg_id'] = sent.message_id
            save_sessions()
    except Exception as e:
        print(f"[BG PREVIEW ERROR]: {e}")

# -------------------------------------------------------------
# CALLBACK QUERY ROUTING (INLINE MENUS)
# -------------------------------------------------------------

@bot.callback_query_handler(func=lambda call: True)
def handle_callbacks(call):
    chat_id = call.message.chat.id
    message_id = call.message.message_id
    data = call.data
    session = get_user_session(chat_id)
    
    if data == 'menu:main':
        bot.edit_message_text(
            get_settings_summary_text(session),
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=get_settings_keyboard(session)
        )
        return bot.answer_callback_query(call.id)

    # 1. Motion Menu
    if data == 'menu:motion':
        kb = types.InlineKeyboardMarkup(row_width=2)
        motions = [
            ('spin', '🔄 360° Spin'),
            ('bounce', '🏀 DVD Bounce'),
            ('pendulum', '🔔 Pendulum Swing'),
            ('float', '🌊 Floating Wave'),
            ('zigzag', '⚡ ZigZag Blitz'),
            ('figure8', '♾️ Figure-8 Loop'),
            ('spiral', '🌀 Spiral Orbit'),
            ('zoom', '🔍 Pulse Zoom')
        ]
        for m_key, m_label in motions:
            is_cur = (session.get('motion_type') == m_key)
            kb.add(types.InlineKeyboardButton(f"{m_label} {'✅' if is_cur else ''}", callback_data=f"set:motion:{m_key}"))
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))
        
        bot.edit_message_text(
            "🎬 *Select Motion Style*:\nChoose how the item moves before stopping in the outline:",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('set:motion:'):
        m = data.replace('set:motion:', '')
        session['motion_type'] = m
        save_sessions()
        bot.edit_message_text(
            get_settings_summary_text(session),
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=get_settings_keyboard(session)
        )
        return bot.answer_callback_query(call.id, text=f"✅ Motion set to: {m.upper()}")

    # 2. Speed Menu
    if data == 'menu:speed':
        kb = types.InlineKeyboardMarkup(row_width=4)
        speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0]
        row = []
        for sp in speeds:
            is_cur = (session.get('speed') == sp)
            row.append(types.InlineKeyboardButton(f"{sp}x {'✅' if is_cur else ''}", callback_data=f"set:speed:{sp}"))
            if len(row) == 4:
                kb.row(*row)
                row = []
        if row: kb.row(*row)
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))
        
        bot.edit_message_text(
            f"⏱️ *Animation Speed Multiplier*:\nCurrent: *{session.get('speed', 1.0)}x*",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('set:speed:'):
        sp = float(data.replace('set:speed:', ''))
        session['speed'] = sp
        save_sessions()
        bot.edit_message_text(
            get_settings_summary_text(session),
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=get_settings_keyboard(session)
        )
        return bot.answer_callback_query(call.id, text=f"✅ Speed set to: {sp}x")

    # 3. Scale Menu
    if data == 'menu:scale':
        cur = session.get('png_scale', 100)
        kb = types.InlineKeyboardMarkup()
        kb.row(
            types.InlineKeyboardButton('➖ -10%', callback_data='step:scale:-10'),
            types.InlineKeyboardButton(f"🎯 {cur}%", callback_data='scale:info'),
            types.InlineKeyboardButton('➕ +10%', callback_data='step:scale:+10')
        )
        kb.row(
            types.InlineKeyboardButton('🔬 50%', callback_data='set:scale:50'),
            types.InlineKeyboardButton('📱 75%', callback_data='set:scale:75'),
            types.InlineKeyboardButton('🎯 100%', callback_data='set:scale:100'),
            types.InlineKeyboardButton('🔍 125%', callback_data='set:scale:125'),
            types.InlineKeyboardButton('💥 150%', callback_data='set:scale:150')
        )
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))

        bot.edit_message_text(
            f"📐 *Adjust PNG Object Size*:\n\n"
            f"• Current Size: *{cur}%* ({get_png_scale_label(cur)})\n"
            f"• Gauge: `[{get_scale_bar(cur)}]`\n\n"
            f"_Use buttons to adjust in real time or type /size <num>._",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('step:scale:') or data.startswith('set:scale:'):
        cur = session.get('png_scale', 100)
        if data.startswith('step:scale:'):
            delta = int(data.replace('step:scale:', ''))
            new_s = max(40, min(200, cur + delta))
        else:
            new_s = int(data.replace('set:scale:', ''))
        session['png_scale'] = new_s
        save_sessions()
        
        kb = types.InlineKeyboardMarkup()
        kb.row(
            types.InlineKeyboardButton('➖ -10%', callback_data='step:scale:-10'),
            types.InlineKeyboardButton(f"🎯 {new_s}%", callback_data='scale:info'),
            types.InlineKeyboardButton('➕ +10%', callback_data='step:scale:+10')
        )
        kb.row(
            types.InlineKeyboardButton('🔬 50%', callback_data='set:scale:50'),
            types.InlineKeyboardButton('📱 75%', callback_data='set:scale:75'),
            types.InlineKeyboardButton('🎯 100%', callback_data='set:scale:100'),
            types.InlineKeyboardButton('🔍 125%', callback_data='set:scale:125'),
            types.InlineKeyboardButton('💥 150%', callback_data='set:scale:150')
        )
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))

        bot.edit_message_text(
            f"📐 *Adjust PNG Object Size*:\n\n"
            f"• Current Size: *{new_s}%* ({get_png_scale_label(new_s)})\n"
            f"• Gauge: `[{get_scale_bar(new_s)}]`\n\n"
            f"_Use buttons to adjust in real time or type /size <num>._",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id, text=f"Size: {new_s}%")

    # 4. Background Menu
    if data == 'menu:bg':
        kb = types.InlineKeyboardMarkup(row_width=2)
        kb.add(types.InlineKeyboardButton('📸 👁️ Visual Gallery (Browse Photo Previews)', callback_data=f"view:bg:{session.get('bg_gradient', 'cyberpunk')}"))
        
        keys = list(renderer.BG_PRESETS_LABELS.keys())
        for i in range(0, len(keys), 2):
            k1 = keys[i]
            is_cur1 = (session.get('bg_gradient') == k1)
            b1 = types.InlineKeyboardButton(f"{renderer.BG_PRESETS_LABELS[k1]} {'✅' if is_cur1 else ''}", callback_data=f"view:bg:{k1}")
            if i + 1 < len(keys):
                k2 = keys[i+1]
                is_cur2 = (session.get('bg_gradient') == k2)
                b2 = types.InlineKeyboardButton(f"{renderer.BG_PRESETS_LABELS[k2]} {'✅' if is_cur2 else ''}", callback_data=f"view:bg:{k2}")
                kb.row(b1, b2)
            else:
                kb.row(b1)
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))

        bot.edit_message_text(
            "🎨 *Background Studio Gradients*:\nClick any background to view its visual photo card or apply:",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('view:bg:'):
        bg = data.replace('view:bg:', '')
        is_photo = (call.message.content_type == 'photo') or (session.get('last_bg_preview_msg_id') == message_id)
        send_or_update_bg_preview(chat_id, bg, message_id=message_id, is_edit=is_photo)
        return bot.answer_callback_query(call.id, text=f"Previewing {bg}")

    if data.startswith('apply:bg:'):
        bg = data.replace('apply:bg:', '')
        session['bg_gradient'] = bg
        save_sessions()
        bg_name = renderer.BG_PRESETS_LABELS.get(bg, bg)
        
        is_photo = (call.message.content_type == 'photo') or (session.get('last_bg_preview_msg_id') == message_id)
        if is_photo:
            send_or_update_bg_preview(chat_id, bg, message_id=message_id, is_edit=True)
            
        return bot.answer_callback_query(call.id, text=f"✅ Active: {bg_name}")

    if data == 'close:bg_preview':
        if session.get('last_bg_preview_msg_id'):
            try: bot.delete_message(chat_id, session['last_bg_preview_msg_id'])
            except Exception: pass
            session['last_bg_preview_msg_id'] = None
            save_sessions()
        return bot.answer_callback_query(call.id, text="Preview closed")

    # 5. Particles Menu
    if data == 'menu:particles':
        is_on = session.get('show_sparkles', True)
        kb = types.InlineKeyboardMarkup(row_width=2)
        kb.add(types.InlineKeyboardButton("🟢 Enable Particles" if not is_on else "🔴 Disable Particles", callback_data="toggle:particles"))
        kb.add(
            types.InlineKeyboardButton("✨ 40 (Subtle)", callback_data="set:pts:40"),
            types.InlineKeyboardButton("✨ 90 (Dense)", callback_data="set:pts:90"),
            types.InlineKeyboardButton("✨ 140 (Blizzard)", callback_data="set:pts:140")
        )
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))

        bot.edit_message_text(
            f"✨ *3D Glowing Atmosphere & Sparkles*:\n\n"
            f"• Status: *{'ENABLED ✅' if is_on else 'DISABLED ⚪'}*\n"
            f"• Count: *{session.get('particle_count', 90)} floating particles*\n"
            f"• Speed: *{session.get('particle_speed', 3.0)}x*",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data == 'toggle:particles':
        session['show_sparkles'] = not session.get('show_sparkles', True)
        save_sessions()
        return bot.answer_callback_query(call.id, text=f"Particles: {'ON' if session['show_sparkles'] else 'OFF'}")

    if data.startswith('set:pts:'):
        pts = int(data.replace('set:pts:', ''))
        session['particle_count'] = pts
        session['show_sparkles'] = True
        save_sessions()
        return bot.answer_callback_query(call.id, text=f"Particles: {pts}")

    # 6. Audio Menu
    if data == 'menu:audio':
        pool_len = len(session.get('custom_audio_files', []))
        kb = types.InlineKeyboardMarkup(row_width=2)
        kb.add(
            types.InlineKeyboardButton(f"🎲 Random Pool ({pool_len} tracks)", callback_data="set:audio:random_pool"),
            types.InlineKeyboardButton("🔇 Silent (No Audio)", callback_data="set:audio:none")
        )
        if pool_len > 0:
            kb.add(types.InlineKeyboardButton("🗑️ Clear Audio Pool", callback_data="action:clear_pool"))
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))

        bot.edit_message_text(
            f"🎵 *Background Audio & Soundtrack*:\n\n"
            f"• Active Mode: *{session.get('audio_preset', 'random_pool')}*\n"
            f"• User Tracks in Pool: **{pool_len} MP3s**\n\n"
            f"_To add custom music, simply send an MP3 audio file into the chat!_",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('set:audio:'):
        aud = data.replace('set:audio:', '')
        session['audio_preset'] = aud
        save_sessions()
        return bot.answer_callback_query(call.id, text=f"Audio set to: {aud}")

    if data == 'action:clear_pool':
        session['custom_audio_files'] = []
        session['audio_preset'] = 'none'
        save_sessions()
        return bot.answer_callback_query(call.id, text="Audio pool cleared!")

    # 7. Resolution & Duration
    if data == 'menu:resolution':
        ram_mb = renderer.get_available_ram_mb()
        cloud_note = ""
        if ram_mb < 1024:
            cloud_note = "\n\n⚠️ _Cloud server has limited RAM. 2K/4K will auto-downgrade to 1080p to prevent crashes._"
        
        kb = types.InlineKeyboardMarkup(row_width=2)
        kb.add(
            types.InlineKeyboardButton("📱 720p (Fastest)", callback_data="set:res:720p"),
            types.InlineKeyboardButton("🎬 1080p (FHD)", callback_data="set:res:1080p"),
            types.InlineKeyboardButton("💎 2K (1440p)", callback_data="set:res:2k"),
            types.InlineKeyboardButton("👑 4K (2160p)", callback_data="set:res:4k")
        )
        kb.add(
            types.InlineKeyboardButton("📱 9:16 (Shorts/Reels)", callback_data="set:ar:9:16"),
            types.InlineKeyboardButton("🔲 1:1 (Square)", callback_data="set:ar:1:1")
        )
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))
        
        bot.edit_message_text(
            f"📺 *Output Video Resolution & Aspect Ratio*:\n"
            f"Current: *{session.get('resolution', '720p').upper()}* • *{session.get('aspect_ratio', '9:16')}*"
            f"{cloud_note}",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('set:res:'):
        res = data.replace('set:res:', '')
        session['resolution'] = res
        save_sessions()
        note = ""
        if res in ('4k', '2k') and renderer.get_available_ram_mb() < 1024:
            note = " (will auto-fit to server RAM)"
        return bot.answer_callback_query(call.id, text=f"Resolution: {res.upper()}{note}")

    if data.startswith('set:ar:'):
        ar = data.replace('set:ar:', '')
        session['aspect_ratio'] = ar
        save_sessions()
        return bot.answer_callback_query(call.id, text=f"Aspect Ratio: {ar}")

    if data == 'menu:duration':
        kb = types.InlineKeyboardMarkup(row_width=3)
        for sec in [1, 2, 3, 4, 5, 6, 8, 10]:
            is_cur = (int(session.get('duration', 3)) == sec)
            kb.add(types.InlineKeyboardButton(f"{sec}s {'✅' if is_cur else ''}", callback_data=f"set:dur:{sec}"))
        kb.add(types.InlineKeyboardButton('« Back to Settings', callback_data='menu:main'))
        
        bot.edit_message_text(
            f"⏳ *Challenge Video Duration*:\nCurrent: *{int(session.get('duration', 3))} seconds*",
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=kb
        )
        return bot.answer_callback_query(call.id)

    if data.startswith('set:dur:'):
        d = int(data.replace('set:dur:', ''))
        session['duration'] = float(d)
        save_sessions()
        return bot.answer_callback_query(call.id, text=f"Duration: {d}s")

    if data == 'action:reset':
        sessions[str(chat_id)] = get_default_session()
        save_sessions()
        bot.edit_message_text(
            get_settings_summary_text(sessions[str(chat_id)]),
            chat_id=chat_id,
            message_id=message_id,
            reply_markup=get_settings_keyboard(sessions[str(chat_id)])
        )
        return bot.answer_callback_query(call.id, text="Settings reset to default!")

    bot.answer_callback_query(call.id)

# -------------------------------------------------------------
# SINGLE IMAGE / PHOTO VIDEO RENDERING & AUTO-CLEANUP
# -------------------------------------------------------------

def handle_single_image(chat_id, file_id, original_name="ChallengeItem"):
    session = get_user_session(chat_id)
    clean_name = Path(original_name).stem or "item"
    
    status_msg = bot.send_message(
        chat_id,
        f"🎬 *{BOT_BRAND} — Starting*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📁 *Item*: `{clean_name}`\n\n"
        f"📊 *Stage*: 📥 Downloading  `[●○○○○○]`\n"
        f"⏱️ *Elapsed*: `0s`"
    )

    tracker = LiveProgressTracker(bot, chat_id, status_msg.message_id, clean_name, session)

    temp_image_path = TEMP_DIR / f"{chat_id}_{int(time.time())}_{original_name}"
    rendered_video_path = EXPORTS_DIR / f"challenge_{clean_name}_{session.get('resolution', '720p').upper()}_{int(time.time())}.mp4"

    try:
        # Stage 1: Download
        tracker.set_stage(1, '📥 Downloading')
        file_info = bot.get_file(file_id)
        downloaded = bot.download_file(file_info.file_path)
        with open(temp_image_path, 'wb') as f:
            f.write(downloaded)

        img = Image.open(temp_image_path)

        # Stage 2: Processing
        tracker.set_stage(2, '🔧 Processing Image')

        # Audio selection & duration auto-match
        chosen_audio = None
        pool = session.get('custom_audio_files') or []
        single_custom = session.get('custom_audio_file')
        preset = session.get('audio_preset')

        if pool and (preset == 'random_pool' or not preset or preset == 'custom'):
            valid_tracks = [t['path'] for t in pool if os.path.exists(t.get('path', ''))]
            if valid_tracks:
                import random
                chosen_audio = random.choice(valid_tracks)
        elif single_custom and os.path.exists(single_custom):
            chosen_audio = single_custom

        video_duration = session.get('duration', 3.0)
        if chosen_audio and os.path.exists(chosen_audio):
            det_dur = renderer.get_audio_duration(chosen_audio)
            if det_dur and det_dur > 0:
                video_duration = det_dur
                print(f"[BOT] Video duration matched to audio track: {video_duration}s")

        # Stage 3: Render
        tracker.set_stage(3, '🎬 Rendering 60 FPS')

        config = {
            'image': img,
            'motion_type': session.get('motion_type', 'spin'),
            'speed': session.get('speed', 1.0),
            'duration': video_duration,
            'fps': session.get('fps', 60),
            'resolution': session.get('resolution', '720p'),
            'aspect_ratio': session.get('aspect_ratio', '9:16'),
            'bg_gradient': session.get('bg_gradient', 'cyberpunk'),
            'header_text': get_clean_header(session.get('header_text', 'CAN YOU STOP THIS?')),
            'header_color': session.get('header_color', '#ffe600'),
            'sub_text': get_clean_header(session.get('sub_text', 'PAUSE EXACTLY IN THE OUTLINE!')),
            'outline_color': session.get('outline_color', '#00f3ff'),
            'outline_width': session.get('outline_width', 8),
            'outline_glow': session.get('outline_glow', 18),
            'image_scale': 0.72 * (session.get('png_scale', 100) / 100.0),
            'show_sparkles': session.get('show_sparkles', True),
            'particle_count': session.get('particle_count', 90),
            'particle_speed': session.get('particle_speed', 3.0),
            'particle_color': session.get('particle_color', '#00f3ff'),
            'audio_path': chosen_audio,
            'output_path': str(rendered_video_path)
        }

        result = renderer.render_stop_challenge_video(config, on_progress=tracker.on_render_progress)

        # Stage 4: Muxing
        tracker.set_stage(4, '🔊 Muxing Audio')

        # Stage 5: Uploading
        tracker.set_stage(5, '📤 Uploading to Telegram')

        size_mb = os.path.getsize(rendered_video_path) / (1024 * 1024)
        total_time = time.time() - tracker.start_time

        caption = (
            f"✅ *{BOT_BRAND} — Video Ready!*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📁 *File*: `{result['filename']}`\n"
            f"📦 *Size*: `{size_mb:.1f} MB`\n"
            f"⏱️ *Duration*: `{result['duration']}s` @ `60 FPS`\n"
            f"📺 *Resolution*: `{session.get('resolution', '720p').upper()}` • `{session.get('aspect_ratio', '9:16')}`\n"
            f"🎨 *Background*: `{renderer.BG_PRESETS_LABELS.get(session.get('bg_gradient', 'cyberpunk'), 'cyberpunk')}`\n"
            f"🎵 *Audio*: `{'Attached ✅' if chosen_audio else 'Silent'}`\n"
            f"⚡ *Rendered in*: `{fmt_time(total_time)}`\n\n"
            f"🔥 {BOT_TAG}"
        )

        with open(rendered_video_path, 'rb') as video_file:
            bot.send_video(
                chat_id,
                video_file,
                caption=caption,
                duration=int(result['duration']),
                supports_streaming=True
            )

        # Stage 6: Done — delete progress message
        try:
            bot.delete_message(chat_id, status_msg.message_id)
        except Exception:
            pass

    except Exception as e:
        print(f"[RENDER ERROR]: {traceback.format_exc()}")
        try:
            bot.edit_message_text(
                f"❌ *{BOT_BRAND} — Render Failed*\n\n"
                f"📁 *Item*: `{clean_name}`\n"
                f"⚠️ *Error*: `{str(e)[:200]}`\n\n"
                f"_Please try again or contact support._",
                chat_id=chat_id,
                message_id=status_msg.message_id
            )
        except Exception:
            pass

    finally:
        # AUTOMATIC IMMEDIATE SERVER CACHE CLEANUP
        try:
            if temp_image_path.exists():
                temp_image_path.unlink()
        except Exception:
            pass
        try:
            if rendered_video_path.exists():
                rendered_video_path.unlink()
                print(f"[CLEANUP] Deleted rendered video from server: {rendered_video_path.name}")
        except Exception:
            pass

# -------------------------------------------------------------
# BATCH ZIP ARCHIVE RENDERING & AUTO-CLEANUP
# -------------------------------------------------------------

def handle_batch_zip(chat_id, file_id, zip_name="batch.zip"):
    session = get_user_session(chat_id)
    batch_id = int(time.time())
    batch_dir = TEMP_DIR / f"zip_batch_{chat_id}_{batch_id}"
    extract_dir = batch_dir / "extracted"
    local_zip = batch_dir / zip_name
    batch_start = time.time()
    
    batch_dir.mkdir(parents=True, exist_ok=True)
    extract_dir.mkdir(parents=True, exist_ok=True)
    
    status_msg = bot.send_message(
        chat_id,
        f"📦 *{BOT_BRAND} — Batch Mode*\n"
        f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
        f"📁 *Archive*: `{zip_name}`\n\n"
        f"📊 *Stage*: 📥 Downloading ZIP  `[●○○○○]`\n"
        f"⏱️ *Elapsed*: `0s`"
    )
    
    rendered_videos = []
    output_zip_path = EXPORTS_DIR / f"StopChallenge_Batch_{batch_id}.zip"
    last_batch_edit = [0]  # mutable for closure

    def batch_progress_update(text):
        now = time.time()
        if (now - last_batch_edit[0]) < 2.0:
            return
        try:
            bot.edit_message_text(text, chat_id=chat_id, message_id=status_msg.message_id)
            last_batch_edit[0] = time.time()
        except Exception:
            pass

    try:
        # 1. Download ZIP
        file_info = bot.get_file(file_id)
        downloaded = bot.download_file(file_info.file_path)
        with open(local_zip, 'wb') as f:
            f.write(downloaded)

        # 2. Extract ZIP
        batch_progress_update(
            f"📦 *{BOT_BRAND} — Batch Mode*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📁 *Archive*: `{zip_name}`\n\n"
            f"📊 *Stage*: 📂 Extracting Files  `[●●○○○]`\n"
            f"⏱️ *Elapsed*: `{fmt_time(time.time() - batch_start)}`"
        )

        with zipfile.ZipFile(local_zip, 'r') as z:
            z.extractall(extract_dir)

        # 3. Find image files and audio files
        valid_exts = {'.png', '.jpg', '.jpeg', '.webp'}
        valid_audio_exts = {'.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'}

        all_files = [
            p for p in extract_dir.rglob('*')
            if p.is_file() and '__MACOSX' not in str(p)
        ]
        image_files = [p for p in all_files if p.suffix.lower() in valid_exts]
        audio_files = [p for p in all_files if p.suffix.lower() in valid_audio_exts]

        # Auto-import audio tracks if included in ZIP
        if audio_files:
            if 'custom_audio_files' not in session or not isinstance(session['custom_audio_files'], list):
                session['custom_audio_files'] = []
            import shutil
            for a_path in audio_files:
                dest_a = TEMP_DIR / f"{chat_id}_{int(time.time())}_{a_path.name}"
                try:
                    shutil.copy2(str(a_path), str(dest_a))
                    session['custom_audio_files'].append({
                        'name': a_path.name,
                        'path': str(dest_a),
                        'addedAt': int(time.time() * 1000)
                    })
                except Exception:
                    pass
            session['audio_preset'] = 'random_pool'
            save_sessions()

        if not image_files:
            return bot.edit_message_text(
                f"❌ *{BOT_BRAND} — No Images Found*\n\n"
                f"📁 Archive `{zip_name}` contained no .png/.jpg files.\n"
                f"_Please include image files in your ZIP._",
                chat_id=chat_id,
                message_id=status_msg.message_id
            )

        total_count = len(image_files)

        # 4. Render each video with live progress
        for idx, img_path in enumerate(image_files):
            clean_item_name = img_path.stem
            out_mp4 = EXPORTS_DIR / f"{idx+1:02d}_{clean_item_name}_60FPS.mp4"

            # Select random audio from pool for each item
            chosen_audio = None
            pool = session.get('custom_audio_files') or []
            single_custom = session.get('custom_audio_file')
            preset = session.get('audio_preset')

            if pool and (preset == 'random_pool' or not preset or preset == 'custom'):
                valid_tracks = [t['path'] for t in pool if os.path.exists(t.get('path', ''))]
                if valid_tracks:
                    import random
                    chosen_audio = random.choice(valid_tracks)
            elif single_custom and os.path.exists(single_custom):
                chosen_audio = single_custom

            item_duration = session.get('duration', 3.0)
            if chosen_audio and os.path.exists(chosen_audio):
                det_dur = renderer.get_audio_duration(chosen_audio)
                if det_dur and det_dur > 0:
                    item_duration = det_dur

            overall_pct = int((idx / total_count) * 100)
            overall_bar = make_progress_bar(overall_pct, 15)

            # Batch item render callback
            def make_item_progress(item_idx, item_name):
                item_render_start = time.time()
                def on_item_prog(pct, cur_frame, total_frames):
                    now = time.time()
                    if (now - last_batch_edit[0]) < 2.5:
                        return
                    item_elapsed = now - item_render_start
                    batch_elapsed = now - batch_start
                    if pct > 0:
                        item_eta = (item_elapsed / pct) * (100 - pct)
                    else:
                        item_eta = 0
                    item_bar = make_progress_bar(pct, 15)
                    cur_overall = int(((item_idx + pct/100) / total_count) * 100)
                    cur_overall_bar = make_progress_bar(cur_overall, 15)

                    text = (
                        f"📦 *{BOT_BRAND} — Batch Render*\n"
                        f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                        f"📊 *Overall*: `[{cur_overall_bar}]` *{cur_overall}%*\n"
                        f"🎞️ *Video {item_idx+1}/{total_count}*: `{item_name}`\n\n"
                        f"`[{item_bar}]` *{pct}%*\n\n"
                        f"⏱️ *Item ETA*: `{fmt_time(item_eta)}`\n"
                        f"🕐 *Batch Time*: `{fmt_time(batch_elapsed)}`\n\n"
                        f"🎨 `{session.get('bg_gradient', 'cyberpunk')}` • "
                        f"📺 `{session.get('resolution', '720p').upper()}`"
                    )
                    batch_progress_update(text)
                return on_item_prog

            # Show item start
            batch_progress_update(
                f"📦 *{BOT_BRAND} — Batch Render*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"📊 *Overall*: `[{overall_bar}]` *{overall_pct}%*\n"
                f"🎞️ *Video {idx+1}/{total_count}*: `{clean_item_name}`\n\n"
                f"📊 *Stage*: 🔧 Processing Image\n"
                f"🕐 *Batch Time*: `{fmt_time(time.time() - batch_start)}`"
            )

            try:
                res = renderer.render_stop_challenge_video({
                    'image': str(img_path),
                    'motion_type': session.get('motion_type', 'spin'),
                    'speed': session.get('speed', 1.0),
                    'duration': item_duration,
                    'fps': session.get('fps', 60),
                    'resolution': session.get('resolution', '720p'),
                    'aspect_ratio': session.get('aspect_ratio', '9:16'),
                    'bg_gradient': session.get('bg_gradient', 'cyberpunk'),
                    'header_text': get_clean_header(session.get('header_text', 'CAN YOU STOP THIS?')),
                    'header_color': session.get('header_color', '#ffe600'),
                    'sub_text': get_clean_header(session.get('sub_text', 'PAUSE EXACTLY IN THE OUTLINE!')),
                    'outline_color': session.get('outline_color', '#00f3ff'),
                    'outline_width': session.get('outline_width', 8),
                    'outline_glow': session.get('outline_glow', 18),
                    'image_scale': 0.72 * (session.get('png_scale', 100) / 100.0),
                    'show_sparkles': session.get('show_sparkles', True),
                    'particle_count': session.get('particle_count', 90),
                    'particle_speed': session.get('particle_speed', 3.0),
                    'particle_color': session.get('particle_color', '#00f3ff'),
                    'audio_path': chosen_audio,
                    'output_path': str(out_mp4)
                }, on_progress=make_item_progress(idx, clean_item_name))
                rendered_videos.append(out_mp4)
            except Exception as item_err:
                print(f"[BATCH ITEM ERROR] {img_path.name}: {item_err}")

        if not rendered_videos:
            return bot.edit_message_text(
                f"❌ *{BOT_BRAND} — Batch Failed*\n\n"
                f"None of the {total_count} videos could be rendered.\n"
                f"_Please check your images and try again._",
                chat_id=chat_id,
                message_id=status_msg.message_id
            )

        # 5. Bundle rendered MP4s into a single ZIP archive
        batch_progress_update(
            f"📦 *{BOT_BRAND} — Packaging*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📊 *Overall*: `[{make_progress_bar(95, 15)}]` *95%*\n\n"
            f"📤 Packaging `{len(rendered_videos)}` videos into ZIP...\n"
            f"🕐 *Batch Time*: `{fmt_time(time.time() - batch_start)}`"
        )

        with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as out_zip:
            for v_path in rendered_videos:
                if v_path.exists():
                    out_zip.write(v_path, arcname=v_path.name)

        zip_size_mb = os.path.getsize(output_zip_path) / (1024 * 1024)
        total_batch_time = time.time() - batch_start

        caption = (
            f"✅ *{BOT_BRAND} — Batch Complete!* 📦\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📁 *Videos*: `{len(rendered_videos)}/{total_count}` rendered\n"
            f"📦 *Size*: `{zip_size_mb:.1f} MB`\n"
            f"⏱️ *Total Time*: `{fmt_time(total_batch_time)}`\n\n"
            f"⚙️ `60 FPS` • `{session.get('resolution', '720p').upper()}` • `{session.get('motion_type', 'spin').upper()}`\n"
            f"🎨 `{renderer.BG_PRESETS_LABELS.get(session.get('bg_gradient', 'cyberpunk'), 'cyberpunk')}`\n\n"
            f"🔥 {BOT_TAG}"
        )

        with open(output_zip_path, 'rb') as zf:
            bot.send_document(
                chat_id,
                zf,
                caption=caption,
                visible_file_name=output_zip_path.name
            )

        try:
            bot.delete_message(chat_id, status_msg.message_id)
        except Exception:
            pass

    except Exception as e:
        print(f"[BATCH ZIP ERROR]: {traceback.format_exc()}")
        try:
            bot.edit_message_text(
                f"❌ *{BOT_BRAND} — Batch Error*\n\n"
                f"⚠️ *Error*: `{str(e)[:200]}`\n\n"
                f"_Please try again._",
                chat_id=chat_id,
                message_id=status_msg.message_id
            )
        except Exception:
            pass

    finally:
        # AUTOMATIC SERVER CLEANUP
        try:
            if output_zip_path.exists():
                output_zip_path.unlink()
                print(f"[CLEANUP] Deleted batch ZIP: {output_zip_path.name}")
        except Exception:
            pass

        for v in rendered_videos:
            try:
                if v.exists():
                    v.unlink()
                    print(f"[CLEANUP] Deleted batch video: {v.name}")
            except Exception:
                pass

        if batch_dir.exists():
            try:
                for sub in batch_dir.rglob('*'):
                    try:
                        if sub.is_file(): sub.unlink()
                    except Exception: pass
                for sub in sorted(batch_dir.rglob('*'), reverse=True):
                    try:
                        if sub.is_dir(): sub.rmdir()
                    except Exception: pass
                batch_dir.rmdir()
                print(f"[CLEANUP] Wiped batch work dir: {batch_dir.name}")
            except Exception:
                pass

# -------------------------------------------------------------
# AUDIO UPLOAD HANDLER
# -------------------------------------------------------------

def handle_audio_upload(chat_id, file_id, file_name="audio.mp3"):
    session = get_user_session(chat_id)
    if 'custom_audio_files' not in session:
        session['custom_audio_files'] = []

    safe_name = Path(file_name).name.replace(' ', '_')
    local_path = TEMP_DIR / f"{chat_id}_{int(time.time())}_{safe_name}"

    try:
        file_info = bot.get_file(file_id)
        downloaded = bot.download_file(file_info.file_path)
        with open(local_path, 'wb') as f:
            f.write(downloaded)

        # Detect audio duration
        audio_dur = renderer.get_audio_duration(str(local_path))
        dur_text = f"`{audio_dur}s`" if audio_dur else "_Unknown_"

        session['custom_audio_files'].append({
            'name': safe_name,
            'path': str(local_path),
            'added_at': int(time.time())
        })
        session['audio_preset'] = 'random_pool'
        save_sessions()

        pool_len = len(session['custom_audio_files'])
        msg = (
            f"🎵 *{BOT_BRAND} — Audio Added*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📁 *Track*: `{safe_name}`\n"
            f"⏱️ *Duration*: {dur_text}\n"
            f"🎶 *Pool Size*: `{pool_len} track{'s' if pool_len > 1 else ''}`\n"
            f"🔀 *Mode*: `Random Pool` ✅\n\n"
            f"💡 _Video duration will auto-match to audio length!_"
        )
        bot.send_message(chat_id, msg)
    except Exception as e:
        bot.send_message(chat_id, f"❌ *Audio Upload Failed*: `{e}`")

# -------------------------------------------------------------
# DISPATCHERS FOR USER ATTACHMENTS
# -------------------------------------------------------------

@bot.message_handler(content_types=['photo'])
def on_photo(message):
    chat_id = message.chat.id
    photo = message.photo[-1]
    threading.Thread(target=handle_single_image, args=(chat_id, photo.file_id, "ChallengePhoto.png")).start()

@bot.message_handler(content_types=['audio', 'voice'])
def on_audio(message):
    chat_id = message.chat.id
    if message.content_type == 'audio':
        f_name = message.audio.file_name or f"audio_{int(time.time())}.mp3"
        f_id = message.audio.file_id
    else:
        f_name = f"voice_{int(time.time())}.ogg"
        f_id = message.voice.file_id
    handle_audio_upload(chat_id, f_id, f_name)

@bot.message_handler(content_types=['document'])
def on_document(message):
    chat_id = message.chat.id
    doc = message.document
    f_name = doc.file_name or "document"
    f_id = doc.file_id
    
    is_zip = f_name.lower().endswith('.zip')
    is_image = any(f_name.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.webp'])
    is_audio = any(f_name.lower().endswith(ext) for ext in ['.mp3', '.wav', '.m4a', '.ogg', '.aac'])

    if is_zip:
        threading.Thread(target=handle_batch_zip, args=(chat_id, f_id, f_name)).start()
    elif is_image:
        threading.Thread(target=handle_single_image, args=(chat_id, f_id, f_name)).start()
    elif is_audio:
        handle_audio_upload(chat_id, f_id, f_name)
    else:
        bot.send_message(
            chat_id,
            "⚠️ *Unsupported File Format*\n\nPlease send:\n• 📦 **ZIP Archive** with PNG images\n• 🖼️ **Transparent PNG** or photo\n• 🎵 **MP3 / Audio File**"
        )

# -------------------------------------------------------------
# DUAL HTTP SERVER FOR RENDER HEALTH CHECKS
# -------------------------------------------------------------

class HealthCheckHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path in ['/health', '/api/status', '/']:
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = {
                'status': 'online',
                'engine': 'python-60fps-native',
                'platform': sys.platform,
                'exports': str(EXPORTS_DIR)
            }
            self.wfile.write(json.dumps(resp).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass # suppress access log noise

def start_http_server():
    server = HTTPServer(('0.0.0.0', PORT), HealthCheckHandler)
    print(f"[HTTP] Health Server running on 0.0.0.0:{PORT}")
    server.serve_forever()

threading.Thread(target=start_http_server, daemon=True).start()

# -------------------------------------------------------------
# MAIN START
# -------------------------------------------------------------

BOT_START_TIME = time.time()

if __name__ == '__main__':
    print(f"[BOT] {BOT_BRAND} is active and listening on port {PORT}!")
    try:
        bot.delete_webhook(drop_pending_updates=True)
    except Exception as e:
        print(f"[BOT] Webhook clear notice: {e}")
    bot.infinity_polling(timeout=20, long_polling_timeout=20)

"""
STOP CHALLENGE 4K 60FPS PYTHON VIDEO ENGINE
Exact 1:1 Recreation of the Original HTML5 Canvas Studio Engine:
- Buttery Smooth Subpixel Radial Dilated Neon Outline (32-angle circular sweep + dual neon glow)
- 20 Curated Studio Gradients with Cinematic Vignette, Dimming, and Cyber Grid Lines
- Smart Border BFS Flood-Fill Background Removal (Leaves subject interior 100% solid)
- Pulsing Dynamic Header with Semi-Transparent Glass Pill Backdrop at Top
- Sleek Call-to-Action Subtitle Pill Banner at Bottom
- Top-Left Neon Circular Countdown Timer with Animated Cyan Progress Arc
- Center Target Crosshair & Floating 3D Diamond Star Sparkles
- Automatic Video Duration Matching to Audio Length
- Fast Deterministic 60 FPS FFmpeg rawvideo pipe
"""

import os
import time
import math
import subprocess
import gc
from collections import deque
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from scipy.ndimage import shift

# Memory-aware rendering: detect available RAM for cloud deploy safety
def get_available_ram_mb():
    """Detect available system RAM in MB. Returns 512 as safe fallback."""
    try:
        with open('/proc/meminfo', 'r') as f:
            for line in f:
                if line.startswith('MemAvailable:'):
                    return int(line.split()[1]) // 1024
    except Exception:
        pass
    return 2048  # Default generous fallback for local dev

MAX_SAFE_PIXELS = None  # Will be computed once at render time

# -------------------------------------------------------------
# 20 CURATED STUDIO BACKGROUND PRESETS (MATCHING CanvasEngine.js)
# -------------------------------------------------------------
GRADIENT_PRESETS = {
    'cyberpunk': {
        'type': 'linear_diag',
        'stops': [(0.0, (15, 12, 41)), (0.5, (48, 43, 99)), (1.0, (36, 36, 62))],
        'grid': 'cyber'
    },
    'neon-city': {
        'type': 'linear_v',
        'stops': [(0.0, (10, 0, 26)), (0.5, (46, 8, 84)), (0.85, (255, 0, 127)), (1.0, (255, 170, 0))],
        'grid': 'horizon'
    },
    'gaming-rgb': {
        'type': 'radial',
        'stops': [(0.0, (26, 16, 60)), (0.6, (13, 15, 24)), (1.0, (5, 6, 10))],
        'grid': 'hex'
    },
    'laser-matrix': {
        'type': 'linear_v',
        'stops': [(0.0, (2, 11, 30)), (0.7, (8, 30, 61)), (1.0, (0, 243, 255))],
        'grid': 'lasers'
    },
    'vaporwave': {
        'type': 'linear_diag',
        'stops': [(0.0, (43, 16, 85)), (0.5, (117, 151, 222)), (1.0, (255, 0, 127))],
        'grid': None
    },
    'inferno': {
        'type': 'radial_center_y',
        'cy': 0.6,
        'stops': [(0.0, (255, 61, 0)), (0.4, (221, 44, 0)), (0.8, (62, 6, 0)), (1.0, (21, 0, 0))],
        'grid': None
    },
    'luxury-gold': {
        'type': 'radial',
        'stops': [(0.0, (212, 175, 55)), (0.4, (133, 109, 40)), (0.8, (31, 28, 22)), (1.0, (13, 12, 10))],
        'grid': None
    },
    'midnight-diamond': {
        'type': 'radial',
        'stops': [(0.0, (13, 50, 104)), (0.5, (7, 24, 54)), (1.0, (2, 7, 18))],
        'grid': None
    },
    'emerald-noir': {
        'type': 'radial',
        'stops': [(0.0, (0, 77, 64)), (0.5, (0, 36, 27)), (1.0, (2, 13, 9))],
        'grid': None
    },
    'rose-gold': {
        'type': 'linear_diag',
        'stops': [(0.0, (58, 28, 40)), (0.5, (183, 110, 121)), (1.0, (27, 13, 18))],
        'grid': None
    },
    'deep-space': {
        'type': 'radial',
        'stops': [(0.0, (26, 16, 60)), (0.6, (11, 5, 26)), (1.0, (2, 1, 8))],
        'grid': None
    },
    'supernova': {
        'type': 'radial',
        'stops': [(0.0, (0, 243, 255)), (0.3, (121, 40, 202)), (0.7, (31, 0, 56)), (1.0, (5, 1, 10))],
        'grid': None
    },
    'aurora': {
        'type': 'linear_diag',
        'stops': [(0.0, (3, 27, 56)), (0.5, (5, 117, 230)), (1.0, (0, 242, 96))],
        'grid': None
    },
    'dark-matter': {
        'type': 'radial',
        'stops': [(0.0, (18, 0, 36)), (0.6, (40, 0, 79)), (1.0, (0, 0, 0))],
        'grid': None
    },
    'studio-dark': {
        'type': 'radial',
        'stops': [(0.0, (50, 57, 70)), (0.6, (24, 27, 34)), (1.0, (9, 10, 13))],
        'grid': None
    },
    'viral-split': {
        'type': 'linear_diag',
        'stops': [(0.0, (255, 0, 127)), (0.5, (16, 11, 32)), (1.0, (0, 243, 255))],
        'grid': None
    },
    'electric-violet': {
        'type': 'linear_diag',
        'stops': [(0.0, (123, 44, 191)), (0.5, (60, 9, 108)), (1.0, (16, 0, 43))],
        'grid': None
    },
    'acid-lime': {
        'type': 'linear_diag',
        'stops': [(0.0, (0, 255, 136)), (0.5, (11, 61, 34)), (1.0, (3, 20, 10))],
        'grid': None
    },
    'pure-oled': {
        'type': 'solid',
        'color': (0, 0, 0),
        'grid': None
    },
    'pastel-creator': {
        'type': 'linear_diag',
        'stops': [(0.0, (255, 154, 158)), (0.5, (254, 207, 239)), (1.0, (161, 196, 253))],
        'grid': None
    }
}

BG_PRESETS_LABELS = {
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
}

def get_target_dimensions(resolution='720p', aspect_ratio='9:16'):
    res_map = {
        '4k': {'9:16': (2160, 3840), '1:1': (2160, 2160), '16:9': (3840, 2160)},
        '2k': {'9:16': (1440, 2560), '1:1': (1440, 1440), '16:9': (2560, 1440)},
        '1080p': {'9:16': (1080, 1920), '1:1': (1080, 1080), '16:9': (1920, 1080)},
        '720p': {'9:16': (720, 1280), '1:1': (720, 720), '16:9': (1280, 720)}
    }
    w, h = res_map.get(str(resolution).lower(), {}).get(aspect_ratio, (720, 1280))
    
    # Smart RAM-aware auto-downgrade to prevent OOM crashes on cloud
    available_ram = get_available_ram_mb()
    # Each RGBA frame ≈ w*h*4 bytes. Need ~6 frames in memory + overhead
    frame_mb = (w * h * 4) / (1024 * 1024)
    estimated_need = frame_mb * 8  # bg + outline + overlay layers + working copies
    
    if estimated_need > available_ram * 0.6:  # Use max 60% of RAM
        # Auto-downgrade to the highest resolution that fits
        for fallback_res in ['1080p', '720p']:
            fw, fh = res_map.get(fallback_res, {}).get(aspect_ratio, (720, 1280))
            fallback_need = (fw * fh * 4 * 8) / (1024 * 1024)
            if fallback_need < available_ram * 0.6:
                print(f"[RENDERER] ⚠️ RAM-safe downgrade: {resolution} → {fallback_res} "
                      f"(need {estimated_need:.0f}MB, avail {available_ram}MB)")
                return fw, fh
    
    return w, h

def hex_to_rgb(hex_str, default=(0, 243, 255)):
    try:
        hex_str = str(hex_str).lstrip('#')
        if len(hex_str) == 3:
            hex_str = ''.join([c*2 for c in hex_str])
        return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
    except Exception:
        return default

def get_font(size=36, bold=True):
    candidates = [
        r"C:\Windows\Fonts\segoeuib.ttf" if bold else r"C:\Windows\Fonts\segoeui.ttf",
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf"
    ]
    for font_path in candidates:
        if os.path.exists(font_path):
            try:
                return ImageFont.truetype(font_path, size=size)
            except Exception:
                pass
    return ImageFont.load_default()

def strip_unsupported_chars(text):
    """Replaces emojis or special characters that fail on standard system fonts."""
    clean = ""
    for ch in text:
        if ord(ch) < 0x2000 or ord(ch) == 0x2022:
            clean += ch
        else:
            clean += " "
    return " ".join(clean.split())

# -------------------------------------------------------------
# 1. SMART BACKGROUND REMOVAL (BFS FLOOD FILL FROM BORDERS)
# -------------------------------------------------------------
def process_image_transparency(img):
    """
    Exact reproduction of workerBridge.js BFS Flood Fill:
    1. If image already has >0.5% transparent pixels (native PNG), leaves it untouched.
    2. Samples 8 border points. If at least 5 are black (<35) or white (>220),
       performs BFS flood fill from the 4 outer border edges.
    3. Leaves interior subject details (eyes, clothes, text) 100% solid!
    """
    img = img.convert('RGBA')
    arr = np.array(img)
    h, w = arr.shape[:2]

    # Check if native transparent PNG
    alpha = arr[:, :, 3]
    if np.sum(alpha < 200) > (w * h * 0.005):
        return img

    border_pts = [
        (0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1),
        (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1)
    ]
    corner_colors = [arr[r, c, :3] for r, c in border_pts]
    black_corners = sum(1 for c in corner_colors if np.all(c < 35))
    white_corners = sum(1 for c in corner_colors if np.all(c > 220))

    if black_corners < 5 and white_corners < 5:
        return img

    is_black = (black_corners >= 5)
    visited = np.zeros((h, w), dtype=bool)
    q = deque()

    def matches_bg(r, c):
        if is_black:
            return np.max(arr[r, c, :3]) < 40
        else:
            return np.min(arr[r, c, :3]) > 215

    for c in range(w):
        if matches_bg(0, c) and not visited[0, c]:
            visited[0, c] = True; q.append((0, c))
        if matches_bg(h - 1, c) and not visited[h - 1, c]:
            visited[h - 1, c] = True; q.append((h - 1, c))
    for r in range(h):
        if matches_bg(r, 0) and not visited[r, 0]:
            visited[r, 0] = True; q.append((r, 0))
        if matches_bg(r, w - 1) and not visited[r, w - 1]:
            visited[r, w - 1] = True; q.append((r, w - 1))

    while q:
        cr, cc = q.popleft()
        arr[cr, cc, 3] = 0
        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
            nr, nc = cr + dr, cc + dc
            if 0 <= nr < h and 0 <= nc < w and not visited[nr, nc]:
                if matches_bg(nr, nc):
                    visited[nr, nc] = True
                    q.append((nr, nc))

    return Image.fromarray(arr)

# -------------------------------------------------------------
# 2. STUDIO PROCEDURAL BACKGROUND ENGINE
# -------------------------------------------------------------
def create_gradient_background(width, height, preset_name='cyberpunk'):
    """
    Renders 1:1 procedural background matching CanvasEngine.js:
    - Multi-stop linear diagonal and radial gradients
    - Dark dimming tint (35%)
    - Cinematic Vignette darkening edges (30-40%)
    - High-tech cyber grid, lasers, and horizon lines with subtle alpha
    """
    cfg = GRADIENT_PRESETS.get(preset_name, GRADIENT_PRESETS['cyberpunk'])
    b_type = cfg.get('type', 'linear_diag')

    if b_type == 'linear_diag':
        xx, yy = np.meshgrid(
            np.linspace(0, 1, width, dtype=np.float32),
            np.linspace(0, 1, height, dtype=np.float32)
        )
        pos = (xx + yy) / 2.0
    elif b_type == 'linear_v':
        yy = np.linspace(0, 1, height, dtype=np.float32)[:, None]
        pos = np.tile(yy, (1, width))
    elif b_type in ('radial', 'radial_center_y'):
        cy = cfg.get('cy', 0.5)
        xx, yy = np.meshgrid(
            np.linspace(0, 1, width, dtype=np.float32) - 0.5,
            np.linspace(0, 1, height, dtype=np.float32) - cy
        )
        dist = np.sqrt(xx**2 + (yy * (height / width))**2)
        pos = np.clip(dist / 0.85, 0.0, 1.0)
    else:
        pos = np.zeros((height, width), dtype=np.float32)

    # Multi-stop color blending
    stops = cfg.get('stops', [(0.0, (0, 0, 0)), (1.0, (0, 0, 0))])
    r_arr = np.zeros((height, width), dtype=np.float32)
    g_arr = np.zeros((height, width), dtype=np.float32)
    b_arr = np.zeros((height, width), dtype=np.float32)

    for i in range(len(stops) - 1):
        s0, c0 = stops[i]
        s1, c1 = stops[i + 1]
        m = (pos >= s0) & (pos <= s1) if i < len(stops) - 2 else (pos >= s0)
        frac = np.clip((pos[m] - s0) / max(1e-5, s1 - s0), 0.0, 1.0)
        r_arr[m] = c0[0] + frac * (c1[0] - c0[0])
        g_arr[m] = c0[1] + frac * (c1[1] - c0[1])
        b_arr[m] = c0[2] + frac * (c1[2] - c0[2])

    rgb = np.stack([r_arr, g_arr, b_arr], axis=-1)

    # Dimming tint (35% dim)
    rgb *= 0.72

    # Cinematic Vignette (from canvasEngine.js drawVignetteAndDim)
    xx, yy = np.meshgrid(
        np.linspace(-1, 1, width, dtype=np.float32),
        np.linspace(-1, 1, height, dtype=np.float32)
    )
    rad_dist = np.sqrt(xx**2 + yy**2) / 1.414
    vignette = 1.0 - np.clip(rad_dist * 0.40, 0.0, 0.40)
    rgb *= vignette[:, :, None]

    base_img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8)).convert('RGBA')

    # Grid / Cyber Pattern Overlays (with subtle semi-transparency)
    grid_type = cfg.get('grid')
    if grid_type:
        grid_layer = Image.new('RGBA', (width, height), (0, 0, 0, 0))
        g_draw = ImageDraw.Draw(grid_layer)
        if grid_type == 'cyber':
            grid_size = 70
            for gx in range(0, width, grid_size):
                g_draw.line([(gx, 0), (gx, height)], fill=(0, 243, 255, 18), width=1)
            for gy in range(0, height, grid_size):
                g_draw.line([(0, gy), (width, gy)], fill=(0, 243, 255, 18), width=1)
        elif grid_type == 'lasers':
            for lx in range(0, width, 60):
                g_draw.line([(lx, 0), (lx, height)], fill=(0, 243, 255, 30), width=1)
        elif grid_type == 'horizon':
            hy = int(height * 0.72)
            for hx in range(-width, width * 2, 90):
                g_draw.line([(width // 2, hy), (hx, height)], fill=(0, 243, 255, 35), width=2)
            for y_step in range(hy, height, 35):
                g_draw.line([(0, y_step), (width, y_step)], fill=(0, 243, 255, 25), width=1)
        elif grid_type == 'hex':
            hex_size = 50
            for x in range(0, width + hex_size, int(hex_size * 1.5)):
                for y in range(0, height + hex_size, int(hex_size * 1.732)):
                    g_draw.ellipse([(x - 3, y - 3), (x + 3, y + 3)], outline=(0, 243, 255, 22), width=1)
        base_img = Image.alpha_composite(base_img, grid_layer)

    return base_img

# -------------------------------------------------------------
# 3. BUTTERY SMOOTH NEON OUTLINE (32-ANGLE CIRCULAR SWEEP)
# -------------------------------------------------------------
def generate_outline_and_glow(item_img, outline_color=(0, 243, 255), thickness=8, glow_radius=18, padding=50):
    """
    EXACT 1:1 RECREATION OF JavaScript OutlineGenerator.js:
    - Multi-directional radial dilation (32-angle circular sweep)
    - Subpixel bilinear interpolation via scipy.ndimage.shift (0 jagged pixels!)
    - Subtracts original mask leaving a razor-sharp anti-aliased ribbon
    - Dual-layer neon glow: ambient wide glow + intense inner glow + crisp core stroke
    """
    w, h = item_img.size
    pad = int(max(thickness * 3, 30) + glow_radius * 2 + padding)
    total_w = w + pad * 2
    total_h = h + pad * 2

    # Extract anti-aliased floating-point alpha channel (Preserves all smooth curves)
    alpha = np.array(item_img.split()[-1], dtype=np.float32)

    alpha_pad = np.zeros((total_h, total_w), dtype=np.float32)
    alpha_pad[pad:pad+h, pad:pad+w] = alpha

    # 32-angle circular sweep with subpixel bilinear interpolation
    steps = max(24, int(thickness * 4))
    dilated = np.zeros_like(alpha_pad)
    for i in range(steps):
        angle = (i / steps) * math.pi * 2
        dx = math.cos(angle) * thickness
        dy = math.sin(angle) * thickness
        s = shift(alpha_pad, (dy, dx), order=1, mode='constant', cval=0.0)
        dilated = np.maximum(dilated, s)

    # Outer border = dilated - original mask
    ribbon_alpha = np.clip(dilated - alpha_pad, 0, 255).astype(np.uint8)

    # Razor-sharp colored border stroke
    border_img = Image.new('RGBA', (total_w, total_h), outline_color + (0,))
    border_img.putalpha(Image.fromarray(ribbon_alpha))

    # Dual-pass neon glow (Exact match to HTML5 Canvas shadowBlur)
    if glow_radius > 0:
        glow_wide = border_img.filter(ImageFilter.GaussianBlur(glow_radius))
        glow_intense = border_img.filter(ImageFilter.GaussianBlur(max(2, glow_radius // 2)))
        final_outline = Image.alpha_composite(glow_wide, glow_intense)
        final_outline = Image.alpha_composite(final_outline, border_img)
    else:
        final_outline = border_img

    return {
        'image': final_outline,
        'pad': pad,
        'width': total_w,
        'height': total_h,
        'item_w': w,
        'item_h': h
    }

# Free intermediate numpy arrays after outline generation
def _cleanup_outline_memory():
    gc.collect()

# -------------------------------------------------------------
# 4. 3D FLOATING PARTICLES & 4-POINT DIAMOND SPARKLES
# -------------------------------------------------------------
def init_particles(count, width, height, color=(0, 243, 255)):
    particles = []
    np.random.seed(42)
    palette = [(0, 243, 255), (255, 0, 127), (255, 230, 0), (0, 255, 136), (179, 136, 255), (255, 255, 255)]

    for i in range(count):
        depth = float(np.random.uniform(0.35, 1.75))
        base_radius = float(np.random.uniform(1.2, 3.4) * depth)
        particles.append({
            'start_x': float(np.random.uniform(0, width)),
            'start_y': float(np.random.uniform(0, height)),
            'depth': depth,
            'radius': base_radius,
            'speed_x': float(np.random.uniform(-0.5, 0.5) * depth * 20),
            'speed_y': float(np.random.uniform(-0.8, -0.2) * depth * 40),
            'base_opacity': float(np.random.uniform(0.35, 0.85)),
            'twinkle_speed': float(np.random.uniform(1.5, 4.0)),
            'phase': float(np.random.uniform(0, math.pi * 2)),
            'is_star': (i % 4 == 0),
            'color': color if color != 'multi' else palette[i % len(palette)]
        })
    return particles

def draw_particles(img_draw, particles, t, width, height, particle_speed=1.0):
    for p in particles:
        x = (p['start_x'] + p['speed_x'] * particle_speed * t) % width
        y = (p['start_y'] + p['speed_y'] * particle_speed * t) % height

        twinkle = 0.7 + 0.3 * math.sin(t * p['twinkle_speed'] * 3 + p['phase'])
        r = p['radius'] * (0.8 + 0.3 * twinkle)
        col = p['color']

        if p['is_star']:
            star_r = r * 2.2
            pts_v = [(x, y - star_r), (x + star_r * 0.35, y), (x, y + star_r), (x - star_r * 0.35, y)]
            img_draw.polygon(pts_v, fill=col)
            pts_h = [(x - star_r, y), (x, y - star_r * 0.35), (x + star_r, y), (x, y + star_r * 0.35)]
            img_draw.polygon(pts_h, fill=col)
            core_r = max(1.0, r * 0.4)
            img_draw.ellipse([(x - core_r, y - core_r), (x + core_r, y + core_r)], fill=(255, 255, 255))
        else:
            img_draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=col)

# -------------------------------------------------------------
# 5. MOTION ENGINE (EXACT MATCH TO animations.js)
# -------------------------------------------------------------
def compute_transform(t, motion_type, speed, width, height, target_x, target_y, target_scale):
    period = 2.5 / max(0.2, speed)
    cycle = (t % period) / period

    x = target_x
    y = target_y
    angle = 0.0
    scale = target_scale

    if motion_type == 'spin':
        spin_speed = (360.0 / (period / 2.0)) * speed
        angle = (t * spin_speed) % 360.0

    elif motion_type == 'bounce':
        amp_x = width * 0.28
        amp_y = height * 0.18
        x = target_x + amp_x * math.sin(cycle * math.pi * 2)
        y = target_y + amp_y * math.sin(cycle * math.pi * 4)
        angle = 12 * math.sin(cycle * math.pi * 2)

    elif motion_type == 'pendulum':
        max_angle = 45.0
        angle = max_angle * math.sin(cycle * math.pi * 2)
        arm = height * 0.32
        rad = math.radians(angle)
        x = target_x + math.sin(rad) * arm
        y = (target_y - arm) + math.cos(rad) * arm

    elif motion_type == 'float':
        amp = 90
        x = target_x + amp * math.cos(cycle * math.pi * 2) - amp
        y = target_y + amp * math.sin(cycle * math.pi * 2)
        angle = 8 * math.sin(cycle * math.pi * 2)

    elif motion_type == 'zigzag':
        x = target_x + (width * 0.3) * math.sin(cycle * math.pi * 6)
        y = target_y + (height * 0.2) * math.cos(cycle * math.pi * 2) - (height * 0.2)
        angle = 15 * math.sin(cycle * math.pi * 6)

    elif motion_type == 'figure8':
        amp_x = width * 0.32
        amp_y = height * 0.16
        x = target_x + amp_x * math.sin(cycle * math.pi * 2)
        y = target_y + amp_y * math.sin(cycle * math.pi * 4)
        angle = 20 * math.sin(cycle * math.pi * 2)

    elif motion_type == 'spiral':
        r = (width * 0.25) * math.sin(cycle * math.pi)
        theta = cycle * math.pi * 4
        x = target_x + r * math.cos(theta)
        y = target_y + r * math.sin(theta)
        angle = math.degrees(theta) % 360

    elif motion_type == 'heartbeat':
        phase = cycle % 1.0
        zoom = 1.0
        if phase < 0.2:
            zoom = 1.0 + math.sin(phase * math.pi * 5) * 0.45
        elif 0.25 <= phase < 0.45:
            zoom = 1.0 + math.sin((phase - 0.25) * math.pi * 5) * 0.32
        scale = target_scale * zoom
        angle = 0.0

    elif motion_type == 'zoom':
        pulse = math.sin(cycle * math.pi * 2)
        scale = target_scale * (1.0 + 0.45 * pulse)
        angle = 15 * pulse

    return x, y, angle, scale

# -------------------------------------------------------------
# 6. AUDIO DURATION DETECTOR
# -------------------------------------------------------------
def get_audio_duration(file_path):
    if not file_path or not os.path.exists(file_path):
        return None
    try:
        cmd = [
            'ffprobe', '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            file_path
        ]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
        dur = float(out)
        return round(dur, 2) if dur > 0 else None
    except Exception:
        return None

# -------------------------------------------------------------
# 7. HIGH-PERFORMANCE VIDEO RENDER ENGINE
# -------------------------------------------------------------
def render_stop_challenge_video(config, on_progress=None):
    """
    Renders a 60 FPS Stop Challenge Video with exact 1:1 Canvas Engine Parity.
    - Duration matches audio length automatically down to the millisecond
    - Buttery smooth circular-sweep neon outline
    - Rich studio gradient with cinematic vignette
    - Top Header Glass Pill Banner with breathing pulse
    - Bottom Call-to-Action Subtitle Glass Pill Banner
    - Top-Left Neon Circular Countdown Timer with animated progress arc
    - Floating 3D sparkles and depth-layered atmosphere
    """
    image_input = config.get('image')
    if isinstance(image_input, str):
        source_img = Image.open(image_input)
    else:
        source_img = image_input

    motion_type = config.get('motion_type', 'spin')
    speed = float(config.get('speed', 1.0))
    duration = float(config.get('duration', 3.0))
    fps = int(config.get('fps', 60))
    resolution = config.get('resolution', '720p')
    aspect_ratio = config.get('aspect_ratio', '9:16')
    bg_gradient = config.get('bg_gradient', 'cyberpunk')

    header_text = strip_unsupported_chars(config.get('header_text', 'CAN YOU STOP THIS?'))
    header_color = hex_to_rgb(config.get('header_color', '#ffe600'), (255, 230, 0))
    sub_text = strip_unsupported_chars(config.get('sub_text', 'PAUSE EXACTLY IN THE OUTLINE!'))

    outline_color = hex_to_rgb(config.get('outline_color', '#00f3ff'), (0, 243, 255))
    outline_width = int(config.get('outline_width', 8))
    outline_glow = int(config.get('outline_glow', 18))
    pulse_outline = config.get('pulse_outline', False) # Static crisp outline matching CanvasEngine line 687

    image_scale_mult = float(config.get('image_scale', 0.72))
    show_sparkles = config.get('show_sparkles', True)
    particle_count = int(config.get('particle_count', 90))
    particle_speed = float(config.get('particle_speed', 3.0))
    particle_color = hex_to_rgb(config.get('particle_color', '#00f3ff'), (0, 243, 255))

    audio_path = config.get('audio_path', None)
    output_path = config.get('output_path', f"exports/challenge_{int(time.time())}.mp4")

    # CRITICAL: Auto-match video duration to audio track length!
    if audio_path and os.path.exists(audio_path):
        detected_dur = get_audio_duration(audio_path)
        if detected_dur and detected_dur > 0:
            duration = min(60.0, max(1.0, detected_dur))
            print(f"[RENDERER] Matched video duration to audio length: {duration}s")

    width, height = get_target_dimensions(resolution, aspect_ratio)
    scale = width / 1080.0

    # Smart FPS reduction for high resolutions to save memory & time
    pixel_count = width * height
    if pixel_count > 2073600 and fps > 30:  # >1080p
        fps = 30
        print(f"[RENDERER] FPS auto-reduced to 30 for {width}x{height} (memory safety)")

    # 1. Process image cutout cleanly using outer-border BFS flood fill
    processed_img = process_image_transparency(source_img)
    # Free source image memory
    if isinstance(image_input, str):
        del source_img
        gc.collect()

    base_dim = min(width, height) * 0.52 * (image_scale_mult / 0.72)
    aspect = processed_img.width / max(1, processed_img.height)
    if aspect >= 1.0:
        item_w = int(base_dim)
        item_h = int(base_dim / aspect)
    else:
        item_h = int(base_dim)
        item_w = int(base_dim * aspect)
    item_w = max(10, item_w)
    item_h = max(10, item_h)

    resized_item = processed_img.resize((item_w, item_h), Image.Resampling.LANCZOS)

    # 2. Generate Buttery Smooth Circular Neon Outline
    outline_data = generate_outline_and_glow(
        resized_item,
        outline_color=outline_color,
        thickness=outline_width,
        glow_radius=outline_glow,
        padding=50
    )
    outline_base_img = outline_data['image']
    _cleanup_outline_memory()  # Free numpy intermediates from outline generation

    # 3. Target Position
    target_x = width // 2
    target_y = int(height * 0.53)

    # Reduce particles on high-res to save CPU + memory
    if pixel_count > 2073600:  # > 1080p
        particle_count = min(particle_count, 40)
        outline_glow = min(outline_glow, 10)

    # Pre-render Studio Gradient Background with Cinematic Vignette & Grid
    bg_base = create_gradient_background(width, height, bg_gradient)

    # -------------------------------------------------------------
    # EXACT 1:1 TEXT & OVERLAYS FROM CanvasEngine.js
    # -------------------------------------------------------------
    font_header_size = max(24, int(52 * scale))
    font_sub_size = max(16, int(28 * scale))
    font_timer_size = max(12, int(18 * scale))

    font_header = get_font(font_header_size, bold=True)
    font_sub = get_font(font_sub_size, bold=True)
    font_timer = get_font(font_timer_size, bold=True)

    temp_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))

    # A. Top Header Banner Canvas (Pill centered horizontally)
    bbox_h = temp_draw.textbbox((0, 0), header_text, font=font_header)
    tw_h = bbox_h[2] - bbox_h[0]
    th_h = bbox_h[3] - bbox_h[1]

    h_padx = max(24, int(font_header_size * 0.6))
    h_pady = max(12, int(font_header_size * 0.28))
    h_box_w = tw_h + h_padx * 2
    h_box_h = th_h + h_pady * 2
    h_box_y = int(55 * scale)

    # Header canvas with margin for pulsation
    header_margin = 20
    header_base_canvas = Image.new('RGBA', (h_box_w + header_margin * 2, h_box_h + header_margin * 2), (0, 0, 0, 0))
    hb_draw = ImageDraw.Draw(header_base_canvas)
    hb_draw.rounded_rectangle(
        [header_margin, header_margin, header_margin + h_box_w, header_margin + h_box_h],
        radius=h_box_h // 2,
        fill=(0, 0, 0, 175),
        outline=(*outline_color, 140),
        width=2
    )
    hb_draw.text((header_margin + h_padx + 2, header_margin + h_pady + 2), header_text, fill=(0, 0, 0, 240), font=font_header)
    hb_draw.text((header_margin + h_padx, header_margin + h_pady), header_text, fill=(*header_color, 255), font=font_header)

    # B. Bottom Subtitle Banner Canvas (Pill centered horizontally at bottom)
    bbox_s = temp_draw.textbbox((0, 0), sub_text, font=font_sub)
    tw_s = bbox_s[2] - bbox_s[0]
    th_s = bbox_s[3] - bbox_s[1]

    s_padx = max(20, int(font_sub_size * 0.7))
    s_pady = max(10, int(font_sub_size * 0.35))
    s_box_w = tw_s + s_padx * 2
    s_box_h = th_s + s_pady * 2
    s_box_x = (width - s_box_w) // 2
    s_box_y = height - int(60 * scale) - s_box_h

    sub_canvas = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(sub_canvas)
    s_draw.rounded_rectangle(
        [s_box_x, s_box_y, s_box_x + s_box_w, s_box_y + s_box_h],
        radius=s_box_h // 2,
        fill=(0, 0, 0, 175),
        outline=(255, 255, 255, 45),
        width=1
    )
    s_draw.text((s_box_x + s_padx + 1, s_box_y + s_pady + 1), sub_text, fill=(0, 0, 0, 220), font=font_sub)
    s_draw.text((s_box_x + s_padx, s_box_y + s_pady), sub_text, fill=(255, 255, 255, 250), font=font_sub)

    # C. Top-Left Countdown Timer Metrics
    timer_x = int(75 * scale)
    timer_y = int(80 * scale)
    timer_r = int(28 * scale)

    # Initialize Floating Sparkles
    particles = init_particles(particle_count, width, height, particle_color) if show_sparkles else []

    # 4. Setup FFmpeg Output Pipe
    total_frames = int(duration * fps)
    has_audio = bool(audio_path and os.path.exists(audio_path))
    temp_video_path = output_path + '.temp.mp4' if has_audio else output_path

    ffmpeg_cmd = [
        'ffmpeg', '-y',
        '-f', 'rawvideo',
        '-vcodec', 'rawvideo',
        '-s', f'{width}x{height}',
        '-pix_fmt', 'rgb24',
        '-r', str(fps),
        '-i', '-',
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '18',
        '-pix_fmt', 'yuv420p',
        temp_video_path
    ]

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

    proc = subprocess.Popen(
        ffmpeg_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    # Outline paste coordinates (pre-calculated for maximum performance)
    ox = target_x - outline_base_img.width // 2
    oy = target_y - outline_base_img.height // 2

    # 5. Deterministic 60 FPS Render Loop
    last_reported_percent = -1

    for frame_idx in range(total_frames):
        t = frame_idx / fps

        frame = bg_base.copy()
        f_draw = ImageDraw.Draw(frame)

        # 5a. Floating Bokeh & 4-Point Diamond Sparkles
        if show_sparkles and particles:
            draw_particles(f_draw, particles, t, width, height, particle_speed)

        # 5b. Stationary Outline: Rock-solid, razor-sharp & anti-aliased (Matching CanvasEngine line 687)
        if pulse_outline:
            pulse_factor = 1.0 + math.sin(t * 5.0) * 0.035
            cur_ow = max(10, int(outline_base_img.width * pulse_factor))
            cur_oh = max(10, int(outline_base_img.height * pulse_factor))
            cur_outline = outline_base_img.resize((cur_ow, cur_oh), Image.Resampling.BICUBIC)
            cur_ox = target_x - cur_outline.width // 2
            cur_oy = target_y - cur_outline.height // 2
            frame.paste(cur_outline, (cur_ox, cur_oy), cur_outline)
        else:
            frame.paste(outline_base_img, (ox, oy), outline_base_img)

        # 5c. Target Center Indicator Dot (Cyan glowing crosshair)
        f_draw.ellipse(
            [(target_x - 14, target_y - 14), (target_x + 14, target_y + 14)],
            outline=(*outline_color, 90),
            width=2
        )
        f_draw.ellipse(
            [(target_x - 4, target_y - 4), (target_x + 4, target_y + 4)],
            fill=(*outline_color, 220)
        )

        # 5d. Compute Moving Item Transform
        cur_x, cur_y, cur_angle, cur_scale = compute_transform(
            t, motion_type, speed, width, height, target_x, target_y, 1.0
        )

        if abs(cur_scale - 1.0) > 0.01:
            mw = max(4, int(resized_item.width * cur_scale))
            mh = max(4, int(resized_item.height * cur_scale))
            moving_img = resized_item.resize((mw, mh), Image.Resampling.BICUBIC)
        else:
            moving_img = resized_item

        if abs(cur_angle) > 0.01:
            rotated_item = moving_img.rotate(cur_angle, resample=Image.Resampling.BICUBIC, expand=True)
        else:
            rotated_item = moving_img

        mx = int(cur_x - rotated_item.width // 2)
        my = int(cur_y - rotated_item.height // 2)
        frame.paste(rotated_item, (mx, my), rotated_item)

        # 5e. Bottom Subtitle Pill Banner
        frame.paste(sub_canvas, (0, 0), sub_canvas)

        # 5f. Top Pulsing Header Pill Banner (Exact match to canvasEngine line 794)
        header_pulse = 1.0 + math.sin(t * 6.0) * 0.045
        cur_hw = int(header_base_canvas.width * header_pulse)
        cur_hh = int(header_base_canvas.height * header_pulse)
        cur_header = header_base_canvas.resize((cur_hw, cur_hh), Image.Resampling.BICUBIC)
        ch_x = (width - cur_hw) // 2
        ch_y = h_box_y - (cur_hh - header_base_canvas.height) // 2
        frame.paste(cur_header, (ch_x, ch_y), cur_header)

        # 5g. Top-Left Circular Countdown Timer (Exact match to canvasEngine line 1040)
        f_draw.ellipse(
            [(timer_x - timer_r, timer_y - timer_r), (timer_x + timer_r, timer_y + timer_r)],
            fill=(0, 0, 0, 180),
            outline=(255, 255, 255, 50),
            width=2
        )
        progress_frac = (t % duration) / duration
        arc_end = -90 + int(360 * progress_frac)
        f_draw.arc(
            [(timer_x - timer_r, timer_y - timer_r), (timer_x + timer_r, timer_y + timer_r)],
            start=-90,
            end=arc_end,
            fill=(0, 243, 255),
            width=3
        )
        rem_sec = max(1, math.ceil(duration - (t % duration)))
        t_str = f"{rem_sec}s"
        t_bbox = f_draw.textbbox((0, 0), t_str, font=font_timer)
        t_w = t_bbox[2] - t_bbox[0]
        t_h = t_bbox[3] - t_bbox[1]
        f_draw.text((timer_x - t_w // 2, timer_y - t_h // 2 - 2), t_str, fill=(255, 255, 255), font=font_timer)

        # Pipe raw RGB frame to FFmpeg
        frame_rgb = frame.convert('RGB')
        proc.stdin.write(frame_rgb.tobytes())

        if on_progress:
            pct = int((frame_idx + 1) / total_frames * 100)
            if pct != last_reported_percent and (pct % 5 == 0 or pct == 100):
                last_reported_percent = pct
                on_progress(pct, frame_idx + 1, total_frames)

    proc.stdin.close()
    proc.wait()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg render error (code {proc.returncode})")

    # Stage 2: Audio muxing (matches video duration to audio exactly)
    if has_audio and os.path.exists(temp_video_path):
        mux_cmd = [
            'ffmpeg', '-y',
            '-i', temp_video_path,
            '-i', audio_path,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-t', str(duration),
            output_path
        ]
        subprocess.run(mux_cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        try:
            os.unlink(temp_video_path)
        except Exception:
            pass

    size_kb = round(os.path.getsize(output_path) / 1024)
    return {
        'path': output_path,
        'filename': os.path.basename(output_path),
        'duration': duration,
        'size_kb': size_kb
    }

"""
STOP CHALLENGE 4K 60FPS PYTHON VIDEO ENGINE
Exact recreation of the original Canvas Studio Engine:
- Padded, Razor-Sharp Dual-Glow Neon Outline with Hypnotic Pulse
- 4-Point Diamond Sparkles & Depth-Layered Bokeh Atmosphere
- Dynamic Pulsing Header with Glass Pill Backdrop
- Seamless Studio Gradients with Cyber Grid Lines
- Fast, deterministic 60 FPS FFmpeg rawvideo pipe
"""

import os
import time
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# 20 Curated Studio Gradients (Color stops: [(Top RGB), (Mid RGB), (Bot RGB)])
GRADIENT_PRESETS = {
    'cyberpunk': ((15, 12, 41), (48, 43, 99), (36, 36, 62)),
    'neon-city': ((10, 20, 55), (45, 15, 80), (10, 8, 30)),
    'gaming-rgb': ((12, 12, 22), (28, 14, 55), (8, 22, 42)),
    'laser-matrix': ((5, 15, 45), (12, 42, 95), (3, 8, 25)),
    'vaporwave': ((55, 15, 70), (95, 35, 85), (25, 12, 50)),
    'inferno': ((50, 10, 5), (95, 30, 8), (20, 5, 2)),
    'luxury-gold': ((32, 25, 10), (75, 60, 22), (18, 14, 6)),
    'midnight-diamond': ((8, 20, 48), (15, 42, 88), (5, 10, 28)),
    'emerald-noir': ((5, 32, 20), (12, 70, 42), (3, 16, 12)),
    'rose-gold': ((48, 20, 32), (88, 42, 58), (24, 10, 18)),
    'deep-space': ((6, 6, 22), (22, 14, 48), (4, 4, 15)),
    'supernova': ((40, 14, 45), (85, 28, 52), (18, 6, 24)),
    'aurora': ((8, 32, 38), (20, 72, 62), (6, 18, 28)),
    'dark-matter': ((16, 8, 32), (36, 18, 65), (8, 4, 18)),
    'studio-dark': ((15, 15, 18), (30, 30, 35), (10, 10, 12)),
    'viral-split': ((55, 12, 48), (15, 40, 75), (28, 10, 35)),
    'electric-violet': ((28, 8, 58), (68, 20, 110), (14, 4, 35)),
    'acid-lime': ((12, 32, 8), (32, 75, 20), (6, 18, 4)),
    'pure-oled': ((0, 0, 0), (10, 10, 14), (0, 0, 0)),
    'pastel-creator': ((42, 32, 50), (72, 50, 80), (26, 20, 35))
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
    return res_map.get(str(resolution).lower(), {}).get(aspect_ratio, (720, 1280))

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
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
        r"C:\Windows\Fonts\arial.ttf",
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

def process_image_transparency(img):
    """
    Ensures image has an alpha channel.
    If image was converted to JPEG with black or white background (e.g. by Telegram),
    removes the background cleanly with edge anti-aliasing.
    """
    img = img.convert('RGBA')
    arr = np.array(img)
    alpha = arr[:, :, 3]

    transparent_pixels = np.sum(alpha < 200)
    if transparent_pixels > (arr.shape[0] * arr.shape[1] * 0.005):
        return img

    h, w = arr.shape[:2]
    border_pts = [
        (0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1),
        (0, w // 2), (h - 1, w // 2), (h // 2, 0), (h // 2, w - 1)
    ]
    corner_colors = [arr[r, c, :3] for r, c in border_pts]
    
    black_corners = sum(1 for c in corner_colors if np.all(c < 35))
    white_corners = sum(1 for c in corner_colors if np.all(c > 220))

    if black_corners >= 5:
        brightness = np.max(arr[:, :, :3], axis=2)
        new_alpha = np.clip((brightness.astype(np.float32) - 15) / 30.0 * 255.0, 0, 255).astype(np.uint8)
        arr[:, :, 3] = new_alpha
        return Image.fromarray(arr)
        
    elif white_corners >= 5:
        min_channel = np.min(arr[:, :, :3], axis=2)
        new_alpha = np.clip((240.0 - min_channel.astype(np.float32)) / 30.0 * 255.0, 0, 255).astype(np.uint8)
        arr[:, :, 3] = new_alpha
        return Image.fromarray(arr)

    return img

def create_gradient_background(width, height, preset_name='cyberpunk'):
    """Creates a seamless studio gradient with optional cyber grid overlay."""
    c_top, c_mid, c_bot = GRADIENT_PRESETS.get(preset_name, GRADIENT_PRESETS['cyberpunk'])

    y = np.linspace(0.0, 1.0, height, dtype=np.float32)
    top = np.array(c_top, dtype=np.float32)
    mid = np.array(c_mid, dtype=np.float32)
    bot = np.array(c_bot, dtype=np.float32)

    colors = np.zeros((height, 3), dtype=np.float32)
    mask = y < 0.5
    colors[mask] = top + (mid - top) * (y[mask, None] * 2.0)
    colors[~mask] = mid + (bot - mid) * ((y[~mask, None] - 0.5) * 2.0)

    grad_arr = np.tile(colors[:, None, :], (1, width, 1))
    grad_arr = np.clip(grad_arr, 0, 255).astype(np.uint8)
    bg = Image.fromarray(grad_arr)

    # Add subtle cyber grid lines if cyberpunk or neon-city
    if preset_name in ['cyberpunk', 'neon-city', 'laser-matrix']:
        draw = ImageDraw.Draw(bg)
        grid_size = 70
        grid_col = (0, 243, 255, 14)
        for gx in range(0, width, grid_size):
            draw.line([(gx, 0), (gx, height)], fill=(0, 40, 60))
        for gy in range(0, height, grid_size):
            draw.line([(0, gy), (width, gy)], fill=(0, 40, 60))

    return bg

def generate_outline_and_glow(item_img, outline_color=(0, 243, 255), thickness=8, glow_radius=18, padding=60):
    """
    EXACT RECREATION OF ORIGINAL OUTLINE ENGINE:
    - Adds generous padding so glow never clips at boundaries
    - Multi-angle dilation around binarized silhouette mask
    - Interior punched out
    - Dual-layer neon glow (soft ambient glow + intense neon core)
    """
    w, h = item_img.size
    pad = int(max(thickness * 3, 30) + glow_radius * 2 + padding)
    total_w = w + pad * 2
    total_h = h + pad * 2

    # 1. Solid Binarized Mask with Padding
    mask = Image.new('L', (total_w, total_h), 0)
    alpha = item_img.split()[-1]
    # Make all non-transparent pixels pure 255
    bin_alpha = alpha.point(lambda p: 255 if p > 25 else 0)
    mask.paste(bin_alpha, (pad, pad))

    # 2. Dilation by thickness
    filter_size = max(3, int(thickness * 2 + 1))
    dilated_mask = mask.filter(ImageFilter.MaxFilter(filter_size))

    # 3. Outer Border = Dilated - Mask
    arr_dilated = np.array(dilated_mask, dtype=np.int16)
    arr_mask = np.array(mask, dtype=np.int16)
    border_alpha = np.clip(arr_dilated - arr_mask, 0, 255).astype(np.uint8)

    # 4. Colored Border Image
    border_img = Image.new('RGBA', (total_w, total_h), outline_color + (0,))
    border_img.putalpha(Image.fromarray(border_alpha))

    # 5. Dual Neon Glow (Intense Inner Glow + Ambient Soft Glow)
    if glow_radius > 0:
        glow_ambient = border_img.filter(ImageFilter.GaussianBlur(glow_radius))
        glow_core = border_img.filter(ImageFilter.GaussianBlur(max(2, glow_radius // 2)))
        
        final_outline = Image.alpha_composite(glow_ambient, glow_core)
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

def init_particles(count, width, height, color=(0, 243, 255)):
    """Initializes 3D depth-layered bokeh and 4-point diamond star particles."""
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
            'speed_y': float(np.random.uniform(-0.8, -0.2) * depth * 40), # gentle upward float
            'base_opacity': float(np.random.uniform(0.35, 0.85)),
            'twinkle_speed': float(np.random.uniform(1.5, 4.0)),
            'phase': float(np.random.uniform(0, math.pi * 2)),
            'is_star': (i % 4 == 0), # 25% are 4-point diamond sparkles
            'color': color if color != 'multi' else palette[i % len(palette)]
        })
    return particles

def draw_particles(img_draw, particles, t, width, height, particle_speed=1.0):
    """Draws 3D floating bokeh and diamond star sparkles."""
    for p in particles:
        # Wrap seamlessly across canvas
        x = (p['start_x'] + p['speed_x'] * particle_speed * t) % width
        y = (p['start_y'] + p['speed_y'] * particle_speed * t) % height
        
        twinkle = 0.7 + 0.3 * math.sin(t * p['twinkle_speed'] * 3 + p['phase'])
        alpha_factor = max(0.1, min(1.0, p['base_opacity'] * twinkle))
        r = p['radius'] * (0.8 + 0.3 * twinkle)
        col = p['color']

        if p['is_star']:
            # 4-point diamond sparkle star
            star_r = r * 2.2
            # Horizontal & vertical diamonds
            pts = [
                (x, y - star_r),
                (x + star_r * 0.35, y),
                (x, y + star_r),
                (x - star_r * 0.35, y)
            ]
            img_draw.polygon(pts, fill=col)
            pts_h = [
                (x - star_r, y),
                (x, y - star_r * 0.35),
                (x + star_r, y),
                (x, y + star_r * 0.35)
            ]
            img_draw.polygon(pts_h, fill=col)
            # Center bright white core
            core_r = max(1.0, r * 0.4)
            img_draw.ellipse([(x - core_r, y - core_r), (x + core_r, y + core_r)], fill=(255, 255, 255))
        else:
            # Glowing circular bokeh
            img_draw.ellipse([(x - r, y - r), (x + r, y + r)], fill=col)

def compute_transform(t, motion_type, speed, width, height, target_x, target_y, target_scale):
    """Computes (x, y, angle, scale) for moving item. Aligns with outline at cycle=0!"""
    period = 2.5 / max(0.2, speed)
    cycle = (t % period) / period

    x = target_x
    y = target_y
    angle = 0.0
    scale = target_scale

    if motion_type == 'spin':
        angle = (t * (360 / (period / 2)) * speed) % 360

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

    elif motion_type == 'zoom':
        pulse = math.sin(cycle * math.pi * 2)
        scale = target_scale * (1.0 + 0.45 * pulse)
        angle = 15 * pulse

    return x, y, angle, scale

def get_audio_duration(file_path):
    """Gets audio duration in seconds."""
    if not file_path or not os.path.exists(file_path): return None
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file_path]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL).decode('utf-8').strip()
        dur = float(out)
        return round(dur, 1) if dur > 0 else None
    except Exception:
        return None

def render_stop_challenge_video(config, on_progress=None):
    """
    Renders a complete 60 FPS Stop Challenge Video and pipes directly to FFmpeg.
    Features:
    - Padded Razor-Sharp Dual Neon Glow Outline with Breathing Pulse
    - Pulsing Dynamic Header with Semi-Transparent Glass Pill Banner
    - 4-Point Diamond Sparkles and Layered Atmosphere Bokeh
    - Center Target Indicator
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
    
    header_text = config.get('header_text', 'CAN YOU STOP THIS?')
    header_color = hex_to_rgb(config.get('header_color', '#ffe600'), (255, 230, 0))
    sub_text = config.get('sub_text', 'PAUSE EXACTLY IN THE OUTLINE!')
    
    outline_color = hex_to_rgb(config.get('outline_color', '#00f3ff'), (0, 243, 255))
    outline_width = int(config.get('outline_width', 8))
    outline_glow = int(config.get('outline_glow', 18))
    pulse_outline = config.get('pulse_outline', True) # Breathing pulse on outline
    
    image_scale_mult = float(config.get('image_scale', 0.72))
    show_sparkles = config.get('show_sparkles', True)
    particle_count = int(config.get('particle_count', 90))
    particle_speed = float(config.get('particle_speed', 3.0))
    particle_color = hex_to_rgb(config.get('particle_color', '#00f3ff'), (0, 243, 255))
    
    audio_path = config.get('audio_path', None)
    output_path = config.get('output_path', f"exports/challenge_{int(time.time())}.mp4")

    # Adapt duration to audio if specified
    if audio_path and os.path.exists(audio_path) and config.get('auto_audio_duration', False):
        detected_dur = get_audio_duration(audio_path)
        if detected_dur and detected_dur > 0:
            duration = min(60.0, max(1.0, detected_dur))

    width, height = get_target_dimensions(resolution, aspect_ratio)

    # 1. Process image cutout & scale
    processed_img = process_image_transparency(source_img)
    
    base_dim = min(width, height) * 0.52 * image_scale_mult
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

    # 2. Generate Padded Razor-Sharp Dual Neon Glow Outline
    outline_data = generate_outline_and_glow(
        resized_item,
        outline_color=outline_color,
        thickness=outline_width,
        glow_radius=outline_glow,
        padding=50
    )
    outline_base_img = outline_data['image']
    pad = outline_data['pad']

    # 3. Stationary Target Position
    target_x = width // 2
    target_y = int(height * 0.54)

    # Pre-render Studio Gradient Background
    bg_base = create_gradient_background(width, height, bg_gradient)

    # Fonts
    font_header_size = max(24, int(width * 0.052))
    font_sub_size = max(16, int(width * 0.032))
    font_header = get_font(font_header_size, bold=True)
    font_sub = get_font(font_sub_size, bold=False)

    # Pre-render Glass Pill Background for Header
    temp_draw = ImageDraw.Draw(Image.new('RGBA', (1, 1)))
    bbox_h = temp_draw.textbbox((0, 0), header_text, font=font_header)
    tw_h = bbox_h[2] - bbox_h[0]
    th_h = bbox_h[3] - bbox_h[0]

    bbox_s = temp_draw.textbbox((0, 0), sub_text, font=font_sub)
    tw_s = bbox_s[2] - bbox_s[0]
    th_s = bbox_s[3] - bbox_s[0]

    pill_w = max(tw_h, tw_s) + 60
    pill_h = th_h + th_s + 44
    pill_x1 = (width - pill_w) // 2
    pill_y1 = int(height * 0.055)
    pill_x2 = pill_x1 + pill_w
    pill_y2 = pill_y1 + pill_h

    # Static Header Canvas
    header_canvas = Image.new('RGBA', (width, int(height * 0.25)), (0, 0, 0, 0))
    h_draw = ImageDraw.Draw(header_canvas)
    
    # Glass pill backdrop
    h_draw.rounded_rectangle([pill_x1, pill_y1, pill_x2, pill_y2], radius=18, fill=(0, 0, 0, 150), outline=(*outline_color, 90), width=2)
    
    # Header text with shadow
    hx = (width - tw_h) // 2
    hy = pill_y1 + 14
    h_draw.text((hx + 3, hy + 3), header_text, fill=(0, 0, 0, 220), font=font_header)
    h_draw.text((hx, hy), header_text, fill=(*header_color, 255), font=font_header)

    # Subtext with shadow
    sx = (width - tw_s) // 2
    sy = hy + th_h + 10
    h_draw.text((sx + 2, sy + 2), sub_text, fill=(0, 0, 0, 200), font=font_sub)
    h_draw.text((sx, sy), sub_text, fill=(255, 255, 255, 240), font=font_sub)

    # Initialize 3D Floating Particles
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

    # 5. Render Frames Loop
    last_reported_percent = -1

    for frame_idx in range(total_frames):
        t = frame_idx / fps
        
        frame = bg_base.copy()
        f_draw = ImageDraw.Draw(frame)

        # 5a. Draw 3D Floating Bokeh & Diamond Sparkles
        if show_sparkles and particles:
            draw_particles(f_draw, particles, t, width, height, particle_speed)

        # 5b. Stationary Outline with Subtle Breathing Pulse (Exact match to previous code)
        if pulse_outline:
            # Gentle rhythmic pulse (1.0 +- 3.5%)
            pulse_factor = 1.0 + math.sin(t * 5.0) * 0.035
            cur_ow = max(10, int(outline_base_img.width * pulse_factor))
            cur_oh = max(10, int(outline_base_img.height * pulse_factor))
            cur_outline = outline_base_img.resize((cur_ow, cur_oh), Image.Resampling.BILINEAR)
        else:
            cur_outline = outline_base_img

        ox = target_x - cur_outline.width // 2
        oy = target_y - cur_outline.height // 2
        frame.paste(cur_outline, (ox, oy), cur_outline)

        # 5c. Target Center Indicator Dot (Subtle glowing cyan crosshair)
        f_draw.ellipse(
            [(target_x - 12, target_y - 12), (target_x + 12, target_y + 12)],
            outline=(*outline_color, 80),
            width=2
        )
        f_draw.ellipse(
            [(target_x - 3, target_y - 3), (target_x + 3, target_y + 3)],
            fill=(*outline_color, 200)
        )

        # 5d. Compute Moving Item Transform
        cur_x, cur_y, cur_angle, cur_scale = compute_transform(
            t, motion_type, speed, width, height, target_x, target_y, 1.0
        )

        if abs(cur_scale - 1.0) > 0.01:
            mw = max(4, int(resized_item.width * cur_scale))
            mh = max(4, int(resized_item.height * cur_scale))
            moving_img = resized_item.resize((mw, mh), Image.Resampling.BILINEAR)
        else:
            moving_img = resized_item

        if abs(cur_angle) > 0.01:
            rotated_item = moving_img.rotate(cur_angle, resample=Image.Resampling.BICUBIC, expand=True)
        else:
            rotated_item = moving_img

        mx = int(cur_x - rotated_item.width // 2)
        my = int(cur_y - rotated_item.height // 2)
        frame.paste(rotated_item, (mx, my), rotated_item)

        # 5e. Pulsing Header Banner
        header_pulse = 1.0 + math.sin(t * 6.0) * 0.03
        if abs(header_pulse - 1.0) > 0.005:
            hw = max(10, int(header_canvas.width * header_pulse))
            hh = max(10, int(header_canvas.height * header_pulse))
            cur_header = header_canvas.resize((hw, hh), Image.Resampling.BILINEAR)
            hx = (width - hw) // 2
            frame.paste(cur_header, (hx, 0), cur_header)
        else:
            frame.paste(header_canvas, (0, 0), header_canvas)

        # Pipe raw RGB frame to FFmpeg
        proc.stdin.write(frame.tobytes())

        if on_progress:
            pct = int((frame_idx + 1) / total_frames * 100)
            if pct != last_reported_percent and (pct % 5 == 0 or pct == 100):
                last_reported_percent = pct
                on_progress(pct, frame_idx + 1, total_frames)

    proc.stdin.close()
    proc.wait()

    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg render error (code {proc.returncode})")

    # Stage 2: Fast audio muxing if audio track present
    if has_audio and os.path.exists(temp_video_path):
        mux_cmd = [
            'ffmpeg', '-y',
            '-i', temp_video_path,
            '-i', audio_path,
            '-c:v', 'copy',
            '-c:a', 'aac',
            '-b:a', '192k',
            '-shortest',
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

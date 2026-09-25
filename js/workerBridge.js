/**
 * HEADLESS SERVER RENDER BRIDGE
 * Exposes window.renderVideoTask(config) for headless Chrome / Telegram Bot.
 * Renders 60 FPS deterministic MP4 video with WebCodecs and streams to server.
 */

window.__renderProgress = null;
window.__renderResult = null;
window.__renderError = null;

let canvasEngine = null;
let audioManager = null;
let videoRecorder = null;

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('workerCanvas');
  canvasEngine = new CanvasEngine(canvas);
  audioManager = new AudioManager();
  videoRecorder = new VideoRecorder(canvasEngine, audioManager);
  window.__workerReady = true;
  console.log('[WORKER] Headless Render Worker Ready!');
});

/**
 * Smart White-Background Remover
 * Detects if an image was compressed into JPEG with a solid white background (e.g. by Telegram)
 * and performs border BFS flood-fill to restore transparent cutouts while preserving interior white details.
 */
function processImageTransparency(sourceImg) {
  try {
    const w = sourceImg.naturalWidth || sourceImg.width;
    const h = sourceImg.naturalHeight || sourceImg.height;
    if (!w || !h) return sourceImg;

    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    ctx.drawImage(sourceImg, 0, 0);

    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    // 1. Check if already has transparent pixels (alpha < 200)
    let transparentCount = 0;
    const thresholdAlpha = w * h * 0.005; // 0.5% of pixels
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 200) {
        transparentCount++;
        if (transparentCount > thresholdAlpha) {
          // Native transparent PNG — leave completely untouched!
          return sourceImg;
        }
      }
    }

    // 2. Sample 8 points along perimeter (corners and midpoints)
    const sampleCoords = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
      [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)]
    ];

    let whiteBorderSamples = 0;
    for (const [cx, cy] of sampleCoords) {
      const idx = (cy * w + cx) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      if (r >= 225 && g >= 225 && b >= 225) {
        whiteBorderSamples++;
      }
    }

    // If at least 5 out of 8 border points are white/near-white,
    // this was likely a transparent PNG that Telegram converted to JPEG with a white background!
    if (whiteBorderSamples >= 5) {
      console.log('[WORKER] Auto-removing white background from Telegram-compressed image via border flood-fill...');

      const visited = new Uint8Array(w * h);
      const queue = new Int32Array(w * h);
      let head = 0;
      let tail = 0;

      function isWhite(x, y) {
        const idx = (y * w + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (r >= 220 && g >= 220 && b >= 220) return true;
        if (r >= 205 && g >= 205 && b >= 205 && Math.abs(r - g) < 18 && Math.abs(r - b) < 18) return true;
        return false;
      }

      // Seed all 4 border edges
      for (let x = 0; x < w; x++) {
        if (isWhite(x, 0)) {
          const p = x;
          if (!visited[p]) { visited[p] = 1; queue[tail++] = p; }
        }
        if (isWhite(x, h - 1)) {
          const p = (h - 1) * w + x;
          if (!visited[p]) { visited[p] = 1; queue[tail++] = p; }
        }
      }
      for (let y = 0; y < h; y++) {
        if (isWhite(0, y)) {
          const p = y * w;
          if (!visited[p]) { visited[p] = 1; queue[tail++] = p; }
        }
        if (isWhite(w - 1, y)) {
          const p = y * w + (w - 1);
          if (!visited[p]) { visited[p] = 1; queue[tail++] = p; }
        }
      }

      // BFS flood fill
      while (head < tail) {
        const p = queue[head++];
        const px = p % w;
        const py = (p / w) | 0;

        // Make pixel transparent
        data[p * 4 + 3] = 0;

        if (px > 0) {
          const n = p - 1;
          if (!visited[n] && isWhite(px - 1, py)) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (px < w - 1) {
          const n = p + 1;
          if (!visited[n] && isWhite(px + 1, py)) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (py > 0) {
          const n = p - w;
          if (!visited[n] && isWhite(px, py - 1)) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
        if (py < h - 1) {
          const n = p + w;
          if (!visited[n] && isWhite(px, py + 1)) {
            visited[n] = 1;
            queue[tail++] = n;
          }
        }
      }

      // Clean boundary fringe
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = (y * w + x) * 4;
          if (data[idx + 3] > 0) {
            const hasTransparentNeighbor =
              data[((y - 1) * w + x) * 4 + 3] === 0 ||
              data[((y + 1) * w + x) * 4 + 3] === 0 ||
              data[(y * w + (x - 1)) * 4 + 3] === 0 ||
              data[(y * w + (x + 1)) * 4 + 3] === 0;

            if (hasTransparentNeighbor) {
              const r = data[idx], g = data[idx + 1], b = data[idx + 2];
              if (r >= 210 && g >= 210 && b >= 210) {
                data[idx + 3] = 0;
              }
            }
          }
        }
      }

      ctx.putImageData(imgData, 0, 0);
      return c;
    }
  } catch (err) {
    console.warn('[WORKER] Transparency processing fallback:', err);
  }
  return sourceImg;
}

window.renderVideoTask = async function(config) {
  window.__renderProgress = { percent: 0, currentFrame: 0, totalFrames: 0 };
  window.__renderResult = null;
  window.__renderError = null;

  try {
    if (!window.__workerReady) {
      const canvas = document.getElementById('workerCanvas');
      canvasEngine = new CanvasEngine(canvas);
      audioManager = new AudioManager();
      videoRecorder = new VideoRecorder(canvasEngine, audioManager);
    }

    let {
      imageUrl,
      imageName = 'ChallengeItem',
      motionType = 'spin',
      speed = 1.0,
      duration = 3,
      fps = 60,
      resolution = '720p',
      aspectRatio = '9:16',
      headerText = 'CAN YOU STOP THIS? 🛑',
      headerColor = '#ffe600',
      subText = 'PAUSE EXACTLY IN THE OUTLINE! 🎯',
      outlineColor = '#00f3ff',
      outlineWidth = 8,
      outlineGlow = 18,
      bgGradient = 'cyberpunk',
      audioPreset = 'none',
      customAudioUrl = null,
      imageScale = 0.72,
      showSparkles = true,
      particleCount = 40,
      particleSpeed = 1.0,
      particleColor = '#00f3ff',
      filename = `challenge_${Date.now()}.mp4`
    } = config;

    console.log(`[WORKER] Starting Render Task: "${imageName}" | Motion: ${motionType} | Res: ${resolution} ${fps}FPS ${duration}s | Particles: ${showSparkles ? `${particleCount}@${particleSpeed}x` : 'OFF'}`);

    // 1. Dimensions & Canvas Setup
    const [w, h] = videoRecorder.getTargetDimensions(resolution, aspectRatio);
    canvasEngine.setAspectRatio(aspectRatio, w, h);
    canvasEngine.totalDuration = duration;

    // 2. Motion Engine
    canvasEngine.motionEngine.setConfig({
      motionType: motionType,
      speed: speed,
      amplitude: 85
    });

    // 3. Visual Styling & Hook
    canvasEngine.config.headerText = headerText;
    canvasEngine.config.headerColor = headerColor;
    canvasEngine.config.subText = subText;
    canvasEngine.config.bgType = 'gradient';
    canvasEngine.config.bgGradient = bgGradient;
    canvasEngine.config.showTimer = true;
    canvasEngine.config.pulseOutline = false;

    // 3b. Atmosphere & Particles Config
    canvasEngine.config.showSparkles = showSparkles !== false;
    canvasEngine.config.particleSpeed = typeof particleSpeed === 'number' ? particleSpeed : 1.0;
    canvasEngine.config.particleColor = particleColor || '#00f3ff';
    canvasEngine.initParticles(particleCount || 40);

    // 4. Outline Config
    canvasEngine.setOutlineOptions({
      color: outlineColor,
      width: outlineWidth,
      glowBlur: outlineGlow
    });

    // 5. Load Image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to load image from URL'));
      img.src = imageUrl;
    });

    // Auto-detect and remove white background if Telegram compressed transparent PNG to JPEG
    const processedImg = processImageTransparency(img);

    const item = {
      id: 'slot-1',
      name: imageName,
      img: processedImg,
      imgUrl: imageUrl,
      scale: typeof imageScale === 'number' && imageScale > 0 ? imageScale : 0.72,
      offsetX: 0,
      offsetY: 0,
      angle: 0,
      outlineData: null
    };

    canvasEngine.setItems([item]);
    canvasEngine.currentTime = 0;

    // Wait for outline generation to complete
    await new Promise(r => setTimeout(r, 100));

    // 6. Audio Setup
    let customBuffer = null;
    if (customAudioUrl) {
      try {
        console.log(`[WORKER] Fetching custom audio from: ${customAudioUrl}`);
        const aRes = await fetch(customAudioUrl);
        const aArrayBuf = await aRes.arrayBuffer();
        const dummyCtx = new (window.AudioContext || window.webkitAudioContext)();
        customBuffer = await dummyCtx.decodeAudioData(aArrayBuf);
        dummyCtx.close();
      } catch (aErr) {
        console.warn('[WORKER] Custom audio decode error (proceeding without audio):', aErr);
      }
    }

    if (customBuffer) {
      audioManager.getRenderedAudioBuffer = async () => customBuffer;
      // Auto-adapt video duration to match audio length exactly!
      // E.g. If audio is 10 sec, video duration becomes 10 sec!
      if (customBuffer.duration && customBuffer.duration > 0) {
        duration = Math.max(1, Math.round(customBuffer.duration * 10) / 10);
        canvasEngine.totalDuration = duration;
        console.log(`[WORKER] Video duration matched to audio length: ${duration}s`);
      }
    } else if (audioPreset && audioPreset !== 'none') {
      audioManager.setPreset(audioPreset);
    } else {
      audioManager.setPreset('none');
    }

    // 7. Render Video Frame-by-Frame Offline
    return new Promise((resolve, reject) => {
      videoRecorder.startRecording({
        resolution,
        fps,
        duration,
        onProgress: (progress, currentFrame, totalFrames) => {
          window.__renderProgress = {
            percent: Math.round(progress * 100),
            currentFrame,
            totalFrames
          };
        },
        onComplete: async (result) => {
          try {
            console.log(`[WORKER] Render finished! Uploading binary MP4 to server: ${filename}`);
            const resp = await fetch(`/api/save-rendered-video?filename=${encodeURIComponent(filename)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'video/mp4' },
              body: result.blob
            });
            const data = await resp.json();
            data.duration = result.durationSec || duration;
            window.__renderResult = data;
            console.log('[WORKER] Server save success:', data);
            resolve(data);
          } catch (postErr) {
            window.__renderError = postErr.message;
            reject(postErr);
          }
        },
        onError: (err) => {
          window.__renderError = err?.message || String(err);
          reject(err);
        }
      });
    });

  } catch (err) {
    console.error('[WORKER] Error in renderVideoTask:', err);
    window.__renderError = err?.message || String(err);
    throw err;
  }
};

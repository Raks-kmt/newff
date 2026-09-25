/**
 * CANVAS 2D RENDERING PIPELINE (20+ PROCEDURAL BACKGROUNDS & 4K HIGH-DPI READY)
 */

class CanvasEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';

    // Canonical Design Coordinates (Default: 9:16 vertical 1080x1920)
    this.baseWidth = 1080;
    this.baseHeight = 1920;
    this.aspectRatio = '9:16';

    // Buffer Resolution
    this.width = 1080;
    this.height = 1920;

    this.canvas.width = 1080;
    this.canvas.height = 1920;

    // Multi-Item Slots
    this.items = [];
    this.bgImage = null;

    this.isPlaying = true;
    this.currentTime = 0;
    this.totalDuration = 10;
    this.lastFrameTime = 0;

    this.config = {
      globalScale: 1.0,
      targetYOffset: 0,
      pulseOutline: false,
      outlinePulseSpeed: 1.0,
      motionTrails: 0,
      showCrosshair: true,

      // Procedural Background Patterns & Audio Visualizer
      bgPattern: 'none', // 'none' | 'grid' | 'hex' | 'stars' | 'retro'
      showAudioVisualizer: false,
      visualizerColor: '#00f3ff',

      // Overlays, Watermark, Badges & Timer
      timerStyle: 'circle', // 'circle' | 'bar' | 'digital' | 'none'
      watermarkText: '',
      watermarkOpacity: 0.6,
      viralBadge: 'none', // 'none' | '99-fail' | 'dont-blink' | 'lvl-99' | 'viral' | 'impossible'
      text3dDepth: true,

      // Background
      bgType: 'gradient',
      bgGradient: 'cyberpunk',
      bgColor: '#0d0f18',

      // Text Overlays & Hooks
      headerText: 'CAN YOU STOP THIS? 🛑',
      headerFontFamily: 'Outfit',
      headerTextSize: 52,
      headerFontSize: 52,
      headerTextColor: '#ffe600',
      headerColor: '#ffe600',
      headerTextGrad: 'solid',
      headerPosY: 55,
      headerStrokeWidth: 0,
      headerStrokeColor: '#000000',
      headerGlowBlur: 18,
      headerGlowColor: '#00f3ff',
      headerPillStyle: 'glass',
      headerBgStyle: 'glass',
      headerAnim: 'none',

      // Subtitle / CTA
      subText: 'PAUSE EXACTLY IN THE OUTLINE! 🎯',
      subFontFamily: 'Outfit',
      subTextSize: 28,
      subFontSize: 28,
      subTextColor: '#ffffff',
      subPosY: 60,
      subPillStyle: 'glass',
      subStrokeWidth: 0,
      subStrokeColor: '#000000',

      showTimer: true,
      showCenterDot: true,
      showSparkles: true,
      showItemBadges: true
    };

    this.outlineGen = new OutlineGenerator();
    this.motionEngine = new MotionEngine();

    this.particles = [];
    this.initParticles(40);

    this.onFrameUpdate = () => {};
    this.animFrameId = null;
  }

  initParticles(count) {
    this.particles = [];
    const actualCount = typeof count === 'number' && count > 0 ? count : (this.config.particleCount || 40);
    const w = this.baseWidth || 1080;
    const h = this.baseHeight || 1920;
    const palette = ['#00f3ff', '#ff007f', '#ffe600', '#00ff88', '#b388ff', '#ffffff'];

    for (let i = 0; i < actualCount; i++) {
      // 3D Depth layering: depth factor 0.35 (distant background) to 1.75 (close foreground)
      const depth = Math.random() * 1.4 + 0.35;
      const baseRadius = (Math.random() * 2.2 + 1.2) * depth;
      this.particles.push({
        startX: Math.random() * w,
        startY: Math.random() * h,
        depth: depth,
        radius: baseRadius,
        speedX: (Math.random() - 0.5) * 0.7 * depth,
        speedY: (-Math.random() * 0.8 - 0.2) * depth, // gentle upward floating drift
        baseOpacity: Math.random() * 0.5 + 0.35,
        twinkleSpeed: Math.random() * 2.5 + 1.5,
        phase: Math.random() * Math.PI * 2,
        isSparkleStar: i % 4 === 0, // 25% are 4-point diamond sparkles
        color: palette[i % palette.length]
      });
    }
  }

  setAspectRatio(ratio, w, h) {
    this.aspectRatio = ratio;
    this.baseWidth = w;
    this.baseHeight = h;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    this.initParticles(40);
    this.regenerateAllOutlines();
  }

  setItems(itemsList) {
    this.items = itemsList;
    this.regenerateAllOutlines();
  }

  updateItem(index, updates) {
    if (this.items[index]) {
      Object.assign(this.items[index], updates);
      if (updates.img) {
        this.regenerateOutlineForIndex(index);
      }
    }
  }

  setOutlineOptions(options) {
    this.outlineOptions = options;
    this.regenerateAllOutlines();
  }

  regenerateAllOutlines() {
    this.items.forEach((item, idx) => {
      this.regenerateOutlineForIndex(idx);
    });
  }

  regenerateOutlineForIndex(index) {
    const item = this.items[index];
    if (item && item.img) {
      item.outlineData = this.outlineGen.generateOutline(item.img, this.outlineOptions);
    }
  }

  start() {
    if (!this.isPlaying) {
      this.isPlaying = true;
      this.lastFrameTime = performance.now();
    }
    if (!this.animFrameId) {
      this.loop();
    }
  }

  pause() {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  loop(now = performance.now()) {
    if (!this.isPlaying) return;

    if (!this.lastFrameTime) this.lastFrameTime = now;
    const delta = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    this.currentTime += delta;
    if (this.currentTime >= this.totalDuration) {
      this.currentTime = 0;
    }

    this.renderFrame(this.currentTime);
    this.onFrameUpdate(this.currentTime, this.totalDuration);

    this.animFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  renderFrame(time) {
    const ctx = this.ctx;
    const actualW = this.width;
    const actualH = this.height;
    const baseW = this.baseWidth || 1080;
    const baseH = this.baseHeight || 1920;

    const scaleFactor = actualW / baseW;

    ctx.save();
    ctx.clearRect(0, 0, actualW, actualH);

    // High-DPI Resolution Scaling Matrix (100% 1:1 visual parity across Preview, 720p, 1080p, 2K, and 4K)
    ctx.scale(scaleFactor, scaleFactor);

    // 1. Procedural Background Layer
    this.renderBackground(ctx, baseW, baseH, time);

    // 2. Ambient Floating Particles (deterministic)
    if (this.config.showSparkles) {
      this.renderParticles(ctx, baseW, baseH, time);
    }

    // 3. Targets (Outlines in Background)
    const targetDefs = this.getTargetSlotPositions();
    this.renderTargetSilhouettes(ctx, targetDefs, time);

    // 4. Moving Foreground Objects
    const currentTransforms = this.renderMovingObjects(ctx, targetDefs, time);

    // 5. Header, Timer, and Text Overlays
    this.renderOverlays(ctx, baseW, baseH, time);

    ctx.restore();

    return { currentTransforms, targetDefs };
  }

  /**
   * 20+ High-Fidelity Procedural Backgrounds & Custom Wallpaper Engine
   */
  drawVignetteAndDim(ctx, w, h) {
    // 1. Dark Dimming Tint
    const dim = (this.config.bgDimOpacity !== undefined ? this.config.bgDimOpacity : 35) / 100;
    if (dim > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${dim})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Cinematic Vignette
    const vig = (this.config.bgVignette !== undefined ? this.config.bgVignette : 30) / 100;
    if (vig > 0) {
      const radius = Math.max(w, h) * 0.75;
      const vigGrad = ctx.createRadialGradient(w / 2, h / 2, radius * 0.25, w / 2, h / 2, radius);
      vigGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vigGrad.addColorStop(0.7, `rgba(0, 0, 0, ${vig * 0.6})`);
      vigGrad.addColorStop(1, `rgba(0, 0, 0, ${vig})`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(0, 0, w, h);
    }
  }

  renderBackground(ctx, w, h, time = 0) {
    // 1. Custom Wallpaper Image
    if (this.config.bgType === 'image' && this.bgImage) {
      ctx.save();

      let imgScale = this.config.bgScale || 1.0;
      let panX = 0;
      let panY = 0;

      // Ken Burns Motion (Cinematic dynamic zoom & slow pan)
      if (this.config.bgKenBurns) {
        const kbProgress = (time % this.totalDuration) / this.totalDuration;
        imgScale *= 1.0 + Math.sin(kbProgress * Math.PI) * 0.08;
        panX = Math.sin(kbProgress * Math.PI * 2) * (w * 0.025);
        panY = Math.cos(kbProgress * Math.PI * 2) * (h * 0.015);
      }

      // Bokeh Depth-of-Field Blur
      const blurPx = this.config.bgBlur || 0;
      if (blurPx > 0) {
        ctx.filter = `blur(${blurPx}px)`;
      }

      const imgW = this.bgImage.width || w;
      const imgH = this.bgImage.height || h;
      const fit = this.config.bgFit || 'cover';

      let drawW = w * imgScale;
      let drawH = h * imgScale;
      let drawX = (w - drawW) / 2 + panX;
      let drawY = (h - drawH) / 2 + panY;

      if (fit === 'cover') {
        const ratio = Math.max(w / imgW, h / imgH) * imgScale;
        drawW = imgW * ratio;
        drawH = imgH * ratio;
        drawX = (w - drawW) / 2 + panX;
        drawY = (h - drawH) / 2 + panY;
      } else if (fit === 'contain') {
        const ratio = Math.min(w / imgW, h / imgH) * imgScale;
        drawW = imgW * ratio;
        drawH = imgH * ratio;
        drawX = (w - drawW) / 2 + panX;
        drawY = (h - drawH) / 2 + panY;
        ctx.fillStyle = '#05060a';
        ctx.fillRect(0, 0, w, h);
      }

      const pad = blurPx * 2;
      ctx.drawImage(this.bgImage, drawX - pad, drawY - pad, drawW + pad * 2, drawH + pad * 2);
      ctx.filter = 'none';
      ctx.restore();

      this.drawVignetteAndDim(ctx, w, h);
      return;
    }

    // 2. Custom 2-Color Gradient Generator
    if (this.config.bgType === 'custom-grad') {
      const angle = (this.config.bgGradAngle !== undefined ? this.config.bgGradAngle : 135) * (Math.PI / 180);
      const c1 = this.config.bgGradColor1 || '#0f0c29';
      const c2 = this.config.bgGradColor2 || '#00f3ff';
      const diag = Math.hypot(w, h);
      const x1 = w / 2 - Math.cos(angle) * (diag / 2);
      const y1 = h / 2 - Math.sin(angle) * (diag / 2);
      const x2 = w / 2 + Math.cos(angle) * (diag / 2);
      const y2 = h / 2 + Math.sin(angle) * (diag / 2);

      const grad = ctx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, c1);
      grad.addColorStop(1, c2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      this.drawVignetteAndDim(ctx, w, h);
      return;
    }

    if (this.config.bgType === 'solid') {
      ctx.fillStyle = this.config.bgColor || '#0d0f18';
      ctx.fillRect(0, 0, w, h);
      this.drawVignetteAndDim(ctx, w, h);
      return;
    }

    const gradType = this.config.bgGradient || 'cyberpunk';
    let grad;

    switch (gradType) {
      case 'neon-city': {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#0a001a');
        grad.addColorStop(0.5, '#2e0854');
        grad.addColorStop(0.85, '#ff007f');
        grad.addColorStop(1, '#ffaa00');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Perspective Horizon Grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.18)';
        ctx.lineWidth = 2;
        const horizonY = h * 0.72;
        for (let x = -w; x <= w * 2; x += 90) {
          ctx.beginPath();
          ctx.moveTo(w / 2, horizonY);
          ctx.lineTo(x, h);
          ctx.stroke();
        }
        for (let y = horizonY; y <= h; y += 35) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
        break;
      }

      case 'gaming-rgb': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, h * 0.7);
        grad.addColorStop(0, '#1a103c');
        grad.addColorStop(0.6, '#0d0f18');
        grad.addColorStop(1, '#05060a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Carbon Hex Grid
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.08)';
        ctx.lineWidth = 1.5;
        const hexSize = 50;
        for (let x = 0; x < w + hexSize; x += hexSize * 1.5) {
          for (let y = 0; y < h + hexSize; y += hexSize * 1.732) {
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        break;
      }

      case 'laser-matrix': {
        grad = ctx.createLinearGradient(0, 0, 0, h);
        grad.addColorStop(0, '#020b1e');
        grad.addColorStop(0.7, '#081e3d');
        grad.addColorStop(1, '#00f3ff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.15)';
        ctx.lineWidth = 1.5;
        for (let x = 0; x < w; x += 60) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        break;
      }

      case 'vaporwave': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#2b1055');
        grad.addColorStop(0.5, '#7597de');
        grad.addColorStop(1, '#ff007f');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'inferno': {
        grad = ctx.createRadialGradient(w / 2, h * 0.6, 80, w / 2, h * 0.6, h * 0.8);
        grad.addColorStop(0, '#ff3d00');
        grad.addColorStop(0.4, '#dd2c00');
        grad.addColorStop(0.8, '#3e0600');
        grad.addColorStop(1, '#150000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'luxury-gold': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, h * 0.85);
        grad.addColorStop(0, '#d4af37');
        grad.addColorStop(0.4, '#856d28');
        grad.addColorStop(0.8, '#1f1c16');
        grad.addColorStop(1, '#0d0c0a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'midnight-diamond': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, h * 0.85);
        grad.addColorStop(0, '#0d3268');
        grad.addColorStop(0.5, '#071836');
        grad.addColorStop(1, '#020712');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'emerald-noir': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, h * 0.85);
        grad.addColorStop(0, '#004d40');
        grad.addColorStop(0.5, '#00241b');
        grad.addColorStop(1, '#020d09');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'rose-gold': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#3a1c28');
        grad.addColorStop(0.5, '#b76e79');
        grad.addColorStop(1, '#1b0d12');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'deep-space': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 100, w / 2, h / 2, h);
        grad.addColorStop(0, '#1a103c');
        grad.addColorStop(0.6, '#0b051a');
        grad.addColorStop(1, '#020108');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'supernova': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, h * 0.9);
        grad.addColorStop(0, '#00f3ff');
        grad.addColorStop(0.3, '#7928ca');
        grad.addColorStop(0.7, '#1f0038');
        grad.addColorStop(1, '#05010a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'aurora': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#031b38');
        grad.addColorStop(0.5, '#0575e6');
        grad.addColorStop(1, '#00f260');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'dark-matter': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, h * 0.85);
        grad.addColorStop(0, '#120024');
        grad.addColorStop(0.6, '#28004f');
        grad.addColorStop(1, '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'studio-dark': {
        grad = ctx.createRadialGradient(w / 2, h / 2, 120, w / 2, h / 2, h);
        grad.addColorStop(0, '#323946');
        grad.addColorStop(0.6, '#181b22');
        grad.addColorStop(1, '#090a0d');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'viral-split': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#ff007f');
        grad.addColorStop(0.5, '#100b20');
        grad.addColorStop(1, '#00f3ff');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'electric-violet': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#7b2cbf');
        grad.addColorStop(0.5, '#3c096c');
        grad.addColorStop(1, '#10002b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'acid-lime': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#00ff88');
        grad.addColorStop(0.5, '#0b3d22');
        grad.addColorStop(1, '#03140a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'pure-oled': {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'pastel-creator': {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#ff9a9e');
        grad.addColorStop(0.5, '#fecfef');
        grad.addColorStop(1, '#a1c4fd');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        break;
      }

      case 'cyberpunk':
      default: {
        grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#0f0c29');
        grad.addColorStop(0.5, '#302b63');
        grad.addColorStop(1, '#24243e');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Cyber Grid Lines
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
        ctx.lineWidth = 1;
        const gridSize = 70;
        for (let x = 0; x < w; x += gridSize) {
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = 0; y < h; y += gridSize) {
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
        break;
      }
    }

    this.drawVignetteAndDim(ctx, w, h);
  }

  renderParticles(ctx, w, h, time = 0) {
    if (this.config.showSparkles === false) return;

    const pColorCfg = this.config.particleColor || '#00f3ff';
    const isMulti = pColorCfg === 'multi';
    const speedMult = typeof this.config.particleSpeed === 'number' ? this.config.particleSpeed : 1.0;

    ctx.save();
    this.particles.forEach(p => {
      // Parallax drifting position wrapped seamlessly across canvas
      const x = ((p.startX + p.speedX * speedMult * time * 60) % w + w) % w;
      const y = ((p.startY + p.speedY * speedMult * time * 60) % h + h) % h;

      // Realistic twinkle / shimmer pulsation
      const twinkle = 0.7 + 0.3 * Math.sin(time * p.twinkleSpeed * 3 + p.phase);
      const alpha = Math.max(0.05, Math.min(1.0, p.baseOpacity * twinkle));
      const col = isMulti ? p.color : pColorCfg;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = Math.round(10 * p.depth);

      if (p.isSparkleStar) {
        // Draw 4-point diamond sparkle flare with center core
        const r = p.radius * 1.8;
        ctx.beginPath();
        ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.quadraticCurveTo(x, y, x, y + r);
        ctx.quadraticCurveTo(x, y, x - r, y);
        ctx.quadraticCurveTo(x, y, x, y - r);
        ctx.fill();

        // Bright white center pinpoint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Soft glowing circular bokeh particle
        ctx.beginPath();
        ctx.arc(x, y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
    ctx.restore();
  }

  getTargetSlotPositions() {
    const w = this.baseWidth || 1080;
    const h = this.baseHeight || 1920;
    const centerX = w / 2;
    const centerY = (h / 2) + (this.config.targetYOffset || 0);

    return this.items.map((item, idx) => {
      const baseScale = (item.scale !== undefined ? item.scale : 0.7) * (this.config.globalScale || 1.0);
      return {
        slotIndex: idx + 1,
        id: item.id || `slot-${idx + 1}`,
        name: item.name || `Object ${idx + 1}`,
        targetX: centerX + (item.offsetX || 0),
        targetY: centerY + (item.offsetY || 0),
        targetScale: baseScale,
        targetAngle: item.angle || 0,
        itemRef: item
      };
    });
  }

  renderTargetSilhouettes(ctx, targetDefs, time) {
    const pulseFactor = 1.0; // Strictly disabled: static, crisp outline with 0 pulsing

    targetDefs.forEach(def => {
      const item = def.itemRef;
      if (!item || !item.img) return;

      const img = item.img;
      const imgW = img.naturalWidth || img.width || 400;
      const imgH = img.naturalHeight || img.height || 400;

      ctx.save();
      ctx.translate(def.targetX, def.targetY);
      ctx.rotate((def.targetAngle * Math.PI) / 180);
      ctx.scale(def.targetScale * pulseFactor, def.targetScale * pulseFactor);

      if (item.outlineData && item.outlineData.canvas) {
        const pad = item.outlineData.pad || 0;
        ctx.drawImage(
          item.outlineData.canvas,
          -imgW / 2 - pad,
          -imgH / 2 - pad,
          imgW + pad * 2,
          imgH + pad * 2
        );
      }

      if (this.config.showCenterDot) {
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#00f3ff';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  renderMovingObjects(ctx, targetDefs, time) {
    const transforms = [];
    const baseW = this.baseWidth || 1080;
    const baseH = this.baseHeight || 1920;

    targetDefs.forEach((def, idx) => {
      const item = def.itemRef;
      if (!item || !item.img) return;

      const img = item.img;
      const imgW = img.naturalWidth || img.width || 400;
      const imgH = img.naturalHeight || img.height || 400;

      const motionState = this.motionEngine.getTransformForSlot(
        time,
        idx,
        def,
        { width: baseW, height: baseH }
      );

      transforms.push({
        slotIndex: def.slotIndex,
        x: motionState.x,
        y: motionState.y,
        scale: motionState.scale,
        angle: motionState.angle
      });

      ctx.save();
      ctx.translate(motionState.x, motionState.y);
      ctx.rotate((motionState.angle * Math.PI) / 180);
      ctx.scale(motionState.scale, motionState.scale);
      ctx.drawImage(img, -imgW / 2, -imgH / 2, imgW, imgH);
      ctx.restore();
    });

    return transforms;
  }

  renderOverlays(ctx, w, h, time) {
    ctx.save();

    // 1. TOP VIRAL HOOK / HEADLINE TEXT
    if (this.config.headerText) {
      ctx.save();
      const fontSize = this.config.headerTextSize || this.config.headerFontSize || 52;
      const fontFamily = this.config.headerFontFamily || 'Outfit';
      const isBold = this.config.headerBold !== false;
      const isItalic = !!this.config.headerItalic;
      const fontStyleStr = `${isItalic ? 'italic ' : ''}${isBold ? '800 ' : '400 '}`;
      ctx.font = `${fontStyleStr}${fontSize}px "${fontFamily}", sans-serif`;

      let posX = w / 2;
      let posY = this.config.headerPosY !== undefined ? this.config.headerPosY : 55;
      const align = this.config.headerAlign || 'center';
      ctx.textAlign = align;
      ctx.textBaseline = 'top';

      if (align === 'left') posX = 40;
      else if (align === 'right') posX = w - 40;

      // Text Dynamic Animations
      const animType = this.config.headerAnim || 'none';
      if (animType === 'pulse') {
        const pulse = 1.0 + Math.sin(time * 6) * 0.045;
        ctx.translate(posX, posY + fontSize / 2);
        ctx.scale(pulse, pulse);
        ctx.translate(-posX, -(posY + fontSize / 2));
      } else if (animType === 'flicker') {
        // Fast neon flicker effect
        const flickerSignal = Math.sin(time * 26) + Math.sin(time * 41);
        const flickerOpacity = flickerSignal < -1.3 ? 0.35 : (flickerSignal > 1.3 ? 0.75 : 1.0);
        ctx.globalAlpha *= flickerOpacity;
      } else if (animType === 'wiggle' || animType === 'jitter') {
        // Subtle rhythmic tilt & micro-jitter
        const wiggleAngle = Math.sin(time * 10) * 0.035;
        const wiggleX = Math.sin(time * 16) * 3;
        const wiggleY = Math.cos(time * 12) * 2;
        ctx.translate(posX + wiggleX, posY + fontSize / 2 + wiggleY);
        ctx.rotate(wiggleAngle);
        ctx.translate(-posX, -(posY + fontSize / 2));
      } else if (animType === 'bounce') {
        const bounce = Math.abs(Math.sin(time * 5)) * 12;
        posY -= bounce;
      } else if (animType === 'shake') {
        const shake = Math.sin(time * 24) * 4;
        posX += shake;
      }

      const textColor = this.config.headerTextColor || this.config.headerColor || '#ffe600';

      // Background Banner / Pill Style
      const bgStyle = this.config.headerPillStyle || this.config.headerBgStyle || 'glass';
      if (bgStyle !== 'none') {
        const metrics = ctx.measureText(this.config.headerText);
        const textWidth = metrics.width;
        const paddingX = Math.max(22, fontSize * 0.45);
        const paddingY = Math.max(10, fontSize * 0.22);
        const boxHeight = fontSize + paddingY * 2;
        let boxX = posX - textWidth / 2 - paddingX;
        if (align === 'left') boxX = posX - paddingX;
        if (align === 'right') boxX = posX - textWidth - paddingX;
        const boxY = posY - paddingY;
        const boxWidth = textWidth + paddingX * 2;
        const radius = (bgStyle === 'solid') ? 10 : boxHeight / 2;

        ctx.save();
        if (bgStyle === 'glass') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.5;
        } else if (bgStyle === 'solid') {
          ctx.fillStyle = 'rgba(10, 14, 26, 0.94)';
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.5)';
          ctx.lineWidth = 2;
        } else if (bgStyle === 'neon' || bgStyle === 'pill' || bgStyle === 'glow') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.strokeStyle = textColor || '#00f3ff';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = textColor || '#00f3ff';
          ctx.shadowBlur = 18;
        }

        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Text Glow
      const glowBlur = this.config.headerGlowBlur !== undefined ? this.config.headerGlowBlur : 18;
      if (glowBlur > 0) {
        ctx.shadowColor = this.config.headerGlowColor || textColor;
        ctx.shadowBlur = glowBlur;
      }

      // Stroke Border
      const strokeWidth = this.config.headerStrokeWidth || 0;
      const strokeColor = this.config.headerStrokeColor || '#000000';
      if (strokeWidth > 0) {
        ctx.save();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(this.config.headerText, posX, posY);
        ctx.restore();
      }

      // Fill text (solid or curated text gradients)
      const textGrad = this.config.headerTextGrad || 'solid';
      if (textGrad && textGrad !== 'solid') {
        const metrics = ctx.measureText(this.config.headerText);
        const gradX0 = posX - metrics.width / 2;
        const gradX1 = posX + metrics.width / 2;
        const grad = ctx.createLinearGradient(gradX0, posY, gradX1, posY + fontSize);
        if (textGrad === 'gold') {
          grad.addColorStop(0, '#fff6a3');
          grad.addColorStop(0.5, '#ffd700');
          grad.addColorStop(1, '#ff6a00');
        } else if (textGrad === 'cyber' || textGrad === 'cyan-pink') {
          grad.addColorStop(0, '#00f3ff');
          grad.addColorStop(1, '#ff007f');
        } else if (textGrad === 'neon-green') {
          grad.addColorStop(0, '#00ff88');
          grad.addColorStop(1, '#00f3ff');
        } else if (textGrad === 'fire') {
          grad.addColorStop(0, '#ffea00');
          grad.addColorStop(0.5, '#ff3d00');
          grad.addColorStop(1, '#9b0000');
        } else if (textGrad === 'violet') {
          grad.addColorStop(0, '#e0aaff');
          grad.addColorStop(1, '#7b2cbf');
        } else {
          grad.addColorStop(0, textColor);
          grad.addColorStop(1, textColor);
        }
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = textColor;
      }

      ctx.fillText(this.config.headerText, posX, posY);
      ctx.restore();
    }

    // 2. SUBTITLE / CALL TO ACTION TEXT
    if (this.config.subText) {
      ctx.save();
      const subFontSize = this.config.subTextSize || this.config.subFontSize || 28;
      const subFontFamily = this.config.subFontFamily || 'Outfit';
      const isSubBold = this.config.subBold !== false;
      ctx.font = `${isSubBold ? '700 ' : '400 '}${subFontSize}px "${subFontFamily}", sans-serif`;

      // Correct Bottom Margin calculation: Place at bottom of canvas
      const bottomMargin = this.config.subPosY !== undefined ? this.config.subPosY : 60;
      const subPosY = h - bottomMargin;
      const subPosX = w / 2;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Subtitle Pill / Background Style
      const subPillStyle = this.config.subPillStyle || 'glass';
      if (subPillStyle !== 'none') {
        const subMetrics = ctx.measureText(this.config.subText);
        const subTextW = subMetrics.width;
        const padX = Math.max(18, subFontSize * 0.65);
        const padY = Math.max(8, subFontSize * 0.32);
        const boxW = subTextW + padX * 2;
        const boxH = subFontSize + padY * 2;
        const boxX = subPosX - boxW / 2;
        const boxY = subPosY - boxH / 2;
        const radius = boxH / 2;

        ctx.save();
        if (subPillStyle === 'glass') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.lineWidth = 1.5;
        } else if (subPillStyle === 'neon') {
          ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#00f3ff';
          ctx.shadowBlur = 14;
        } else if (subPillStyle === 'solid') {
          ctx.fillStyle = 'rgba(10, 14, 26, 0.92)';
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
        }
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Subtitle Stroke
      const subStrokeWidth = this.config.subStrokeWidth || 0;
      const subStrokeColor = this.config.subStrokeColor || '#000000';
      if (subStrokeWidth > 0) {
        ctx.save();
        ctx.strokeStyle = subStrokeColor;
        ctx.lineWidth = subStrokeWidth * 2;
        ctx.lineJoin = 'round';
        ctx.strokeText(this.config.subText, subPosX, subPosY);
        ctx.restore();
      }

      ctx.fillStyle = this.config.subTextColor || '#ffffff';
      ctx.fillText(this.config.subText, subPosX, subPosY);
      ctx.restore();
    }

    // 3. VIRAL BADGES (e.g. 99% FAIL / IMPOSSIBLE / DON'T BLINK)
    if (this.config.viralBadge && this.config.viralBadge !== 'none') {
      ctx.save();
      const badgeTextMap = {
        '99-fail': '🔥 99% FAIL',
        'dont-blink': '👀 DON\'T BLINK',
        'lvl-99': '🏆 LEVEL 99',
        'viral': '⚡ VIRAL CHALLENGE',
        'impossible': '💀 IMPOSSIBLE LEVEL'
      };
      const bText = badgeTextMap[this.config.viralBadge] || this.config.viralBadge;
      ctx.font = '800 20px "Space Grotesk", sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      const bMetrics = ctx.measureText(bText);
      const bW = bMetrics.width + 24;
      const bH = 34;
      const bX = w - 40;
      const bY = 55;

      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 127, 0.9)';
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.roundRect(bX - bW, bY, bW, bH, 8);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(bText, bX - 12, bY + 8);
      ctx.restore();
    }

    // 4. WATERMARK TEXT
    if (this.config.watermarkText) {
      ctx.save();
      const wmOpacity = this.config.watermarkOpacity !== undefined ? this.config.watermarkOpacity : 0.6;
      ctx.globalAlpha = wmOpacity;
      ctx.font = '700 22px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(this.config.watermarkText, w - 30, h - 25);
      ctx.restore();
    }

    // 5. PROGRESS TIMER (Supports Circle, Bar, Digital)
    if (this.config.showTimer !== false && this.config.timerStyle !== 'none') {
      const progress = (time % this.totalDuration) / this.totalDuration;
      const remainingSec = Math.ceil(this.totalDuration - (time % this.totalDuration));
      const tStyle = this.config.timerStyle || 'circle';

      if (tStyle === 'circle') {
        const timerX = 75;
        const timerY = 80;
        const timerR = 28;

        ctx.beginPath();
        ctx.arc(timerX, timerY, timerR, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 4;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(timerX, timerY, timerR, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
        ctx.strokeStyle = '#00f3ff';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.stroke();

        ctx.font = `800 18px "Space Grotesk", monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${remainingSec}s`, timerX, timerY);
      } else if (tStyle === 'bar') {
        // Sleek horizontal progress bar across top
        const barH = 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(0, 0, w, barH);

        const barGrad = ctx.createLinearGradient(0, 0, w, 0);
        barGrad.addColorStop(0, '#00f3ff');
        barGrad.addColorStop(1, '#ff007f');
        ctx.fillStyle = barGrad;
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 10;
        ctx.fillRect(0, 0, w * progress, barH);
      } else if (tStyle === 'digital') {
        const dX = 40;
        const dY = 55;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(dX, dY, 110, 36, 6);
        ctx.fill();
        ctx.stroke();

        ctx.font = `800 18px "Space Grotesk", monospace`;
        ctx.fillStyle = '#00f3ff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`⏱️ 00:0${remainingSec}`, dX + 55, dY + 18);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}

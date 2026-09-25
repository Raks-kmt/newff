/**
 * OUTLINE & SILHOUETTE GENERATOR (HIGH-DPI 4K/2K RAZOR SHARP ENGINE)
 * Generates an independent, high-resolution offscreen canvas for EVERY item
 * ensuring crisp glowing outlines on 4K (2160p) and 2K (1440p) screens.
 */

class OutlineGenerator {
  constructor() {}

  /**
   * Generates an independent outline/silhouette canvas for a target image
   * @param {HTMLImageElement|HTMLCanvasElement} img - Source transparent image
   * @param {Object} options - Customization parameters
   */
  generateOutline(img, options = {}) {
    if (!img || !img.width || !img.height) return null;

    const {
      mode = 'outline-only', // 'outline-only' | 'silhouette' | 'both'
      color = '#ffffff',
      color2 = null,
      gradAngle = 90,
      thickness = 8,
      glow = 18,
      dashStyle = 'solid',
      dualLayer = false,
      padding = 50
    } = options;

    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    // Generous padding for thick strokes & neon blur without clipping
    const pad = Math.max(thickness * 3, 30) + glow * 2 + padding;
    const totalW = width + pad * 2;
    const totalH = height + pad * 2;

    const outlineCanvas = document.createElement('canvas');
    outlineCanvas.width = totalW;
    outlineCanvas.height = totalH;
    const ctx = outlineCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Silhouette mask canvas
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = totalW;
    maskCanvas.height = totalH;
    const mCtx = maskCanvas.getContext('2d');
    mCtx.imageSmoothingEnabled = true;
    mCtx.imageSmoothingQuality = 'high';

    // Draw source image centered
    mCtx.drawImage(img, pad, pad, width, height);

    // Colorize all non-transparent pixels (solid or 2-color gradient)
    mCtx.globalCompositeOperation = 'source-in';
    if (color2) {
      const rad = (gradAngle * Math.PI) / 180;
      const x1 = totalW / 2 - Math.cos(rad) * (totalW / 2);
      const y1 = totalH / 2 - Math.sin(rad) * (totalH / 2);
      const x2 = totalW / 2 + Math.cos(rad) * (totalW / 2);
      const y2 = totalH / 2 + Math.sin(rad) * (totalH / 2);
      const grad = mCtx.createLinearGradient(x1, y1, x2, y2);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color2);
      mCtx.fillStyle = grad;
    } else {
      mCtx.fillStyle = color;
    }
    mCtx.fillRect(0, 0, totalW, totalH);
    mCtx.globalCompositeOperation = 'source-over';

    if (mode === 'silhouette') {
      if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow * 1.2;
      }
      ctx.drawImage(maskCanvas, 0, 0);
      if (glow > 0) ctx.drawImage(maskCanvas, 0, 0);

    } else if (mode === 'outline-only') {
      const dilatedCanvas = document.createElement('canvas');
      dilatedCanvas.width = totalW;
      dilatedCanvas.height = totalH;
      const dCtx = dilatedCanvas.getContext('2d');
      dCtx.imageSmoothingEnabled = true;
      dCtx.imageSmoothingQuality = 'high';

      // Multi-directional radial dilation (32-angle circular sweep for super smooth borders)
      const steps = Math.max(24, thickness * 4);
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const dx = Math.cos(angle) * thickness;
        const dy = Math.sin(angle) * thickness;
        dCtx.drawImage(maskCanvas, dx, dy);
      }

      // Punch out interior so only the outer border remains
      dCtx.globalCompositeOperation = 'destination-out';
      dCtx.drawImage(maskCanvas, 0, 0);
      dCtx.globalCompositeOperation = 'source-over';

      if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
      }
      ctx.drawImage(dilatedCanvas, 0, 0);
      if (glow > 0) ctx.drawImage(dilatedCanvas, 0, 0);

      // Dash pattern styling
      if (dashStyle === 'dashed' || dashStyle === 'dotted') {
        ctx.globalCompositeOperation = 'destination-in';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = totalW * 2;
        ctx.lineCap = dashStyle === 'dotted' ? 'round' : 'butt';
        ctx.setLineDash(dashStyle === 'dotted' ? [6, 16] : [22, 16]);
        
        ctx.beginPath();
        for (let y = 0; y < totalH; y += 24) {
          ctx.moveTo(0, y);
          ctx.lineTo(totalW, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'source-over';
      }

    } else if (mode === 'both') {
      if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow * 1.5;
      }
      ctx.globalAlpha = 0.35;
      ctx.drawImage(maskCanvas, 0, 0);
      ctx.globalAlpha = 1.0;

      const steps = 20;
      for (let i = 0; i < steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        const dx = Math.cos(angle) * (thickness * 0.8);
        const dy = Math.sin(angle) * (thickness * 0.8);
        ctx.drawImage(maskCanvas, dx, dy);
      }
    }

    return {
      canvas: outlineCanvas,
      pad: pad,
      width: totalW,
      height: totalH,
      imgWidth: width,
      imgHeight: height
    };
  }
}

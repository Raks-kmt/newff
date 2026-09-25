/**
 * ADVANCED ANIMATION & MOTION PHYSICS ENGINE (12+ VIRAL MOTION STYLES)
 * Math trajectories for multi-item synchronized pause challenges:
 * Pendulum, 360 Spin, DVD Bounce, Orbit, Chaos, Vortex, Figure-8,
 * ZigZag Blitz, Heartbeat Pulse, Parachute Drop, Tornado Helix, and Rollercoaster.
 */

class MotionEngine {
  constructor() {
    this.motionType = 'pendulum';
    this.speed = 1.0;
    this.amplitude = 85; // %
    this.matchFrequency = 2.5; // seconds between alignments
    this.motionTrails = false;
    this.elasticity = 1.0;
  }

  setConfig(config) {
    if (config.motionType) this.motionType = config.motionType;
    if (config.speed !== undefined) this.speed = config.speed;
    if (config.amplitude !== undefined) this.amplitude = config.amplitude;
    if (config.matchFrequency !== undefined) this.matchFrequency = config.matchFrequency;
    if (config.motionTrails !== undefined) this.motionTrails = config.motionTrails;
    if (config.elasticity !== undefined) this.elasticity = config.elasticity;
  }

  getTransformForSlot(t, itemIndex, def, canvasSize) {
    const target = {
      x: def.targetX !== undefined ? def.targetX : def.x,
      y: def.targetY !== undefined ? def.targetY : def.y,
      angle: def.targetAngle !== undefined ? def.targetAngle : (def.angle || 0),
      scale: def.targetScale !== undefined ? def.targetScale : (def.scale || 1.0)
    };
    return this.getTransformAt(t, canvasSize, target, itemIndex);
  }

  /**
   * Calculates transform for a specific item at time `t`
   */
  getTransformAt(t, canvasSize, target, itemIndex = 0) {
    const { width, height } = canvasSize;
    const ampFactor = this.amplitude / 100;
    const effectiveSpeed = this.speed;

    let x = target.x;
    let y = target.y;
    let angle = target.angle;
    let scale = target.scale;
    let opacity = 1.0;
    let isAligned = false;

    const period = this.matchFrequency / effectiveSpeed;

    switch (this.motionType) {
      // 1. CLOCK BELL / PENDULUM
      case 'pendulum': {
        const omega = (Math.PI * 2) / period;
        const maxAngleDeg = 45 * ampFactor;
        const currentAngleOffset = maxAngleDeg * Math.sin(omega * t);

        const armLength = height * 0.36 * ampFactor;
        const pivotX = target.x;
        const pivotY = target.y - armLength;

        const rad = (currentAngleOffset * Math.PI) / 180;
        x = pivotX + Math.sin(rad) * armLength;
        y = pivotY + Math.cos(rad) * armLength;
        angle = target.angle + currentAngleOffset;

        const matchDist = Math.abs(Math.sin(omega * t));
        if (matchDist < 0.05) isAligned = true;
        break;
      }

      // 2. 360° CONTINUOUS SPIN
      case 'spin': {
        const dir = (itemIndex % 2 === 0) ? 1 : -1;
        const spinSpeed = (360 / (period / 2)) * effectiveSpeed * dir;
        const totalRot = (t * spinSpeed) % 360;

        angle = target.angle + totalRot;
        scale = target.scale; // Zero pulsing: rock-solid scale for perfect outline match

        const angleDiff = Math.abs((dir > 0 ? totalRot : (360 + totalRot)) % 360);
        if (angleDiff < 10 || angleDiff > 350) isAligned = true;
        break;
      }

      // 3. DVD / WALL BOUNCER
      case 'bounce': {
        const kx = (Math.PI * 2) / period;
        const ky = (Math.PI * 4) / period;
        const phaseMod = (itemIndex * Math.PI * 2);

        const spanX = (width * 0.32) * ampFactor;
        const spanY = (height * 0.22) * ampFactor;

        x = target.x + Math.sin(kx * t + phaseMod) * spanX;
        y = target.y + Math.sin(ky * t + phaseMod) * spanY;
        angle = target.angle + Math.sin(t * 3 + itemIndex) * (18 * ampFactor);

        const dist = Math.hypot(x - target.x, y - target.y);
        if (dist < 35) isAligned = true;
        break;
      }

      // 4. ORBITAL / SPIRAL ECLIPSE
      case 'orbit': {
        const theta = (Math.PI * 2 * t) / period;
        const radiusX = (width * 0.3) * ampFactor;
        const radiusY = (height * 0.18) * ampFactor;
        const radiusMod = Math.abs(Math.cos(theta));

        x = target.x + Math.cos(theta) * radiusX * radiusMod;
        y = target.y + Math.sin(theta) * radiusY * radiusMod;
        angle = target.angle + (theta * 180) / Math.PI;

        const dist = Math.hypot(x - target.x, y - target.y);
        if (dist < 40) isAligned = true;
        break;
      }

      // 5. CHAOS SPEED RUSH
      case 'chaos': {
        const phase = (t / period) % 1.0;
        let ease;
        if (phase < 0.7) {
          ease = Math.sin(phase * Math.PI * 1.4);
        } else {
          ease = 1.0 - Math.pow((1.0 - phase) / 0.3, 3);
        }

        const distanceSpan = (width * 0.32) * ampFactor;
        const dirAngle = Math.sin(Math.floor(t / period) * 123.45 + itemIndex * 1.5) * Math.PI * 2;

        x = target.x + Math.cos(dirAngle) * distanceSpan * (1 - ease);
        y = target.y + Math.sin(dirAngle) * distanceSpan * (1 - ease);
        angle = target.angle + (1 - ease) * 180;
        scale = target.scale * (0.6 + ease * 0.4);

        if (phase > 0.94 || phase < 0.05) isAligned = true;
        break;
      }

      // 6. 🕳️ BLACK HOLE VORTEX (Cosmic Inward Spiral)
      case 'vortex': {
        const phase = (t / period) % 1.0;
        const spiralRot = phase * Math.PI * 6; // 3 full turns
        const currentRadius = (1.0 - phase) * (width * 0.42 * ampFactor);

        x = target.x + Math.cos(spiralRot + itemIndex) * currentRadius;
        y = target.y + Math.sin(spiralRot + itemIndex) * currentRadius;
        angle = target.angle + (spiralRot * 180) / Math.PI;
        scale = target.scale * (0.4 + phase * 0.6);

        if (phase > 0.92 || phase < 0.04) isAligned = true;
        break;
      }

      // 7. 🏎️ FIGURE-8 INFINITY LOOP (Drifting)
      case 'figure8': {
        const theta = (Math.PI * 2 * t) / period;
        const scaleX = (width * 0.34) * ampFactor;
        const scaleY = (height * 0.22) * ampFactor;

        // Lemniscate of Gerono (Smooth infinity path)
        x = target.x + Math.sin(theta) * scaleX;
        y = target.y + Math.sin(theta) * Math.cos(theta) * scaleY * 2;
        angle = target.angle + Math.cos(theta) * (30 * ampFactor);

        const dist = Math.hypot(x - target.x, y - target.y);
        if (dist < 35) isAligned = true;
        break;
      }

      // 8. ⚡ ZIG-ZAG BLITZ (High-Speed Dashes)
      case 'zigzag': {
        const phase = (t / period) % 1.0;
        const subStep = Math.floor(phase * 4);
        const subPhase = (phase * 4) % 1.0;
        const span = (width * 0.3) * ampFactor;

        const waypoints = [
          { x: -span, y: -span * 0.6, a: -25 },
          { x: span, y: -span * 0.2, a: 25 },
          { x: -span * 0.8, y: span * 0.4, a: -15 },
          { x: 0, y: 0, a: 0 }
        ];

        const startPt = waypoints[subStep];
        const endPt = waypoints[(subStep + 1) % waypoints.length];

        // Smooth cubic ease between waypoints
        const ease = subPhase * subPhase * (3 - 2 * subPhase);
        x = target.x + (startPt.x + (endPt.x - startPt.x) * ease);
        y = target.y + (startPt.y + (endPt.y - startPt.y) * ease);
        angle = target.angle + (startPt.a + (endPt.a - startPt.a) * ease);

        if (subStep === 3 && subPhase > 0.8) isAligned = true;
        break;
      }

      // 9. 💓 HEARTBEAT PULSE & ZOOM BLOOM
      case 'heartbeat': {
        const phase = (t / period) % 1.0;
        // Double pulse heartbeat rhythm
        let zoom = 1.0;
        if (phase < 0.2) {
          zoom = 1.0 + Math.sin(phase * Math.PI * 5) * 0.5 * ampFactor;
        } else if (phase >= 0.25 && phase < 0.45) {
          zoom = 1.0 + Math.sin((phase - 0.25) * Math.PI * 5) * 0.35 * ampFactor;
        } else {
          zoom = 1.0;
        }

        scale = target.scale * zoom;
        const wobbleX = Math.sin(t * 12) * (15 * ampFactor) * (zoom - 1);
        x = target.x + wobbleX;
        y = target.y;
        angle = target.angle;

        if (phase >= 0.65) isAligned = true;
        break;
      }

      // 10. 🪂 PARACHUTE DROP & FLOAT
      case 'drop': {
        const phase = (t / period) % 1.0;
        const startY = target.y - (height * 0.45 * ampFactor);

        let curY;
        if (phase < 0.75) {
          // Gravity fall with air resistance
          const dropProgress = phase / 0.75;
          curY = startY + (target.y - startY) * Math.pow(dropProgress, 1.8);
        } else {
          // Elastic touch-down settle
          const settleProgress = (phase - 0.75) / 0.25;
          curY = target.y + Math.sin(settleProgress * Math.PI * 2) * (12 * (1 - settleProgress));
        }

        const sway = Math.sin(phase * Math.PI * 6) * (35 * ampFactor);
        x = target.x + sway;
        y = curY;
        angle = target.angle + Math.cos(phase * Math.PI * 6) * (15 * ampFactor);

        if (phase > 0.72 && phase < 0.85) isAligned = true;
        break;
      }

      // 11. 🌪️ TORNADO DOUBLE HELIX
      case 'tornado': {
        const theta = (Math.PI * 2 * t) / period;
        const heightSpan = (height * 0.3) * ampFactor;
        const widthSpan = (width * 0.32) * ampFactor;

        x = target.x + Math.sin(theta * 3 + itemIndex * Math.PI) * widthSpan * Math.cos(theta);
        y = target.y + Math.sin(theta) * heightSpan;
        angle = target.angle + Math.sin(theta * 2) * 45;
        scale = target.scale * (0.8 + Math.cos(theta * 3) * 0.25);

        const dist = Math.hypot(x - target.x, y - target.y);
        if (dist < 35) isAligned = true;
        break;
      }

      // 12. 🎢 ROLLERCOASTER LOOP
      case 'rollercoaster': {
        const theta = (Math.PI * 2 * t) / period;
        const loopRadius = (width * 0.28) * ampFactor;

        // Circular loop with straight run-in and run-out
        x = target.x + Math.sin(theta) * loopRadius;
        y = target.y - (1 - Math.cos(theta)) * loopRadius;
        angle = target.angle + (theta * 180) / Math.PI;

        const dist = Math.hypot(x - target.x, y - target.y);
        if (dist < 35) isAligned = true;
        break;
      }
    }

    return {
      x,
      y,
      angle,
      scale,
      opacity,
      isAligned
    };
  }

  calculateMultiAccuracy(itemTransforms, itemTargets, canvasSize) {
    const maxDistTolerance = Math.min(canvasSize.width, canvasSize.height) * 0.35;
    let totalScore = 0;
    const itemScores = [];

    for (let i = 0; i < itemTransforms.length; i++) {
      const current = itemTransforms[i];
      const target = itemTargets[i];

      const tX = target.targetX !== undefined ? target.targetX : (target.x || 0);
      const tY = target.targetY !== undefined ? target.targetY : (target.y || 0);
      const tAngle = target.targetAngle !== undefined ? target.targetAngle : (target.angle || 0);

      const dist = Math.hypot(current.x - tX, current.y - tY);
      let rotDiff = Math.abs((current.angle - tAngle) % 360);
      if (rotDiff > 180) rotDiff = 360 - rotDiff;

      const distScore = Math.max(0, 1 - (dist / maxDistTolerance));
      const angleScore = Math.max(0, 1 - (rotDiff / 90));

      const rawItemScore = (distScore * 0.65 + angleScore * 0.35) * 100;
      const finalItemScore = Math.min(100, Math.max(0, rawItemScore));

      itemScores.push({
        slotIndex: i + 1,
        percent: parseFloat(finalItemScore.toFixed(1)),
        distPixels: Math.round(dist),
        angleDiffDeg: Math.round(rotDiff)
      });

      totalScore += finalItemScore;
    }

    const overallPercent = parseFloat((totalScore / itemTransforms.length).toFixed(1));

    return {
      overallPercent,
      itemScores,
      totalItems: itemTransforms.length
    };
  }
}

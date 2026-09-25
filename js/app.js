/**
 * PRO STOP CHALLENGE STUDIO 2.0 (NLE VIDEO EDITOR CONTROLLER)
 * Powers the Multi-Track Timeline, Frame-Stepping Transport,
 * Inspector Panels, and Instant 60 FPS Export Pipeline.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Core DOM Elements
  const canvas = document.getElementById('mainCanvas');
  const canvasFrame = document.getElementById('canvasFrame');
  const playheadLine = document.getElementById('playheadLine');
  const tcCurrent = document.getElementById('tcCurrent');
  const tcTotal = document.getElementById('tcTotal');
  const vuFillL = document.getElementById('vuFillL');
  const vuFillR = document.getElementById('vuFillR');

  // 2. Engine Instances
  const audioManager = new AudioManager();
  const canvasEngine = new CanvasEngine(canvas);
  const videoRecorder = new VideoRecorder(canvasEngine, audioManager);

  // 3. Default Outline Styling
  const outlineOptions = {
    mode: 'outline-only',
    color: '#ffffff',
    thickness: 6,
    glow: 15,
    dashStyle: 'solid'
  };
  canvasEngine.setOutlineOptions(outlineOptions);

  // 4. App State
  let activeItems = [];
  let currentItemCount = 1;
  let activeSlotIndex = 0;

  // Selected Export Options
  let selectedExportRes = '4k';
  let selectedExportFps = 60;
  let selectedExportFormat = 'mp4';

  // 1000+ Presets Library
  const all1000Presets = generate1000Presets();

  // Helper: Format Timecode string
  function formatTimecode(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const frames = Math.floor((seconds % 1) * 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(frames).padStart(2, '0')}`;
  }

  // -------------------------------------------------------------
  // MULTI-ITEM SLOT INITIALIZATION (1 to 5 Objects)
  // -------------------------------------------------------------
  async function setupItemSlots(count, comboData = null) {
    currentItemCount = count;
    const badge = document.getElementById('itemCountBadge');
    if (badge) badge.textContent = `${count} Object${count > 1 ? 's' : ''}`;

    document.querySelectorAll('.btn-count').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.getAttribute('data-count')) === count);
    });

    const newItems = [];
    const defaultKeys = ['burger', 'fries', 'soda', 'pizza', 'donut'];

    const templates = {
      1: [{ offsetX: 0, offsetY: 0, scale: 0.7, angle: 0 }],
      2: [
        { offsetX: 0, offsetY: -260, scale: 0.58, angle: 0 },
        { offsetX: 0, offsetY: 260, scale: 0.58, angle: 0 }
      ],
      3: [
        { offsetX: 0, offsetY: -460, scale: 0.46, angle: 0 },
        { offsetX: 0, offsetY: 0, scale: 0.52, angle: 0 },
        { offsetX: 0, offsetY: 460, scale: 0.48, angle: 0 }
      ],
      4: [
        { offsetX: -180, offsetY: -320, scale: 0.42, angle: 0 },
        { offsetX: 180, offsetY: -320, scale: 0.42, angle: 0 },
        { offsetX: -180, offsetY: 320, scale: 0.42, angle: 0 },
        { offsetX: 180, offsetY: 320, scale: 0.46, angle: 0 }
      ],
      5: [
        { offsetX: -180, offsetY: -420, scale: 0.36, angle: 0 },
        { offsetX: 180, offsetY: -420, scale: 0.36, angle: 0 },
        { offsetX: 0, offsetY: 0, scale: 0.42, angle: 0 },
        { offsetX: -180, offsetY: 420, scale: 0.36, angle: 0 },
        { offsetX: 180, offsetY: 420, scale: 0.36, angle: 0 }
      ]
    };

    const layout = comboData?.items || templates[count] || templates[1];

    for (let i = 0; i < count; i++) {
      let objKey = comboData?.items[i]?.objKey || defaultKeys[i % defaultKeys.length];
      const presetObj = PRESETS.catalog[objKey] || PRESETS.catalog.burger;

      const { image, url } = await svgToImage(presetObj.svg);
      const conf = layout[i] || { offsetX: 0, offsetY: 0, scale: 0.5, angle: 0 };

      newItems.push({
        id: `slot-${i + 1}`,
        name: presetObj.name,
        objKey: objKey,
        img: image,
        imgUrl: url,
        offsetX: conf.offsetX,
        offsetY: conf.offsetY,
        scale: conf.scale,
        angle: conf.angle,
        flipX: false,
        flipY: false,
        shadowBlur: 0,
        shadowOffsetY: 0,
        shadowOpacity: 50,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        outlineData: null
      });
    }

    activeItems = newItems;
    canvasEngine.setItems(activeItems);
    renderSlotCardsUI();

    if (comboData?.headerText) {
      document.getElementById('headerText').value = comboData.headerText;
      canvasEngine.config.headerText = comboData.headerText;
      const clip = document.getElementById('clipText');
      if (clip) clip.textContent = `📝 "${comboData.headerText}"`;
    }
    if (comboData?.motionType) {
      document.querySelectorAll('.motion-card').forEach(c => {
        c.classList.toggle('active', c.getAttribute('data-motion') === comboData.motionType);
      });
      canvasEngine.motionEngine.setConfig({ motionType: comboData.motionType });
    }
  }

  function renderSlotCardsUI() {
    const container = document.getElementById('itemSlotsContainer');
    if (!container) return;
    container.innerHTML = '';

    activeItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'item-slot-card';
      const scalePct = Math.round(item.scale * 100);
      card.innerHTML = `
        <div class="slot-header">
          <div class="slot-title-badge">
            <span class="slot-tag">ACTIVE PRODUCT</span>
            <span class="slot-name">${item.name}</span>
          </div>
          <button class="btn btn-ghost btn-sm change-slot-obj-btn" data-slot="${idx}" title="Choose another product image">
            🔄 Switch
          </button>
        </div>

        <div class="slot-body">
          <div class="slot-thumb-wrap" data-slot="${idx}">
            <img src="${item.imgUrl || item.img.src}" alt="Slot ${idx + 1}">
            <input type="file" class="file-input slot-file-input" data-slot="${idx}" accept="image/png,image/webp">
          </div>

          <div class="slot-controls">
            <div class="slot-mini-slider">
              <label>Scale: <span class="slot-val-badge" id="slotScaleVal-${idx}">${scalePct}%</span></label>
              <input type="range" class="custom-slider slot-scale-slider" data-slot="${idx}" min="15" max="150" value="${scalePct}">
            </div>
            <div class="slot-mini-slider">
              <label>X-Pos: <span class="slot-val-badge" id="slotXVal-${idx}">${item.offsetX}px</span></label>
              <input type="range" class="custom-slider slot-x-slider" data-slot="${idx}" min="-400" max="400" value="${item.offsetX}">
            </div>
            <div class="slot-mini-slider">
              <label>Y-Pos: <span class="slot-val-badge" id="slotYVal-${idx}">${item.offsetY}px</span></label>
              <input type="range" class="custom-slider slot-y-slider" data-slot="${idx}" min="-650" max="650" value="${item.offsetY}">
            </div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('.slot-scale-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const slotIdx = parseInt(e.target.getAttribute('data-slot'));
        const intVal = parseInt(e.target.value);
        const val = intVal / 100;
        if (activeItems[slotIdx]) {
          activeItems[slotIdx].scale = val;
          canvasEngine.updateItem(slotIdx, { scale: val });
          const valEl = document.getElementById(`slotScaleVal-${slotIdx}`);
          if (valEl) valEl.textContent = `${intVal}%`;
          triggerAutoSave();
        }
      });
    });

    container.querySelectorAll('.slot-x-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const slotIdx = parseInt(e.target.getAttribute('data-slot'));
        const val = parseInt(e.target.value);
        if (activeItems[slotIdx]) {
          activeItems[slotIdx].offsetX = val;
          canvasEngine.updateItem(slotIdx, { offsetX: val });
          const valEl = document.getElementById(`slotXVal-${slotIdx}`);
          if (valEl) valEl.textContent = `${val}px`;
          triggerAutoSave();
        }
      });
    });

    container.querySelectorAll('.slot-y-slider').forEach(slider => {
      slider.addEventListener('input', (e) => {
        const slotIdx = parseInt(e.target.getAttribute('data-slot'));
        const val = parseInt(e.target.value);
        if (activeItems[slotIdx]) {
          activeItems[slotIdx].offsetY = val;
          canvasEngine.updateItem(slotIdx, { offsetY: val });
          const valEl = document.getElementById(`slotYVal-${slotIdx}`);
          if (valEl) valEl.textContent = `${val}px`;
          triggerAutoSave();
        }
      });
    });

    container.querySelectorAll('.slot-file-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const slotIdx = parseInt(e.target.getAttribute('data-slot'));
        if (e.target.files && e.target.files[0]) {
          handleSingleSlotUpload(slotIdx, e.target.files[0]);
        }
      });
    });

    container.querySelectorAll('.change-slot-obj-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const slotIdx = parseInt(btn.getAttribute('data-slot'));
        activeSlotIndex = slotIdx;
        const fileInput = btn.closest('.item-slot-card').querySelector('.slot-file-input');
        if (fileInput) fileInput.click();
      });
    });
  }

  function handleSingleSlotUpload(slotIdx, file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // SMART REPLACEMENT: Preserve existing scale, position offsets, rotation angle
        const existing = activeItems[slotIdx] || {};
        const preservedScale = existing.scale !== undefined ? existing.scale : 0.7;
        const preservedOffsetX = existing.offsetX !== undefined ? existing.offsetX : 0;
        const preservedOffsetY = existing.offsetY !== undefined ? existing.offsetY : 0;
        const preservedAngle = existing.angle !== undefined ? existing.angle : 0;

        activeItems[slotIdx] = {
          ...existing,
          id: existing.id || `slot-${slotIdx + 1}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          img: img,
          imgUrl: e.target.result,
          scale: preservedScale,
          offsetX: preservedOffsetX,
          offsetY: preservedOffsetY,
          angle: preservedAngle,
          outlineData: null // Regenerates silhouette with current outline styles automatically
        };

        canvasEngine.setItems(activeItems);
        renderSlotCardsUI();
        if (!canvasEngine.isPlaying) {
          canvasEngine.renderFrame(canvasEngine.currentTime);
        }
        triggerAutoSave();
        flashSaveBadge(`Product Updated ✓`);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // PNG Drag & Drop
  const multiPngDropzone = document.getElementById('multiPngDropzone');
  const multiPngInput = document.getElementById('multiPngInput');

  function handleMultiPngFiles(files) {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find(f => f.type.startsWith('image/'));
    if (!file) return;
    handleSingleSlotUpload(activeSlotIndex || 0, file);
  }

  if (multiPngInput) {
    multiPngInput.addEventListener('change', (e) => {
      if (e.target.files) handleMultiPngFiles(e.target.files);
    });
  }
  if (multiPngDropzone) {
    multiPngDropzone.addEventListener('dragover', (e) => { e.preventDefault(); multiPngDropzone.classList.add('dragover'); });
    multiPngDropzone.addEventListener('dragleave', () => multiPngDropzone.classList.remove('dragover'));
    multiPngDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      multiPngDropzone.classList.remove('dragover');
      if (e.dataTransfer.files) handleMultiPngFiles(e.dataTransfer.files);
    });
  }

  // Emoji / Sticker Maker with Smart Replacement
  async function applyEmojiToCurrentSlot(emojiStr) {
    if (!emojiStr) return;
    const { image, url } = await emojiToImage(emojiStr.trim(), 1200);
    const targetSlot = Math.min(activeSlotIndex, Math.max(0, activeItems.length - 1));
    if (!activeItems[targetSlot]) return;

    // SMART REPLACEMENT: Preserve existing scale, offsets and angle
    const existing = activeItems[targetSlot];
    const preservedScale = existing.scale !== undefined ? existing.scale : 0.7;
    const preservedOffsetX = existing.offsetX !== undefined ? existing.offsetX : 0;
    const preservedOffsetY = existing.offsetY !== undefined ? existing.offsetY : 0;
    const preservedAngle = existing.angle !== undefined ? existing.angle : 0;

    activeItems[targetSlot] = {
      ...existing,
      name: `Emoji ${emojiStr}`,
      img: image,
      imgUrl: url,
      scale: preservedScale,
      offsetX: preservedOffsetX,
      offsetY: preservedOffsetY,
      angle: preservedAngle,
      outlineData: null
    };

    canvasEngine.setItems(activeItems);
    renderSlotCardsUI();
    if (!canvasEngine.isPlaying) {
      canvasEngine.renderFrame(canvasEngine.currentTime);
    }
    triggerAutoSave();
    flashSaveBadge(`Emoji ${emojiStr} Applied ✓`);
  }

  document.querySelectorAll('.emoji-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const emoji = pill.getAttribute('data-emoji');
      applyEmojiToCurrentSlot(emoji);
    });
  });

  // =============================================================
  // REAL-TIME AUTO-SAVE & SESSION PERSISTENCE ENGINE
  // =============================================================
  const AUTO_SAVE_KEY = 'stop_challenge_pro_session_autosave_v2';
  let autoSaveTimeout = null;

  function flashSaveBadge(msg = 'Auto-Saved ✓') {
    const textEl = document.getElementById('saveStatusText');
    const badgeEl = document.getElementById('saveStatusBadge');
    if (textEl) textEl.textContent = msg;
    if (badgeEl) {
      badgeEl.classList.add('saving');
      setTimeout(() => {
        badgeEl.classList.remove('saving');
        if (textEl) textEl.textContent = 'Auto-Saved ✓';
      }, 1200);
    }
  }

  function triggerAutoSave() {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      saveSessionToStorage();
    }, 350);
  }

  function saveSessionToStorage() {
    try {
      const serializedItems = activeItems.map(item => ({
        id: item.id,
        name: item.name,
        objKey: item.objKey,
        imgUrl: item.imgUrl || (item.img && item.img.src) || '',
        offsetX: item.offsetX !== undefined ? item.offsetX : 0,
        offsetY: item.offsetY !== undefined ? item.offsetY : 0,
        scale: item.scale !== undefined ? item.scale : 0.7,
        angle: item.angle !== undefined ? item.angle : 0
      }));

      const activeTabBtn = document.querySelector('.tab-btn.active');
      const activeTabId = activeTabBtn ? activeTabBtn.getAttribute('data-tab') : 'objects-tab';

      const sessionData = {
        activeTab: activeTabId,
        aspectRatio: canvasEngine.aspectRatio || '9:16',
        globalScale: canvasEngine.config.globalScale !== undefined ? canvasEngine.config.globalScale : 1.0,
        itemCount: currentItemCount,
        activeSlotIndex: activeSlotIndex,
        items: serializedItems,
        outlineConfig: {
          ...outlineOptions,
          targetYOffset: canvasEngine.config.targetYOffset,
          pulseOutline: false,
          showCrosshair: canvasEngine.config.showCrosshair,
          outlinePulseSpeed: canvasEngine.config.outlinePulseSpeed
        },
        motionConfig: {
          motionType: canvasEngine.motionEngine.motionType,
          speed: canvasEngine.motionEngine.speed !== undefined ? canvasEngine.motionEngine.speed : 1.0,
          amplitude: canvasEngine.motionEngine.amplitude !== undefined ? canvasEngine.motionEngine.amplitude : 85,
          motionTrails: canvasEngine.config.motionTrails,
          totalDuration: canvasEngine.totalDuration
        },
        bgConfig: {
          bgType: canvasEngine.config.bgType,
          bgGradient: canvasEngine.config.bgGradient,
          bgColor: canvasEngine.config.bgColor,
          bgGradColor1: canvasEngine.config.bgGradColor1,
          bgGradColor2: canvasEngine.config.bgGradColor2,
          bgGradAngle: canvasEngine.config.bgGradAngle,
          bgFit: canvasEngine.config.bgFit,
          bgScale: canvasEngine.config.bgScale,
          bgBlur: canvasEngine.config.bgBlur,
          bgDimOpacity: canvasEngine.config.bgDimOpacity,
          bgVignette: canvasEngine.config.bgVignette,
          bgKenBurns: canvasEngine.config.bgKenBurns,
          showSparkles: canvasEngine.config.showSparkles,
          particleCount: canvasEngine.config.particleCount,
          particleSpeed: canvasEngine.config.particleSpeed,
          particleColor: canvasEngine.config.particleColor,
          showAudioVisualizer: canvasEngine.config.showAudioVisualizer,
          visualizerColor: canvasEngine.config.visualizerColor,
          bgImageUrl: canvasEngine.bgImage ? (canvasEngine.bgImage.src || '') : '',
          customBgFileName: (document.getElementById('customBgFileName') && document.getElementById('customBgFileName').textContent) || ''
        },
        audioConfig: {
          currentPreset: audioManager.currentPreset,
          volume: audioManager.volume
        },
        textConfig: {
          headerText: canvasEngine.config.headerText,
          headerFontFamily: canvasEngine.config.headerFontFamily,
          headerTextSize: canvasEngine.config.headerTextSize,
          headerTextColor: canvasEngine.config.headerTextColor,
          headerTextGrad: canvasEngine.config.headerTextGrad,
          headerPosY: canvasEngine.config.headerPosY,
          headerStrokeWidth: canvasEngine.config.headerStrokeWidth,
          headerStrokeColor: canvasEngine.config.headerStrokeColor,
          headerGlowBlur: canvasEngine.config.headerGlowBlur,
          headerPillStyle: canvasEngine.config.headerPillStyle,
          headerAnim: canvasEngine.config.headerAnim,

          subText: canvasEngine.config.subText,
          subFontFamily: canvasEngine.config.subFontFamily,
          subTextSize: canvasEngine.config.subTextSize,
          subTextColor: canvasEngine.config.subTextColor,
          subPosY: canvasEngine.config.subPosY,
          subPillStyle: canvasEngine.config.subPillStyle,
          viralBadge: canvasEngine.config.viralBadge,
          watermarkText: canvasEngine.config.watermarkText,
          watermarkOpacity: canvasEngine.config.watermarkOpacity,
          timerStyle: canvasEngine.config.timerStyle,
          aspectRatio: canvasEngine.aspectRatio
        },
        timestamp: Date.now()
      };

      localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(sessionData));
      flashSaveBadge('Auto-Saved ✓');
    } catch (e) {
      console.warn('Auto-save warning:', e);
    }
  }

  // Ensure synchronous save when user leaves or closes window
  window.addEventListener('beforeunload', () => {
    saveSessionToStorage();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      saveSessionToStorage();
    }
  });

  async function restoreSessionFromStorage() {
    try {
      const raw = localStorage.getItem(AUTO_SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!data || !data.items || data.items.length === 0) return false;

      // 0. Active Tab & Global Scale
      if (data.activeTab) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${data.activeTab}"]`);
        const tabPane = document.getElementById(data.activeTab);
        if (tabBtn && tabPane) {
          document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
          document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
          tabBtn.classList.add('active');
          tabPane.classList.add('active');
        }
      }

      if (data.globalScale !== undefined) {
        canvasEngine.config.globalScale = data.globalScale;
        const gsSlider = document.getElementById('globalScale');
        if (gsSlider) gsSlider.value = Math.round(data.globalScale * 100);
        const gsVal = document.getElementById('globalScaleVal');
        if (gsVal) gsVal.textContent = `${Math.round(data.globalScale * 100)}%`;
      }

      // 1. Text & Aspect Ratio
      if (data.textConfig) {
        if (data.textConfig.aspectRatio) {
          const ratio = data.textConfig.aspectRatio;
          const ratioBtn = document.querySelector(`.btn-ratio[data-ratio="${ratio}"]`);
          if (ratioBtn) {
            document.querySelectorAll('.btn-ratio').forEach(b => b.classList.remove('active'));
            ratioBtn.classList.add('active');
            const w = parseInt(ratioBtn.getAttribute('data-w'));
            const h = parseInt(ratioBtn.getAttribute('data-h'));
            canvasEngine.setAspectRatio(ratio, w, h);
            if (canvasFrame) canvasFrame.className = `canvas-frame aspect-${ratio.replace(':', '-')}`;
          }
        }
        if (data.textConfig.headerText !== undefined) {
          const headerInput = document.getElementById('headerText');
          if (headerInput) headerInput.value = data.textConfig.headerText;
          canvasEngine.config.headerText = data.textConfig.headerText;
          const clip = document.getElementById('clipText');
          if (clip) clip.textContent = `📝 "${data.textConfig.headerText}"`;
        }
        if (data.textConfig.headerFontFamily) {
          const fontSelect = document.getElementById('headerFontFamily');
          if (fontSelect) fontSelect.value = data.textConfig.headerFontFamily;
          canvasEngine.config.headerFontFamily = data.textConfig.headerFontFamily;
        }
        if (data.textConfig.headerTextSize) {
          const sizeInput = document.getElementById('headerTextSize');
          if (sizeInput) sizeInput.value = data.textConfig.headerTextSize;
          const valEl = document.getElementById('headerTextSizeVal');
          if (valEl) valEl.textContent = `${data.textConfig.headerTextSize} px`;
          canvasEngine.config.headerTextSize = data.textConfig.headerTextSize;
        }
        if (data.textConfig.headerPosY !== undefined) {
          const posYInput = document.getElementById('headerPosY');
          if (posYInput) posYInput.value = data.textConfig.headerPosY;
          const valEl = document.getElementById('headerPosYVal');
          if (valEl) valEl.textContent = `${data.textConfig.headerPosY} px`;
          canvasEngine.config.headerPosY = data.textConfig.headerPosY;
        }
        if (data.textConfig.headerTextColor) {
          const colorInput = document.getElementById('headerTextColor');
          if (colorInput) colorInput.value = data.textConfig.headerTextColor;
          const valEl = document.getElementById('headerTextColorVal');
          if (valEl) valEl.textContent = data.textConfig.headerTextColor;
          canvasEngine.config.headerTextColor = data.textConfig.headerTextColor;
        }
        if (data.textConfig.headerTextGrad) {
          canvasEngine.config.headerTextGrad = data.textConfig.headerTextGrad;
          document.querySelectorAll('.text-grad-presets .btn-tag').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tgrad') === data.textConfig.headerTextGrad);
          });
        }
        if (data.textConfig.headerStrokeWidth !== undefined) {
          const swInput = document.getElementById('headerStrokeWidth');
          if (swInput) swInput.value = data.textConfig.headerStrokeWidth;
          const valEl = document.getElementById('headerStrokeWidthVal');
          if (valEl) valEl.textContent = `${data.textConfig.headerStrokeWidth} px`;
          canvasEngine.config.headerStrokeWidth = data.textConfig.headerStrokeWidth;
        }
        if (data.textConfig.headerStrokeColor) {
          const scInput = document.getElementById('headerStrokeColor');
          if (scInput) scInput.value = data.textConfig.headerStrokeColor;
          canvasEngine.config.headerStrokeColor = data.textConfig.headerStrokeColor;
        }
        if (data.textConfig.headerGlowBlur !== undefined) {
          const gbInput = document.getElementById('headerGlowBlur');
          if (gbInput) gbInput.value = data.textConfig.headerGlowBlur;
          const valEl = document.getElementById('headerGlowBlurVal');
          if (valEl) valEl.textContent = `${data.textConfig.headerGlowBlur} px`;
          canvasEngine.config.headerGlowBlur = data.textConfig.headerGlowBlur;
        }
        if (data.textConfig.headerPillStyle) {
          canvasEngine.config.headerPillStyle = data.textConfig.headerPillStyle;
          document.querySelectorAll('#headerPillStyleGroup .btn-segment').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-pill') === data.textConfig.headerPillStyle);
          });
        }
        if (data.textConfig.headerAnim) {
          canvasEngine.config.headerAnim = data.textConfig.headerAnim;
          document.querySelectorAll('#headerAnimGroup .btn-segment').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-anim') === data.textConfig.headerAnim);
          });
        }
        if (data.textConfig.subText !== undefined) {
          const subInput = document.getElementById('subText');
          if (subInput) subInput.value = data.textConfig.subText;
          canvasEngine.config.subText = data.textConfig.subText;
        }
        if (data.textConfig.subFontFamily) {
          const subFontSelect = document.getElementById('subFontFamily');
          if (subFontSelect) subFontSelect.value = data.textConfig.subFontFamily;
          canvasEngine.config.subFontFamily = data.textConfig.subFontFamily;
        }
        if (data.textConfig.subTextColor) {
          const subColorInput = document.getElementById('subTextColor');
          if (subColorInput) subColorInput.value = data.textConfig.subTextColor;
          const subColorVal = document.getElementById('subTextColorVal');
          if (subColorVal) subColorVal.textContent = data.textConfig.subTextColor;
          canvasEngine.config.subTextColor = data.textConfig.subTextColor;
        }
        if (data.textConfig.subTextSize) {
          const subSizeInput = document.getElementById('subTextSize');
          if (subSizeInput) subSizeInput.value = data.textConfig.subTextSize;
          const subValEl = document.getElementById('subTextSizeVal');
          if (subValEl) subValEl.textContent = `${data.textConfig.subTextSize} px`;
          canvasEngine.config.subTextSize = data.textConfig.subTextSize;
        }
        if (data.textConfig.subPosY !== undefined) {
          const subPosInput = document.getElementById('subPosY');
          if (subPosInput) subPosInput.value = data.textConfig.subPosY;
          const valEl = document.getElementById('subPosYVal');
          if (valEl) valEl.textContent = `${data.textConfig.subPosY} px`;
          canvasEngine.config.subPosY = data.textConfig.subPosY;
        }
        if (data.textConfig.subPillStyle) {
          canvasEngine.config.subPillStyle = data.textConfig.subPillStyle;
          document.querySelectorAll('#subPillStyleGroup .btn-segment').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-subpill') === data.textConfig.subPillStyle);
          });
        }
        if (data.textConfig.viralBadge) {
          canvasEngine.config.viralBadge = data.textConfig.viralBadge;
          document.querySelectorAll('#viralBadgeGroup .btn-segment').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-badge') === data.textConfig.viralBadge);
          });
        }
        if (data.textConfig.watermarkText !== undefined) {
          const wmInput = document.getElementById('watermarkText');
          if (wmInput) wmInput.value = data.textConfig.watermarkText;
          canvasEngine.config.watermarkText = data.textConfig.watermarkText;
        }
        if (data.textConfig.watermarkOpacity !== undefined) {
          const opInput = document.getElementById('watermarkOpacity');
          if (opInput) opInput.value = Math.round(data.textConfig.watermarkOpacity * 100);
          const valEl = document.getElementById('watermarkOpacityVal');
          if (valEl) valEl.textContent = `${Math.round(data.textConfig.watermarkOpacity * 100)}%`;
          canvasEngine.config.watermarkOpacity = data.textConfig.watermarkOpacity;
        }
        if (data.textConfig.timerStyle) {
          canvasEngine.config.timerStyle = data.textConfig.timerStyle;
          document.querySelectorAll('#timerStyleGroup .btn-segment').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tstyle') === data.textConfig.timerStyle);
          });
        }
      }

      // 2. Outline Config
      if (data.outlineConfig) {
        Object.assign(outlineOptions, data.outlineConfig);
        canvasEngine.setOutlineOptions(outlineOptions);

        document.querySelectorAll('#outlineModeGroup .btn-segment').forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-mode') === outlineOptions.mode);
        });
        const colorInput = document.getElementById('outlineColor');
        if (colorInput && outlineOptions.color) {
          colorInput.value = outlineOptions.color;
          const valEl = document.getElementById('outlineColorVal');
          if (valEl) valEl.textContent = outlineOptions.color;
        }
        const thickInput = document.getElementById('borderThickness');
        if (thickInput && outlineOptions.thickness) {
          thickInput.value = outlineOptions.thickness;
          const valEl = document.getElementById('borderThicknessVal');
          if (valEl) valEl.textContent = `${outlineOptions.thickness} px`;
        }
        const glowInput = document.getElementById('glowIntensity');
        if (glowInput && outlineOptions.glow !== undefined) {
          glowInput.value = outlineOptions.glow;
          const valEl = document.getElementById('glowIntensityVal');
          if (valEl) valEl.textContent = `${outlineOptions.glow} px`;
        }
        if (data.outlineConfig.targetYOffset !== undefined && Number.isFinite(Number(data.outlineConfig.targetYOffset))) {
          const tY = Number(data.outlineConfig.targetYOffset);
          const yInput = document.getElementById('targetYOffset');
          if (yInput) yInput.value = tY;
          const valEl = document.getElementById('targetYVal');
          if (valEl) valEl.textContent = `${tY} px`;
          canvasEngine.config.targetYOffset = tY;
        } else {
          canvasEngine.config.targetYOffset = 0;
        }
        canvasEngine.config.pulseOutline = false;
        if (data.outlineConfig.showCrosshair !== undefined) {
          const chInput = document.getElementById('showCrosshair');
          if (chInput) chInput.checked = data.outlineConfig.showCrosshair;
          canvasEngine.config.showCrosshair = data.outlineConfig.showCrosshair;
        }
        if (data.outlineConfig.outlinePulseSpeed !== undefined) {
          const psInput = document.getElementById('outlinePulseSpeed');
          if (psInput) psInput.value = data.outlineConfig.outlinePulseSpeed;
          const valEl = document.getElementById('outlinePulseSpeedVal');
          if (valEl) valEl.textContent = `${data.outlineConfig.outlinePulseSpeed.toFixed(1)}x`;
          canvasEngine.config.outlinePulseSpeed = data.outlineConfig.outlinePulseSpeed;
        }
      }

      // 3. Motion Config
      if (data.motionConfig) {
        let mType = data.motionConfig.motionType || 'pendulum';
        if (mType !== 'spin' && mType !== 'pendulum') mType = 'pendulum';
        document.querySelectorAll('.motion-card').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-motion') === mType);
        });
        canvasEngine.motionEngine.setConfig({
          motionType: mType,
          speed: data.motionConfig.speed || 1.0,
          amplitude: data.motionConfig.amplitude || 85
        });

        if (data.motionConfig.motionTrails !== undefined) {
          const trInput = document.getElementById('motionTrails');
          if (trInput) trInput.value = data.motionConfig.motionTrails;
          const valEl = document.getElementById('motionTrailsVal');
          if (valEl) valEl.textContent = data.motionConfig.motionTrails === 0 ? '0 Echoes (Off)' : `${data.motionConfig.motionTrails} Echoes`;
          canvasEngine.config.motionTrails = data.motionConfig.motionTrails;
        }

        if (data.motionConfig.speed) {
          const spInput = document.getElementById('motionSpeed');
          if (spInput) spInput.value = data.motionConfig.speed;
          const spVal = document.getElementById('motionSpeedVal');
          if (spVal) spVal.textContent = `${data.motionConfig.speed}x`;
        }
        if (data.motionConfig.amplitude) {
          const ampInput = document.getElementById('motionAmplitude');
          if (ampInput) ampInput.value = data.motionConfig.amplitude;
          const ampVal = document.getElementById('motionAmplitudeVal');
          if (ampVal) ampVal.textContent = `${data.motionConfig.amplitude}%`;
        }
        if (data.motionConfig.totalDuration) {
          const durInput = document.getElementById('videoDuration');
          if (durInput) durInput.value = data.motionConfig.totalDuration;
          const durVal = document.getElementById('videoDurationVal');
          if (durVal) durVal.textContent = `${data.motionConfig.totalDuration.toFixed(1)} Seconds`;
          canvasEngine.totalDuration = data.motionConfig.totalDuration;
          if (tcTotal) tcTotal.textContent = formatTimecode(data.motionConfig.totalDuration);
        }
      }

      // 4. Background & Atmosphere Config
      if (data.bgConfig) {
        canvasEngine.config.bgType = data.bgConfig.bgType || 'gradient';
        canvasEngine.config.bgGradient = data.bgConfig.bgGradient || 'cyberpunk';
        canvasEngine.config.bgColor = data.bgConfig.bgColor || '#0d0f18';
        canvasEngine.config.bgGradColor1 = data.bgConfig.bgGradColor1 || '#0f0c29';
        canvasEngine.config.bgGradColor2 = data.bgConfig.bgGradColor2 || '#00f3ff';
        canvasEngine.config.bgGradAngle = data.bgConfig.bgGradAngle !== undefined ? data.bgConfig.bgGradAngle : 135;
        canvasEngine.config.bgFit = data.bgConfig.bgFit || 'cover';
        canvasEngine.config.bgScale = data.bgConfig.bgScale !== undefined ? data.bgConfig.bgScale : 1.0;
        canvasEngine.config.bgBlur = data.bgConfig.bgBlur !== undefined ? data.bgConfig.bgBlur : 0;
        canvasEngine.config.bgDimOpacity = data.bgConfig.bgDimOpacity !== undefined ? data.bgConfig.bgDimOpacity : 35;
        canvasEngine.config.bgVignette = data.bgConfig.bgVignette !== undefined ? data.bgConfig.bgVignette : 30;
        canvasEngine.config.bgKenBurns = data.bgConfig.bgKenBurns || false;
        canvasEngine.config.showSparkles = data.bgConfig.showSparkles !== undefined ? data.bgConfig.showSparkles : true;
        canvasEngine.config.particleCount = data.bgConfig.particleCount || 40;
        canvasEngine.config.particleSpeed = data.bgConfig.particleSpeed || 1.0;
        canvasEngine.config.particleColor = data.bgConfig.particleColor || '#00f3ff';

        document.querySelectorAll('.grad-tile').forEach(c => {
          c.classList.toggle('active', c.getAttribute('data-grad') === (data.bgConfig.bgGradient || 'cyberpunk') && data.bgConfig.bgType === 'gradient');
        });

        // Restore Custom Wallpaper if present
        if (data.bgConfig.bgImageUrl && data.bgConfig.bgType === 'image') {
          const bgImg = new Image();
          bgImg.onload = () => {
            canvasEngine.bgImage = bgImg;
            canvasEngine.config.bgType = 'image';
            const bgCard = document.getElementById('customBgCard');
            const bgThumb = document.getElementById('customBgThumb');
            const bgName = document.getElementById('customBgFileName');
            if (bgCard) bgCard.style.display = 'block';
            if (bgThumb) bgThumb.src = data.bgConfig.bgImageUrl;
            if (bgName) bgName.textContent = 'Custom Wallpaper (Saved)';
          };
          bgImg.src = data.bgConfig.bgImageUrl;
        }

        // Restore UI Sliders & Controls
        const fitBtns = document.querySelectorAll('#bgFitGroup .btn-segment');
        fitBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-fit') === canvasEngine.config.bgFit));

        const scaleSlider = document.getElementById('bgScale');
        if (scaleSlider) scaleSlider.value = Math.round(canvasEngine.config.bgScale * 100);
        const scaleVal = document.getElementById('bgScaleVal');
        if (scaleVal) scaleVal.textContent = `${Math.round(canvasEngine.config.bgScale * 100)}%`;

        const blurSlider = document.getElementById('bgBlur');
        if (blurSlider) blurSlider.value = canvasEngine.config.bgBlur;
        const blurVal = document.getElementById('bgBlurVal');
        if (blurVal) blurVal.textContent = `${canvasEngine.config.bgBlur} px`;

        const dimSlider = document.getElementById('bgDimOpacity');
        if (dimSlider) dimSlider.value = canvasEngine.config.bgDimOpacity;
        const dimVal = document.getElementById('bgDimOpacityVal');
        if (dimVal) dimVal.textContent = `${canvasEngine.config.bgDimOpacity}%`;

        const vigSlider = document.getElementById('bgVignette');
        if (vigSlider) vigSlider.value = canvasEngine.config.bgVignette;
        const vigVal = document.getElementById('bgVignetteVal');
        if (vigVal) vigVal.textContent = `${canvasEngine.config.bgVignette}%`;

        const kbInput = document.getElementById('bgKenBurns');
        if (kbInput) kbInput.checked = canvasEngine.config.bgKenBurns;

        const c1Input = document.getElementById('bgGradColor1');
        if (c1Input) c1Input.value = canvasEngine.config.bgGradColor1;
        const c2Input = document.getElementById('bgGradColor2');
        if (c2Input) c2Input.value = canvasEngine.config.bgGradColor2;

        const angleSlider = document.getElementById('bgGradAngle');
        if (angleSlider) angleSlider.value = canvasEngine.config.bgGradAngle;
        const angleVal = document.getElementById('bgGradAngleVal');
        if (angleVal) angleVal.textContent = `${canvasEngine.config.bgGradAngle}°`;

        const sparklesInput = document.getElementById('showSparkles');
        if (sparklesInput) sparklesInput.checked = canvasEngine.config.showSparkles;

        const pCountSlider = document.getElementById('particleCount');
        if (pCountSlider) pCountSlider.value = canvasEngine.config.particleCount;
        const pCountVal = document.getElementById('particleCountVal');
        if (pCountVal) pCountVal.textContent = `${canvasEngine.config.particleCount}`;

        const pSpeedSlider = document.getElementById('particleSpeed');
        if (pSpeedSlider) pSpeedSlider.value = canvasEngine.config.particleSpeed;
        const pSpeedVal = document.getElementById('particleSpeedVal');
        if (pSpeedVal) pSpeedVal.textContent = `${canvasEngine.config.particleSpeed.toFixed(1)}x`;

        const pColorInput = document.getElementById('particleColor');
        if (pColorInput) pColorInput.value = canvasEngine.config.particleColor;

        if (data.bgConfig.showAudioVisualizer !== undefined) {
          const visInput = document.getElementById('showAudioVisualizer');
          if (visInput) visInput.checked = data.bgConfig.showAudioVisualizer;
          canvasEngine.config.showAudioVisualizer = data.bgConfig.showAudioVisualizer;
        }
        if (data.bgConfig.visualizerColor) {
          const vcInput = document.getElementById('visualizerColor');
          if (vcInput) vcInput.value = data.bgConfig.visualizerColor;
          canvasEngine.config.visualizerColor = data.bgConfig.visualizerColor;
        }
      }

      // 5. Audio Config
      if (data.audioConfig) {
        audioManager.setPreset(data.audioConfig.currentPreset === 'cyber-trap' ? 'none' : (data.audioConfig.currentPreset || 'none'));
      }

      // 6. Items Restoration (Images & Coordinates)
      currentItemCount = data.items.length;
      activeSlotIndex = data.activeSlotIndex || 0;
      const countBadge = document.getElementById('itemCountBadge');
      if (countBadge) countBadge.textContent = `${currentItemCount} Object${currentItemCount > 1 ? 's' : ''}`;
      document.querySelectorAll('.btn-count').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.getAttribute('data-count')) === currentItemCount);
      });

      const loadedItems = [];
      for (let i = 0; i < data.items.length; i++) {
        const itemInfo = data.items[i];
        let img = null;
        if (itemInfo.imgUrl) {
          img = await new Promise((resolve) => {
            const im = new Image();
            im.onload = () => resolve(im);
            im.onerror = () => resolve(null);
            im.src = itemInfo.imgUrl;
          });
        }
        if (!img) {
          const presetObj = PRESETS.catalog[itemInfo.objKey] || PRESETS.catalog.burger;
          const { image, url } = await svgToImage(presetObj.svg);
          img = image;
          itemInfo.imgUrl = url;
        }

        const offX = (itemInfo.offsetX !== undefined && Number.isFinite(Number(itemInfo.offsetX))) ? Number(itemInfo.offsetX) : 0;
        const offY = (itemInfo.offsetY !== undefined && Number.isFinite(Number(itemInfo.offsetY))) ? Number(itemInfo.offsetY) : 0;
        const sc = (itemInfo.scale !== undefined && Number.isFinite(Number(itemInfo.scale)) && Number(itemInfo.scale) > 0) ? Number(itemInfo.scale) : 0.7;
        const ang = (itemInfo.angle !== undefined && Number.isFinite(Number(itemInfo.angle))) ? Number(itemInfo.angle) : 0;

        loadedItems.push({
          id: itemInfo.id || `slot-${i + 1}`,
          name: itemInfo.name || `Object ${i + 1}`,
          objKey: itemInfo.objKey || 'burger',
          img: img,
          imgUrl: itemInfo.imgUrl,
          offsetX: offX,
          offsetY: offY,
          scale: sc,
          angle: ang,
          outlineData: null
        });
      }

      activeItems = loadedItems;
      canvasEngine.setItems(activeItems);
      renderSlotCardsUI();
      flashSaveBadge('Session Restored ✓');
      return true;
    } catch (err) {
      console.error('Failed to restore session:', err);
      return false;
    }
  }

  // -------------------------------------------------------------
  // INITIAL LOAD & BOOTSTRAP
  // -------------------------------------------------------------
  canvasEngine.setAspectRatio('9:16', 1080, 1920);
  const sessionRestored = await restoreSessionFromStorage();
  if (!sessionRestored) {
    await setupItemSlots(1);
    audioManager.setPreset('cyber-trap');
  }
  canvasEngine.start();
  renderSavedPresetsList();

  // Timeline Synchronization Loop
  canvasEngine.onFrameUpdate = (currentTime, totalDuration) => {
    if (tcCurrent) tcCurrent.textContent = formatTimecode(currentTime);
    if (tcTotal) tcTotal.textContent = formatTimecode(totalDuration);

    if (playheadLine) {
      const pct = (currentTime / totalDuration) * 100;
      playheadLine.style.left = `${pct}%`;
      const playheadFill = document.getElementById('playheadFill');
      if (playheadFill) playheadFill.style.width = `${pct}%`;
    }

    // VU Meters Simulation
    if (vuFillL && vuFillR && audioManager.isPlaying) {
      const l = 40 + Math.sin(currentTime * 18) * 35;
      const r = 40 + Math.cos(currentTime * 18) * 35;
      vuFillL.style.width = `${Math.min(100, Math.max(10, l))}%`;
      vuFillR.style.width = `${Math.min(100, Math.max(10, r))}%`;
    }
  };

  const globalScaleSlider = document.getElementById('globalScale');
  if (globalScaleSlider) {
    globalScaleSlider.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('globalScaleVal').textContent = `${val}%`;
      canvasEngine.config.globalScale = val / 100;
      triggerAutoSave();
    });
  }

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');
      triggerAutoSave();
    });
  });

  // Outline Controls
  document.querySelectorAll('#outlineModeGroup .btn-segment').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#outlineModeGroup .btn-segment').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      outlineOptions.mode = btn.getAttribute('data-mode');
      canvasEngine.setOutlineOptions(outlineOptions);
      triggerAutoSave();
    });
  });

  const outlineColor = document.getElementById('outlineColor');
  if (outlineColor) {
    outlineColor.addEventListener('input', (e) => {
      const val = e.target.value;
      document.getElementById('outlineColorVal').textContent = val;
      outlineOptions.color = val;
      canvasEngine.setOutlineOptions(outlineOptions);
      triggerAutoSave();
    });
  }

  document.querySelectorAll('.quick-colors .color-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('.quick-colors .color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const color = dot.getAttribute('data-color');
      if (outlineColor) outlineColor.value = color;
      document.getElementById('outlineColorVal').textContent = color;
      outlineOptions.color = color;
      canvasEngine.setOutlineOptions(outlineOptions);
      triggerAutoSave();
    });
  });

  const borderThickness = document.getElementById('borderThickness');
  if (borderThickness) {
    borderThickness.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('borderThicknessVal').textContent = `${val} px`;
      outlineOptions.thickness = val;
      canvasEngine.setOutlineOptions(outlineOptions);
      triggerAutoSave();
    });
  }

  const glowIntensity = document.getElementById('glowIntensity');
  if (glowIntensity) {
    glowIntensity.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('glowIntensityVal').textContent = `${val} px`;
      outlineOptions.glow = val;
      canvasEngine.setOutlineOptions(outlineOptions);
      triggerAutoSave();
    });
  }

  const targetYOffset = document.getElementById('targetYOffset');
  if (targetYOffset) {
    targetYOffset.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('targetYVal').textContent = `${val} px`;
      canvasEngine.config.targetYOffset = val;
      triggerAutoSave();
    });
  }

  const pulseOutline = document.getElementById('pulseOutline');
  if (pulseOutline) {
    pulseOutline.addEventListener('change', (e) => {
      canvasEngine.config.pulseOutline = e.target.checked;
      triggerAutoSave();
    });
  }

  // Motion Controls (12 Styles)
  document.querySelectorAll('.motion-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.motion-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const motionType = card.getAttribute('data-motion');
      canvasEngine.motionEngine.setConfig({ motionType });
      triggerAutoSave();
    });
  });

  const motionSpeed = document.getElementById('motionSpeed');
  if (motionSpeed) {
    motionSpeed.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      const label = val <= 0.7 ? 'Easy' : (val >= 1.6 ? 'INSANE' : 'Medium');
      document.getElementById('motionSpeedVal').textContent = `${val.toFixed(1)}x (${label})`;
      canvasEngine.motionEngine.setConfig({ speed: val });
      triggerAutoSave();
    });
  }

  const motionAmplitude = document.getElementById('motionAmplitude');
  if (motionAmplitude) {
    motionAmplitude.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('motionAmplitudeVal').textContent = `${val}%`;
      canvasEngine.motionEngine.setConfig({ amplitude: val });
      triggerAutoSave();
    });
  }

  const videoDuration = document.getElementById('videoDuration');
  if (videoDuration) {
    videoDuration.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('videoDurationVal').textContent = `${val.toFixed(1)} Seconds`;
      canvasEngine.totalDuration = val;
      if (tcTotal) tcTotal.textContent = formatTimecode(val);
      triggerAutoSave();
    });
  }

  // =========================================================================
  // CUSTOM BACKGROUND WALLPAPER & ATMOSPHERIC ENGINE
  // =========================================================================
  const customBgInput = document.getElementById('customBgInput');
  const customBgDropzone = document.getElementById('customBgDropzone');
  const customBgCard = document.getElementById('customBgCard');
  const customBgFileName = document.getElementById('customBgFileName');
  const customBgThumb = document.getElementById('customBgThumb');
  const removeCustomBgBtn = document.getElementById('removeCustomBgBtn');

  function handleCustomBgUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        canvasEngine.bgImage = img;
        canvasEngine.config.bgType = 'image';
        if (customBgCard) customBgCard.style.display = 'block';
        if (customBgFileName) customBgFileName.textContent = file.name || 'Wallpaper.jpg';
        if (customBgThumb) customBgThumb.src = e.target.result;
        document.querySelectorAll('.grad-tile').forEach(t => t.classList.remove('active'));
        refreshCanvasPreview();
        triggerAutoSave();
        flashSaveBadge('Wallpaper Applied ✓');
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  if (customBgInput) {
    customBgInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCustomBgUpload(e.target.files[0]);
      }
    });
  }

  if (customBgDropzone) {
    customBgDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      customBgDropzone.classList.add('dragover');
    });
    customBgDropzone.addEventListener('dragleave', () => {
      customBgDropzone.classList.remove('dragover');
    });
    customBgDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      customBgDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleCustomBgUpload(e.dataTransfer.files[0]);
      }
    });
  }

  if (removeCustomBgBtn) {
    removeCustomBgBtn.addEventListener('click', () => {
      canvasEngine.bgImage = null;
      canvasEngine.config.bgType = 'gradient';
      if (customBgCard) customBgCard.style.display = 'none';
      if (customBgInput) customBgInput.value = '';
      const firstGrad = document.querySelector('.grad-tile[data-grad="cyberpunk"]');
      if (firstGrad) firstGrad.click();
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Background Fit Mode
  document.querySelectorAll('#bgFitGroup .btn-segment').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#bgFitGroup .btn-segment').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      canvasEngine.config.bgFit = btn.getAttribute('data-fit');
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // Background Scale / Zoom Slider
  const bgScale = document.getElementById('bgScale');
  if (bgScale) {
    bgScale.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('bgScaleVal').textContent = `${val}%`;
      canvasEngine.config.bgScale = val / 100;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Background Bokeh Blur Depth Slider
  const bgBlur = document.getElementById('bgBlur');
  if (bgBlur) {
    bgBlur.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('bgBlurVal').textContent = `${val} px`;
      canvasEngine.config.bgBlur = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Background Dimming Tint Slider
  const bgDimOpacity = document.getElementById('bgDimOpacity');
  if (bgDimOpacity) {
    bgDimOpacity.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('bgDimOpacityVal').textContent = `${val}%`;
      canvasEngine.config.bgDimOpacity = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Background Cinematic Vignette Slider
  const bgVignette = document.getElementById('bgVignette');
  if (bgVignette) {
    bgVignette.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('bgVignetteVal').textContent = `${val}%`;
      canvasEngine.config.bgVignette = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Ken Burns Motion Toggle
  const bgKenBurns = document.getElementById('bgKenBurns');
  if (bgKenBurns) {
    bgKenBurns.addEventListener('change', (e) => {
      canvasEngine.config.bgKenBurns = e.target.checked;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Custom 2-Color Gradient Generator
  const bgGradColor1 = document.getElementById('bgGradColor1');
  const bgGradColor2 = document.getElementById('bgGradColor2');
  const bgGradAngle = document.getElementById('bgGradAngle');
  const applyCustomGradBtn = document.getElementById('applyCustomGradBtn');

  if (bgGradAngle) {
    bgGradAngle.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('bgGradAngleVal').textContent = `${val}°`;
      canvasEngine.config.bgGradAngle = val;
      if (canvasEngine.config.bgType === 'custom-grad') {
        refreshCanvasPreview();
        triggerAutoSave();
      }
    });
  }

  if (applyCustomGradBtn) {
    applyCustomGradBtn.addEventListener('click', () => {
      canvasEngine.config.bgType = 'custom-grad';
      if (bgGradColor1) canvasEngine.config.bgGradColor1 = bgGradColor1.value;
      if (bgGradColor2) canvasEngine.config.bgGradColor2 = bgGradColor2.value;
      if (bgGradAngle) canvasEngine.config.bgGradAngle = parseInt(bgGradAngle.value);
      if (customBgCard) customBgCard.style.display = 'none';
      document.querySelectorAll('.grad-tile').forEach(t => t.classList.remove('active'));
      refreshCanvasPreview();
      triggerAutoSave();
      flashSaveBadge('Custom Gradient Applied ✓');
    });
  }

  // Curated Gradient Palette Clicks
  document.querySelectorAll('.grad-tile').forEach(tile => {
    tile.addEventListener('click', () => {
      document.querySelectorAll('.grad-tile').forEach(t => t.classList.remove('active'));
      tile.classList.add('active');
      canvasEngine.config.bgType = 'gradient';
      canvasEngine.config.bgGradient = tile.getAttribute('data-grad');
      if (customBgCard) customBgCard.style.display = 'none';
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // Atmospheric Particles Controls
  const showSparkles = document.getElementById('showSparkles');
  if (showSparkles) {
    showSparkles.addEventListener('change', (e) => {
      canvasEngine.config.showSparkles = e.target.checked;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const particleCount = document.getElementById('particleCount');
  if (particleCount) {
    particleCount.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('particleCountVal').textContent = `${val}`;
      canvasEngine.config.particleCount = val;
      canvasEngine.initParticles(val);
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const particleSpeed = document.getElementById('particleSpeed');
  if (particleSpeed) {
    particleSpeed.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('particleSpeedVal').textContent = `${val.toFixed(1)}x`;
      canvasEngine.config.particleSpeed = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const particleColor = document.getElementById('particleColor');
  if (particleColor) {
    particleColor.addEventListener('input', (e) => {
      canvasEngine.config.particleColor = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const previewAudioBtn = document.getElementById('previewAudioBtn');
  if (previewAudioBtn) {
    previewAudioBtn.addEventListener('click', () => {
      audioManager.initContext();
      if (audioManager.isPlaying) {
        audioManager.pause();
        previewAudioBtn.textContent = '🔇';
      } else {
        audioManager.play();
        previewAudioBtn.textContent = '🔊';
      }
    });
  }

  // --- CUSTOM AUDIO UPLOAD & DRAG/DROP ---
  const customAudioInput = document.getElementById('customAudioInput');
  const customAudioDropzone = document.getElementById('customAudioDropzone');
  const customAudioCard = document.getElementById('customAudioCard');
  const customAudioFileName = document.getElementById('customAudioFileName');
  const customAudioDuration = document.getElementById('customAudioDuration');
  const removeCustomAudioBtn = document.getElementById('removeCustomAudioBtn');
  const currentTrackTitle = document.getElementById('currentTrackTitle');

  async function handleCustomAudioUpload(file) {
    if (!file) return;
    try {
      const info = await audioManager.loadUserAudio(file);
      if (customAudioCard) customAudioCard.style.display = 'block';
      if (customAudioFileName) customAudioFileName.textContent = info.name;
      if (customAudioDuration) customAudioDuration.textContent = info.duration;
      if (currentTrackTitle) currentTrackTitle.textContent = `Custom: ${info.name}`;

      // Deselect built-in preset chips
      document.querySelectorAll('#audioPresets .chip').forEach(c => c.classList.remove('active'));

      // If playback was active, restart with new audio
      if (canvasEngine.isPlaying) {
        audioManager.play();
      }
      triggerAutoSave();
    } catch (err) {
      console.error('Failed to load custom audio:', err);
      alert('Could not decode audio file. Please try a standard MP3 or WAV file.');
    }
  }

  if (customAudioInput) {
    customAudioInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleCustomAudioUpload(e.target.files[0]);
      }
    });
  }

  if (customAudioDropzone) {
    customAudioDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      customAudioDropzone.classList.add('dragover');
    });
    customAudioDropzone.addEventListener('dragleave', () => {
      customAudioDropzone.classList.remove('dragover');
    });
    customAudioDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      customAudioDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleCustomAudioUpload(e.dataTransfer.files[0]);
      }
    });
  }

  if (removeCustomAudioBtn) {
    removeCustomAudioBtn.addEventListener('click', () => {
      audioManager.clearCustomAudio();
      if (customAudioCard) customAudioCard.style.display = 'none';
      if (customAudioInput) customAudioInput.value = '';

      // Revert to Cyber Trap preset
      const defaultPreset = 'cyber-trap';
      audioManager.setPreset(defaultPreset);
      document.querySelectorAll('#audioPresets .chip').forEach(c => {
        const isDefault = c.getAttribute('data-audio') === defaultPreset;
        c.classList.toggle('active', isDefault);
        if (isDefault && currentTrackTitle) {
          currentTrackTitle.textContent = `${c.textContent} (Built-in)`;
        }
      });

      if (canvasEngine.isPlaying) {
        audioManager.play();
      }
      triggerAutoSave();
    });
  }

  // Built-in Soundtracks Presets
  document.querySelectorAll('#audioPresets .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#audioPresets .chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');

      const preset = chip.getAttribute('data-audio');
      audioManager.setPreset(preset);

      // Hide custom audio card when preset is clicked
      if (customAudioCard) customAudioCard.style.display = 'none';
      if (customAudioInput) customAudioInput.value = '';

      if (currentTrackTitle) {
        currentTrackTitle.textContent = preset === 'none' ? 'No Audio (Muted)' : `${chip.textContent}`;
      }

      if (canvasEngine.isPlaying) {
        if (preset === 'none') {
          audioManager.pause();
        } else {
          audioManager.play();
        }
      }
      triggerAutoSave();
    });
  });

  const audioVolume = document.getElementById('audioVolume');
  if (audioVolume) {
    audioVolume.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('audioVolumeVal').textContent = `${val}%`;
      audioManager.setVolume(val / 100);
      triggerAutoSave();
    });
  }

  // Text & Overlays (Instant Visual Updates)
  function refreshCanvasPreview() {
    if (!canvasEngine.isPlaying) {
      canvasEngine.renderFrame(canvasEngine.currentTime);
      canvasEngine.onFrameUpdate(canvasEngine.currentTime, canvasEngine.totalDuration);
    }
  }

  const headerText = document.getElementById('headerText');
  if (headerText) {
    headerText.addEventListener('input', (e) => {
      canvasEngine.config.headerText = e.target.value;
      const clip = document.getElementById('clipText');
      if (clip) clip.textContent = `📝 "${e.target.value}"`;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // 1-Tap Quick Viral Hooks
  document.querySelectorAll('.hook-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const hook = chip.getAttribute('data-hook');
      if (headerText) headerText.value = hook;
      canvasEngine.config.headerText = hook;
      const clip = document.getElementById('clipText');
      if (clip) clip.textContent = `📝 "${hook}"`;
      refreshCanvasPreview();
      triggerAutoSave();
      flashSaveBadge('Hook Applied ✓');
    });
  });

  const headerFontFamily = document.getElementById('headerFontFamily');
  if (headerFontFamily) {
    headerFontFamily.addEventListener('change', (e) => {
      canvasEngine.config.headerFontFamily = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const headerTextSize = document.getElementById('headerTextSize');
  if (headerTextSize) {
    headerTextSize.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('headerTextSizeVal').textContent = `${val} px`;
      canvasEngine.config.headerTextSize = val;
      canvasEngine.config.headerFontSize = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const headerPosY = document.getElementById('headerPosY');
  if (headerPosY) {
    headerPosY.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('headerPosYVal').textContent = `${val} px`;
      canvasEngine.config.headerPosY = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const headerTextColor = document.getElementById('headerTextColor');
  if (headerTextColor) {
    headerTextColor.addEventListener('input', (e) => {
      canvasEngine.config.headerTextColor = e.target.value;
      canvasEngine.config.headerColor = e.target.value;
      const valEl = document.getElementById('headerTextColorVal');
      if (valEl) valEl.textContent = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Quick Colors for Header Text
  document.querySelectorAll('#text-tab .quick-colors .color-dot[data-color]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#text-tab .quick-colors .color-dot[data-color]').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const color = dot.getAttribute('data-color');
      if (headerTextColor) headerTextColor.value = color;
      const valEl = document.getElementById('headerTextColorVal');
      if (valEl) valEl.textContent = color;
      canvasEngine.config.headerTextColor = color;
      canvasEngine.config.headerColor = color;
      canvasEngine.config.headerTextGrad = 'solid';
      document.querySelectorAll('.text-grad-presets .btn-tag').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tgrad') === 'solid');
      });
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // Text Gradients
  document.querySelectorAll('.text-grad-presets .btn-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.text-grad-presets .btn-tag').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      canvasEngine.config.headerTextGrad = btn.getAttribute('data-tgrad');
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  const headerStrokeWidth = document.getElementById('headerStrokeWidth');
  if (headerStrokeWidth) {
    headerStrokeWidth.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('headerStrokeWidthVal').textContent = `${val} px`;
      canvasEngine.config.headerStrokeWidth = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const headerStrokeColor = document.getElementById('headerStrokeColor');
  if (headerStrokeColor) {
    headerStrokeColor.addEventListener('input', (e) => {
      canvasEngine.config.headerStrokeColor = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const headerGlowBlur = document.getElementById('headerGlowBlur');
  if (headerGlowBlur) {
    headerGlowBlur.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('headerGlowBlurVal').textContent = `${val} px`;
      canvasEngine.config.headerGlowBlur = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Header Pill Style Group
  document.querySelectorAll('#headerPillStyleGroup .btn-segment').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#headerPillStyleGroup .btn-segment').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const pill = btn.getAttribute('data-pill');
      canvasEngine.config.headerPillStyle = pill;
      canvasEngine.config.headerBgStyle = pill;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // Header Animation Group
  document.querySelectorAll('#headerAnimGroup .btn-segment').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#headerAnimGroup .btn-segment').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      canvasEngine.config.headerAnim = btn.getAttribute('data-anim');
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // Subtitle Controls
  const subText = document.getElementById('subText');
  if (subText) {
    subText.addEventListener('input', (e) => {
      canvasEngine.config.subText = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Quick Subtitle Suggestions
  document.querySelectorAll('.sub-hook-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const sub = chip.getAttribute('data-sub');
      if (subText) subText.value = sub;
      canvasEngine.config.subText = sub;
      refreshCanvasPreview();
      triggerAutoSave();
      flashSaveBadge('Subtitle Applied ✓');
    });
  });

  const subFontFamily = document.getElementById('subFontFamily');
  if (subFontFamily) {
    subFontFamily.addEventListener('change', (e) => {
      canvasEngine.config.subFontFamily = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const subTextSize = document.getElementById('subTextSize');
  if (subTextSize) {
    subTextSize.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('subTextSizeVal').textContent = `${val} px`;
      canvasEngine.config.subTextSize = val;
      canvasEngine.config.subFontSize = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const subPosY = document.getElementById('subPosY');
  if (subPosY) {
    subPosY.addEventListener('input', (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('subPosYVal').textContent = `${val} px`;
      canvasEngine.config.subPosY = val;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  const subTextColor = document.getElementById('subTextColor');
  if (subTextColor) {
    subTextColor.addEventListener('input', (e) => {
      canvasEngine.config.subTextColor = e.target.value;
      const valEl = document.getElementById('subTextColorVal');
      if (valEl) valEl.textContent = e.target.value;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  }

  // Quick Colors for Subtitle
  document.querySelectorAll('#text-tab .quick-colors .color-dot[data-subcolor]').forEach(dot => {
    dot.addEventListener('click', () => {
      document.querySelectorAll('#text-tab .quick-colors .color-dot[data-subcolor]').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      const color = dot.getAttribute('data-subcolor');
      if (subTextColor) subTextColor.value = color;
      const valEl = document.getElementById('subTextColorVal');
      if (valEl) valEl.textContent = color;
      canvasEngine.config.subTextColor = color;
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // Subtitle Pill Style Group
  document.querySelectorAll('#subPillStyleGroup .btn-segment').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#subPillStyleGroup .btn-segment').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      canvasEngine.config.subPillStyle = btn.getAttribute('data-subpill');
      refreshCanvasPreview();
      triggerAutoSave();
    });
  });

  // =============================================================
  // CUSTOM PRESETS VAULT (Save, Load, Delete Custom User Presets)
  // =============================================================
  const VAULT_STORAGE_KEY = 'stop_challenge_user_presets_vault_v1';

  function getVaultPresets() {
    try {
      const raw = localStorage.getItem(VAULT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveVaultPresets(presets) {
    try {
      localStorage.setItem(VAULT_STORAGE_KEY, JSON.stringify(presets));
    } catch (e) {
      console.warn('Could not save custom preset vault:', e);
    }
  }

  function renderSavedPresetsList() {
    const listEl = document.getElementById('savedPresetsList');
    if (!listEl) return;
    const presets = getVaultPresets();

    if (presets.length === 0) {
      listEl.innerHTML = `
        <div style="font-size: 0.72rem; color: var(--text-muted); text-align: center; padding: 12px 0;">
          No custom presets saved yet. Click "+ Save Preset" to store your current style!
        </div>
      `;
      return;
    }

    listEl.innerHTML = '';
    presets.forEach((preset, idx) => {
      const card = document.createElement('div');
      card.className = 'saved-preset-card';
      card.innerHTML = `
        <div class="saved-preset-info" style="flex: 1;">
          <div class="saved-preset-title">${preset.name}</div>
          <div class="saved-preset-meta">${preset.headerText || 'Custom Hook'} • ${preset.itemCount || 1} Item(s)</div>
        </div>
        <button class="saved-preset-del" data-idx="${idx}" title="Delete preset">✕</button>
      `;

      card.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-preset-del')) return;
        applySavedPreset(preset);
      });

      const delBtn = card.querySelector('.saved-preset-del');
      if (delBtn) {
        delBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          deleteSavedPreset(idx);
        });
      }

      listEl.appendChild(card);
    });
  }

  function applySavedPreset(preset) {
    if (!preset) return;

    // 1. Headline
    if (preset.headerText !== undefined) {
      if (headerText) headerText.value = preset.headerText;
      canvasEngine.config.headerText = preset.headerText;
      const clip = document.getElementById('clipText');
      if (clip) clip.textContent = `📝 "${preset.headerText}"`;
    }
    if (preset.headerFontFamily) {
      if (headerFontFamily) headerFontFamily.value = preset.headerFontFamily;
      canvasEngine.config.headerFontFamily = preset.headerFontFamily;
    }
    if (preset.headerTextSize) {
      if (headerTextSize) headerTextSize.value = preset.headerTextSize;
      const valEl = document.getElementById('headerTextSizeVal');
      if (valEl) valEl.textContent = `${preset.headerTextSize} px`;
      canvasEngine.config.headerTextSize = preset.headerTextSize;
      canvasEngine.config.headerFontSize = preset.headerTextSize;
    }
    if (preset.headerTextColor) {
      if (headerTextColor) headerTextColor.value = preset.headerTextColor;
      const valEl = document.getElementById('headerTextColorVal');
      if (valEl) valEl.textContent = preset.headerTextColor;
      canvasEngine.config.headerTextColor = preset.headerTextColor;
      canvasEngine.config.headerColor = preset.headerTextColor;
    }
    if (preset.headerTextGrad) {
      canvasEngine.config.headerTextGrad = preset.headerTextGrad;
      document.querySelectorAll('.text-grad-presets .btn-tag').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tgrad') === preset.headerTextGrad);
      });
    }
    if (preset.headerPillStyle) {
      canvasEngine.config.headerPillStyle = preset.headerPillStyle;
      canvasEngine.config.headerBgStyle = preset.headerPillStyle;
      document.querySelectorAll('#headerPillStyleGroup .btn-segment').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-pill') === preset.headerPillStyle);
      });
    }
    if (preset.headerAnim) {
      canvasEngine.config.headerAnim = preset.headerAnim;
      document.querySelectorAll('#headerAnimGroup .btn-segment').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-anim') === preset.headerAnim);
      });
    }

    // 2. Subtitle
    if (preset.subText !== undefined) {
      if (subText) subText.value = preset.subText;
      canvasEngine.config.subText = preset.subText;
    }
    if (preset.subFontFamily) {
      if (subFontFamily) subFontFamily.value = preset.subFontFamily;
      canvasEngine.config.subFontFamily = preset.subFontFamily;
    }
    if (preset.subTextSize) {
      if (subTextSize) subTextSize.value = preset.subTextSize;
      const valEl = document.getElementById('subTextSizeVal');
      if (valEl) valEl.textContent = `${preset.subTextSize} px`;
      canvasEngine.config.subTextSize = preset.subTextSize;
      canvasEngine.config.subFontSize = preset.subTextSize;
    }
    if (preset.subTextColor) {
      if (subTextColor) subTextColor.value = preset.subTextColor;
      const valEl = document.getElementById('subTextColorVal');
      if (valEl) valEl.textContent = preset.subTextColor;
      canvasEngine.config.subTextColor = preset.subTextColor;
    }
    if (preset.subPillStyle) {
      canvasEngine.config.subPillStyle = preset.subPillStyle;
      document.querySelectorAll('#subPillStyleGroup .btn-segment').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-subpill') === preset.subPillStyle);
      });
    }

    refreshCanvasPreview();
    triggerAutoSave();
    flashSaveBadge(`Preset "${preset.name}" Loaded ✓`);
  }

  function deleteSavedPreset(idx) {
    const presets = getVaultPresets();
    if (presets[idx]) {
      const name = presets[idx].name;
      presets.splice(idx, 1);
      saveVaultPresets(presets);
      renderSavedPresetsList();
      flashSaveBadge(`Deleted "${name}"`);
    }
  }

  const saveCurrentPresetBtn = document.getElementById('saveCurrentPresetBtn');
  if (saveCurrentPresetBtn) {
    saveCurrentPresetBtn.addEventListener('click', () => {
      const defaultName = canvasEngine.config.headerText ? canvasEngine.config.headerText.slice(0, 20) : `Preset ${getVaultPresets().length + 1}`;
      const presetName = prompt('Enter a name for this custom preset:', defaultName);
      if (!presetName) return;

      const newPreset = {
        name: presetName.trim(),
        createdAt: Date.now(),
        itemCount: currentItemCount,
        headerText: canvasEngine.config.headerText,
        headerFontFamily: canvasEngine.config.headerFontFamily,
        headerTextSize: canvasEngine.config.headerTextSize,
        headerTextColor: canvasEngine.config.headerTextColor,
        headerTextGrad: canvasEngine.config.headerTextGrad,
        headerPosY: canvasEngine.config.headerPosY,
        headerStrokeWidth: canvasEngine.config.headerStrokeWidth,
        headerStrokeColor: canvasEngine.config.headerStrokeColor,
        headerGlowBlur: canvasEngine.config.headerGlowBlur,
        headerPillStyle: canvasEngine.config.headerPillStyle,
        headerAnim: canvasEngine.config.headerAnim,

        subText: canvasEngine.config.subText,
        subFontFamily: canvasEngine.config.subFontFamily,
        subTextSize: canvasEngine.config.subTextSize,
        subTextColor: canvasEngine.config.subTextColor,
        subPosY: canvasEngine.config.subPosY,
        subPillStyle: canvasEngine.config.subPillStyle
      };

      const presets = getVaultPresets();
      presets.unshift(newPreset);
      saveVaultPresets(presets);
      renderSavedPresetsList();
      flashSaveBadge('Preset Saved to Vault ✓');
    });
  }

  // Aspect Ratio Switching
  document.querySelectorAll('.btn-ratio').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.btn-ratio').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const ratio = btn.getAttribute('data-ratio');
      const w = parseInt(btn.getAttribute('data-w'));
      const h = parseInt(btn.getAttribute('data-h'));

      if (canvasFrame) canvasFrame.className = `canvas-frame aspect-${ratio.replace(':', '-')}`;
      canvasEngine.setAspectRatio(ratio, w, h);
      updateResolutionCardLabels(ratio);
      triggerAutoSave();
    });
  });

  function updateResolutionCardLabels(ratio) {
    const res4k = document.getElementById('res4kSub');
    const res2k = document.getElementById('res2kSub');
    const res1080 = document.getElementById('res1080Sub');
    const res720 = document.getElementById('res720Sub');

    if (!res4k) return;

    if (ratio === '9:16') {
      res4k.textContent = '2160 x 3840 px';
      res2k.textContent = '1440 x 2560 px';
      res1080.textContent = '1080 x 1920 px';
      res720.textContent = '720 x 1280 px';
    } else if (ratio === '1:1') {
      res4k.textContent = '2160 x 2160 px';
      res2k.textContent = '1440 x 1440 px';
      res1080.textContent = '1080 x 1080 px';
      res720.textContent = '720 x 720 px';
    } else {
      res4k.textContent = '3840 x 2160 px';
      res2k.textContent = '2560 x 1440 px';
      res1080.textContent = '1920 x 1080 px';
      res720.textContent = '1280 x 720 px';
    }
  }

  // Transport and Challenge UI Elements
  const playToggleBtn = document.getElementById('playToggleBtn');
  const playIcon = document.getElementById('playIcon');
  const playText = document.getElementById('playText');
  const stepBackBtn = document.getElementById('stepBackBtn');
  const stepForwardBtn = document.getElementById('stepForwardBtn');
  const restartBtn = document.getElementById('restartBtn');
  const retryChallengeBtn = document.getElementById('retryChallengeBtn');
  const interactiveStopBtn = document.getElementById('interactiveStopBtn');
  const challengeScoreCard = document.getElementById('challengeScoreCard');
  const matchFlash = document.getElementById('matchFlash');
  const multiScoreBreakdown = document.getElementById('multiScoreBreakdown');

  function togglePlayPause() {
    if (canvasEngine.isPlaying) {
      canvasEngine.pause();
      audioManager.pause();
      if (playIcon) playIcon.textContent = '▶️';
      if (playText) playText.textContent = 'Play';
    } else {
      if (challengeScoreCard) challengeScoreCard.style.display = 'none';
      canvasEngine.start();
      if (playIcon) playIcon.textContent = '⏸️';
      if (playText) playText.textContent = 'Pause';
    }
  }

  if (stepBackBtn) {
    stepBackBtn.addEventListener('click', () => {
      canvasEngine.pause();
      canvasEngine.currentTime = Math.max(0, canvasEngine.currentTime - (1 / 60));
      canvasEngine.renderFrame(canvasEngine.currentTime);
      canvasEngine.onFrameUpdate(canvasEngine.currentTime, canvasEngine.totalDuration);
    });
  }

  if (stepForwardBtn) {
    stepForwardBtn.addEventListener('click', () => {
      canvasEngine.pause();
      canvasEngine.currentTime = (canvasEngine.currentTime + (1 / 60)) % canvasEngine.totalDuration;
      canvasEngine.renderFrame(canvasEngine.currentTime);
      canvasEngine.onFrameUpdate(canvasEngine.currentTime, canvasEngine.totalDuration);
    });
  }

  function triggerStopChallengeAction() {
    if (!canvasEngine.isPlaying) {
      togglePlayPause();
      return;
    }

    canvasEngine.pause();
    audioManager.pause();
    if (playIcon) playIcon.textContent = '▶️';
    if (playText) playText.textContent = 'Play';

    const { currentTransforms, targetDefs } = canvasEngine.renderFrame(canvasEngine.currentTime);

    const multiAccuracy = canvasEngine.motionEngine.calculateMultiAccuracy(
      currentTransforms,
      targetDefs,
      { width: canvasEngine.width, height: canvasEngine.height }
    );

    if (matchFlash) {
      matchFlash.classList.remove('trigger');
      void matchFlash.offsetWidth;
      matchFlash.classList.add('trigger');
    }

    audioManager.playMatchSound(multiAccuracy.overallPercent);

    document.getElementById('scoreVal').textContent = `${multiAccuracy.overallPercent}%`;
    const scoreTitle = document.getElementById('scoreTitle');
    const scoreDesc = document.getElementById('scoreDesc');
    const scoreStars = document.getElementById('scoreStars');

    if (multiAccuracy.overallPercent >= 95) {
      scoreStars.textContent = '⭐⭐⭐⭐⭐';
      scoreTitle.textContent = 'INSANE PERFECT MATCH! 🔥';
      scoreDesc.textContent = 'God-level timing! All objects locked in!';
    } else if (multiAccuracy.overallPercent >= 80) {
      scoreStars.textContent = '⭐⭐⭐⭐';
      scoreTitle.textContent = 'GREAT TIMING! 🎯';
      scoreDesc.textContent = 'Super close match across all items!';
    } else if (multiAccuracy.overallPercent >= 60) {
      scoreStars.textContent = '⭐⭐⭐';
      scoreTitle.textContent = 'NICE TRY! 👍';
      scoreDesc.textContent = 'Almost synced all targets! Try again.';
    } else {
      scoreStars.textContent = '⭐';
      scoreTitle.textContent = 'MISSED! ❌';
      scoreDesc.textContent = 'Too early or too late! Try again.';
    }

    if (multiAccuracy.totalItems > 1 && multiScoreBreakdown) {
      multiScoreBreakdown.style.display = 'flex';
      multiScoreBreakdown.innerHTML = multiAccuracy.itemScores.map(s => `
        <div class="breakdown-row">
          <span>Slot ${s.slotIndex} (${activeItems[s.slotIndex - 1]?.name || 'Item'}):</span>
          <span style="font-weight: bold; color: var(--accent-cyan);">${s.percent}%</span>
        </div>
      `).join('');
    } else if (multiScoreBreakdown) {
      multiScoreBreakdown.style.display = 'none';
    }

    if (challengeScoreCard) challengeScoreCard.style.display = 'block';
  }

  if (playToggleBtn) playToggleBtn.addEventListener('click', togglePlayPause);
  if (interactiveStopBtn) interactiveStopBtn.addEventListener('click', triggerStopChallengeAction);
  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      if (challengeScoreCard) challengeScoreCard.style.display = 'none';
      canvasEngine.currentTime = 0;
      if (!canvasEngine.isPlaying) togglePlayPause();
    });
  }
  if (retryChallengeBtn) {
    retryChallengeBtn.addEventListener('click', () => {
      if (challengeScoreCard) challengeScoreCard.style.display = 'none';
      if (!canvasEngine.isPlaying) togglePlayPause();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (challengeScoreCard) challengeScoreCard.style.display = 'none';
      togglePlayPause();
    }
  });

  // Multi-Touch Gestures for Canvas on Mobile (Drag to move, Pinch to zoom)
  let isTouchDragging = false;
  let isPinching = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let initialItemOffsetX = 0;
  let initialItemOffsetY = 0;
  let initialPinchDistance = 0;
  let initialItemScale = 1;

  function getTouchDistance(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }

  if (canvas) {
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        isTouchDragging = true;
        isPinching = false;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        const item = activeItems[activeSlotIndex] || activeItems[0];
        if (item) {
          initialItemOffsetX = item.offsetX || 0;
          initialItemOffsetY = item.offsetY || 0;
        }
      } else if (e.touches.length === 2) {
        isTouchDragging = false;
        isPinching = true;
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const item = activeItems[activeSlotIndex] || activeItems[0];
        if (item) {
          initialItemScale = item.scale || 0.7;
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchmove', (e) => {
      if (isTouchDragging && e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        const item = activeItems[activeSlotIndex] || activeItems[0];
        if (item) {
          const canvasRect = canvas.getBoundingClientRect();
          const scaleFactor = canvasEngine.width / Math.max(1, canvasRect.width);
          item.offsetX = Math.round(initialItemOffsetX + dx * scaleFactor);
          item.offsetY = Math.round(initialItemOffsetY + dy * scaleFactor);
          canvasEngine.updateItem(activeSlotIndex, { offsetX: item.offsetX, offsetY: item.offsetY });
          const oxSlider = document.querySelector(`.slot-x-slider[data-slot="${activeSlotIndex}"]`);
          if (oxSlider) oxSlider.value = item.offsetX;
          const oySlider = document.querySelector(`.slot-y-slider[data-slot="${activeSlotIndex}"]`);
          if (oySlider) oySlider.value = item.offsetY;
          const xValEl = document.getElementById(`slotXVal-${activeSlotIndex}`);
          if (xValEl) xValEl.textContent = `${item.offsetX}px`;
          const yValEl = document.getElementById(`slotYVal-${activeSlotIndex}`);
          if (yValEl) yValEl.textContent = `${item.offsetY}px`;
        }
      } else if (isPinching && e.touches.length === 2) {
        const currentDist = getTouchDistance(e.touches[0], e.touches[1]);
        if (initialPinchDistance > 0) {
          const ratio = currentDist / initialPinchDistance;
          const item = activeItems[activeSlotIndex] || activeItems[0];
          if (item) {
            const newScale = Math.min(2.5, Math.max(0.2, initialItemScale * ratio));
            item.scale = parseFloat(newScale.toFixed(2));
            canvasEngine.updateItem(activeSlotIndex, { scale: item.scale });
            const sSlider = document.querySelector(`.slot-scale-slider[data-slot="${activeSlotIndex}"]`);
            const scalePct = Math.round(item.scale * 100);
            if (sSlider) sSlider.value = scalePct;
            const scaleValEl = document.getElementById(`slotScaleVal-${activeSlotIndex}`);
            if (scaleValEl) scaleValEl.textContent = `${scalePct}%`;
          }
        }
      }
    }, { passive: true });

    canvas.addEventListener('touchend', () => {
      if (isTouchDragging || isPinching) {
        triggerAutoSave();
      }
      isTouchDragging = false;
      isPinching = false;
    });
  }

  // Interactive Timeline Scrubber (Mouse & Touch)
  const timelineScrubberArea = document.getElementById('timelineScrubberArea');
  if (timelineScrubberArea) {
    let isScrubbing = false;

    function handleScrub(clientX) {
      const rect = timelineScrubberArea.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const trackWidth = rect.width;
      if (trackWidth > 0) {
        const pct = Math.min(1, Math.max(0, clickX / trackWidth));
        canvasEngine.currentTime = pct * canvasEngine.totalDuration;
        canvasEngine.renderFrame(canvasEngine.currentTime);
        canvasEngine.onFrameUpdate(canvasEngine.currentTime, canvasEngine.totalDuration);
      }
    }

    timelineScrubberArea.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      handleScrub(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) handleScrub(e.clientX);
    });

    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });

    timelineScrubberArea.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches.length > 0) {
        isScrubbing = true;
        handleScrub(e.touches[0].clientX);
      }
    }, { passive: true });

    timelineScrubberArea.addEventListener('touchmove', (e) => {
      if (isScrubbing && e.touches && e.touches.length > 0) {
        handleScrub(e.touches[0].clientX);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isScrubbing = false;
    });
  }

  // -------------------------------------------------------------
  // EXPORT MODAL & SMOOTH VIDEO WORKFLOW
  // -------------------------------------------------------------
  const openExportSettingsModalBtn = document.getElementById('openExportSettingsModalBtn');
  const exportSettingsModal = document.getElementById('exportSettingsModal');
  const closeExportSettingsBtn = document.getElementById('closeExportSettingsBtn');
  const cancelExportSettingsBtn = document.getElementById('cancelExportSettingsBtn');
  const startSmoothExportBtn = document.getElementById('startSmoothExportBtn');
  const startExportBtnText = document.getElementById('startExportBtnText');

  const exportProgressModal = document.getElementById('exportProgressModal');
  const exportProgressFill = document.getElementById('exportProgressFill');
  const exportProgressPercent = document.getElementById('exportProgressPercent');
  const frameCounterBadge = document.getElementById('frameCounterBadge');
  const cancelExportProcessBtn = document.getElementById('cancelExportProcessBtn');

  function updateStartExportBtnLabel() {
    if (startExportBtnText) {
      startExportBtnText.textContent = `Start ${selectedExportRes.toUpperCase()} ${selectedExportFps}FPS ${selectedExportFormat.toUpperCase()} Export 🚀`;
    }
  }

  if (openExportSettingsModalBtn) {
    openExportSettingsModalBtn.addEventListener('click', () => {
      updateResolutionCardLabels(canvasEngine.aspectRatio);
      updateStartExportBtnLabel();
      if (exportSettingsModal) exportSettingsModal.style.display = 'flex';
    });
  }

  if (closeExportSettingsBtn) closeExportSettingsBtn.addEventListener('click', () => { exportSettingsModal.style.display = 'none'; });
  if (cancelExportSettingsBtn) cancelExportSettingsBtn.addEventListener('click', () => { exportSettingsModal.style.display = 'none'; });

  document.querySelectorAll('#resolutionCards .export-option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#resolutionCards .export-option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedExportRes = card.getAttribute('data-res');
      updateStartExportBtnLabel();
    });
  });

  document.querySelectorAll('#formatCards .export-option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('#formatCards .export-option-card').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedExportFormat = card.getAttribute('data-format');
      updateStartExportBtnLabel();
    });
  });

  if (startSmoothExportBtn) {
    startSmoothExportBtn.addEventListener('click', () => {
      if (exportSettingsModal) exportSettingsModal.style.display = 'none';
      if (exportProgressModal) exportProgressModal.style.display = 'flex';

      const progressState = document.getElementById('exportProgressState');
      const successState = document.getElementById('exportSuccessState');
      if (progressState) progressState.style.display = 'block';
      if (successState) successState.style.display = 'none';

      // FIX 3: PAUSE live animation loop — prevent two loops fighting over canvas
      canvasEngine.pause();
      audioManager.pause();
      canvasEngine.currentTime = 0;

      if (exportProgressFill) exportProgressFill.style.width = '0%';
      if (exportProgressPercent) exportProgressPercent.textContent = '0%';
      const title = document.getElementById('exportProgressTitle');
      if (title) title.textContent = `Rendering ${selectedExportRes.toUpperCase()} ${selectedExportFps}FPS ${selectedExportFormat.toUpperCase()}...`;

      videoRecorder.startRecording({
        resolution: selectedExportRes,
        fps: selectedExportFps,
        format: selectedExportFormat,
        duration: canvasEngine.totalDuration,
        onProgress: (progress, currentFrame, totalFrames) => {
          const pct = Math.round(progress * 100);
          if (exportProgressFill) exportProgressFill.style.width = `${pct}%`;
          if (exportProgressPercent) exportProgressPercent.textContent = `${pct}%`;
          if (frameCounterBadge) {
            frameCounterBadge.textContent = `Frame ${currentFrame} / ${totalFrames}`;
          }
        },
        onComplete: (result) => {
          const progressState = document.getElementById('exportProgressState');
          const successState = document.getElementById('exportSuccessState');
          const directDownloadLink = document.getElementById('directDownloadLink');
          const exportSuccessDetails = document.getElementById('exportSuccessDetails');

          if (progressState) progressState.style.display = 'none';
          if (successState) successState.style.display = 'block';

          if (directDownloadLink) {
            directDownloadLink.href = result.url;
            directDownloadLink.download = result.filename;
          }

          if (exportSuccessDetails) {
            exportSuccessDetails.textContent = `${result.resolution} • ${result.fps} FPS • ${result.filename}`;
          }

          // Trigger automatic download
          videoRecorder.download(result.url, result.filename);

          // FIX 3: Resume live preview after export
          canvasEngine.start();
        },
        onError: (err) => {
          console.error('Export error:', err);
          if (exportProgressModal) exportProgressModal.style.display = 'none';
          alert('Export Error: ' + (err?.message || err || 'Unknown error. Check browser console (F12).'));

          // FIX 3: Resume live preview after export error
          canvasEngine.start();
        }
      });
    });
  }

  const closeExportSuccessBtn = document.getElementById('closeExportSuccessBtn');
  if (closeExportSuccessBtn) {
    closeExportSuccessBtn.addEventListener('click', () => {
      if (exportProgressModal) exportProgressModal.style.display = 'none';
    });
  }

  if (cancelExportProcessBtn) {
    cancelExportProcessBtn.addEventListener('click', () => {
      videoRecorder.stopRecording();
      if (exportProgressModal) exportProgressModal.style.display = 'none';
      audioManager.pause();
    });
  }

  const openExportsFolderBtn = document.getElementById('openExportsFolderBtn');
  if (openExportsFolderBtn) {
    openExportsFolderBtn.addEventListener('click', async () => {
      try {
        const res = await fetch('/api/open-exports');
        if (!res.ok) alert('Exports folder is located at: C:\\Users\\admin\\Desktop\\prompt maker\\exports');
      } catch (e) {
        alert('Exports folder is located at: C:\\Users\\admin\\Desktop\\prompt maker\\exports');
      }
    });
  }

  // =============================================================
  // 🏭 BATCH VIDEO FACTORY — MASS PNG + RANDOM AUDIO → BULK VIDEOS
  // =============================================================
  const batchPngInput = document.getElementById('batchPngInput');
  const batchPngDropzone = document.getElementById('batchPngDropzone');
  const batchPngGrid = document.getElementById('batchPngGrid');
  const batchPngListWrap = document.getElementById('batchPngListWrap');
  const batchPngCountBadge = document.getElementById('batchPngCountBadge');
  const clearBatchPngsBtn = document.getElementById('clearBatchPngsBtn');

  const batchAudioInput = document.getElementById('batchAudioInput');
  const batchAudioDropzone = document.getElementById('batchAudioDropzone');
  const batchAudioList = document.getElementById('batchAudioList');
  const batchAudioListWrap = document.getElementById('batchAudioListWrap');
  const batchAudioCountBadge = document.getElementById('batchAudioCountBadge');
  const clearBatchAudiosBtn = document.getElementById('clearBatchAudiosBtn');

  const startBatchExportBtn = document.getElementById('startBatchExportBtn');
  const startBatchExportText = document.getElementById('startBatchExportText');

  // Batch Progress Modal Elements
  const batchProgressModal = document.getElementById('batchProgressModal');
  const batchProgressState = document.getElementById('batchProgressState');
  const batchSuccessState = document.getElementById('batchSuccessState');
  const batchProgressTitle = document.getElementById('batchProgressTitle');
  const batchProgressSubtitle = document.getElementById('batchProgressSubtitle');
  const batchOverallFill = document.getElementById('batchOverallFill');
  const batchOverallText = document.getElementById('batchOverallText');
  const batchCurrentName = document.getElementById('batchCurrentName');
  const batchCurrentPercent = document.getElementById('batchCurrentPercent');
  const batchCurrentFill = document.getElementById('batchCurrentFill');
  const batchFrameCounter = document.getElementById('batchFrameCounter');
  const batchCurrentAudio = document.getElementById('batchCurrentAudio');
  const batchLogList = document.getElementById('batchLogList');
  const cancelBatchExportBtn = document.getElementById('cancelBatchExportBtn');
  const closeBatchSuccessBtn = document.getElementById('closeBatchSuccessBtn');
  const batchSuccessDetails = document.getElementById('batchSuccessDetails');
  const batchSuccessStats = document.getElementById('batchSuccessStats');

  // Batch data stores
  let batchPngFiles = []; // Array of { file, dataUrl, img }
  let batchAudioFiles = []; // Array of { file, name, buffer (AudioBuffer) }
  let batchCancelRequested = false;

  // --- Batch PNG Upload Handling ---
  function loadImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => resolve({ file, dataUrl: e.target.result, img });
        img.onerror = () => reject(new Error(`Failed to load: ${file.name}`));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error(`Failed to read: ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function handleBatchPngUpload(fileList) {
    const imageFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    // Load all images in parallel with progress
    const loadPromises = imageFiles.map(f => loadImageFile(f).catch(err => {
      console.warn('[BATCH]', err.message);
      return null;
    }));

    const results = await Promise.all(loadPromises);
    const validResults = results.filter(r => r !== null);

    batchPngFiles = batchPngFiles.concat(validResults);
    renderBatchPngGrid();
    updateBatchStats();
    flashSaveBadge(`${validResults.length} PNGs Added ✓`);
  }

  function renderBatchPngGrid() {
    if (!batchPngGrid) return;
    batchPngGrid.innerHTML = '';

    if (batchPngFiles.length === 0) {
      if (batchPngListWrap) batchPngListWrap.style.display = 'none';
      return;
    }

    if (batchPngListWrap) batchPngListWrap.style.display = 'block';

    // Only show first 200 thumbnails for performance, rest indicated by count
    const maxShow = 200;
    const showCount = Math.min(batchPngFiles.length, maxShow);

    for (let i = 0; i < showCount; i++) {
      const item = batchPngFiles[i];
      const thumb = document.createElement('div');
      thumb.className = 'batch-png-thumb';
      thumb.innerHTML = `
        <img src="${item.dataUrl}" alt="${item.file.name}" title="${item.file.name}">
        <span class="batch-thumb-index">${i + 1}</span>
        <button class="batch-thumb-remove" data-idx="${i}" title="Remove">✕</button>
      `;
      batchPngGrid.appendChild(thumb);
    }

    if (batchPngFiles.length > maxShow) {
      const moreEl = document.createElement('div');
      moreEl.className = 'batch-png-thumb';
      moreEl.style.display = 'flex';
      moreEl.style.alignItems = 'center';
      moreEl.style.justifyContent = 'center';
      moreEl.style.fontSize = '0.7rem';
      moreEl.style.color = 'var(--accent-cyan)';
      moreEl.style.fontWeight = '800';
      moreEl.textContent = `+${batchPngFiles.length - maxShow}`;
      batchPngGrid.appendChild(moreEl);
    }

    // Remove buttons
    batchPngGrid.querySelectorAll('.batch-thumb-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        batchPngFiles.splice(idx, 1);
        renderBatchPngGrid();
        updateBatchStats();
      });
    });

    if (batchPngCountBadge) batchPngCountBadge.textContent = `${batchPngFiles.length} Images`;
  }

  // Batch PNG Input & Drop
  if (batchPngInput) {
    batchPngInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleBatchPngUpload(e.target.files);
        batchPngInput.value = '';
      }
    });
  }
  if (batchPngDropzone) {
    batchPngDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      batchPngDropzone.classList.add('dragover');
    });
    batchPngDropzone.addEventListener('dragleave', () => batchPngDropzone.classList.remove('dragover'));
    batchPngDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      batchPngDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleBatchPngUpload(e.dataTransfer.files);
      }
    });
  }
  if (clearBatchPngsBtn) {
    clearBatchPngsBtn.addEventListener('click', () => {
      batchPngFiles = [];
      renderBatchPngGrid();
      updateBatchStats();
    });
  }

  // --- Batch Audio Upload Handling ---
  async function handleBatchAudioUpload(fileList) {
    const audioFiles = Array.from(fileList).filter(f =>
      f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name)
    );
    if (audioFiles.length === 0) return;

    // Ensure AudioContext exists
    audioManager.initContext();

    for (const file of audioFiles) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = await audioManager.ctx.decodeAudioData(arrayBuffer);
        batchAudioFiles.push({ file, name: file.name, buffer });
      } catch (err) {
        console.warn(`[BATCH] Failed to decode audio: ${file.name}`, err);
      }
    }

    renderBatchAudioList();
    updateBatchStats();
    flashSaveBadge(`${audioFiles.length} Audio Added ✓`);
  }

  function renderBatchAudioList() {
    if (!batchAudioList) return;
    batchAudioList.innerHTML = '';

    if (batchAudioFiles.length === 0) {
      if (batchAudioListWrap) batchAudioListWrap.style.display = 'none';
      return;
    }

    if (batchAudioListWrap) batchAudioListWrap.style.display = 'block';

    batchAudioFiles.forEach((item, idx) => {
      const dur = item.buffer ? `${Math.round(item.buffer.duration)}s` : '--';
      const el = document.createElement('div');
      el.className = 'batch-audio-item';
      el.innerHTML = `
        <span class="audio-index">#${idx + 1}</span>
        <span class="audio-name" title="${item.name}">🎵 ${item.name}</span>
        <span style="font-size:0.65rem; color:var(--text-muted);">${dur}</span>
        <button class="audio-remove-btn" data-idx="${idx}" title="Remove">✕</button>
      `;
      batchAudioList.appendChild(el);
    });

    // Remove buttons
    batchAudioList.querySelectorAll('.audio-remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        batchAudioFiles.splice(idx, 1);
        renderBatchAudioList();
        updateBatchStats();
      });
    });

    if (batchAudioCountBadge) batchAudioCountBadge.textContent = `${batchAudioFiles.length} Tracks`;
  }

  // Batch Audio Input & Drop
  if (batchAudioInput) {
    batchAudioInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleBatchAudioUpload(e.target.files);
        batchAudioInput.value = '';
      }
    });
  }
  if (batchAudioDropzone) {
    batchAudioDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      batchAudioDropzone.classList.add('dragover');
    });
    batchAudioDropzone.addEventListener('dragleave', () => batchAudioDropzone.classList.remove('dragover'));
    batchAudioDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      batchAudioDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleBatchAudioUpload(e.dataTransfer.files);
      }
    });
  }
  if (clearBatchAudiosBtn) {
    clearBatchAudiosBtn.addEventListener('click', () => {
      batchAudioFiles = [];
      renderBatchAudioList();
      updateBatchStats();
    });
  }

  // --- Update Batch Stats & Button State ---
  function updateBatchStats() {
    const pngCount = batchPngFiles.length;
    const audioCount = batchAudioFiles.length;

    const statPngs = document.getElementById('batchStatPngs');
    const statAudios = document.getElementById('batchStatAudios');
    const statVideos = document.getElementById('batchStatVideos');
    const statETA = document.getElementById('batchStatETA');

    if (statPngs) statPngs.textContent = pngCount;
    if (statAudios) statAudios.textContent = audioCount;
    if (statVideos) statVideos.textContent = pngCount;

    // Estimate: ~8 seconds per 10-sec 1080p video, ~15s per 4K video
    const perVideoSec = selectedExportRes === '4k' ? 15 : (selectedExportRes === '2k' ? 12 : 8);
    const totalEtaMin = Math.ceil((pngCount * perVideoSec) / 60);
    if (statETA) statETA.textContent = `~${totalEtaMin}m`;

    // Update button state
    if (startBatchExportBtn) {
      startBatchExportBtn.disabled = pngCount === 0;
    }
    if (startBatchExportText) {
      if (pngCount === 0) {
        startBatchExportText.textContent = 'Upload PNGs to Start Batch Export';
      } else {
        startBatchExportText.textContent = `🚀 Generate ${pngCount} Videos (${selectedExportRes.toUpperCase()} ${selectedExportFps}FPS)`;
      }
    }

    if (batchPngCountBadge) batchPngCountBadge.textContent = `${pngCount} Images`;
    if (batchAudioCountBadge) batchAudioCountBadge.textContent = `${audioCount} Tracks`;
  }

  // --- Batch Log Helper ---
  function addBatchLog(msg, type = 'info') {
    if (!batchLogList) return;
    const entry = document.createElement('div');
    entry.className = `batch-log-entry ${type}`;
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    entry.innerHTML = `<span>${icons[type] || ''}</span><span>${msg}</span>`;
    batchLogList.appendChild(entry);
    // Auto scroll to bottom
    const logSection = batchLogList.closest('.batch-log-section');
    if (logSection) logSection.scrollTop = logSection.scrollHeight;
  }

  // --- Render single audio buffer for offline export ---
  async function renderAudioBufferForExport(audioBuffer, duration, volume) {
    const sampleRate = 48000;
    const totalSamples = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = volume;
    gainNode.connect(offlineCtx.destination);

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.connect(gainNode);
    source.start(0);
    return await offlineCtx.startRendering();
  }



  // Fix: We need to handle the audio override properly
  // Override the videoRecorder's startRecording to support batch audio injection
  const originalStartRecording = videoRecorder.startRecording.bind(videoRecorder);

  // Wrap for batch audio support
  videoRecorder.startBatchRecording = async function(options, customAudioBuffer) {
    // Temporarily swap audioManager's getRenderedAudioBuffer
    const originalGetRendered = audioManager.getRenderedAudioBuffer.bind(audioManager);

    if (customAudioBuffer) {
      audioManager.getRenderedAudioBuffer = async () => customAudioBuffer;
    }

    return new Promise((resolve, reject) => {
      const origComplete = options.onComplete;
      const origError = options.onError;

      options.onComplete = (result) => {
        audioManager.getRenderedAudioBuffer = originalGetRendered;
        origComplete?.(result);
        resolve(result);
      };
      options.onError = (err) => {
        audioManager.getRenderedAudioBuffer = originalGetRendered;
        origError?.(err);
        reject(err);
      };

      originalStartRecording(options);
    });
  };

  // Replace the batch export engine to use the proper wrapper
  async function startBatchExportV2() {
    if (batchPngFiles.length === 0) return;

    batchCancelRequested = false;
    const totalVideos = batchPngFiles.length;
    let completedVideos = 0;
    let failedVideos = 0;
    const startTime = performance.now();

    // Show progress modal
    if (batchProgressModal) batchProgressModal.style.display = 'flex';
    if (batchProgressState) batchProgressState.style.display = 'block';
    if (batchSuccessState) batchSuccessState.style.display = 'none';
    if (batchLogList) batchLogList.innerHTML = '';
    if (batchOverallFill) batchOverallFill.style.width = '0%';
    if (batchCurrentFill) batchCurrentFill.style.width = '0%';

    // Pause live preview
    canvasEngine.pause();
    audioManager.pause();

    addBatchLog(`🏭 Batch Factory started — ${totalVideos} videos to generate`, 'info');
    if (batchAudioFiles.length > 0) {
      addBatchLog(`🎵 Audio pool: ${batchAudioFiles.length} tracks (random assignment)`, 'info');
    } else {
      addBatchLog(`🎵 Using current preset/custom audio for all videos`, 'info');
    }

    // Save original state
    const origItem0 = activeItems[0] ? { ...activeItems[0] } : null;

    for (let i = 0; i < batchPngFiles.length; i++) {
      if (batchCancelRequested) {
        addBatchLog(`⛔ Batch cancelled at video ${i + 1}/${totalVideos}`, 'error');
        break;
      }

      const pngData = batchPngFiles[i];
      const pngName = pngData.file.name.replace(/\.[^/.]+$/, '');

      // Pick random audio from pool
      let audioName = 'Preset/Custom Audio';
      let audioBufferForExport = null;

      if (batchAudioFiles.length > 0) {
        const randomIdx = Math.floor(Math.random() * batchAudioFiles.length);
        const selectedAudio = batchAudioFiles[randomIdx];
        audioName = selectedAudio.name.replace(/\.[^/.]+$/, '');

        try {
          audioBufferForExport = await renderAudioBufferForExport(
            selectedAudio.buffer,
            canvasEngine.totalDuration,
            audioManager.volume
          );
        } catch (err) {
          console.warn(`[BATCH] Audio render failed for ${audioName}:`, err);
        }
      }

      // Update progress UI
      if (batchCurrentName) batchCurrentName.textContent = `🖼️ ${i + 1}/${totalVideos}: ${pngName}`;
      if (batchCurrentAudio) batchCurrentAudio.textContent = `🎵 ${audioName}`;
      if (batchCurrentPercent) batchCurrentPercent.textContent = '0%';
      if (batchCurrentFill) batchCurrentFill.style.width = '0%';
      if (batchOverallText) batchOverallText.textContent = `${completedVideos} / ${totalVideos} Videos`;

      addBatchLog(`🎬 [${i + 1}/${totalVideos}] Rendering "${pngName}" + "${audioName}"`, 'info');

      // Swap product image in slot 0
      const existingBase = origItem0 || { scale: 0.7, offsetX: 0, offsetY: 0, angle: 0 };
      activeItems[0] = {
        ...existingBase,
        id: 'slot-1',
        name: pngName,
        img: pngData.img,
        imgUrl: pngData.dataUrl,
        outlineData: null
      };
      canvasEngine.setItems(activeItems);
      canvasEngine.currentTime = 0;

      // Allow outline to generate
      await new Promise(r => setTimeout(r, 80));

      try {
        const result = await videoRecorder.startBatchRecording({
          resolution: selectedExportRes,
          fps: selectedExportFps,
          format: selectedExportFormat,
          duration: canvasEngine.totalDuration,
          onProgress: (progress, currentFrame, totalFrames) => {
            const pct = Math.round(progress * 100);
            if (batchCurrentFill) batchCurrentFill.style.width = `${pct}%`;
            if (batchCurrentPercent) batchCurrentPercent.textContent = `${pct}%`;
            if (batchFrameCounter) batchFrameCounter.textContent = `Frame ${currentFrame} / ${totalFrames}`;
          },
          onComplete: () => {},
          onError: () => {}
        }, audioBufferForExport);

        // Download
        const filename = `batch_${String(i + 1).padStart(3, '0')}_${pngName}_${selectedExportRes.toUpperCase()}_${selectedExportFps}FPS.mp4`;
        videoRecorder.download(result.url, filename);
        setTimeout(() => {
          try { URL.revokeObjectURL(result.url); } catch (e) {}
        }, 12000);

        completedVideos++;
        const overallPct = Math.round((completedVideos / totalVideos) * 100);
        if (batchOverallFill) batchOverallFill.style.width = `${overallPct}%`;
        if (batchOverallText) batchOverallText.textContent = `${completedVideos} / ${totalVideos} Videos`;

        const sizeKB = Math.round(result.blob.size / 1024);
        addBatchLog(`✅ [${i + 1}] "${pngName}" — ${sizeKB} KB ✓`, 'success');

      } catch (err) {
        failedVideos++;
        addBatchLog(`❌ [${i + 1}] "${pngName}" — Error: ${err?.message || err}`, 'error');
        console.error(`[BATCH] Video ${i + 1} failed:`, err);
      }

      // Brief pause between videos for GC
      await new Promise(r => setTimeout(r, 300));
    }

    // DONE!
    const totalTimeSec = ((performance.now() - startTime) / 1000);
    const totalTimeMin = (totalTimeSec / 60).toFixed(1);

    addBatchLog(`🎉 Batch complete! ${completedVideos} success, ${failedVideos} failed in ${totalTimeMin} min`, 'success');

    if (batchProgressState) batchProgressState.style.display = 'none';
    if (batchSuccessState) batchSuccessState.style.display = 'block';
    if (batchSuccessDetails) {
      batchSuccessDetails.textContent = `${completedVideos} videos generated in ${totalTimeMin} minutes!`;
    }
    if (batchSuccessStats) {
      batchSuccessStats.innerHTML = `
        <div class="stat-item"><span class="stat-val">${completedVideos}</span><span class="stat-lbl">Completed</span></div>
        <div class="stat-item"><span class="stat-val">${failedVideos}</span><span class="stat-lbl">Failed</span></div>
        <div class="stat-item"><span class="stat-val">${totalTimeMin}m</span><span class="stat-lbl">Total Time</span></div>
        <div class="stat-item"><span class="stat-val">${selectedExportRes.toUpperCase()}</span><span class="stat-lbl">Quality</span></div>
      `;
    }

    // Restore original item and resume
    if (origItem0) {
      activeItems[0] = origItem0;
      canvasEngine.setItems(activeItems);
      renderSlotCardsUI();
    }
    canvasEngine.start();
  }

  // Wire up batch export button
  if (startBatchExportBtn) {
    startBatchExportBtn.addEventListener('click', () => {
      if (batchPngFiles.length === 0) {
        alert('Please upload PNG images first!');
        return;
      }
      startBatchExportV2();
    });
  }

  // Cancel batch
  if (cancelBatchExportBtn) {
    cancelBatchExportBtn.addEventListener('click', () => {
      batchCancelRequested = true;
      videoRecorder.stopRecording();
      addBatchLog('⛔ Cancel requested... finishing current video...', 'error');
    });
  }

  // Close batch success
  if (closeBatchSuccessBtn) {
    closeBatchSuccessBtn.addEventListener('click', () => {
      if (batchProgressModal) batchProgressModal.style.display = 'none';
    });
  }

});

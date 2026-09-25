/**
 * Stop Challenge Pro Studio - CapCut Batch Media Pool & Drag-and-Drop Engine
 * Enables bulk loading of 10-50+ files simultaneously (PNG, JPG, SVG, MP3, WAV)
 * with instant Drag & Drop placement onto Canvas, Slot Layers, and Timeline tracks.
 */

class MediaPool {
  constructor() {
    this.mediaItems = [];
    this.STORAGE_KEY = 'stop_challenge_media_pool_v2';
    this.loadMediaFromStorage();
    this.ensureSampleAssets();
    this.activeFilter = 'all';
    this.draggedItem = null;
  }

  loadMediaFromStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mediaItems = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load persistent media pool:', e);
    }
  }

  ensureSampleAssets() {
    if (this.mediaItems.length > 0) return;

    const samples = [
      { key: 'burger', name: 'Burger 🍔', type: 'png' },
      { key: 'fries', name: 'Crispy Fries 🍟', type: 'png' },
      { key: 'soda', name: 'Cold Soda 🥤', type: 'png' },
      { key: 'pizza', name: 'Pizza Slice 🍕', type: 'png' },
      { key: 'donut', name: 'Glazed Donut 🍩', type: 'png' },
      { key: 'car', name: 'Sports Car 🏎️', type: 'png' },
      { key: 'sneaker', name: 'Sneaker 👟', type: 'png' },
      { key: 'watch', name: 'Smart Watch ⌚', type: 'png' },
      { key: 'diamond', name: 'Diamond 💎', type: 'png' },
      { key: 'headphone', name: 'Headphones 🎧', type: 'png' }
    ];

    samples.forEach(s => {
      const presetsObj = typeof PRESETS !== 'undefined' ? PRESETS : (typeof window !== 'undefined' ? window.PRESETS : null);
      const p = presetsObj?.catalog ? presetsObj.catalog[s.key] : null;
      if (p) {
        const enhancedSvg = p.svg.replace(/width="[0-9]+"/, 'width="800"').replace(/height="[0-9]+"/, 'height="800"');
        const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(enhancedSvg);
        this.mediaItems.push({
          id: 'sample_' + s.key,
          objKey: s.key,
          name: s.name,
          type: s.type,
          url: dataUrl,
          width: 800,
          height: 800,
          sizeStr: '12 KB',
          addedAt: Date.now()
        });
      }
    });

    this.saveMediaToStorage();
  }

  saveMediaToStorage() {
    try {
      const lightweight = this.mediaItems.slice(0, 35).map(item => ({
        id: item.id,
        objKey: item.objKey,
        name: item.name,
        type: item.type,
        url: item.url && item.url.length < 1500000 ? item.url : '',
        width: item.width,
        height: item.height,
        duration: item.duration,
        sizeStr: item.sizeStr,
        addedAt: item.addedAt
      }));
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(lightweight));
    } catch (e) {
      console.warn('Media pool storage notice:', e);
    }
  }

  async importFiles(fileList) {
    const files = Array.from(fileList);
    if (!files.length) return [];

    const imported = [];

    for (const file of files) {
      try {
        const item = await this.processFile(file);
        if (item) {
          // Avoid duplicates by name + size
          const exists = this.mediaItems.find(m => m.name === item.name && m.size === item.size);
          if (!exists) {
            this.mediaItems.unshift(item);
            imported.push(item);
          }
        }
      } catch (err) {
        console.error('Error importing media file:', file.name, err);
      }
    }

    this.saveMediaToStorage();
    this.renderUI();
    return imported;
  }

  processFile(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|aac|ogg|m4a|flac)$/i.test(file.name);
      const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg|gif|avif)$/i.test(file.name);

      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

      const baseItem = {
        id: 'media_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: file.name,
        size: file.size,
        sizeStr: sizeStr,
        type: isAudio ? 'audio' : (file.name.toLowerCase().endsWith('.png') ? 'png' : 'image'),
        addedAt: Date.now()
      };

      if (isAudio) {
        reader.onload = (e) => {
          const audioUrl = e.target.result;
          const tempAudio = new Audio();
          tempAudio.src = audioUrl;
          tempAudio.onloadedmetadata = () => {
            const mins = Math.floor(tempAudio.duration / 60);
            const secs = Math.floor(tempAudio.duration % 60);
            resolve({
              ...baseItem,
              url: audioUrl,
              duration: `${mins}:${secs < 10 ? '0' : ''}${secs}`,
              durationSec: tempAudio.duration
            });
          };
          tempAudio.onerror = () => {
            resolve({ ...baseItem, url: audioUrl, duration: '--:--' });
          };
        };
        reader.readAsDataURL(file);
      } else if (isImage) {
        reader.onload = (e) => {
          const imgUrl = e.target.result;
          const tempImg = new Image();
          tempImg.onload = () => {
            resolve({
              ...baseItem,
              url: imgUrl,
              width: tempImg.naturalWidth,
              height: tempImg.naturalHeight
            });
          };
          tempImg.onerror = () => {
            resolve({ ...baseItem, url: imgUrl, width: 512, height: 512 });
          };
          tempImg.src = imgUrl;
        };
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    });
  }

  addMediaItem(item) {
    this.mediaItems.unshift(item);
    this.saveMediaToStorage();
    this.renderUI();
  }

  removeMediaItem(id) {
    this.mediaItems = this.mediaItems.filter(m => m.id !== id);
    this.saveMediaToStorage();
    this.renderUI();
  }

  clearMediaPool() {
    this.mediaItems = [];
    this.saveMediaToStorage();
    this.renderUI();
  }

  renderUI() {
    const grid = document.getElementById('mediaPoolGrid');
    const emptyState = document.getElementById('mediaPoolEmpty');
    const countBadge = document.getElementById('mediaPoolCount');

    if (countBadge) {
      countBadge.textContent = `${this.mediaItems.length} Assets`;
    }

    if (!grid) return;
    grid.innerHTML = '';

    const filtered = this.mediaItems.filter(item => {
      if (this.activeFilter === 'all') return true;
      if (this.activeFilter === 'images') return item.type === 'image' || item.type === 'png';
      if (this.activeFilter === 'pngs') return item.type === 'png';
      if (this.activeFilter === 'audio') return item.type === 'audio';
      return true;
    });

    if (filtered.length === 0) {
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = `media-asset-tile type-${item.type}`;
        card.setAttribute('draggable', 'true');
        card.setAttribute('data-id', item.id);

        let thumbHtml = '';
        if (item.type === 'audio') {
          thumbHtml = `
            <div class="asset-audio-thumb">
              <span class="audio-icon">🎵</span>
              <span class="audio-dur">${item.duration || 'Audio'}</span>
            </div>
          `;
        } else {
          thumbHtml = `
            <img src="${item.url}" alt="${item.name}" loading="lazy">
            <span class="asset-dim-badge">${item.width && item.height ? `${item.width}×${item.height}` : item.sizeStr}</span>
          `;
        }

        card.innerHTML = `
          <div class="asset-thumb-container">
            ${thumbHtml}
            <div class="asset-hover-overlay">
              <button class="btn-add-asset" title="1-Click Add to Canvas" data-id="${item.id}">➕</button>
              <button class="btn-del-asset" title="Delete from Media Pool" data-id="${item.id}">🗑️</button>
            </div>
            <span class="asset-tag-badge">${item.type.toUpperCase()}</span>
          </div>
          <div class="asset-name" title="${item.name}">${item.name}</div>
        `;

        // Drag Events
        card.addEventListener('dragstart', (e) => {
          this.draggedItem = item;
          e.dataTransfer.setData('text/plain', JSON.stringify({
            type: item.type,
            id: item.id,
            objKey: item.objKey,
            url: item.url,
            name: item.name
          }));
          card.classList.add('dragging');
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('dragging');
          setTimeout(() => {
            this.draggedItem = null;
          }, 150);
        });

        // 1-Click Add Button
        const addBtn = card.querySelector('.btn-add-asset');
        if (addBtn) {
          addBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.handleAssetPlacement(item);
          });
        }

        // Card Direct Tap to Add on mobile
        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-del-asset') || e.target.closest('.btn-add-asset')) return;
          this.handleAssetPlacement(item);
        });

        // Delete Button
        const delBtn = card.querySelector('.btn-del-asset');
        if (delBtn) {
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeMediaItem(item.id);
          });
        }

        grid.appendChild(card);
      });
    }
  }

  handleAssetPlacement(item) {
    if (item.type === 'audio') {
      // Set as custom audio track
      if (window.audioManager) {
        const audioInput = document.getElementById('customAudioInput');
        window.audioManager.setCustomAudio(item.url, item.name);
        const card = document.getElementById('customAudioCard');
        if (card) card.style.display = 'block';
        const nameEl = document.getElementById('customAudioFileName');
        if (nameEl) nameEl.textContent = item.name;
        const durEl = document.getElementById('customAudioDuration');
        if (durEl) durEl.textContent = item.duration || 'Custom';
        if (window.app && window.app.triggerAutoSave) window.app.triggerAutoSave();
      }
    } else {
      // Add as slot image or replace current active slot
      if (window.app && window.app.addOrReplaceSlotWithAsset) {
        window.app.addOrReplaceSlotWithAsset(item);
      }
    }
  }

  async handleTimelineTrackDrop(trackType, item) {
    if (!item) return;

    if (trackType === 'audio' || item.type === 'audio') {
      if (window.audioManager) {
        window.audioManager.setCustomAudio(item.url, item.name);
        const card = document.getElementById('customAudioCard');
        if (card) card.style.display = 'block';
        const nameEl = document.getElementById('customAudioFileName');
        if (nameEl) nameEl.textContent = item.name;
        const durEl = document.getElementById('customAudioDuration');
        if (durEl) durEl.textContent = item.duration || 'Custom Audio';
        if (window.app && window.app.renderTimelineTracksUI) window.app.renderTimelineTracksUI();
        if (window.app && window.app.triggerAutoSave) window.app.triggerAutoSave();
        if (window.app && window.app.flashSaveBadge) window.app.flashSaveBadge('Audio Track Updated ✓');
      }
    } else if (trackType === 'canvas' && item.type !== 'png') {
      let img = null;
      if (window.app && window.app.loadImageSafe) {
        img = await window.app.loadImageSafe(item.url);
      } else {
        img = new Image();
        img.src = item.url;
      }
      if (img && window.canvasEngine) {
        window.canvasEngine.bgImage = img;
        window.canvasEngine.config.bgType = 'image';
        if (!window.canvasEngine.isPlaying) window.canvasEngine.renderFrame(window.canvasEngine.currentTime || 0);
      }
      const customCard = document.getElementById('customBgCard');
      if (customCard) customCard.style.display = 'block';
      const thumb = document.getElementById('customBgThumb');
      if (thumb) thumb.src = item.url;
      const fn = document.getElementById('customBgFileName');
      if (fn) fn.textContent = item.name;
      if (window.app && window.app.renderTimelineTracksUI) window.app.renderTimelineTracksUI();
      if (window.app && window.app.triggerAutoSave) window.app.triggerAutoSave();
      if (window.app && window.app.flashSaveBadge) window.app.flashSaveBadge('Background Photo Set ✓');
    } else if (trackType === 'text') {
      const textTab = document.querySelector('.activity-btn[data-tab="text-tab"]');
      if (textTab) textTab.click();
    } else {
      if (window.app && window.app.addOrReplaceSlotWithAsset) {
        await window.app.addOrReplaceSlotWithAsset(item, true);
      }
    }
  }

  initDragAndDropListeners() {
    // 1. Bulk Dropzone in Media Drawer
    const bulkDropzone = document.getElementById('bulkMediaDropzone');
    const bulkInput = document.getElementById('bulkMediaInput');

    if (bulkDropzone && bulkInput) {
      bulkDropzone.addEventListener('click', () => bulkInput.click());
      bulkInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length) {
          this.importFiles(e.target.files);
          bulkInput.value = '';
        }
      });

      bulkDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        bulkDropzone.classList.add('drag-over');
      });
      bulkDropzone.addEventListener('dragleave', () => {
        bulkDropzone.classList.remove('drag-over');
      });
      bulkDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        bulkDropzone.classList.remove('drag-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          this.importFiles(e.dataTransfer.files);
        }
      });
    }

    // 2. Canvas Viewport Drop Target (Drop from Media Pool or OS directly onto Canvas)
    const canvasViewport = document.getElementById('canvasViewport');
    if (canvasViewport) {
      canvasViewport.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvasViewport.classList.add('canvas-drag-over');
      });
      canvasViewport.addEventListener('dragleave', () => {
        canvasViewport.classList.remove('canvas-drag-over');
      });
      canvasViewport.addEventListener('drop', async (e) => {
        e.preventDefault();
        canvasViewport.classList.remove('canvas-drag-over');

        // Case A: Dropped files from OS Explorer directly onto canvas
        if (e.dataTransfer.files && e.dataTransfer.files.length) {
          const imported = await this.importFiles(e.dataTransfer.files);
          if (imported.length && imported[0].type !== 'audio') {
            this.handleAssetPlacement(imported[0]);
          }
        } 
        // Case B: Dropped asset from Media Pool
        else if (this.draggedItem) {
          this.handleAssetPlacement(this.draggedItem);
        }
      });
    }

    // 3. Multi-Track Timeline Drop Targets
    const timelineArea = document.getElementById('timelineScrubberArea');
    if (timelineArea) {
      timelineArea.addEventListener('dragover', (e) => {
        e.preventDefault();
      });
      timelineArea.addEventListener('drop', async (e) => {
        // If dropped directly in scrubber area outside a row
        if (!e.target.closest('.timeline-track-row')) {
          e.preventDefault();
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
            const imported = await this.importFiles(e.dataTransfer.files);
            if (imported && imported.length) {
              await this.handleTimelineTrackDrop('objects', imported[0]);
            }
          } else if (this.draggedItem) {
            await this.handleTimelineTrackDrop('objects', this.draggedItem);
          }
        }
      });

      document.querySelectorAll('.timeline-track-row').forEach(row => {
        const trackType = row.getAttribute('data-track-type') || 'objects';

        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.stopPropagation();
          row.classList.add('drag-over-track');
        });

        row.addEventListener('dragleave', (e) => {
          e.stopPropagation();
          row.classList.remove('drag-over-track');
        });

        row.addEventListener('drop', async (e) => {
          e.preventDefault();
          e.stopPropagation();
          row.classList.remove('drag-over-track');

          // Case A: Dropped file from PC / Explorer
          if (e.dataTransfer.files && e.dataTransfer.files.length) {
            const imported = await this.importFiles(e.dataTransfer.files);
            if (imported && imported.length) {
              await this.handleTimelineTrackDrop(trackType, imported[0]);
            }
          }
          // Case B: Dropped asset from Media Bin
          else if (this.draggedItem) {
            await this.handleTimelineTrackDrop(trackType, this.draggedItem);
          }
        });
      });
    }

    // 4. Media Filter Chips
    document.querySelectorAll('.media-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.media-filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.activeFilter = chip.getAttribute('data-filter') || 'all';
        this.renderUI();
      });
    });
  }
}

window.mediaPool = new MediaPool();


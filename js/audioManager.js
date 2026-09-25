/**
 * WEB AUDIO API MANAGER & PROCEDURAL MUSIC SYNTHESIZER
 * Manages background tracks, custom user audio files (MP3/WAV/AAC/M4A),
 * live playback preview, and offline audio rendering for 60 FPS MP4 export.
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.destNode = null;

    this.isPlaying = false;
    this.currentPreset = 'none'; // 'none' by default - silent unless user uploads custom audio
    this.volume = 0.8;
    this.synthLoopTimer = null;
    this.userAudioElement = null;
    this.userAudioSource = null;
    this.userAudioBuffer = null;
    this.userAudioName = '';
    this.userAudioDuration = 0;

    this.isCustomAudio = false;
  }

  /**
   * Initializes Web Audio Context on user interaction
   */
  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

      this.destNode = this.ctx.createMediaStreamDestination();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.connect(this.destNode);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
    if (this.userAudioElement) {
      this.userAudioElement.volume = this.volume;
    }
  }

  getAudioStream() {
    this.initContext();
    return this.destNode.stream;
  }

  /**
   * Loads and decodes a custom user audio file (MP3, WAV, AAC, M4A, OGG)
   */
  async loadUserAudio(file) {
    this.initContext();
    if (this.userAudioElement) {
      this.userAudioElement.pause();
      this.userAudioElement.remove();
      this.userAudioElement = null;
    }

    const arrayBuffer = await file.arrayBuffer();
    // Decode into AudioBuffer for offline rendering
    try {
      this.userAudioBuffer = await this.ctx.decodeAudioData(arrayBuffer.slice(0));
    } catch (e) {
      console.warn('decodeAudioData failed, fallback to element only:', e);
    }

    const url = URL.createObjectURL(file);
    this.userAudioElement = new Audio(url);
    this.userAudioElement.loop = true;
    this.userAudioElement.volume = this.volume;
    this.userAudioElement.crossOrigin = 'anonymous';

    try {
      this.userAudioSource = this.ctx.createMediaElementSource(this.userAudioElement);
      this.userAudioSource.connect(this.masterGain);
    } catch (e) {
      // Element source already connected
    }

    this.isCustomAudio = true;
    this.userAudioName = file.name;
    this.userAudioDuration = this.userAudioBuffer ? this.userAudioBuffer.duration : 0;

    const mins = Math.floor(this.userAudioDuration / 60);
    const secs = Math.floor(this.userAudioDuration % 60);
    const durationStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    return {
      name: file.name,
      duration: durationStr,
      durationSec: this.userAudioDuration,
      sampleRate: this.userAudioBuffer ? this.userAudioBuffer.sampleRate : 44100
    };
  }

  clearCustomAudio() {
    this.pause();
    this.isCustomAudio = false;
    this.userAudioBuffer = null;
    this.userAudioName = '';
    this.userAudioDuration = 0;
    if (this.userAudioElement) {
      this.userAudioElement.pause();
      this.userAudioElement = null;
    }
  }

  setPreset(presetKey) {
    this.currentPreset = presetKey;
    this.isCustomAudio = false;
    if (this.userAudioElement) {
      this.userAudioElement.pause();
    }
  }

  /**
   * Starts playing audio in live preview
   */
  play() {
    this.initContext();
    this.isPlaying = true;

    if (this.isCustomAudio && this.userAudioElement) {
      this.userAudioElement.currentTime = 0;
      this.userAudioElement.play().catch(e => console.warn('Audio play prevented:', e));
    } else if (!this.isCustomAudio && this.currentPreset !== 'none') {
      this.startProceduralSynth();
    }
  }

  /**
   * Pauses audio playback
   */
  pause() {
    this.isPlaying = false;
    if (this.userAudioElement) {
      this.userAudioElement.pause();
    }
    if (this.synthLoopTimer) {
      clearInterval(this.synthLoopTimer);
      this.synthLoopTimer = null;
    }
  }

  /**
   * Renders audio into a clean stereo AudioBuffer for offline video export (48kHz)
   */
  async getRenderedAudioBuffer(duration = 10, sampleRate = 48000) {
    if (this.currentPreset === 'none' && !this.isCustomAudio) {
      return null;
    }

    const totalSamples = Math.ceil(duration * sampleRate);
    const offlineCtx = new OfflineAudioContext(2, totalSamples, sampleRate);
    const gainNode = offlineCtx.createGain();
    gainNode.gain.value = this.volume;
    gainNode.connect(offlineCtx.destination);

    if (this.isCustomAudio && this.userAudioBuffer) {
      // Loop custom audio buffer across duration
      const source = offlineCtx.createBufferSource();
      source.buffer = this.userAudioBuffer;
      source.loop = true;
      source.connect(gainNode);
      source.start(0);
      return await offlineCtx.startRendering();
    }

    // Otherwise render procedural synth beat
    if (this.currentPreset !== 'none') {
      this.scheduleProceduralSynthOffline(offlineCtx, gainNode, duration);
      return await offlineCtx.startRendering();
    }

    return null;
  }

  scheduleProceduralSynthOffline(offlineCtx, destNode, totalDuration) {
    const bpm = this.currentPreset === 'cyber-trap' ? 140 : (this.currentPreset === 'hyped-drop' ? 150 : 120);
    const stepDuration = (60 / bpm) / 2; // 8th notes
    const totalSteps = Math.ceil(totalDuration / stepDuration);

    for (let step = 0; step < totalSteps; step++) {
      const time = step * stepDuration;
      if (time >= totalDuration) break;

      const stepPattern = step % 16;

      if (this.currentPreset === 'tick-tock') {
        this.renderTickOffline(offlineCtx, destNode, time, stepPattern % 2 === 0 ? 1200 : 900);
        continue;
      }

      if (stepPattern % 4 === 0) {
        this.renderKickOffline(offlineCtx, destNode, time);
      }
      if (stepPattern === 4 || stepPattern === 12) {
        this.renderSnareOffline(offlineCtx, destNode, time);
      }
      if (stepPattern % 2 === 0) {
        this.renderHiHatOffline(offlineCtx, destNode, time, stepPattern % 4 === 0 ? 0.15 : 0.08);
      }

      if (this.currentPreset === 'cyber-trap') {
        const bassNotes = [55, 55, 65.4, 49];
        const noteFreq = bassNotes[Math.floor(stepPattern / 4) % bassNotes.length];
        if (stepPattern % 4 === 0) {
          this.renderBassOffline(offlineCtx, destNode, time, noteFreq);
        }
      } else if (this.currentPreset === 'arcade-rush') {
        const melody = [261.6, 329.6, 392.0, 523.2, 392.0, 329.6, 293.6, 349.2];
        this.renderSynthArpOffline(offlineCtx, destNode, time, melody[stepPattern % melody.length]);
      } else if (this.currentPreset === 'hyped-drop') {
        if (stepPattern % 2 === 0) {
          this.renderBassOffline(offlineCtx, destNode, time, 65.41);
        }
      }
    }
  }

  renderKickOffline(ctx, dest, time) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  renderSnareOffline(ctx, dest, time) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.15);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    noise.connect(gain);
    gain.connect(dest);
    noise.start(time);
  }

  renderHiHatOffline(ctx, dest, time, vol = 0.1) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'highpass';
    osc.frequency.setValueAtTime(8000, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  renderTickOffline(ctx, dest, time, freq = 1000) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  renderBassOffline(ctx, dest, time, freq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  renderSynthArpOffline(ctx, dest, time, freq) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  /**
   * Procedural Audio Synthesizer for live playback preview
   */
  startProceduralSynth() {
    if (this.synthLoopTimer) clearInterval(this.synthLoopTimer);

    let step = 0;
    const bpm = this.currentPreset === 'cyber-trap' ? 140 : (this.currentPreset === 'hyped-drop' ? 150 : 120);
    const intervalMs = (60 / bpm) * 1000 / 2;

    this.synthLoopTimer = setInterval(() => {
      if (!this.isPlaying) return;
      this.playSynthStep(step % 16);
      step++;
    }, intervalMs);
  }

  playSynthStep(step) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    if (this.currentPreset === 'tick-tock') {
      this.triggerTick(now, step % 2 === 0 ? 1200 : 900);
      return;
    }

    if (step % 4 === 0) {
      this.triggerKick(now);
    }
    if (step === 4 || step === 12) {
      this.triggerSnare(now);
    }
    if (step % 2 === 0) {
      this.triggerHiHat(now, step % 4 === 0 ? 0.15 : 0.08);
    }

    if (this.currentPreset === 'cyber-trap') {
      const bassNotes = [55, 55, 65.4, 49];
      const noteFreq = bassNotes[Math.floor(step / 4) % bassNotes.length];
      if (step % 4 === 0) {
        this.triggerBass(now, noteFreq);
      }
    } else if (this.currentPreset === 'arcade-rush') {
      const melody = [261.6, 329.6, 392.0, 523.2, 392.0, 329.6, 293.6, 349.2];
      this.triggerSynthArp(now, melody[step % melody.length]);
    } else if (this.currentPreset === 'hyped-drop') {
      if (step % 2 === 0) {
        this.triggerBass(now, 65.41);
      }
    }
  }

  triggerKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);
    gain.gain.setValueAtTime(0.7, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.35);
  }

  triggerSnare(time) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.03));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
  }

  triggerHiHat(time, vol = 0.1) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'highpass';
    osc.frequency.setValueAtTime(8000, time);
    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.05);
  }

  triggerTick(time, freq = 1000) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.4, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.04);
  }

  triggerBass(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.5, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.4);
  }

  triggerSynthArp(time, freq) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(0.18, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  /**
   * Sound effect on Stop Challenge match hit (cheer / success ding)
   */
  playMatchSound(scorePercent) {
    this.initContext();
    const now = this.ctx.currentTime;
    if (scorePercent >= 85) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.3, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.5);
      });
    } else {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.3);
      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  }
}

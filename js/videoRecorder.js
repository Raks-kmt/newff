/**
 * ZERO-FRAME-DROP DETERMINISTIC OFFLINE VIDEO & AUDIO ENCODER
 * 
 * Features:
 * - 60.000 FPS Constant Frame Rate Hardware Video Encoding (WebCodecs AVC)
 * - Crystal Clear Stereo AAC Audio Track (Custom Uploaded Audio & Synth Presets)
 * - Zero GPU Bottleneck Backpressure Queue Management
 * - Flush Timeout Safety Net
 * - Direct Automatic Browser Download Trigger
 */

class VideoRecorder {
  constructor(canvasEngine, audioManager) {
    this.canvasEngine = canvasEngine;
    this.audioManager = audioManager;

    this.exportCanvas = document.createElement('canvas');
    this.exportCtx = null;

    this.isRecording = false;
    this.cancelRequested = false;
  }

  hasWebCodecs() {
    return (
      typeof VideoEncoder === 'function' &&
      typeof VideoFrame === 'function' &&
      typeof Mp4Muxer !== 'undefined'
    );
  }

  getTargetDimensions(resolution, aspectRatio) {
    const table = {
      '4k':    { '9:16': [2160, 3840], '1:1': [2160, 2160], '16:9': [3840, 2160] },
      '2k':    { '9:16': [1440, 2560], '1:1': [1440, 1440], '16:9': [2560, 1440] },
      '1080p': { '9:16': [1080, 1920], '1:1': [1080, 1080], '16:9': [1920, 1080] },
      '720p':  { '9:16': [720, 1280],  '1:1': [720, 720],   '16:9': [1280, 720]  }
    };
    const entry = table[resolution] || table['1080p'];
    const [w, h] = entry[aspectRatio] || entry['9:16'];
    return [w % 2 === 0 ? w : w - 1, h % 2 === 0 ? h : h - 1];
  }

  async startRecording(options = {}) {
    console.log('[EXPORT] startRecording called with:', {
      resolution: options.resolution,
      fps: options.fps,
      duration: options.duration,
      hasWebCodecs: this.hasWebCodecs()
    });

    if (!this.hasWebCodecs()) {
      const msg = 'WebCodecs API not available. Use Chrome or Edge browser.';
      console.error('[EXPORT]', msg);
      options.onError?.(new Error(msg));
      return;
    }

    this.isRecording = true;
    this.cancelRequested = false;

    const {
      resolution = '1080p',
      fps = 60,
      duration = 10,
      onProgress = () => {},
      onComplete = () => {},
      onError = () => {}
    } = options;

    const [targetW, targetH] = this.getTargetDimensions(resolution, this.canvasEngine.aspectRatio);
    console.log(`[EXPORT] Target: ${targetW}x${targetH} @ ${fps}fps, ${duration}s`);

    // Setup export canvas
    this.exportCanvas.width = targetW;
    this.exportCanvas.height = targetH;
    this.exportCtx = this.exportCanvas.getContext('2d');
    this.exportCtx.imageSmoothingEnabled = true;
    this.exportCtx.imageSmoothingQuality = 'high';

    // Save original canvas state
    const origCanvas = this.canvasEngine.canvas;
    const origCtx = this.canvasEngine.ctx;
    const origW = this.canvasEngine.width;
    const origH = this.canvasEngine.height;

    // Swap to export canvas
    this.canvasEngine.canvas = this.exportCanvas;
    this.canvasEngine.ctx = this.exportCtx;
    this.canvasEngine.width = targetW;
    this.canvasEngine.height = targetH;
    this.canvasEngine.regenerateAllOutlines();

    try {
      const baseBitrate = {
        '4k': 24_000_000,
        '2k': 16_000_000,
        '1080p': 9_000_000,
        '720p': 5_000_000
      }[resolution] || 9_000_000;

      // Smart Telegram 50MB Safety Cap:
      // Telegram Bot API strictly limits uploads to 50MB.
      // Auto-cap bitrate so the MP4 file stays comfortably under 44MB for any duration!
      const maxSafeBitrate = Math.floor((44 * 8 * 1024 * 1024) / Math.max(1, duration));
      const bitrate = Math.min(baseBitrate, maxSafeBitrate);
      console.log(`[EXPORT] Bitrate selected: ${(bitrate / 1_000_000).toFixed(1)} Mbps (Duration: ${duration}s, MaxSafe: ${(maxSafeBitrate / 1_000_000).toFixed(1)} Mbps)`);

      // 1. Prepare Audio Track if enabled
      let audioBuffer = null;
      let hasAudioEncoder = typeof AudioEncoder === 'function' && typeof AudioData === 'function';
      let audioConfig = null;

      try {
        if (hasAudioEncoder && this.audioManager) {
          console.log('[EXPORT] Rendering soundtrack for MP4...');
          audioBuffer = await this.audioManager.getRenderedAudioBuffer(duration, 48000);
          if (audioBuffer) {
            audioConfig = {
              codec: 'aac',
              numberOfChannels: 2,
              sampleRate: 48000
            };
            console.log(`[EXPORT] Audio rendered: 2 channels @ 48000Hz, ${audioBuffer.duration.toFixed(1)}s`);
          }
        }
      } catch (audioErr) {
        console.warn('[EXPORT] Audio preparation warning (proceeding without audio):', audioErr);
        audioBuffer = null;
        audioConfig = null;
      }

      // 2. Setup MP4 Muxer with Video and Optional Audio
      console.log('[EXPORT] Creating MP4 muxer with official build...');
      const muxerTarget = new Mp4Muxer.ArrayBufferTarget();
      const muxerOptions = {
        target: muxerTarget,
        video: {
          codec: 'avc',
          width: targetW,
          height: targetH,
          rotation: 0,
          frameRate: fps
        },
        fastStart: 'in-memory'
      };

      if (audioConfig) {
        muxerOptions.audio = audioConfig;
      }

      const muxer = new Mp4Muxer.Muxer(muxerOptions);

      // 3. Setup Video Encoder
      let encoderError = null;
      let videoChunksReceived = 0;

      console.log('[EXPORT] Creating VideoEncoder...');
      const videoEncoder = new VideoEncoder({
        output: (chunk, meta) => {
          try {
            muxer.addVideoChunk(chunk, meta);
            videoChunksReceived++;
          } catch (e) {
            console.error('[EXPORT] Video muxer error:', e);
            encoderError = e;
          }
        },
        error: (e) => {
          console.error('[EXPORT] VideoEncoder error callback:', e);
          encoderError = e;
        }
      });

      // Find best supported AVC codec
      const profiles = ['avc1.640033', 'avc1.4d002a', 'avc1.42001f', 'avc1.42E01E'];
      let selectedCodec = 'avc1.42E01E';

      for (const codec of profiles) {
        try {
          const result = await VideoEncoder.isConfigSupported({
            codec, width: targetW, height: targetH, bitrate, framerate: fps
          });
          if (result && result.supported) {
            selectedCodec = codec;
            console.log(`[EXPORT] Using video codec: ${codec}`);
            break;
          }
        } catch (e) { /* try next */ }
      }

      console.log(`[EXPORT] Configuring VideoEncoder: ${selectedCodec}, ${targetW}x${targetH}, ${bitrate}bps`);
      videoEncoder.configure({
        codec: selectedCodec,
        width: targetW,
        height: targetH,
        bitrate,
        framerate: fps,
        latencyMode: 'quality'
      });

      // 4. Setup Audio Encoder & Encode Audio Track
      let audioEncoder = null;
      if (audioConfig && audioBuffer) {
        try {
          console.log('[EXPORT] Configuring AudioEncoder (AAC 48kHz)...');
          audioEncoder = new AudioEncoder({
            output: (chunk, meta) => {
              try {
                muxer.addAudioChunk(chunk, meta);
              } catch (e) {
                console.warn('[EXPORT] Audio muxer error:', e);
              }
            },
            error: (e) => {
              console.warn('[EXPORT] AudioEncoder error:', e);
            }
          });

          audioEncoder.configure({
            codec: 'mp4a.40.2',
            numberOfChannels: 2,
            sampleRate: 48000,
            bitrate: 128000
          });

          // Slice audio buffer into 1024-frame AudioData chunks
          const sampleRate = 48000;
          const totalAudioFrames = Math.min(audioBuffer.length, Math.ceil(duration * sampleRate));
          const leftData = audioBuffer.getChannelData(0);
          const rightData = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : leftData;
          const chunkSize = 1024;

          for (let offset = 0; offset < totalAudioFrames; offset += chunkSize) {
            const frameCount = Math.min(chunkSize, totalAudioFrames - offset);
            const planarBuffer = new Float32Array(frameCount * 2);
            planarBuffer.set(leftData.subarray(offset, offset + frameCount), 0);
            planarBuffer.set(rightData.subarray(offset, offset + frameCount), frameCount);

            const audioData = new AudioData({
              format: 'f32-planar',
              sampleRate: sampleRate,
              numberOfFrames: frameCount,
              numberOfChannels: 2,
              timestamp: Math.round((offset / sampleRate) * 1_000_000),
              data: planarBuffer
            });

            audioEncoder.encode(audioData);
            audioData.close();
          }

          console.log('[EXPORT] Audio track encoded successfully.');
        } catch (audioEncodeErr) {
          console.warn('[EXPORT] Audio encoding error (skipping audio):', audioEncodeErr);
          audioEncoder = null;
        }
      }

      const totalFrames = Math.round(duration * fps);
      const frameDurationUs = Math.round(1_000_000 / fps);
      console.log(`[EXPORT] Rendering ${totalFrames} frames...`);

      const renderStart = performance.now();

      // 5. Deterministic Offline Video Render Loop
      for (let i = 0; i < totalFrames; i++) {
        if (this.cancelRequested || encoderError) break;

        // Backpressure — wait if encoder queue is too full
        let waitCount = 0;
        while (videoEncoder.encodeQueueSize > 5) {
          await new Promise(r => setTimeout(r, 1));
          waitCount++;
          if (waitCount > 5000) {
            throw new Error('Encoder backpressure timeout — GPU may be overloaded');
          }
        }

        // Render frame at exact deterministic time
        const t = (i / fps) % duration;
        this.canvasEngine.renderFrame(t);

        // Create VideoFrame with exact microsecond timestamp
        const frame = new VideoFrame(this.exportCanvas, {
          timestamp: i * frameDurationUs,
          duration: frameDurationUs
        });

        videoEncoder.encode(frame, { keyFrame: i % fps === 0 });
        frame.close();

        // Report progress
        onProgress((i + 1) / totalFrames, i + 1, totalFrames);

        // Yield every 30 frames to keep UI responsive
        if (i % 30 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }
      }

      if (encoderError) throw encoderError;

      const renderTime = ((performance.now() - renderStart) / 1000).toFixed(1);
      console.log(`[EXPORT] All ${totalFrames} frames rendered in ${renderTime}s. Flushing encoders...`);

      // Flush video encoder
      await Promise.race([
        videoEncoder.flush(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Video encoder flush timeout (8s)')), 8000))
      ]).catch(e => {
        console.warn('[EXPORT] Video flush warning:', e.message);
      });

      // Flush audio encoder if active
      if (audioEncoder) {
        try {
          await Promise.race([
            audioEncoder.flush(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Audio encoder flush timeout')), 3000))
          ]);
          audioEncoder.close();
        } catch (e) {
          console.warn('[EXPORT] Audio flush warning:', e.message);
        }
      }

      console.log(`[EXPORT] VideoEncoder flushed. Total video chunks: ${videoChunksReceived}. Finalizing MP4...`);
      videoEncoder.close();
      muxer.finalize();

      // Restore original canvas
      this.restoreCanvas(origCanvas, origCtx, origW, origH);
      this.isRecording = false;

      // Build result
      const buffer = muxerTarget.buffer;
      const fileSizeKB = Math.round(buffer.byteLength / 1024);
      console.log(`[EXPORT] ✅ MP4 Video ready! Size: ${fileSizeKB} KB (${videoChunksReceived} encoded video chunks)`);

      if (buffer.byteLength < 100) {
        throw new Error(`Video file too small (${buffer.byteLength} bytes). Encoding may have failed.`);
      }

      const blob = new Blob([buffer], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);
      const filename = `stop_challenge_${resolution.toUpperCase()}_${fps}FPS_${Date.now()}.mp4`;

      onComplete({
        blob, url, filename,
        mimeType: 'video/mp4',
        resolution: `${targetW}x${targetH}`,
        fps,
        durationSec: duration
      });

    } catch (err) {
      console.error('[EXPORT] ❌ FATAL ERROR:', err);
      this.restoreCanvas(origCanvas, origCtx, origW, origH);
      this.isRecording = false;
      onError(err);
    }
  }

  restoreCanvas(origCanvas, origCtx, origW, origH) {
    this.canvasEngine.canvas = origCanvas;
    this.canvasEngine.ctx = origCtx;
    this.canvasEngine.width = origW;
    this.canvasEngine.height = origH;
    this.canvasEngine.regenerateAllOutlines();
  }

  stopRecording() {
    this.cancelRequested = true;
    this.isRecording = false;
  }

  download(blobUrl, filename) {
    console.log(`[EXPORT] Triggering download: ${filename}`);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      console.log('[EXPORT] Download link clicked and cleaned up');
    }, 500);
  }
}

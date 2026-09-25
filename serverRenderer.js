/**
 * SERVER RENDERER MANAGER
 * Headless Chrome / Chromium controller via Chrome DevTools Protocol (CDP).
 * Dispatches deterministic 60 FPS video render jobs to render-worker.html
 * Works on Windows, Linux VPS, and Cloud Servers.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ServerRenderer {
  constructor(options = {}) {
    this.port = options.port || parseInt(process.env.CHROME_DEBUG_PORT || '9225', 10);
    this.serverUrl = options.serverUrl || process.env.SERVER_URL || (`http://127.0.0.1:${process.env.PORT || 5050}`);
    this.chromeProcess = null;
    this.ws = null;
    this.msgId = 1;
    this.callbacks = new Map();
    this.isReady = false;
    this.queue = [];
    this.isRendering = false;
  }

  findChromePath() {
    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      return process.env.CHROME_PATH;
    }

    const platform = process.platform;
    const candidates = [];

    if (platform === 'win32') {
      candidates.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe'),
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      );
    } else if (platform === 'linux') {
      candidates.push(
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
      );
    } else if (platform === 'darwin') {
      candidates.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium'
      );
    }

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        return c;
      }
    }

    // Fallback to command name or env
    return process.env.CHROME_PATH || (platform === 'win32' ? 'chrome.exe' : 'google-chrome-stable');
  }

  async start() {
    if (this.isReady && this.ws) return;

    const chromePath = this.findChromePath();
    console.log(`[RENDERER] Starting Headless Chrome from: ${chromePath}`);

    const workerUrl = `${this.serverUrl}/render-worker.html`;

    const userDataDir = process.platform === 'win32'
      ? path.join(__dirname, 'temp', 'chrome_prof')
      : `/tmp/chrome_prof_${Date.now()}`;

    const chromeArgs = [
      '--headless=new',
      `--remote-debugging-port=${this.port}`,
      '--remote-debugging-address=0.0.0.0',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-zygote',
      '--disable-software-rasterizer',
      '--log-level=3',
      '--no-first-run',
      '--no-default-browser-check',
      '--enable-features=WebCodecs',
      '--mute-audio',
      `--user-data-dir=${userDataDir}`,
      workerUrl
    ];

    this.chromeProcess = spawn(chromePath, chromeArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

    if (this.chromeProcess.stderr) {
      this.chromeProcess.stderr.on('data', (d) => {
        const line = d.toString().trim();
        if (line && !line.includes('DevTools listening on') && !line.includes('dbus')) {
          console.log(`[CHROME]: ${line}`);
        }
      });
    }

    this.chromeProcess.on('exit', (code) => {
      console.log(`[RENDERER] Headless Chrome process exited with code ${code}`);
      this.isReady = false;
      global.__rendererReady = false;
      this.ws = null;
    });

    // Wait for CDP port
    let connected = false;
    for (let attempt = 0; attempt < 35; attempt++) {
      await new Promise(r => setTimeout(r, 600));
      try {
        let res = null;
        try {
          res = await fetch(`http://127.0.0.1:${this.port}/json`);
        } catch (e1) {
          try {
            res = await fetch(`http://localhost:${this.port}/json`);
          } catch (e2) {}
        }
        if (!res || !res.ok) continue;

        const targets = await res.json();
        let workerTarget = targets.find(t => t.url && t.url.includes('render-worker.html')) ||
          targets.find(t => t.type === 'page');

        if (!workerTarget) {
          try {
            const newRes = await fetch(`http://127.0.0.1:${this.port}/json/new?${encodeURIComponent(workerUrl)}`, { method: 'PUT' });
            if (newRes.ok) {
              workerTarget = await newRes.json();
            }
          } catch(eNew) {}
        }

        if (workerTarget && workerTarget.webSocketDebuggerUrl) {
          await this.connectWs(workerTarget.webSocketDebuggerUrl);
          connected = true;
          if (!workerTarget.url || !workerTarget.url.includes('render-worker.html')) {
            console.log(`[RENDERER] Navigating target to: ${workerUrl}`);
            await this.send('Page.navigate', { url: workerUrl });
          }
          break;
        }
      } catch (e) {
        // Retry
      }
    }

    if (!connected) {
      throw new Error(`Failed to connect to Headless Chrome on port ${this.port}`);
    }

    console.log('[RENDERER] Connected to Worker Page via CDP!');
    await this.send('Runtime.enable');
    await this.send('Page.enable');

    // Wait 2s for scripts to initialize
    await new Promise(r => setTimeout(r, 2000));
    this.isReady = true;
    global.__rendererReady = true;
  }

  connectWs(wsUrl) {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.method === 'Runtime.consoleAPICalled') {
            const text = msg.params.args.map(a => a.value || a.description || JSON.stringify(a)).join(' ');
            console.log(`[CHROME]: ${text}`);
          }
          if (msg.method === 'Runtime.exceptionThrown') {
            console.error(`[CHROME EXCEPTION]:`, msg.params.exceptionDetails?.exception?.description || msg.params.exceptionDetails);
          }
          if (this.callbacks.has(msg.id)) {
            this.callbacks.get(msg.id)(msg.result);
            this.callbacks.delete(msg.id);
          }
        } catch (e) {}
      };

      this.ws.onclose = () => {
        this.isReady = false;
        this.ws = null;
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) {
        return reject(new Error('CDP WebSocket is not connected'));
      }
      const id = this.msgId++;
      this.callbacks.set(id, resolve);
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true
    });
    return res?.result?.value;
  }

  /**
   * Queue a video render task
   */
  queueRender(config, onProgress) {
    return new Promise((resolve, reject) => {
      this.queue.push({ config, onProgress, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isRendering || this.queue.length === 0) return;

    this.isRendering = true;
    const task = this.queue.shift();

    try {
      if (!this.isReady || !this.ws) {
        await this.start();
      }

      const result = await this.executeRender(task.config, task.onProgress);
      task.resolve(result);
    } catch (err) {
      console.error('[RENDERER] Render task failed:', err);
      task.reject(err);
    } finally {
      this.isRendering = false;
      this.processQueue();
    }
  }

  async executeRender(config, onProgress) {
    console.log(`[RENDERER] Executing job: ${config.imageName || 'video'}`);

    // Call window.renderVideoTask(config)
    const sanitizedConfig = JSON.stringify(config);
    await this.send('Runtime.evaluate', {
      expression: `window.renderVideoTask(${sanitizedConfig})`
    });

    // Monitor progress
    const maxWaitSec = (config.duration || 10) * 15 + 60; // Generous timeout
    const startTime = Date.now();

    while (true) {
      await new Promise(r => setTimeout(r, 600));

      const status = await this.eval(`
        (() => {
          return {
            progress: window.__renderProgress,
            result: window.__renderResult,
            error: window.__renderError
          };
        })()
      `);

      if (status?.progress && onProgress) {
        onProgress(status.progress);
      }

      if (status?.error) {
        throw new Error(`Renderer error: ${status.error}`);
      }

      if (status?.result) {
        console.log(`[RENDERER] Job completed successfully:`, status.result);
        return status.result;
      }

      const elapsedSec = (Date.now() - startTime) / 1000;
      if (elapsedSec > maxWaitSec) {
        throw new Error(`Render timeout after ${Math.round(elapsedSec)}s`);
      }
    }
  }

  async getAudioDuration(audioDataUrl) {
    if (!audioDataUrl) return null;
    try {
      if (!this.isReady || !this.ws) {
        await this.start();
      }
      const dur = await this.eval(`
        (async () => {
          try {
            const res = await fetch(${JSON.stringify(audioDataUrl)});
            const ab = await res.arrayBuffer();
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const buf = await ctx.decodeAudioData(ab);
            ctx.close();
            return buf.duration;
          } catch(e) {
            return null;
          }
        })()
      `);
      return typeof dur === 'number' && dur > 0 ? Math.round(dur * 10) / 10 : null;
    } catch (e) {
      return null;
    }
  }

  stop() {
    if (this.ws) {
      try { this.ws.close(); } catch (e) {}
    }
    if (this.chromeProcess) {
      try { this.chromeProcess.kill(); } catch (e) {}
    }
    this.isReady = false;
  }
}

module.exports = ServerRenderer;

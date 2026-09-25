/**
 * STOP CHALLENGE STUDIO — LOCAL STATIC FILE SERVER
 * Clean, minimal HTTP server for serving the web app on localhost.
 * Broken FFmpeg render endpoints removed (browser WebCodecs handles export).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || 5050;
const ROOT = __dirname;
const EXPORTS_DIR = path.join(ROOT, 'exports');

if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;

  // --- API: Server status / Render Health Check ---
  if (pathname === '/api/status' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      uptime: process.uptime(),
      platform: process.platform,
      rendererReady: global.__rendererReady || false,
      exportsDir: EXPORTS_DIR
    }));
    return;
  }

  // --- API: Open exports folder in Windows Explorer ---
  if (pathname === '/api/open-exports') {
    if (process.platform === 'win32') {
      exec(`explorer.exe "${EXPORTS_DIR}"`);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, path: EXPORTS_DIR }));
    return;
  }

  // --- API: Direct Binary Video Save (used by Bot & Headless Renderer) ---
  if (pathname === '/api/save-rendered-video' && req.method === 'POST') {
    const filename = urlObj.searchParams.get('filename') || `render_${Date.now()}.mp4`;
    const safeFilename = path.basename(filename);
    const outPath = path.join(EXPORTS_DIR, safeFilename);
    const writeStream = fs.createWriteStream(outPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      const stats = fs.statSync(outPath);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        filename: safeFilename,
        path: outPath,
        sizeKB: Math.round(stats.size / 1024)
      }));
    });

    writeStream.on('error', (err) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    });
    return;
  }

  // --- Static file serving ---
  let reqPath = decodeURI(pathname);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(ROOT, reqPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('File Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

function startServer(customPort = PORT) {
  return new Promise((resolve) => {
    server.listen(customPort, '0.0.0.0', () => {
      console.log(`\n  🚀 Stop Challenge Studio Server`);
      console.log(`  ==============================`);
      console.log(`  💻 Port: ${customPort}`);
      console.log(`  📂 Exports: ${EXPORTS_DIR}\n`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer(PORT);
}

module.exports = { server, startServer, PORT, EXPORTS_DIR };

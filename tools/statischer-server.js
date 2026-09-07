// Kleiner statischer Server fuer die Playwright-Laeufe gegen static-site/.
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'static-site');
const TYP = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' };

http.createServer((req, res) => {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/') rel = '/index.html';
  let datei = path.join(ROOT, rel);
  if (!fs.existsSync(datei) && fs.existsSync(datei + '.html')) datei += '.html';
  if (!fs.existsSync(datei) || fs.statSync(datei).isDirectory()) {
    res.writeHead(404); res.end('nicht gefunden'); return;
  }
  const typ = TYP[path.extname(datei)] || 'text/html; charset=utf-8';
  res.writeHead(200, { 'Content-Type': typ });
  fs.createReadStream(datei).pipe(res);
}).listen(8099, () => console.log('Server laeuft auf http://127.0.0.1:8099'));

#!/usr/bin/env node
/*
 * Entwicklungs-Proxy fuer die Pruefung mit echten Daten.
 *
 * Liefert die lokale `static-site/` aus, reicht aber `/api/*` und
 * `/version.json` an die Live-Seite weiter. Dadurch laesst sich eine
 * Aenderung an Gestaltung oder Hilfeschicht sofort mit den echten
 * Bestellungen, Artikeln und Terminen ansehen - ohne zu veroeffentlichen.
 *
 * Das ist die Voraussetzung fuer `tools/pruef-kiosk-neu.js` und fuer
 * `tests/kiosk-neu.spec.js`; beide pruefen ausdruecklich mit echten Daten,
 * weil Beispieldaten die Faelle nicht zeigen, an denen die Bedienung
 * scheitert (lange Artikelnamen, viele Portionen, volle Wochen).
 *
 * Start (aus dem Projektverzeichnis):
 *   node tools/dev-proxy.js [port] [verzeichnis]
 *
 * Voreinstellung: Port 8787, Verzeichnis `static-site` neben diesem Werkzeug.
 *
 * ACHTUNG: Schreibende Zugriffe gehen an die echte Seite. Beim Pruefen also
 * nichts versenden, was nicht versendet werden soll.
 */
'use strict';

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = parseInt(process.argv[2] || '8787', 10);
const WURZEL = path.resolve(
  process.argv[3] || path.join(__dirname, '..', 'static-site')
);
const LIVE = 'https://www.dorfladen-oberornau.de';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
};

function weiterreichen(req, res) {
  const ziel = new URL(req.url, LIVE);
  const anfrage = https.request(
    ziel,
    { method: req.method, headers: Object.assign({}, req.headers, { host: ziel.host }) },
    (antwort) => {
      res.writeHead(antwort.statusCode, antwort.headers);
      antwort.pipe(res);
    }
  );
  anfrage.on('error', (e) => {
    res.writeHead(502);
    res.end('Proxy-Fehler: ' + e.message);
  });
  req.pipe(anfrage);
}

function ausliefern(req, res) {
  let rel = decodeURIComponent(req.url.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/kiosk.html';
  const datei = path.join(WURZEL, rel);
  if (!datei.startsWith(WURZEL)) {
    res.writeHead(403);
    res.end('nicht erlaubt');
    return;
  }
  fs.readFile(datei, (err, daten) => {
    if (err) {
      // Was lokal nicht liegt (Bilder, Schriften), kommt von der Live-Seite.
      weiterreichen(req, res);
      return;
    }
    const endung = path.extname(datei).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[endung] || 'application/octet-stream',
      // Ohne das zeigt der Browser beim Pruefen die vorige Fassung.
      'Cache-Control': 'no-store',
    });
    res.end(daten);
  });
}

http
  .createServer((req, res) => {
    const istSchnittstelle =
      req.url.indexOf('/api/') === 0 || req.url.split('?')[0] === '/version.json';
    if (istSchnittstelle) weiterreichen(req, res);
    else ausliefern(req, res);
  })
  .listen(PORT, () => {
    console.log('Dev-Proxy laeuft auf http://localhost:' + PORT);
    console.log('  Dateien:            ' + WURZEL);
    console.log('  /api/*, version.json -> ' + LIVE);
  });

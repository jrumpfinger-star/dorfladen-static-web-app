/* Werbebilder der PC-Waage im Kiosk (Spec specs/kiosk-werbebilder-upload/spec.md).
 *
 * Selbststaendiges Modul (window.KWerbebilder). Spricht nur mit der eigenen
 * HTTPS-API (/api/waage-werbebilder); die Bilder liegen in SharePoint. Die
 * Waage-Bruecke im Laden holt sie dort ab und gleicht die Waage per FTP an.
 * Dadurch gibt es hier keine Adresse, keinen offenen Port und kein Mixed Content.
 *
 * Nur die Default-Verzeichnisse: Vollbild und Dauerwerbung. Die Reihenfolge
 * auf der Waage ergibt sich aus dem Dateinamen; die Liste zeigt sie so.
 * Keine zusaetzliche Anmeldung im Tab - die Kiosk-Passwortabfrage genuegt.
 */
window.KWerbebilder = (function () {
  'use strict';

  var API = '/api/waage-werbebilder';
  var AKTUALISIERUNG_MS = 8000;
  var MAX_BILDER = 99;
  var MAX_BYTES = 8 * 1024 * 1024;
  var ARTEN = [
    { id: 'vollbild', text: 'Vollbild', hinweis: 'Ganzer Bildschirm, startet im Leerlauf der Waage.' },
    { id: 'dauer', text: 'Dauerwerbung', hinweis: 'Werbefläche unter der Gewichts-/Preisleiste, läuft neben dem Verkauf.' }
  ];
  var PROFILE = [
    { id: 'gross', text: '800 × 600 – Dauerwerbung 800 × 462 (empfohlen)', vollbild: 600, dauer: 462 },
    { id: 'klein', text: '800 × 480 – Dauerwerbung 800 × 280', vollbild: 480, dauer: 280 }
  ];
  var _profil = 'gross', _profilFehler = '';
  try {
    var gespeichert = localStorage.getItem('waage-anzeigeprofil');
    if (PROFILE.some(function (p) { return p.id === gespeichert; })) _profil = gespeichert;
  } catch (e) {
    console.error('Waagenprofil lesen', e);
    _profilFehler = 'Die Anzeigeauswahl konnte nicht gelesen werden. Bitte das Profil prüfen.';
  }

  function masse(art, profil) {
    var p = PROFILE.filter(function (x) { return x.id === (profil || _profil); })[0];
    if (!p || (art !== 'vollbild' && art !== 'dauer')) throw new Error('Bitte ein gültiges Anzeigeprofil wählen.');
    return { w: 1600, h: p[art] * 2 };
  }

  function profilSpeichern(id) {
    if (!PROFILE.some(function (p) { return p.id === id; })) return;
    _profil = id; _profilFehler = '';
    try { localStorage.setItem('waage-anzeigeprofil', id); }
    catch (e) {
      console.error('Waagenprofil speichern', e);
      _profilFehler = 'Die Anzeigeauswahl konnte nicht gespeichert werden. Sie gilt nur bis zum Neuladen.';
    }
  }

  function profilHtml(attribut, gesperrt) {
    return '<label class="wb-profil">Anzeigeprofil <select class="wb-btn" ' + attribut + (gesperrt ? ' disabled' : '') + '>'
      + PROFILE.map(function (p) { return '<option value="' + p.id + '"' + (p.id === _profil ? ' selected' : '') + '>' + p.text + '</option>'; }).join('')
      + '</select></label><p class="wb-klein">Empfehlung anhand des Waagenfotos – bitte an der Waage prüfen. Auswahl gilt für diesen Browser und neue Bilder.</p>'
      + (_profilFehler ? '<p class="wb-fehler" role="alert">' + esc(_profilFehler) + '</p>' : '');
  }

  var _art = 'vollbild';
  var _bilder = [];
  var _bruecke = null;       // Status der Bruecke laut API
  var _laden = false;
  var _geladen = false;
  var _fehler = '';
  var _sig = '';             // Fingerabdruck der letzten Antwort (Neuzeichnen nur bei Aenderung)
  var _timer = null;
  var _staged = [];          // [{file,url,status,fehler}]
  var _abgelehnt = [];       // Texte zu Dateien, die nicht uebernommen wurden
  var _lauf = false;
  var _blobs = {};           // art/name/etag -> Objekt-URL der Miniatur
  var _lb = null;            // offene Grossansicht {items,i}
  var _dlg = null;

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function host() { return document.getElementById('wb-root'); }
  function toast(msg) { if (window.K && typeof K.toast === 'function') K.toast(msg); }

  function groesse(n) {
    if (n >= 1048576) return (n / 1048576).toFixed(1).replace('.', ',') + ' MB';
    return Math.max(1, Math.round(n / 1024)) + ' KB';
  }

  // ══════════════════════════════════════════════════
  //  Verbindung zur Cloud-API
  // ══════════════════════════════════════════════════

  function qs(art, name) {
    return '?art=' + encodeURIComponent(art) + (name ? '&name=' + encodeURIComponent(name) : '');
  }

  function anfrage(methode, query, body, typ, ms) {
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms || 20000);
    var o = { method: methode, signal: ctl.signal, cache: 'no-store' };
    if (body) { o.body = body; o.headers = { 'Content-Type': typ || 'application/octet-stream' }; }
    return fetch(API + query, o).then(
      function (r) { clearTimeout(t); return r; },
      function (e) { clearTimeout(t); throw { art: 'netz', e: e }; }
    );
  }

  function json(r) {
    return r.json().then(function (d) { return d; }, function () { return null; }).then(function (d) {
      if (!d || typeof d.success === 'undefined') throw { art: 'fremd', status: r.status };
      if (!r.ok || d.success === false) {
        throw { art: 'http', status: r.status, text: d.error || ('Fehler ' + r.status) };
      }
      return d;
    });
  }

  function fehlerText(e) {
    if (e && e.art === 'netz') return 'Keine Verbindung zur Dorfladen-Seite. Ist das Gerät online?';
    if (e && e.art === 'fremd') return 'Die Dorfladen-Seite hat unerwartet geantwortet (HTTP ' + e.status + '). Bitte später erneut versuchen.';
    if (e && e.art === 'http' && e.status === 401) return 'Anmeldung nötig – bitte erneut versuchen und das Passwort eingeben.';
    if (e && e.art === 'http' && e.status === 503) return 'Der Bilderspeicher ist gerade nicht erreichbar (' + (e.text || '503') + ').';
    return (e && e.text) || 'Unbekannter Fehler';
  }

  // Brueckenstatus in Worten: online, offline seit ..., noch nie gemeldet.
  function dauer(s) {
    if (s < 90) return s + ' s';
    if (s < 5400) return Math.round(s / 60) + ' Min.';
    if (s < 172800) return Math.round(s / 3600) + ' Std.';
    return Math.round(s / 86400) + ' Tagen';
  }

  function statusText() {
    if (!_geladen || !_bruecke) return { klasse: 'fehl', text: _laden ? '… lade' : '○ Status unbekannt' };
    if (!_bruecke.bekannt) return { klasse: 'fehl', text: '○ Brücke noch nie gemeldet' };
    if (_bruecke.online) return { klasse: _bruecke.ok ? 'ok' : 'warn', text: _bruecke.ok ? '● Brücke online' : '● Brücke online (mit Fehler)' };
    return { klasse: 'fehl', text: '○ Brücke offline seit ' + dauer(_bruecke.vor_s) };
  }

  // ══════════════════════════════════════════════════
  //  Laden
  // ══════════════════════════════════════════════════

  function key(art, b) { return art + '/' + b.name + '/' + (b.etag || b.groesse); }

  /* leise = Hintergrundabfrage (kein "Laden ...", Neuzeichnen nur bei Aenderung). */
  function laden(leise) {
    var art = _art;
    if (!leise) { _laden = true; _fehler = ''; render(); }
    return anfrage('GET', qs(art)).then(json).then(function (d) {
      if (art !== _art) return;
      var sig = JSON.stringify([d.bruecke && [d.bruecke.online, d.bruecke.ok, d.bruecke.fehler, d.bruecke.initialisiert,
        d.bruecke.direkt, d.bruecke.vor_s < 90 ? 0 : Math.floor(d.bruecke.vor_s / 60)], d.bilder]);
      var aenderung = sig !== _sig || _fehler || _laden;
      _sig = sig; _bilder = d.bilder || []; _bruecke = d.bruecke || null;
      _geladen = true; _laden = false; _fehler = '';
      var jetzt = {};
      _bilder.forEach(function (b) { jetzt[key(art, b)] = 1; });
      Object.keys(_blobs).forEach(function (k) {
        if (k.indexOf(art + '/') === 0 && !jetzt[k]) { URL.revokeObjectURL(_blobs[k]); delete _blobs[k]; }
      });
      if (aenderung) { render(); holeMiniaturen(); }
    }).catch(function (e) {
      if (art !== _art) return;
      if (leise && _geladen) return;      // Hintergrundfehler: letzte Anzeige stehen lassen
      _bilder = []; _geladen = false; _laden = false; _fehler = fehlerText(e); _sig = '';
      render();
    });
  }

  function holeMiniaturen() {
    var art = _art;
    var offen = _bilder.filter(function (b) { return !_blobs[key(art, b)]; });
    var i = 0;
    function weiter() {
      if (i >= offen.length || art !== _art) return;
      var b = offen[i++];
      anfrage('GET', qs(art, b.name), null, null, 30000)
        .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (bl) {
          _blobs[key(art, b)] = URL.createObjectURL(bl);
          var el = host() && host().querySelector('.wb-thumb[data-key="' + key(art, b).replace(/"/g, '') + '"]');
          if (el) el.innerHTML = '<img alt="" src="' + _blobs[key(art, b)] + '">';
        })
        .catch(function () { /* Miniatur bleibt leer, Liste bleibt nutzbar */ })
        .then(weiter);
    }
    weiter(); weiter(); weiter();
  }

  // Hintergrundabfrage: nur, solange der Tab offen und die Seite sichtbar ist und nichts uebertragen wird.
  function tick() {
    var p = document.getElementById('panel-werbebilder');
    if (_kam && (!p || !p.classList.contains('active'))) kameraZu();   // Tab gewechselt: Kamera freigeben
    if (!p || !p.classList.contains('active') || document.hidden || _lauf || _dlg || _kam || _laden) return;
    laden(true);
  }

  function startTimer() {
    if (!_timer) _timer = setInterval(tick, AKTUALISIERUNG_MS);
  }

  // ══════════════════════════════════════════════════
  //  Auswahl und Upload
  // ══════════════════════════════════════════════════

  function typOk(f) {
    return /^image\/(jpeg|gif)$/i.test(f.type) || (!f.type && /\.(jpe?g|gif)$/i.test(f.name));
  }

  function dateienAufnehmen(liste) {
    if (_lauf) return;
    var neu = Array.prototype.slice.call(liste || []);
    _abgelehnt = [];
    neu.forEach(function (f) {
      if (!typOk(f)) { _abgelehnt.push(f.name + ' (nur JPEG und GIF)'); return; }
      if (f.size > MAX_BYTES) { _abgelehnt.push(f.name + ' (größer als 8 MB)'); return; }
      if (_staged.some(function (s) { return s.original.name === f.name && s.original.size === f.size; })) return;
      var s = { original: f, file: f, url: '', modus: 'contain', token: 0, status: '', fehler: '' };
      _staged.push(s);
      anpassen(s);
    });
    render();
  }

  function anpassen(s) {
    var tok = ++s.token, m = masse(_art);
    s.fehler = ''; s.anpassFehler = false; s.status = 'bearbeitung';
    if (/image\/gif/i.test(s.original.type) || /\.gif$/i.test(s.original.name)) {
      if (s.url) URL.revokeObjectURL(s.url);
      s.file = s.original; s.url = URL.createObjectURL(s.file); s.status = 'bereit';
      render(); return;
    }
    var url = URL.createObjectURL(s.original), img = new Image();
    function aktuell() { return s.token === tok && _staged.indexOf(s) >= 0; }
    function fehler(e) {
      URL.revokeObjectURL(url);
      if (!aktuell()) return;
      console.error('Waagenbild anpassen', e);
      s.status = 'fehler'; s.anpassFehler = true; s.fehler = 'Dieses Bild konnte nicht angepasst werden. Bitte erneut auswählen.';
      render();
    }
    img.onload = function () {
      if (!aktuell()) { URL.revokeObjectURL(url); return; }
      try {
        var c = document.createElement('canvas'); c.width = m.w; c.height = m.h;
        var x = c.getContext('2d');
        if (!x || !img.naturalWidth || !img.naturalHeight) throw new Error('Bildfläche nicht verfügbar');
        x.fillStyle = '#fff'; x.fillRect(0, 0, m.w, m.h);
        var f = (s.modus === 'cover' ? Math.max : Math.min)(m.w / img.naturalWidth, m.h / img.naturalHeight);
        var w = img.naturalWidth * f, h = img.naturalHeight * f;
        x.imageSmoothingQuality = 'high';
        x.drawImage(img, (m.w - w) / 2, (m.h - h) / 2, w, h);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) {
          if (!aktuell()) return;
          if (!b || b.size > MAX_BYTES) { fehler(new Error('JPEG nicht verfügbar oder zu groß')); return; }
          if (s.url) URL.revokeObjectURL(s.url);
          var name = /\.jpe?g$/i.test(s.original.name) ? s.original.name : s.original.name.replace(/\.[^.]+$/, '') + '.jpg';
          s.file = new File([b], name, { type: 'image/jpeg' });
          s.url = URL.createObjectURL(s.file); s.status = 'bereit'; render();
        }, 'image/jpeg', 0.9);
      } catch (e) { fehler(e); }
    };
    img.onerror = fehler;
    img.src = url;
  }

  function alleAnpassen() {
    _staged.forEach(anpassen);
    render();
  }

  function uploadGesperrt() {
    return _staged.some(function (s) { return s.status === 'bearbeitung' || s.anpassFehler; });
  }

  // ── Zwischenablage (F26) ──
  var _clipN = 0;
  var _clipHinweis = '';

  function stempel() {
    var d = new Date();
    function z(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + z(d.getMonth() + 1) + z(d.getDate()) + '_' + z(d.getHours()) + z(d.getMinutes()) + z(d.getSeconds());
  }

  // PNG/WebP/BMP aus der Zwischenablage -> JPEG (weisser Grund, laengste Seite hoechstens 1920 px).
  function alsJpeg(blob) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(blob);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        if (!w || !h) { URL.revokeObjectURL(url); fail(); return; }
        var f = Math.min(1, 1920 / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * f)); c.height = Math.max(1, Math.round(h * f));
        var x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        c.toBlob(function (b) { if (b) ok(b); else fail(); }, 'image/jpeg', 0.9);
      };
      img.onerror = function () { URL.revokeObjectURL(url); fail(); };
      img.src = url;
    });
  }

  function clipDatei(blob, praefix, immerJpeg) {
    var typ = String(blob.type || '').toLowerCase();
    var n = ++_clipN;
    var basis = (praefix || 'Zwischenablage') + '_' + stempel() + '_' + n;
    if (!immerJpeg && typ === 'image/gif') return Promise.resolve(new File([blob], basis + '.gif', { type: 'image/gif' }));
    if (!immerJpeg && typ === 'image/jpeg') return Promise.resolve(new File([blob], basis + '.jpg', { type: 'image/jpeg' }));
    return alsJpeg(blob).then(function (b) { return new File([b], basis + '.jpg', { type: 'image/jpeg' }); });
  }

  function clipAufnehmen(blobs, praefix, immerJpeg) {
    var wort = (praefix === 'Foto') ? 'Foto' : 'Bild aus der Zwischenablage';
    return Promise.all(blobs.map(function (b) {
      return clipDatei(b, praefix, immerJpeg).catch(function () { return null; });
    })).then(function (dateien) {
      var gut = dateien.filter(Boolean);
      _clipHinweis = gut.length < dateien.length ? 'Ein Bild konnte nicht gelesen werden.' : '';
      if (gut.length) {
        dateienAufnehmen(gut);
        toast(gut.length === 1 ? wort + ' hinzugefügt' : gut.length + ' ' + (praefix === 'Foto' ? 'Fotos' : 'Bilder aus der Zwischenablage') + ' hinzugefügt');
      } else render();
    });
  }

  function clipGesperrt() {
    var p = document.getElementById('panel-werbebilder');
    return !p || !p.classList.contains('active') || _lauf || _dlg || _lb || _kam;
  }

  // Strg+V (und Einfuegen per Langdruck): nur Bilder; Text bleibt unberuehrt.
  function einfuegen(e) {
    if (clipGesperrt()) return;
    var t = e.target;
    var eigenes = t && t.id === 'wb-paste';
    if (!eigenes && t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var blobs = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].kind === 'file' && /^image\//i.test(items[i].type)) {
        var f = items[i].getAsFile();
        if (f) blobs.push(f);
      }
    }
    if (!blobs.length) { if (eigenes) e.preventDefault(); return; }
    e.preventDefault();
    clipAufnehmen(blobs);
  }

  function clipHinweisSetzen() {
    _clipHinweis = 'Einfügen per Knopf ist auf diesem Gerät nicht möglich. Bitte Strg+V drücken oder in das Feld '
      + '„Hier tippen zum Einfügen“ lange drücken und „Einfügen“ wählen.';
    render();
  }

  function clipLesen() {
    if (clipGesperrt()) return;
    if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') { clipHinweisSetzen(); return; }
    navigator.clipboard.read().then(function (items) {
      var holen = [];
      items.forEach(function (it) {
        var typ = (it.types || []).filter(function (t) { return /^image\//i.test(t); })[0];
        if (typ) holen.push(it.getType(typ));
      });
      if (!holen.length) {
        _clipHinweis = 'In der Zwischenablage liegt kein Bild. Erst ein Bild oder einen Screenshot kopieren.';
        render();
        return null;
      }
      return Promise.all(holen).then(clipAufnehmen);
    }).catch(clipHinweisSetzen);
  }

  // ── Kamera (F27) ──
  var _kam = null;             // offene Kamera {stream, el, video, facing, n}
  var _kamOffnend = false;     // Abfrage der Berechtigung laeuft
  var _kamFallback = false;    // Live-Kamera nicht verfuegbar -> Kamera-App anbieten

  function kameraZu() {
    if (!_kam) return;
    try { _kam.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) { /* schon beendet */ }
    if (_kam.el) _kam.el.remove();
    document.removeEventListener('keydown', kameraTaste, true);
    _kam = null;
  }

  function kameraTaste(e) {
    if (e.key === 'Escape') { e.stopPropagation(); kameraZu(); }
  }

  function kameraStrom(facing) {
    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }
    });
  }

  function kameraFehlt() {
    _kamFallback = true;
    _clipHinweis = 'Die Live-Kamera ist hier nicht verfügbar oder nicht erlaubt. Mit „Kamera-App öffnen“ geht es über die Kamera des Geräts.';
    render();
  }

  function kameraFoto() {
    if (!_kam) return;
    var v = _kam.video;
    if (!v.videoWidth || !v.videoHeight) return;
    var f = Math.min(1, 1920 / Math.max(v.videoWidth, v.videoHeight));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(v.videoWidth * f)); c.height = Math.max(1, Math.round(v.videoHeight * f));
    c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(function (b) {
      if (!b || !_kam) return;
      var datei = new File([b], 'Foto_' + stempel() + '_' + (++_clipN) + '.jpg', { type: 'image/jpeg' });
      _kam.n++;
      _clipHinweis = '';
      dateienAufnehmen([datei]);
      var z = document.getElementById('wb-kam-zahl');
      if (z) z.textContent = _kam.n + (_kam.n === 1 ? ' Foto aufgenommen.' : ' Fotos aufgenommen.') + ' Weitere aufnehmen oder „Fertig“.';
    }, 'image/jpeg', 0.9);
  }

  function kameraWechseln() {
    if (!_kam) return;
    var neu = _kam.facing === 'environment' ? 'user' : 'environment';
    kameraStrom(neu).then(function (s) {
      if (!_kam) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
      _kam.stream.getTracks().forEach(function (t) { t.stop(); });
      _kam.stream = s; _kam.facing = neu; _kam.video.srcObject = s;
      _kam.video.play().catch(function () { /* startet bei Antippen */ });
    }).catch(function () {
      var z = document.getElementById('wb-kam-zahl');
      if (z) z.textContent = 'Die andere Kamera lässt sich nicht öffnen.';
    });
  }

  function kameraAnzeigen(stream) {
    var d = document.createElement('div');
    d.className = 'wb-overlay';
    d.id = 'wb-kam';
    d.innerHTML = '<div class="wb-dlg wb-kam-dlg" role="dialog" aria-modal="true"><h3>Foto aufnehmen</h3>'
      + '<video class="wb-video" autoplay playsinline muted></video>'
      + '<p class="wb-klein" id="wb-kam-zahl" role="status">Noch kein Foto aufgenommen.</p>'
      + '<div class="wb-dlg-foot"><button class="wb-btn" data-wb="kam-wechsel">Kamera wechseln</button>'
      + '<button class="wb-btn" data-wb="kam-zu">Fertig</button>'
      + '<button class="wb-btn wb-haupt" data-wb="kam-foto">Aufnehmen</button></div></div>';
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-wb]');
      var a = t && t.getAttribute('data-wb');
      if (e.target === d || a === 'kam-zu') kameraZu();
      else if (a === 'kam-foto') kameraFoto();
      else if (a === 'kam-wechsel') kameraWechseln();
    });
    document.body.appendChild(d);
    var v = d.querySelector('video');
    v.srcObject = stream;
    v.play().catch(function () { /* startet bei Antippen */ });
    _kam = { stream: stream, el: d, video: v, facing: 'environment', n: 0 };
    document.addEventListener('keydown', kameraTaste, true);
  }

  function kameraOeffnen() {
    if (_lauf || _kam || _kamOffnend || _dlg || _lb) return;
    _kamFallback = false;
    _clipHinweis = '';
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') { kameraFehlt(); return; }
    _kamOffnend = true;
    kameraStrom('environment').then(function (stream) {
      _kamOffnend = false;
      var p = document.getElementById('panel-werbebilder');
      if (!p || !p.classList.contains('active')) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
      kameraAnzeigen(stream);
    }).catch(function () { _kamOffnend = false; kameraFehlt(); });
  }

  // ══════════════════════════════════════════════════
  //  Uebertragen aus dem CMS (Spec waage-werbung-aus-cms, F3-F6, F10)
  //  Dialog: neue Bilder (mit Haken), vorhandene Waagenbilder (Haken "loeschen"), erst hoch, dann loeschen.
  // ══════════════════════════════════════════════════

  var _ueb = null;   // offener Dialog

  // Gleiche Regeln wie die API (shared/waage.py): Umlaute umschreiben, nur [A-Za-z0-9._-].
  function dateiname(text, max) {
    var s = String(text || '');
    [['ä', 'ae'], ['ö', 'oe'], ['ü', 'ue'], ['Ä', 'Ae'], ['Ö', 'Oe'], ['Ü', 'Ue'], ['ß', 'ss']].forEach(function (p) { s = s.split(p[0]).join(p[1]); });
    if (s.normalize) s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    s = s.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').replace(/^[._-]+|[._-]+$/g, '');
    return (s || 'bild').slice(0, max || 60);
  }

  function uebZahlen(u) {
    var an = u.neu.filter(function (n) { return n.an; });
    var neuNamen = {};
    an.forEach(function (n) { neuNamen[n.name] = 1; });
    var loesch = u.alt.filter(function (b) { return b.an && !neuNamen[b.name]; });
    var ersetzt = u.alt.filter(function (b) { return neuNamen[b.name]; }).length;
    var danach = u.alt.length - loesch.length + an.length - ersetzt;
    return { an: an, loesch: loesch, ersetzt: ersetzt, danach: danach, zuviel: danach > MAX_BILDER, neuNamen: neuNamen };
  }

  function uebZu() {
    if (!_ueb) return;
    _ueb.token++;
    _ueb.neu.forEach(function (n) { if (n.url) URL.revokeObjectURL(n.url); });
    _ueb.alt.forEach(function (b) { if (b.url) URL.revokeObjectURL(b.url); });
    if (_ueb.el) _ueb.el.remove();
    document.removeEventListener('keydown', uebTaste, true);
    _ueb = null;
  }

  function uebTaste(e) {
    if (e.key === 'Escape' && _ueb && !_ueb.laufend && !_lb) { e.stopPropagation(); uebZu(); }
  }

  function brueckeText(b) {
    if (!b) return '';
    if (!b.bekannt) return '○ Brücke im Laden noch nie gemeldet – Änderungen werden übertragen, sobald sie läuft';
    if (b.online) return b.ok ? '● Brücke online' : '● Brücke online (mit Fehler: ' + (b.fehler || 'unbekannt') + ')';
    return '○ Brücke offline seit ' + dauer(b.vor_s) + ' – Änderungen werden nachgeholt, sobald sie wieder läuft';
  }

  function uebRender() {
    var u = _ueb;
    if (!u || !u.el) return;
    var z = uebZahlen(u);
    var h = '<div class="wb-dlg wb-ueb-dlg" role="dialog" aria-modal="true" aria-label="' + esc(u.o.titel || 'Auf die Waage') + '">'
      + '<div class="wb-ueb-kopf"><h3>' + esc(u.o.titel || 'Auf die Waage übertragen') + '</h3>'
      + '<button class="wb-btn" data-ueb="zu"' + (u.laufend ? ' disabled' : '') + ' aria-label="Schließen">✕</button></div>';

    if (u.o.artWaehlbar !== false) {
      h += '<div class="wb-art" role="tablist">';
      ARTEN.forEach(function (a) {
        h += '<button class="wb-btn' + (a.id === u.art ? ' on' : '') + '" role="tab" aria-selected="' + (a.id === u.art) + '" data-ueb="art" data-art="' + a.id + '"'
          + (u.laufend ? ' disabled' : '') + '>' + a.text + '</button>';
      });
      h += '</div>';
    }
    var artInfo = ARTEN.filter(function (a) { return a.id === u.art; })[0];
    h += profilHtml('data-ueb="profil"', u.laufend);
    h += '<p class="wb-klein">' + esc(artInfo.hinweis) + '</p>';
    if (u.art === 'dauer' && u.o.hinweisDauer !== '') {
      h += '<p class="wb-warn" role="status">' + esc(u.o.hinweisDauer || 'Dauerwerbung: 800 × ' + masse('dauer').h / 2 + ' Pixel. Die Gewichts-/Preisleiste bleibt sichtbar.') + '</p>';
    }

    // Neu
    h += '<div class="wb-card"><h3>Neu auf die Waage <span class="wb-zaehl">' + z.an.length + ' von ' + u.neu.length + '</span></h3>';
    if (!u.erzeugt && !u.fehlerNeu) {
      h += '<p class="wb-klein" role="status" id="wb-ueb-fort">' + esc(u.fort || 'Bilder werden erstellt …') + '</p>';
    } else if (u.fehlerNeu) {
      h += '<p class="wb-fehler" role="alert">' + esc(u.fehlerNeu) + '</p>';
    } else {
      h += '<div class="wb-raster">';
      u.neu.forEach(function (n, i) {
        var st = n.status === 'ok' ? '✓ hochgeladen' : n.status === 'laeuft' ? 'wird gesendet …' : n.status === 'fehler' ? esc(n.fehler) : '';
        h += '<div class="wb-item wb-ueb-item' + (n.status === 'fehler' ? ' wb-fehler' : n.status === 'ok' ? ' wb-ok' : '') + '" data-ueb-neu="' + i + '">'
          + '<label class="wb-haken"><input type="checkbox" data-ueb="an" data-i="' + i + '"' + (n.an ? ' checked' : '') + (u.laufend || u.ergebnis ? ' disabled' : '') + ' aria-label="' + esc(n.name) + ' übertragen"></label>'
          + '<button class="wb-thumb" data-ueb="gross" data-i="' + i + '" aria-label="Vorschau ' + esc(n.name) + '"><img alt="" src="' + n.url + '"></button>'
          + '<div class="wb-info"><b>' + esc(n.name) + '</b><span>' + groesse(n.blob.size) + '</span>'
          + (z.neuNamen[n.name] && u.alt.some(function (b) { return b.name === n.name; }) ? '<span class="wb-sync wartet">ersetzt das gleichnamige Bild</span>' : '')
          + (st ? '<span class="wb-st">' + st + '</span>' : '') + '</div></div>';
      });
      h += '</div>';
    }
    h += '</div>';

    // Bereits auf der Waage
    h += '<div class="wb-card"><h3>Bereits auf der Waage <span class="wb-zaehl">' + u.alt.length + ' / ' + MAX_BILDER + '</span></h3>';
    if (u.fehlerAlt) {
      h += '<p class="wb-fehler" role="alert">' + esc(u.fehlerAlt) + '</p>';
    } else if (!u.altGeladen) {
      h += '<p class="wb-klein">Laden …</p>';
    } else if (!u.alt.length) {
      h += '<p class="wb-klein">Noch keine Bilder in diesem Verzeichnis.</p>';
    } else {
      h += '<div class="wb-aktionen wb-ueb-umschalter"><button class="wb-btn" data-ueb="alle"' + (u.laufend || u.ergebnis ? ' disabled' : '') + '>Alle zum Löschen wählen</button>'
        + '<button class="wb-btn" data-ueb="keine"' + (u.laufend || u.ergebnis ? ' disabled' : '') + '>Keine</button></div>';
      h += '<div class="wb-raster">';
      u.alt.forEach(function (b, i) {
        var ersetzt = !!z.neuNamen[b.name];
        h += '<div class="wb-item wb-ueb-item" data-ueb-alt="' + esc(b.name) + '">'
          + '<label class="wb-haken" title="' + (ersetzt ? 'wird durch das neue Bild ersetzt' : 'löschen') + '"><input type="checkbox" data-ueb="loesch" data-i="' + i + '"'
          + ((b.an && !ersetzt) ? ' checked' : '') + ((u.laufend || u.ergebnis || ersetzt) ? ' disabled' : '') + ' aria-label="' + esc(b.name) + ' löschen"></label>'
          + '<button class="wb-thumb" data-ueb-thumb="' + esc(b.name) + '" data-ueb="gross-alt" data-i="' + i + '" aria-label="Vorschau ' + esc(b.name) + '">'
          + (b.url ? '<img alt="" src="' + b.url + '">' : '') + '</button>'
          + '<div class="wb-info"><b>' + esc(b.name) + '</b><span>' + groesse(b.groesse) + '</span>'
          + '<span class="wb-sync ' + (ersetzt ? 'wartet' : (b.an ? 'wartet' : 'auf')) + '">' + (ersetzt ? 'wird ersetzt' : (b.an ? 'wird gelöscht' : 'bleibt')) + '</span></div></div>';
      });
      h += '</div>';
    }
    h += '</div>';

    // Zusammenfassung, Ergebnis, Knoepfe
    h += '<p class="wb-klein wb-ueb-status" role="status">' + esc(brueckeText(u.bruecke)) + '</p>';
    if (u.ergebnis) {
      h += '<p class="' + (u.ergebnis.ok ? 'wb-klein wb-ok-text' : 'wb-fehler') + '" role="' + (u.ergebnis.ok ? 'status' : 'alert') + '">' + esc(u.ergebnis.text) + '</p>';
    } else {
      h += '<p class="wb-klein" id="wb-ueb-summe">' + z.an.length + ' neu' + (z.ersetzt ? ' (davon ' + z.ersetzt + ' ersetzen ein Bild)' : '') + ' · ' + z.loesch.length + ' löschen · danach ' + z.danach + ' / ' + MAX_BILDER
        + '</p>';
      if (z.zuviel) h += '<p class="wb-fehler" role="alert">Mehr als ' + MAX_BILDER + ' Bilder passen nicht auf die Waage. Bitte weniger Bilder wählen oder mehr alte löschen.</p>';
    }
    h += '<div class="wb-dlg-foot">';
    if (u.ergebnis && u.ergebnis.ok) {
      h += '<button class="wb-btn wb-haupt" data-ueb="zu">Fertig</button>';
    } else {
      h += '<button class="wb-btn" data-ueb="zu"' + (u.laufend ? ' disabled' : '') + '>Abbrechen</button>'
        + '<button class="wb-btn wb-haupt" data-ueb="start" id="wb-ueb-start"'
        + ((u.laufend || !u.erzeugt || z.zuviel || (!z.an.length && !z.loesch.length) || !u.altGeladen) ? ' disabled' : '') + '>'
        + (u.laufend ? 'Wird übertragen …' : (u.ergebnis ? 'Erneut versuchen' : 'Übertragen'
          + (z.an.length || z.loesch.length ? ' (' + z.an.length + ' neu' + (z.loesch.length ? ', ' + z.loesch.length + ' löschen' : '') + ')' : '')))
        + '</button>';
    }
    h += '</div></div>';
    u.el.innerHTML = h;
  }

  function uebNeuLaden() {
    var u = _ueb;
    if (!u) return;
    var tok = ++u.token;
    u.erzeugt = false; u.fehlerNeu = ''; u.fort = 'Bilder werden erstellt …'; u.altGeladen = false; u.fehlerAlt = ''; u.ergebnis = null;
    u.neu.forEach(function (n) { if (n.url) URL.revokeObjectURL(n.url); });
    u.alt.forEach(function (b) { if (b.url) URL.revokeObjectURL(b.url); });
    u.neu = []; u.alt = [];
    uebRender();

    var ende = function () { return _ueb !== u || u.token !== tok; };
    Promise.resolve().then(function () {
      return u.o.erzeuge(u.art, function (i, n) {
        if (ende()) return;
        u.fort = 'Bilder werden erstellt … ' + i + ' / ' + n;
        var el = document.getElementById('wb-ueb-fort');
        if (el) el.textContent = u.fort;
      }, ende, masse(u.art));
    }).then(function (liste) {
      if (ende()) return;
      u.neu = (liste || []).map(function (x) {
        return { name: x.name, blob: x.blob, an: x.an !== false, url: URL.createObjectURL(x.blob), status: '' };
      });
      u.erzeugt = true;
      uebRender();
    }).catch(function (e) {
      if (ende()) return;
      u.fehlerNeu = 'Die Bilder konnten nicht erstellt werden' + (e && e.message ? ' (' + e.message + ')' : '') + '.';
      uebRender();
    });

    anfrage('GET', qs(u.art)).then(json).then(function (d) {
      if (ende()) return;
      u.alt = (d.bilder || []).map(function (b) {
        return { name: b.name, groesse: b.groesse, etag: b.etag, status: b.status, url: '',
                 an: !!(u.o.praefix && b.name.indexOf(u.o.praefix) === 0) };
      });
      u.bruecke = d.bruecke || null;
      u.altGeladen = true;
      uebRender();
      uebThumbs(tok);
    }).catch(function (e) {
      if (ende()) return;
      u.fehlerAlt = fehlerText(e);
      uebRender();
    });
  }

  function uebThumbs(tok) {
    var u = _ueb;
    if (!u) return;
    var art = u.art;
    var offen = u.alt.filter(function (b) { return !b.url; });
    var i = 0;
    function weiter() {
      if (!_ueb || _ueb.token !== tok || i >= offen.length) return;
      var b = offen[i++];
      anfrage('GET', qs(art, b.name), null, null, 30000)
        .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
        .then(function (bl) {
          if (!_ueb || _ueb.token !== tok) return;
          b.url = URL.createObjectURL(bl);
          var el = u.el && u.el.querySelector('[data-ueb-thumb="' + b.name.replace(/"/g, '') + '"]');
          if (el) el.innerHTML = '<img alt="" src="' + b.url + '">';
        })
        .catch(function () { /* Miniatur bleibt leer */ })
        .then(weiter);
    }
    weiter(); weiter(); weiter();
  }

  function uebStart() {
    var u = _ueb;
    if (!u || u.laufend) return;
    var z = uebZahlen(u);
    if (z.zuviel || (!z.an.length && !z.loesch.length)) return;
    var art = u.art;
    u.laufend = true; u.ergebnis = null;
    z.an.forEach(function (n) { n.status = ''; n.fehler = ''; });
    uebRender();
    var fehler = 0, i = 0;

    function weiterHoch() {
      if (!_ueb || _ueb !== u) return;
      if (i >= z.an.length) return loeschen();
      var n = z.an[i++];
      n.status = 'laeuft'; uebRender();
      anfrage('POST', qs(art, n.name), n.blob, 'image/jpeg', 60000).then(json)
        .then(function () { n.status = 'ok'; })
        .catch(function (e) { n.status = 'fehler'; n.fehler = fehlerText(e); fehler++; })
        .then(weiterHoch);
    }

    // Erst wenn ALLES Neue angekommen ist, faellt das Alte weg (wie "Alle ersetzen" im Kiosk).
    function loeschen() {
      if (fehler) {
        u.laufend = false;
        u.ergebnis = { ok: false, text: 'Nicht alle Bilder wurden übertragen – es wurde nichts gelöscht. Bitte „Erneut versuchen“.' };
        uebRender();
        return;
      }
      var k = 0, loeschFehler = 0;
      (function eins() {
        if (!_ueb || _ueb !== u) return;
        if (k >= z.loesch.length) return fertig(loeschFehler);
        anfrage('DELETE', qs(art, z.loesch[k++].name)).then(json).catch(function () { loeschFehler++; }).then(eins);
      })();
    }

    function fertig(loeschFehler) {
      u.laufend = false;
      var text = z.an.length + (z.an.length === 1 ? ' Bild' : ' Bilder') + ' übertragen'
        + (z.loesch.length ? ', ' + (z.loesch.length - loeschFehler) + ' gelöscht' : '')
        + '. Die Brücke im Laden gleicht die Waage in wenigen Sekunden ab.';
      if (loeschFehler) text += ' ' + loeschFehler + ' Bild(er) ließen sich nicht löschen.';
      u.ergebnis = { ok: !loeschFehler, text: text };
      toast(loeschFehler ? 'Übertragen, aber nicht alles gelöscht' : 'Auf die Waage übertragen');
      uebRender();
      if (host()) laden(true);
      anfrage('GET', qs(art)).then(json).then(function (d) {
        if (_ueb === u) { u.bruecke = d.bruecke || u.bruecke; uebRender(); }
      }).catch(function () { /* Anzeige bleibt */ });
    }

    weiterHoch();
  }

  function uebKlick(e) {
    var u = _ueb;
    if (!u) return;
    if (e.target === u.el && !u.laufend) { uebZu(); return; }
    var t = e.target.closest('[data-ueb]');
    if (!t) return;
    var a = t.getAttribute('data-ueb');
    var i = parseInt(t.getAttribute('data-i'), 10);
    if (a === 'zu') { if (!u.laufend) uebZu(); }
    else if (a === 'art') { if (!u.laufend && t.getAttribute('data-art') !== u.art) { u.art = t.getAttribute('data-art'); uebNeuLaden(); } }
    else if (a === 'start') uebStart();
    else if (a === 'alle') { u.alt.forEach(function (b) { b.an = true; }); uebRender(); }
    else if (a === 'keine') { u.alt.forEach(function (b) { b.an = false; }); uebRender(); }
    else if (a === 'gross' || a === 'gross-alt') {
      var quelle = (a === 'gross' ? u.neu : u.alt).filter(function (x) { return x.url; });
      var idx = quelle.indexOf((a === 'gross' ? u.neu : u.alt)[i]);
      if (idx >= 0) lbOeffnen(quelle.map(function (x) { return { name: x.name, src: x.url }; }), idx);
    }
  }

  function uebAenderung(e) {
    var u = _ueb;
    var t = e.target;
    if (!u || !t || !t.getAttribute) return;
    var a = t.getAttribute('data-ueb');
    var i = parseInt(t.getAttribute('data-i'), 10);
    if (a === 'profil' && !u.laufend) { profilSpeichern(t.value); alleAnpassen(); uebNeuLaden(); return; }
    if (a === 'an' && u.neu[i]) { u.neu[i].an = t.checked; uebRender(); }
    else if (a === 'loesch' && u.alt[i]) { u.alt[i].an = t.checked; uebRender(); }
  }

  /* opts: { titel, art ('vollbild'|'dauer'), artWaehlbar (Standard true), hinweisDauer ('' = keiner),
             praefix (alte Bilder mit diesem Namensanfang sind zum Loeschen vorausgewaehlt),
             erzeuge(art, fortschritt(i, n), abgebrochen(), masse) -> Promise<[{name, blob, an}]> } */
  function uebertragen(opts) {
    stil();
    uebZu();
    var el = document.createElement('div');
    el.className = 'wb-overlay';
    el.id = 'wb-ueb';
    _ueb = { o: opts, art: opts.art === 'dauer' ? 'dauer' : 'vollbild', neu: [], alt: [], token: 0, el: el,
             laufend: false, erzeugt: false, altGeladen: false, ergebnis: null, bruecke: null };
    el.addEventListener('click', uebKlick);
    el.addEventListener('change', uebAenderung);
    document.body.appendChild(el);
    document.addEventListener('keydown', uebTaste, true);
    uebNeuLaden();
  }

  function verwerfen(i) {
    var weg = (i === undefined) ? _staged.splice(0) : _staged.splice(i, 1);
    weg.forEach(function (s) { URL.revokeObjectURL(s.url); });
    _abgelehnt = [];
    render();
  }

  function hochladen(ersetzen) {
    if (_lauf || !_staged.length || uploadGesperrt()) return;
    var art = _art;
    var alt = _bilder.map(function (b) { return b.name; });
    var gespeichert = [];
    var fehler = 0;
    var i = 0;
    _lauf = true;
    _abgelehnt = [];
    _staged.forEach(function (s) { if (s.status !== 'ok') { s.status = 'bereit'; s.fehler = ''; } });
    render();

    function naechste() {
      if (i >= _staged.length) return aufraeumen();
      var s = _staged[i++];
      if (s.status === 'ok') return naechste();
      s.status = 'laeuft'; render();
      anfrage('POST', qs(art, s.file.name), s.file,
        s.file.type || (/\.gif$/i.test(s.file.name) ? 'image/gif' : 'image/jpeg'), 60000)
        .then(json)
        .then(function (d) { s.status = 'ok'; gespeichert.push(d.name); })
        .catch(function (e) { s.status = 'fehler'; s.fehler = fehlerText(e); fehler++; })
        .then(naechste);
    }

    // Beim Ersetzen faellt das Alte erst weg, wenn ALLES Neue angekommen ist.
    function aufraeumen() {
      var weg = (ersetzen && !fehler) ? alt.filter(function (n) { return gespeichert.indexOf(n) < 0; }) : [];
      var k = 0;
      (function loesche() {
        if (k >= weg.length) return fertig();
        anfrage('DELETE', qs(art, weg[k++]))
          .then(json).catch(function () { fehler++; }).then(loesche);
      })();
    }

    function fertig() {
      _staged = _staged.filter(function (s) {
        if (s.status === 'ok') { URL.revokeObjectURL(s.url); return false; }
        return true;
      });
      _lauf = false;
      toast(fehler ? 'Nicht alle Bilder wurden übertragen' : (gespeichert.length === 1 ? 'Bild hochgeladen' : gespeichert.length + ' Bilder hochgeladen'));
      laden();
    }

    naechste();
  }

  function ersetzenFragen() {
    if (_lauf || !_staged.length || uploadGesperrt()) return;
    if (!_bilder.length) { hochladen(false); return; }
    bestaetigen('Alle Bilder ersetzen?',
      'Die ' + _bilder.length + ' vorhandenen Bilder werden durch die ' + _staged.length
      + ' neuen ersetzt. Gelöscht wird erst, wenn alle neuen angekommen sind.',
      'Ersetzen', function () { hochladen(true); });
  }

  function loeschenFragen(name) {
    bestaetigen('Bild löschen?', '„' + name + '“ wird entfernt und von der Waage gelöscht, sobald die Brücke das nächste Mal abgleicht.', 'Löschen', function () {
      var art = _art;
      anfrage('DELETE', qs(art, name)).then(json).then(function () {
        toast('Bild gelöscht'); laden();
      }).catch(function (e) { toast(fehlerText(e)); laden(); });
    });
  }

  // ══════════════════════════════════════════════════
  //  Dialog und Grossansicht
  // ══════════════════════════════════════════════════

  function dlgZu() {
    if (_dlg) { _dlg.remove(); _dlg = null; }
  }

  function bestaetigen(titel, text, jaText, ja) {
    dlgZu();
    var d = document.createElement('div');
    d.className = 'wb-overlay';
    d.setAttribute('data-wb-dlg', '1');
    d.innerHTML = '<div class="wb-dlg" role="dialog" aria-modal="true"><h3>' + esc(titel) + '</h3><p>' + esc(text)
      + '</p><div class="wb-dlg-foot"><button class="wb-btn" data-wb="dlg-nein">Abbrechen</button>'
      + '<button class="wb-btn wb-gefahr" data-wb="dlg-ja">' + esc(jaText) + '</button></div></div>';
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-wb]');
      if (e.target === d || (t && t.getAttribute('data-wb') === 'dlg-nein')) dlgZu();
      else if (t && t.getAttribute('data-wb') === 'dlg-ja') { dlgZu(); ja(); }
    });
    document.body.appendChild(d);
    _dlg = d;
  }

  function lbZu() {
    var el = document.getElementById('wb-lb');
    if (el) el.remove();
    document.removeEventListener('keydown', lbTaste, true);
    _lb = null;
  }

  function lbTaste(e) {
    if (!_lb) return;
    if (e.key === 'Escape') { e.stopPropagation(); lbZu(); }
    else if (e.key === 'ArrowRight') lbZeige(_lb.i + 1);
    else if (e.key === 'ArrowLeft') lbZeige(_lb.i - 1);
  }

  function lbZeige(i) {
    if (!_lb) return;
    var n = _lb.items.length;
    _lb.i = (i + n) % n;
    var it = _lb.items[_lb.i];
    var el = document.getElementById('wb-lb');
    if (!el) return;
    el.querySelector('.wb-lb-bild').innerHTML = it.src ? '<img alt="' + esc(it.name) + '" src="' + it.src + '">' : '<span>Wird geladen …</span>';
    el.querySelector('.wb-lb-name').textContent = it.name + (n > 1 ? '  ·  ' + (_lb.i + 1) + ' / ' + n : '');
    if (!it.src && it.lade) {
      it.lade().then(function (src) {
        it.src = src;
        if (_lb && _lb.items[_lb.i] === it) lbZeige(_lb.i);
      }).catch(function () {
        var b = document.querySelector('#wb-lb .wb-lb-bild');
        if (b && _lb && _lb.items[_lb.i] === it) b.innerHTML = '<span>Bild konnte nicht geladen werden.</span>';
      });
    }
  }

  function lbOeffnen(items, i) {
    lbZu();
    var el = document.createElement('div');
    el.id = 'wb-lb';
    el.className = 'wb-overlay wb-lb';
    el.innerHTML = '<button class="wb-lb-x" data-wb="lb-zu" aria-label="Schließen">✕</button>'
      + '<button class="wb-lb-pf wb-lb-zur" data-wb="lb-zur" aria-label="Voriges Bild">‹</button>'
      + '<div class="wb-lb-bild"></div>'
      + '<button class="wb-lb-pf wb-lb-vor" data-wb="lb-vor" aria-label="Nächstes Bild">›</button>'
      + '<div class="wb-lb-name"></div>';
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-wb]');
      var a = t && t.getAttribute('data-wb');
      if (a === 'lb-zur') lbZeige(_lb.i - 1);
      else if (a === 'lb-vor') lbZeige(_lb.i + 1);
      else if (a === 'lb-zu' || !e.target.closest('img')) lbZu();
    });
    document.body.appendChild(el);
    _lb = { items: items, i: i };
    document.addEventListener('keydown', lbTaste, true);
    lbZeige(i);
  }

  function vorschauListe(i) {
    var art = _art;
    var items = _bilder.map(function (b) {
      return {
        name: b.name, src: _blobs[key(art, b)] || '',
        lade: function () {
          return anfrage('GET', qs(art, b.name), null, null, 30000)
            .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
            .then(function (bl) { _blobs[key(art, b)] = URL.createObjectURL(bl); return _blobs[key(art, b)]; });
        }
      };
    });
    if (items[i]) lbOeffnen(items, i);
  }

  function vorschauNeu(i) {
    var s = _staged[i];
    var liste = _staged.filter(function (x) { return x.url && x.status !== 'bearbeitung'; });
    if (s && liste.indexOf(s) >= 0) lbOeffnen(liste.map(function (x) { return { name: x.file.name, src: x.url }; }), liste.indexOf(s));
  }

  // ══════════════════════════════════════════════════
  //  Darstellung
  // ══════════════════════════════════════════════════

  function renderStaged() {
    if (!_staged.length && !_abgelehnt.length) return '';
    var h = '<div class="wb-card wb-stage"><h3>Zum Hochladen (' + _staged.length + ')</h3>';
    if (_abgelehnt.length) {
      h += '<p class="wb-warn" role="alert">Nicht übernommen: ' + esc(_abgelehnt.join(', ')) + '</p>';
    }
    if (_staged.length) {
      h += '<div class="wb-raster">';
      _staged.forEach(function (s, i) {
        var st = s.status === 'ok' ? '✓ hochgeladen' : s.status === 'bearbeitung' ? 'Vorschau wird angepasst …' : s.status === 'laeuft' ? 'wird gesendet …' : s.status === 'fehler' ? esc(s.fehler) : 'bereit';
        var gif = /\.gif$/i.test(s.original.name) || /image\/gif/i.test(s.original.type);
        h += '<div class="wb-item wb-' + s.status + '" data-wb-neu="' + i + '">'
          + '<button class="wb-thumb" data-wb="vorschau-neu" data-i="' + i + '" aria-label="Vorschau ' + esc(s.file.name) + '">' + (s.url ? '<img alt="" src="' + s.url + '">' : '') + '</button>'
          + '<div class="wb-info"><b>' + esc(s.file.name) + '</b><span>' + groesse(s.file.size) + '</span><span class="wb-st" role="status">' + st + '</span>'
          + (gif ? '<span>GIF bleibt unverändert, damit Animationen erhalten bleiben. Kein Beschnitt möglich.</span>'
            : '<label>Bildanpassung <select class="wb-btn" data-wb-modus="' + i + '"' + (_lauf ? ' disabled' : '') + '><option value="contain"' + (s.modus === 'contain' ? ' selected' : '') + '>Vollständig</option><option value="cover"' + (s.modus === 'cover' ? ' selected' : '') + '>Randlos mit Beschnitt</option></select></label>')
          + '</div>'
          + (_lauf ? '' : '<button class="wb-x" data-wb="weg" data-i="' + i + '" aria-label="Entfernen">✕</button>') + '</div>';
      });
      h += '</div>';
      var frei = MAX_BILDER - _bilder.length;
      if (_staged.length > frei) {
        h += '<p class="wb-warn">Auf der Waage ist Platz für ' + MAX_BILDER + ' Bilder je Art – '
          + 'ohne „Alle ersetzen“ passen nur noch ' + Math.max(0, frei) + ' dazu.</p>';
      }
      h += '<div class="wb-aktionen"><button class="wb-btn wb-haupt" data-wb="hoch"' + (_lauf || uploadGesperrt() ? ' disabled' : '') + '>Hochladen</button>'
        + '<button class="wb-btn" data-wb="ersetzen"' + (_lauf || uploadGesperrt() ? ' disabled' : '') + '>Alle ersetzen</button>'
        + '<button class="wb-btn" data-wb="verwerfen"' + (_lauf ? ' disabled' : '') + '>Verwerfen</button></div>';
    }
    return h + '</div>';
  }

  // Hinweise zur Bruecke oberhalb der Liste: offline, Fehler, Erstlauf, Vorrang-Bilder.
  function renderHinweise() {
    var b = _bruecke;
    var h = '';
    if (!b) return h;
    if (!b.bekannt) {
      h += '<p class="wb-warn" role="status">Die Brücke im Laden hat sich noch nie gemeldet. Änderungen werden gespeichert und '
        + 'übertragen, sobald sie läuft.</p>';
    } else if (!b.online) {
      h += '<p class="wb-warn" role="status">Die Brücke im Laden ist offline (seit ' + dauer(b.vor_s) + '). Änderungen werden '
        + 'gespeichert und auf die Waage übertragen, sobald sie wieder läuft.</p>';
    } else if (!b.ok && b.fehler) {
      h += '<p class="wb-warn" role="alert">Beim letzten Abgleich mit der Waage gab es einen Fehler: ' + esc(b.fehler) + '</p>';
    } else if (!b.initialisiert) {
      h += '<p class="wb-klein" role="status">Die Brücke übernimmt gerade die vorhandenen Bilder der Waage.</p>';
    }
    if (b.direkt) {
      h += '<p class="wb-warn" role="alert">Achtung: Direkt im Ordner „' + (_art === 'dauer' ? 'permanent' : 'fullscreen')
        + '“ der Waage liegen ' + b.direkt + ' Bild(er). Die Waage spielt diese zuerst; die Bilder hier („default“) laufen nur, '
        + 'wenn dort nichts liegt.</p>';
    }
    return h;
  }

  function renderListe() {
    var h = '<div class="wb-card"><h3>Auf der Waage <span class="wb-zaehl" id="wb-zaehl">' + _bilder.length + ' / ' + MAX_BILDER + '</span></h3>';
    if (_laden) return h + '<p class="wb-klein">Laden …</p></div>';
    if (_fehler) return h + '<p class="wb-fehler" role="alert">' + esc(_fehler) + '</p></div>';
    h += renderHinweise();
    if (!_bilder.length) return h + '<p class="wb-klein">Noch keine Bilder in diesem Verzeichnis.</p></div>';
    h += '<div class="wb-raster">';
    _bilder.forEach(function (b, i) {
      var k = key(_art, b);
      var auf = b.status === 'auf_waage';
      h += '<div class="wb-item" data-wb-bild="' + esc(b.name) + '">'
        + '<span class="wb-pos">' + (i + 1) + '</span>'
        + '<button class="wb-thumb" data-key="' + esc(k) + '" data-wb="vorschau" data-i="' + i + '" aria-label="Vorschau ' + esc(b.name) + '">'
        + (_blobs[k] ? '<img alt="" src="' + _blobs[k] + '">' : '') + '</button>'
        + '<div class="wb-info"><b>' + esc(b.name) + '</b><span>' + groesse(b.groesse) + '</span>'
        + '<span class="wb-sync ' + (auf ? 'auf' : 'wartet') + '" data-wb-status="' + esc(b.status) + '">'
        + (auf ? '✓ auf der Waage' : '⏳ wartet auf Übertragung') + '</span></div>'
        + '<button class="wb-btn wb-del" data-wb="loeschen" data-name="' + esc(b.name) + '" aria-label="' + esc(b.name) + ' löschen">Löschen</button></div>';
    });
    return h + '</div></div>';
  }

  function render() {
    var el = host();
    if (!el) return;
    var art = ARTEN.filter(function (a) { return a.id === _art; })[0];
    var st = statusText();
    var h = '<div class="wb-kopf"><h2>Werbebilder der Waage</h2><span class="wb-stat ' + st.klasse + '" id="wb-stat">' + esc(st.text) + '</span>'
      + '<span class="wb-sp"></span><button class="wb-btn" data-wb="neu">Aktualisieren</button></div>';
    h += '<div class="wb-art" role="tablist">';
    ARTEN.forEach(function (a) {
      h += '<button class="wb-btn' + (a.id === _art ? ' on' : '') + '" role="tab" aria-selected="' + (a.id === _art) + '" data-wb="art" data-art="' + a.id + '"'
        + (_lauf ? ' disabled' : '') + '>' + a.text + '</button>';
    });
    h += '</div><p class="wb-klein">' + esc(art.hinweis) + ' Die Reihenfolge folgt dem Dateinamen.</p>';
    h += profilHtml('data-wb-profil="1"', _lauf);
    h += '<label class="wb-drop" id="wb-drop"><input type="file" id="wb-datei" multiple accept="image/jpeg,image/gif,.jpg,.jpeg,.gif">'
      + '<b>Bilder hier ablegen oder tippen</b><span>JPEG oder GIF, höchstens 8 MB je Bild</span></label>';
    h += '<div class="wb-clip"><button class="wb-btn" data-wb="einfuegen"' + (_lauf ? ' disabled' : '') + '>Aus Zwischenablage einfügen</button>'
      + '<button class="wb-btn" data-wb="kamera"' + (_lauf ? ' disabled' : '') + '>Foto aufnehmen</button>'
      + (_kamFallback ? '<label class="wb-btn" for="wb-kamera" data-wb-kamera-app="1">Kamera-App öffnen</label>' : '')
      + '<input type="file" id="wb-kamera" accept="image/*" capture="environment" hidden>'
      + '<div id="wb-paste" class="wb-paste" contenteditable="true" role="textbox" inputmode="none" spellcheck="false" '
      + 'aria-label="Hier tippen zum Einfügen" data-placeholder="Hier tippen zum Einfügen – oder Strg+V"></div></div>';
    if (_clipHinweis) h += '<p class="wb-warn" role="status">' + esc(_clipHinweis) + '</p>';
    h += renderStaged() + renderListe();
    el.innerHTML = h;
  }

  // ══════════════════════════════════════════════════
  //  Bedienung
  // ══════════════════════════════════════════════════

  function klick(e) {
    var t = e.target.closest('[data-wb]');
    if (!t || !host().contains(t)) return;
    var a = t.getAttribute('data-wb');
    var i = parseInt(t.getAttribute('data-i'), 10);
    if (a === 'art') { if (_lauf) return; _art = t.getAttribute('data-art'); _bilder = []; _sig = ''; alleAnpassen(); laden(); }
    else if (a === 'neu') laden();
    else if (a === 'hoch') hochladen(false);
    else if (a === 'einfuegen') clipLesen();
    else if (a === 'kamera') kameraOeffnen();
    else if (a === 'ersetzen') ersetzenFragen();
    else if (a === 'verwerfen') verwerfen();
    else if (a === 'weg') verwerfen(i);
    else if (a === 'loeschen') loeschenFragen(t.getAttribute('data-name'));
    else if (a === 'vorschau') vorschauListe(i);
    else if (a === 'vorschau-neu') vorschauNeu(i);
  }

  function verdrahten() {
    var el = host();
    if (!el || el.getAttribute('data-wb-ok')) return;
    el.setAttribute('data-wb-ok', '1');
    document.addEventListener('paste', einfuegen);
    document.addEventListener('visibilitychange', function () { if (document.hidden) kameraZu(); });
    el.addEventListener('click', klick);
    el.addEventListener('change', function (e) {
      if (_lauf) return;
      if (e.target && e.target.hasAttribute('data-wb-profil')) { profilSpeichern(e.target.value); alleAnpassen(); return; }
      if (e.target && e.target.hasAttribute('data-wb-modus')) {
        var s = _staged[Number(e.target.getAttribute('data-wb-modus'))];
        if (s) { s.modus = e.target.value === 'cover' ? 'cover' : 'contain'; anpassen(s); render(); }
        return;
      }
      if (e.target && e.target.id === 'wb-datei') { dateienAufnehmen(e.target.files); e.target.value = ''; }
      else if (e.target && e.target.id === 'wb-kamera') {
        var fotos = Array.prototype.slice.call(e.target.files || []);
        e.target.value = '';
        if (fotos.length) clipAufnehmen(fotos, 'Foto', true);   // immer JPEG, <= 1920 px, Ausrichtung eingerechnet
      }
    });
    el.addEventListener('dragover', function (e) {
      e.preventDefault();
      var z = document.getElementById('wb-drop');
      if (z) z.classList.add('over');
    });
    el.addEventListener('dragleave', function () {
      var z = document.getElementById('wb-drop');
      if (z) z.classList.remove('over');
    });
    el.addEventListener('drop', function (e) {
      e.preventDefault();
      if (_lauf) return;
      dateienAufnehmen(e.dataTransfer && e.dataTransfer.files);
    });
  }

  function onShow() {
    stil();
    verdrahten();
    startTimer();
    laden();
  }

  // ── Stil (Namensraum wb-, theme-faehig ueber --c-*) ──
  function stil() {
    if (document.getElementById('wb-style')) return;
    var s = document.createElement('style');
    s.id = 'wb-style';
    s.textContent = [
      '#wb-root,.wb-overlay{--wp:var(--c-pri,#1e463a);--wb:var(--c-border,#e6e4de);--ws:var(--c-surf,#fff);--wm:var(--c-sec,#6b7280);--wt:var(--c-text,#1f2521);color:var(--wt)}',
      '#wb-root button,#wb-root input,.wb-overlay button{font-family:inherit}',
      '.wb-kopf{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}.wb-kopf h2{margin:0;font-size:18px;font-weight:600}.wb-sp{flex:1}',
      '.wb-stat{font-size:13px;font-weight:600}.wb-stat.ok{color:#15803d}.wb-stat.warn{color:#b45309}.wb-stat.fehl{color:var(--wm)}',
      '.wb-btn{min-height:44px;padding:8px 16px;border:1.5px solid var(--wb);background:var(--ws);color:var(--wt);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer}',
      '.wb-btn.on,.wb-btn.wb-haupt{background:var(--wp);border-color:var(--wp);color:#fff}.wb-btn.wb-gefahr{background:#b91c1c;border-color:#b91c1c;color:#fff}.wb-btn[disabled]{opacity:.5;cursor:default}',
      '.wb-art{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}',
      '.wb-profil{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:8px 0}.wb-profil select,.wb-info select{max-width:100%;min-width:0;white-space:normal}.wb-profil select{flex:1 1 240px}.wb-info label{display:block;min-width:0}',
      '.wb-klein{font-size:13px;color:var(--wm);margin:4px 0 10px}.wb-klein code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:5px}',
      '.wb-card{background:var(--ws);border:1px solid var(--wb);border-radius:14px;padding:14px 16px;margin-top:12px}.wb-card h3{margin:0 0 10px;font-size:15px;font-weight:600}',
      '.wb-zaehl{font-weight:400;color:var(--wm);font-size:13px;margin-left:6px}',
      '.wb-drop{display:flex;flex-direction:column;align-items:center;gap:4px;padding:26px 16px;border:2px dashed var(--wp);border-radius:14px;background:var(--c-pri-l,#f0f4f1);cursor:pointer;text-align:center;min-height:44px}',
      '.wb-drop.over{background:#dcfce7}.wb-drop input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.wb-drop b{color:var(--wp);font-size:15px}.wb-drop span{font-size:12px;color:var(--wm)}',
      '.wb-clip{display:flex;gap:8px;flex-wrap:wrap;align-items:stretch;margin-top:8px}.wb-clip label.wb-btn{display:flex;align-items:center}',
      '.wb-dlg.wb-kam-dlg{max-width:720px}.wb-video{width:100%;max-height:60vh;background:#000;border-radius:10px;display:block;margin:0 0 10px}',
      '.wb-paste{flex:1 1 220px;min-height:44px;padding:10px 12px;border:1.5px dashed var(--wb);border-radius:12px;background:var(--ws);color:var(--wt);font-size:13px;outline:none;overflow:hidden;display:flex;align-items:center}',
      '.wb-paste:empty:before{content:attr(data-placeholder);color:var(--wm)}.wb-paste:focus{border-color:var(--wp)}',
      '.wb-raster{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}',
      '.wb-item{position:relative;display:flex;align-items:center;gap:10px;padding:8px;border:1px solid var(--wb);border-radius:12px;background:var(--ws)}',
      '.wb-item.wb-fehler{border-color:#b91c1c}.wb-item.wb-ok{border-color:#15803d}',
      '.wb-pos{position:absolute;top:4px;left:4px;z-index:1;min-width:22px;height:22px;border-radius:11px;background:var(--wp);color:#fff;font-size:12px;font-weight:600;display:flex;align-items:center;justify-content:center;padding:0 6px}',
      '.wb-thumb{flex:none;width:84px;height:64px;padding:0;border:1px solid var(--wb);border-radius:8px;background:#f3f4f6;overflow:hidden;cursor:zoom-in;display:flex;align-items:center;justify-content:center}.wb-thumb img{width:100%;height:100%;object-fit:contain}',
      '.wb-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;font-size:13px}.wb-info b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:600}.wb-info span{color:var(--wm);font-size:12px}.wb-item.wb-fehler .wb-st{color:#b91c1c}',
      '.wb-x{flex:none;width:44px;height:44px;border:none;background:transparent;font-size:18px;cursor:pointer;color:var(--wm)}',
      '.wb-btn.wb-del{flex:none;padding:8px 12px;color:#b91c1c;border-color:#fecaca}',
      '.wb-aktionen{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}',
      '.wb-warn,.wb-fehler{font-size:13px;margin:8px 0;padding:8px 12px;border-radius:10px}.wb-warn{background:#fef3c7;color:#92400e}.wb-fehler{background:#fee2e2;color:#991b1b}',
      '.wb-info span.wb-sync{font-weight:600}.wb-info span.wb-sync.auf{color:#15803d}.wb-info span.wb-sync.wartet{color:#b45309}',
      '.wb-dlg.wb-ueb-dlg{max-width:860px;max-height:92vh;overflow-y:auto;overscroll-behavior:contain}.wb-ueb-kopf{display:flex;align-items:center;gap:8px;margin-bottom:6px}.wb-ueb-kopf h3{flex:1;margin:0}',
      '.wb-ueb-dlg .wb-card{margin-top:10px;padding:12px 14px}.wb-ueb-dlg .wb-raster{grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}',
      '.wb-ueb-dlg .wb-info b{white-space:normal;overflow:visible;text-overflow:clip;word-break:break-all;font-size:12px}',
      '.wb-haken{flex:none;display:flex;align-items:center;justify-content:center;width:44px;height:44px;cursor:pointer}.wb-haken input{width:24px;height:24px;accent-color:var(--wp);cursor:pointer}',
      '.wb-ok-text{color:#15803d;font-weight:600}.wb-ueb-status{margin:8px 0 2px}.wb-ueb-umschalter{margin:0 0 8px}.wb-ueb-umschalter .wb-btn{min-height:36px;padding:4px 12px;font-size:13px}',
      '.wb-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55);font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}.wb-overlay h3,.wb-overlay p,.wb-overlay span,.wb-overlay b{font-family:inherit}',
      '.wb-dlg{background:#fff;color:#1f2521;border-radius:16px;padding:20px 22px;max-width:440px;width:100%;box-shadow:0 20px 48px rgba(0,0,0,.3)}.wb-dlg h3{margin:0 0 8px;font-size:18px}.wb-dlg p{margin:0 0 16px;line-height:1.5}.wb-dlg-foot{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}',
      '.wb-lb{background:rgba(0,0,0,.88);flex-direction:column;gap:10px}.wb-lb-bild{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;color:#fff}.wb-lb-bild img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}',
      '.wb-lb-name{color:#fff;font-size:14px;text-align:center}',
      '.wb-lb-x{position:absolute;top:12px;right:12px;width:48px;height:48px;border:none;border-radius:24px;background:rgba(255,255,255,.18);color:#fff;font-size:22px;cursor:pointer;z-index:2}',
      '.wb-lb-pf{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:64px;border:none;border-radius:12px;background:rgba(255,255,255,.18);color:#fff;font-size:34px;cursor:pointer;z-index:2}.wb-lb-zur{left:10px}.wb-lb-vor{right:10px}',
      '@media(max-width:560px){.wb-raster{grid-template-columns:1fr}.wb-lb-pf{width:40px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  return { onShow: onShow, reload: laden, uebertragen: uebertragen, dateiname: dateiname, masse: masse };
})();

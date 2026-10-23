/* Werbebilder der PC-Waage im Kiosk (Spec specs/kiosk-werbebilder-upload/spec.md).
 *
 * Selbststaendiges Modul (window.KWerbebilder). Spricht NICHT mit der Cloud,
 * sondern mit der Waage-Bruecke im Laden-LAN (tools/waage-bruecke), die die
 * Bilder per FTP auf der Waage ablegt. Ein Browser kann kein FTP.
 *
 * Nur die Default-Verzeichnisse: Vollbild und Dauerwerbung. Die Reihenfolge
 * auf der Waage ergibt sich aus dem Dateinamen; die Liste zeigt sie so.
 * Keine zusaetzliche Anmeldung im Tab - die Kiosk-Passwortabfrage genuegt.
 */
window.KWerbebilder = (function () {
  'use strict';

  var KEY = 'kiosk_waage_url';
  var STANDARD_PORT = ':8765';
  var MAX_BILDER = 99;
  var MAX_BYTES = 8 * 1024 * 1024;
  var ARTEN = [
    { id: 'vollbild', text: 'Vollbild', hinweis: 'Ganzer Bildschirm, startet im Leerlauf der Waage.' },
    { id: 'dauer', text: 'Dauerwerbung', hinweis: 'Unterer Bildteil (800 × 280), läuft neben dem Verkauf.' }
  ];

  var _art = 'vollbild';
  var _bilder = [];
  var _direkt = 0;           // Bilder direkt im Ordner (Vorrang vor "default")
  var _laden = false;
  var _verbunden = false;
  var _fehler = '';
  var _staged = [];          // [{file,url,status,fehler}]
  var _abgelehnt = [];       // Texte zu Dateien, die nicht uebernommen wurden
  var _lauf = false;
  var _einst = false;
  var _blobs = {};           // art/name/groesse -> Objekt-URL der Miniatur
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
  //  Verbindung zur Bruecke
  // ══════════════════════════════════════════════════

  function basis() {
    var u = '';
    try { u = localStorage.getItem(KEY) || ''; } catch (e) { /* gesperrt */ }
    u = u.trim();
    if (!u) return '';
    if (!/^https?:\/\//i.test(u)) u = 'http://' + u;
    var m = u.match(/^(https?:\/\/)([^\/:]+)(.*)$/i);
    if (m && m[3].charAt(0) !== ':') u = m[1] + m[2] + STANDARD_PORT + m[3];
    return u.replace(/\/+$/, '');
  }

  function anfrage(methode, pfad, body, typ, ms) {
    var b = basis();
    if (!b) return Promise.reject({ art: 'adresse' });
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, ms || 15000);
    var o = { method: methode, signal: ctl.signal, cache: 'no-store' };
    if (body) { o.body = body; o.headers = { 'Content-Type': typ || 'application/octet-stream' }; }
    return fetch(b + pfad, o).then(
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
    if (e && e.art === 'adresse') return 'Die Adresse der Brücke fehlt.';
    if (e && e.art === 'fremd') {
      return 'Unter ' + basis() + ' antwortet nicht die Waage-Brücke (HTTP ' + e.status + '). '
        + 'Bitte IP und Port prüfen (Anzeige im Brücken-Fenster: „Im Kiosk eintragen“), ob die Brücke läuft '
        + 'und ob das Gerät ohne Proxy/VPN im selben Laden-Netz ist.';
    }
    if (e && e.art === 'netz') {
      var mixed = location.protocol === 'https:' && /^http:/i.test(basis());
      return 'Die Waage-Brücke ist nicht erreichbar. Läuft sie, stimmt die Adresse und ist das Gerät im Laden-WLAN?'
        + (mixed ? ' Bei einer http-Adresse muss im Fully Kiosk „Mixed Content zulassen“ eingeschaltet sein.' : '');
    }
    if (e && e.art === 'waage') return 'Die Brücke läuft, aber die Waage antwortet nicht' + (e.text ? ' (' + e.text + ')' : '') + '. Ist sie an und der FTP-Zugang eingetragen?';
    if (e && e.art === 'verzeichnis') return 'Das Werbeverzeichnis wurde auf der Waage nicht gefunden. Bitte den Pfad „ftp_basis“ der Brücke prüfen.';
    if (e && e.art === 'http' && e.status === 502) return 'Die Waage antwortet nicht: ' + e.text;
    return (e && e.text) || 'Unbekannter Fehler';
  }

  // ══════════════════════════════════════════════════
  //  Laden
  // ══════════════════════════════════════════════════

  function key(art, b) { return art + '/' + b.name + '/' + b.groesse; }

  function laden() {
    var art = _art;
    _laden = true; _fehler = '';
    render();
    return anfrage('GET', '/health').then(json).then(function (h) {
      if (!h.waage) throw { art: 'waage', text: h.fehler || '' };
      if (h.arten && h.arten[art] === false) throw { art: 'verzeichnis' };
      return anfrage('GET', '/bilder/' + art).then(json);
    }).then(function (d) {
      if (art !== _art) return;
      _bilder = d.bilder || [];
      _direkt = d.direkt || 0;
      _verbunden = true; _laden = false; _fehler = '';
      var jetzt = {};
      _bilder.forEach(function (b) { jetzt[key(art, b)] = 1; });
      Object.keys(_blobs).forEach(function (k) {
        if (k.indexOf(art + '/') === 0 && !jetzt[k]) { URL.revokeObjectURL(_blobs[k]); delete _blobs[k]; }
      });
      render(); holeMiniaturen();
    }).catch(function (e) {
      if (art !== _art) return;
      _bilder = []; _verbunden = false; _laden = false; _fehler = fehlerText(e);
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
      anfrage('GET', '/bilder/' + art + '/' + encodeURIComponent(b.name), null, null, 30000)
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

  // ══════════════════════════════════════════════════
  //  Auswahl und Upload
  // ══════════════════════════════════════════════════

  function typOk(f) {
    return /^image\/(jpeg|gif)$/i.test(f.type) || (!f.type && /\.(jpe?g|gif)$/i.test(f.name));
  }

  function dateienAufnehmen(liste) {
    var neu = Array.prototype.slice.call(liste || []);
    _abgelehnt = [];
    neu.forEach(function (f) {
      if (!typOk(f)) { _abgelehnt.push(f.name + ' (nur JPEG und GIF)'); return; }
      if (f.size > MAX_BYTES) { _abgelehnt.push(f.name + ' (größer als 8 MB)'); return; }
      if (_staged.some(function (s) { return s.file.name === f.name && s.file.size === f.size; })) return;
      _staged.push({ file: f, url: URL.createObjectURL(f), status: 'bereit', fehler: '' });
    });
    render();
  }

  function verwerfen(i) {
    var weg = (i === undefined) ? _staged.splice(0) : _staged.splice(i, 1);
    weg.forEach(function (s) { URL.revokeObjectURL(s.url); });
    _abgelehnt = [];
    render();
  }

  function hochladen(ersetzen) {
    if (_lauf || !_staged.length) return;
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
      anfrage('POST', '/bilder/' + art + '?name=' + encodeURIComponent(s.file.name), s.file,
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
        anfrage('DELETE', '/bilder/' + art + '/' + encodeURIComponent(weg[k++]))
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
    if (_lauf || !_staged.length) return;
    if (!_bilder.length) { hochladen(false); return; }
    bestaetigen('Alle Bilder ersetzen?',
      'Die ' + _bilder.length + ' vorhandenen Bilder werden durch die ' + _staged.length
      + ' neuen ersetzt. Gelöscht wird erst, wenn alle neuen angekommen sind.',
      'Ersetzen', function () { hochladen(true); });
  }

  function loeschenFragen(name) {
    bestaetigen('Bild löschen?', '„' + name + '“ wird von der Waage entfernt.', 'Löschen', function () {
      var art = _art;
      anfrage('DELETE', '/bilder/' + art + '/' + encodeURIComponent(name)).then(json).then(function () {
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
          return anfrage('GET', '/bilder/' + art + '/' + encodeURIComponent(b.name), null, null, 30000)
            .then(function (r) { if (!r.ok) throw 0; return r.blob(); })
            .then(function (bl) { _blobs[key(art, b)] = URL.createObjectURL(bl); return _blobs[key(art, b)]; });
        }
      };
    });
    if (items[i]) lbOeffnen(items, i);
  }

  function vorschauNeu(i) {
    var items = _staged.map(function (s) { return { name: s.file.name, src: s.url }; });
    if (items[i]) lbOeffnen(items, i);
  }

  // ══════════════════════════════════════════════════
  //  Darstellung
  // ══════════════════════════════════════════════════

  function renderEinstellung() {
    var hat = !!basis();
    var z = adresseZerlegen(basis());
    return '<div class="wb-card wb-einst"><b>Adresse der Waage-Brücke</b>'
      + '<p class="wb-klein">Rechner im Laden, auf dem die Brücke läuft (die Brücke zeigt beim Start „Im Kiosk eintragen“). '
      + 'Wird auf diesem Gerät gemerkt.</p>'
      + '<div class="wb-zeile wb-adr">'
      + '<label>Schema<select id="wb-schema"><option value="http"' + (z.schema === 'http' ? ' selected' : '') + '>http</option>'
      + '<option value="https"' + (z.schema === 'https' ? ' selected' : '') + '>https</option></select></label>'
      + '<label class="wb-l-host">IP-Adresse des Rechners<input id="wb-host" type="text" inputmode="decimal" autocomplete="off" '
      + 'autocapitalize="off" spellcheck="false" placeholder="192.168.1.20" value="' + esc(z.host) + '"></label>'
      + '<label class="wb-l-port">Port<input id="wb-port" type="text" inputmode="numeric" autocomplete="off" '
      + 'placeholder="' + STANDARD_PORT.slice(1) + '" value="' + esc(z.port) + '"></label></div>'
      + '<p class="wb-fehler" id="wb-adr-fehler" role="alert" hidden></p><p class="wb-klein" id="wb-test" role="status"></p>'
      + '<div class="wb-aktionen"><button class="wb-btn" data-wb="url-test">Verbindung testen</button>'
      + '<button class="wb-btn wb-haupt" data-wb="url-speichern">Speichern</button>'
      + (hat ? '<button class="wb-btn" data-wb="einst">Abbrechen</button>' : '') + '</div></div>';
  }

  // Zerlegt die gemerkte Adresse in Schema, Rechner und Port (Standardwerte, wenn leer).
  function adresseZerlegen(u) {
    var m = String(u || '').match(/^(https?):\/\/([^\/:]+)(?::(\d+))?/i);
    if (!m) return { schema: 'http', host: '', port: STANDARD_PORT.slice(1) };
    return { schema: m[1].toLowerCase(), host: m[2], port: m[3] || STANDARD_PORT.slice(1) };
  }

  // Prueft die Eingabe; liefert { url } oder { fehler }.
  function adresseBauen(schema, host, port) {
    host = String(host || '').trim();
    port = String(port || '').trim() || STANDARD_PORT.slice(1);
    if (!host) return { fehler: 'Bitte die IP-Adresse des Rechners eintragen (z. B. 192.168.1.20).' };
    var ipv4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
    if (ipv4 && host.split('.').some(function (t) { return parseInt(t, 10) > 255; })) {
      return { fehler: 'Die IP-Adresse ist ungültig – jede Zahl darf höchstens 255 sein.' };
    }
    if (!ipv4 && !/^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/.test(host)) {
      return { fehler: 'Die Adresse ist ungültig – erlaubt sind eine IP wie 192.168.1.20 oder ein Rechnername.' };
    }
    if (!/^\d{1,5}$/.test(port) || parseInt(port, 10) < 1 || parseInt(port, 10) > 65535) {
      return { fehler: 'Der Port ist ungültig – erlaubt sind Zahlen von 1 bis 65535.' };
    }
    return { url: (schema === 'https' ? 'https' : 'http') + '://' + host + ':' + parseInt(port, 10) };
  }

  function adresseLesen() {
    var g = function (id) { var e = document.getElementById(id); return e ? e.value : ''; };
    var r = adresseBauen(g('wb-schema'), g('wb-host'), g('wb-port'));
    var f = document.getElementById('wb-adr-fehler');
    if (f) { f.hidden = !r.fehler; f.textContent = r.fehler || ''; }
    return r;
  }

  function verbindungTesten() {
    var r = adresseLesen();
    var t = document.getElementById('wb-test');
    if (!r.url || !t) return;
    t.textContent = 'Teste ' + r.url + ' …';
    var ctl = new AbortController();
    var to = setTimeout(function () { ctl.abort(); }, 6000);
    fetch(r.url + '/health', { cache: 'no-store', signal: ctl.signal }).then(function (x) {
      clearTimeout(to);
      return x.json().then(function (d) { return { h: d, status: x.status }; }, function () { return { h: null, status: x.status }; });
    }).then(function (res) {
      var h = res.h;
      if (!h || typeof h.success === 'undefined') {
        t.textContent = '✗ Unter ' + r.url + ' antwortet nicht die Waage-Brücke (HTTP ' + res.status + '). IP und Port prüfen, ohne Proxy/VPN im Laden-Netz sein.';
        return;
      }
      t.textContent = h.waage ? '✓ Brücke erreichbar, Waage antwortet.'
        : '⚠ Brücke erreichbar, aber die Waage antwortet nicht' + (h.fehler ? ' (' + h.fehler + ')' : '') + '. Waagen-IP in der Brücke prüfen.';
    }, function () {
      clearTimeout(to);
      t.textContent = '✗ Keine Antwort von ' + r.url + '. Läuft die Brücke, stimmen IP und Port?'
        + (location.protocol === 'https:' && r.url.indexOf('http:') === 0 ? ' (Mixed Content in Fully Kiosk zulassen.)' : '');
    });
  }

  function renderStaged() {
    if (!_staged.length && !_abgelehnt.length) return '';
    var h = '<div class="wb-card wb-stage"><h3>Zum Hochladen (' + _staged.length + ')</h3>';
    if (_abgelehnt.length) {
      h += '<p class="wb-warn" role="alert">Nicht übernommen: ' + esc(_abgelehnt.join(', ')) + '</p>';
    }
    if (_staged.length) {
      h += '<div class="wb-raster">';
      _staged.forEach(function (s, i) {
        var st = s.status === 'ok' ? '✓ hochgeladen' : s.status === 'laeuft' ? 'wird gesendet …' : s.status === 'fehler' ? esc(s.fehler) : 'bereit';
        h += '<div class="wb-item wb-' + s.status + '" data-wb-neu="' + i + '">'
          + '<button class="wb-thumb" data-wb="vorschau-neu" data-i="' + i + '" aria-label="Vorschau ' + esc(s.file.name) + '"><img alt="" src="' + s.url + '"></button>'
          + '<div class="wb-info"><b>' + esc(s.file.name) + '</b><span>' + groesse(s.file.size) + '</span><span class="wb-st">' + st + '</span></div>'
          + (_lauf ? '' : '<button class="wb-x" data-wb="weg" data-i="' + i + '" aria-label="Entfernen">✕</button>') + '</div>';
      });
      h += '</div>';
      var frei = MAX_BILDER - _bilder.length;
      if (_staged.length > frei) {
        h += '<p class="wb-warn">Auf der Waage ist Platz für ' + MAX_BILDER + ' Bilder je Art – '
          + 'ohne „Alle ersetzen“ passen nur noch ' + Math.max(0, frei) + ' dazu.</p>';
      }
      h += '<div class="wb-aktionen"><button class="wb-btn wb-haupt" data-wb="hoch"' + (_lauf ? ' disabled' : '') + '>Hochladen</button>'
        + '<button class="wb-btn" data-wb="ersetzen"' + (_lauf ? ' disabled' : '') + '>Alle ersetzen</button>'
        + '<button class="wb-btn" data-wb="verwerfen"' + (_lauf ? ' disabled' : '') + '>Verwerfen</button></div>';
    }
    return h + '</div>';
  }

  function renderListe() {
    var h = '<div class="wb-card"><h3>Auf der Waage <span class="wb-zaehl" id="wb-zaehl">' + _bilder.length + ' / ' + MAX_BILDER + '</span></h3>';
    if (_laden) return h + '<p class="wb-klein">Laden …</p></div>';
    if (_fehler) return h + '<p class="wb-fehler" role="alert">' + esc(_fehler) + '</p></div>';
    if (_direkt) {
      h += '<p class="wb-warn" role="alert">Achtung: Direkt im Ordner „' + (_art === 'dauer' ? 'permanent' : 'fullscreen')
        + '“ liegen ' + _direkt + ' Bild(er). Die Waage spielt diese zuerst; die Bilder hier („default“) laufen nur, '
        + 'wenn dort nichts liegt.</p>';
    }
    if (!_bilder.length) return h + '<p class="wb-klein">Noch keine Bilder in diesem Verzeichnis.</p></div>';
    h += '<div class="wb-raster">';
    _bilder.forEach(function (b, i) {
      var k = key(_art, b);
      h += '<div class="wb-item" data-wb-bild="' + esc(b.name) + '">'
        + '<span class="wb-pos">' + (i + 1) + '</span>'
        + '<button class="wb-thumb" data-key="' + esc(k) + '" data-wb="vorschau" data-i="' + i + '" aria-label="Vorschau ' + esc(b.name) + '">'
        + (_blobs[k] ? '<img alt="" src="' + _blobs[k] + '">' : '') + '</button>'
        + '<div class="wb-info"><b>' + esc(b.name) + '</b><span>' + groesse(b.groesse) + '</span></div>'
        + '<button class="wb-btn wb-del" data-wb="loeschen" data-name="' + esc(b.name) + '" aria-label="' + esc(b.name) + ' löschen">Löschen</button></div>';
    });
    return h + '</div></div>';
  }

  function render() {
    var el = host();
    if (!el) return;
    var art = ARTEN.filter(function (a) { return a.id === _art; })[0];
    var h = '<div class="wb-kopf"><h2>Werbebilder der Waage</h2><span class="wb-stat ' + (_verbunden ? 'ok' : 'fehl') + '" id="wb-stat">'
      + (_verbunden ? '● Waage verbunden' : _laden ? '… verbinde' : '○ nicht verbunden') + '</span>'
      + '<span class="wb-sp"></span><button class="wb-btn" data-wb="neu">Aktualisieren</button>'
      + '<button class="wb-btn" data-wb="einst">Adresse</button></div>';
    if (_einst || !basis()) {
      el.innerHTML = h + renderEinstellung();
      return;
    }
    h += '<div class="wb-art" role="tablist">';
    ARTEN.forEach(function (a) {
      h += '<button class="wb-btn' + (a.id === _art ? ' on' : '') + '" role="tab" aria-selected="' + (a.id === _art) + '" data-wb="art" data-art="' + a.id + '"'
        + (_lauf ? ' disabled' : '') + '>' + a.text + '</button>';
    });
    h += '</div><p class="wb-klein">' + esc(art.hinweis) + ' Die Reihenfolge folgt dem Dateinamen.</p>';
    h += '<label class="wb-drop" id="wb-drop"><input type="file" id="wb-datei" multiple accept="image/jpeg,image/gif,.jpg,.jpeg,.gif">'
      + '<b>Bilder hier ablegen oder tippen</b><span>JPEG oder GIF, höchstens 8 MB je Bild</span></label>';
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
    if (a === 'art') { if (_lauf) return; _art = t.getAttribute('data-art'); _bilder = []; laden(); }
    else if (a === 'neu') laden();
    else if (a === 'einst') { _einst = !_einst; render(); }
    else if (a === 'url-test') verbindungTesten();
    else if (a === 'url-speichern') {
      var r = adresseLesen();
      if (!r.url) return;
      try { localStorage.setItem(KEY, r.url); } catch (x) { /* gesperrt */ }
      _einst = false;
      laden();
    }
    else if (a === 'hoch') hochladen(false);
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
    el.addEventListener('click', klick);
    el.addEventListener('change', function (e) {
      if (e.target && e.target.id === 'wb-datei') { dateienAufnehmen(e.target.files); e.target.value = ''; }
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
      if (!basis() || _einst || _lauf) return;
      dateienAufnehmen(e.dataTransfer && e.dataTransfer.files);
    });
  }

  function onShow() {
    stil();
    verdrahten();
    if (!basis()) { render(); return; }
    laden();
  }

  // ── Stil (Namensraum wb-, theme-faehig ueber --c-*) ──
  function stil() {
    if (document.getElementById('wb-style')) return;
    var s = document.createElement('style');
    s.id = 'wb-style';
    s.textContent = [
      '#wb-root{--wp:var(--c-pri,#1e463a);--wb:var(--c-border,#e6e4de);--ws:var(--c-surf,#fff);--wm:var(--c-sec,#6b7280);--wt:var(--c-text,#1f2521);color:var(--wt)}',
      '#wb-root button,#wb-root input{font-family:inherit}',
      '.wb-kopf{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}.wb-kopf h2{margin:0;font-size:18px;font-weight:600}.wb-sp{flex:1}',
      '.wb-stat{font-size:13px;font-weight:600}.wb-stat.ok{color:#15803d}.wb-stat.fehl{color:var(--wm)}',
      '.wb-btn{min-height:44px;padding:8px 16px;border:1.5px solid var(--wb);background:var(--ws);color:var(--wt);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer}',
      '.wb-btn.on,.wb-btn.wb-haupt{background:var(--wp);border-color:var(--wp);color:#fff}.wb-btn.wb-gefahr{background:#b91c1c;border-color:#b91c1c;color:#fff}.wb-btn[disabled]{opacity:.5;cursor:default}',
      '.wb-art{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}',
      '.wb-klein{font-size:13px;color:var(--wm);margin:4px 0 10px}.wb-klein code{background:rgba(0,0,0,.06);padding:1px 5px;border-radius:5px}',
      '.wb-card{background:var(--ws);border:1px solid var(--wb);border-radius:14px;padding:14px 16px;margin-top:12px}.wb-card h3{margin:0 0 10px;font-size:15px;font-weight:600}',
      '.wb-zaehl{font-weight:400;color:var(--wm);font-size:13px;margin-left:6px}',
      '.wb-drop{display:flex;flex-direction:column;align-items:center;gap:4px;padding:26px 16px;border:2px dashed var(--wp);border-radius:14px;background:var(--c-pri-l,#f0f4f1);cursor:pointer;text-align:center;min-height:44px}',
      '.wb-drop.over{background:#dcfce7}.wb-drop input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.wb-drop b{color:var(--wp);font-size:15px}.wb-drop span{font-size:12px;color:var(--wm)}',
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
      '.wb-zeile{display:flex;gap:8px;flex-wrap:wrap}.wb-zeile input,.wb-zeile select{min-width:0;min-height:44px;padding:8px 12px;border:1.5px solid var(--wb);border-radius:12px;font-size:15px;background:var(--ws);color:var(--wt)}',
      '.wb-adr label{display:flex;flex-direction:column;gap:4px;font-size:13px;color:var(--wm)}.wb-adr .wb-l-host{flex:1 1 200px}.wb-adr .wb-l-port{flex:0 0 110px}.wb-adr input,.wb-adr select{width:100%}',
      '.wb-overlay{position:fixed;inset:0;z-index:100000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55)}',
      '.wb-dlg{background:#fff;color:#1f2521;border-radius:16px;padding:20px 22px;max-width:440px;width:100%;box-shadow:0 20px 48px rgba(0,0,0,.3)}.wb-dlg h3{margin:0 0 8px;font-size:18px}.wb-dlg p{margin:0 0 16px;line-height:1.5}.wb-dlg-foot{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}',
      '.wb-lb{background:rgba(0,0,0,.88);flex-direction:column;gap:10px}.wb-lb-bild{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;color:#fff}.wb-lb-bild img{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px}',
      '.wb-lb-name{color:#fff;font-size:14px;text-align:center}',
      '.wb-lb-x{position:absolute;top:12px;right:12px;width:48px;height:48px;border:none;border-radius:24px;background:rgba(255,255,255,.18);color:#fff;font-size:22px;cursor:pointer;z-index:2}',
      '.wb-lb-pf{position:absolute;top:50%;transform:translateY(-50%);width:48px;height:64px;border:none;border-radius:12px;background:rgba(255,255,255,.18);color:#fff;font-size:34px;cursor:pointer;z-index:2}.wb-lb-zur{left:10px}.wb-lb-vor{right:10px}',
      '@media(max-width:560px){.wb-raster{grid-template-columns:1fr}.wb-lb-pf{width:40px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  return { onShow: onShow, reload: laden };
})();

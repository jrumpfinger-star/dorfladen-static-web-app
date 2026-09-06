/* Kiosk – Tab "Bäcker": Bestellung bei der Bäckerei Freundl.
   Selbststaendiges Modul (window.KBaecker), unabhaengig vom grossen K-Modul.
   Nutzt /api/baecker-order und /api/baecker-artikel.

   Kernidee: Beim Oeffnen ist alles mit den Mengen des letzten gleichen
   Wochentags vorbelegt – in der Regel muss nur die Semmelzahl angepasst werden.
   Sortiert wird durchgehend nach Artikelnummer, weil die Nummer beim Baecker
   die Warengruppe bestimmt. */
(function () {
  var API = '/api';
  var _b = null;          // aktuelle Bestellung
  var _uebersicht = null; // Tagesleiste + Erinnerung
  var _artikel = [];      // Katalog
  var _datum = '';        // gewaehlter Liefertag
  var _alleArtikel = false;
  var _korrektur = false;
  var _dirty = {};        // key -> true, wenn gegenueber Vorbelegung geaendert
  var _sub = 'bestellung';
  var _blinkTimer = null;

  function esc(s) {
    return (s == null ? '' : String(s))
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function luc(name, size) {
    size = size || 16;
    return '<i data-lucide="' + name + '" style="width:' + size + 'px;height:' + size + 'px"></i>';
  }
  function icons() { if (window.lucide) lucide.createIcons(); }
  var _toastTimer = null;
  function toast(msg) {
    // Das vorhandene Kiosk-Toast nutzen, damit Meldungen ueberall gleich aussehen
    var el = document.getElementById('k-toast');
    if (el) {
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(_toastTimer);
      _toastTimer = setTimeout(function () { el.classList.remove('show'); }, 3500);
      return;
    }
    var t = document.createElement('div');
    t.className = 'k-toast show';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }
  function posKey(p) {
    return String(p.nummer || '').trim() || String(p.name || '').trim().toLowerCase();
  }
  function host() { return document.getElementById('baecker-body'); }

  // ── Warengruppe anhand der Artikelnummer (reine Lesehilfe) ──
  function gruppeVon(nummer) {
    var gr = (_b && _b.gruppen) || [
      { bis: 119, titel: 'Semmeln & Kleingebäck' },
      { bis: 301, titel: 'Brote & Baguettes' },
      { bis: null, titel: 'Süßes & Sonstiges' }
    ];
    var s = String(nummer || '').trim();
    if (!/^\d+$/.test(s)) return gr[gr.length - 1].titel;
    var n = parseInt(s, 10);
    for (var i = 0; i < gr.length; i++) {
      if (gr[i].bis == null || n <= gr[i].bis) return gr[i].titel;
    }
    return '';
  }

  // ══════════════════════════════════════════════════
  //  Laden
  // ══════════════════════════════════════════════════

  function onShow() {
    // Katalog gleich mitladen – die Zusatzartikel-Suche braucht ihn sofort
    if (!_artikel.length) {
      fetch(API + '/baecker-artikel').then(function (r) { return r.json(); })
        .then(function (res) { _artikel = (res && res.artikel) || []; })
        .catch(function () { /* Suche faellt auf freies Eintragen zurueck */ });
    }
    if (!_datum) return ladeUebersicht(true);
    render();
  }

  function ladeUebersicht(danachLaden) {
    return fetch(API + '/baecker-order?mode=uebersicht')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.success) throw new Error('load');
        _uebersicht = res;
        badge();
        if (danachLaden) {
          _datum = res.naechster;
          return ladeBestellung(_datum);
        }
      })
      .catch(function () {
        var h = host();
        if (h) h.innerHTML = '<div class="k-empty">Die Bestellungen konnten nicht geladen werden.</div>';
      });
  }

  function ladeBestellung(datum) {
    var h = host();
    if (h) {
      h.innerHTML = '<div class="k-empty"><div class="k-empty-icon">'
        + '<i data-lucide="loader" style="width:24px;height:24px;animation:kSpin 1s linear infinite"></i>'
        + '</div>Laden…</div>';
      icons();
    }
    return fetch(API + '/baecker-order?datum=' + encodeURIComponent(datum))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res || !res.success) throw new Error('load');
        _b = res.bestellung;
        _datum = _b.datum;
        _korrektur = false;
        _dirty = {};
        render();
      })
      .catch(function () {
        if (h) h.innerHTML = '<div class="k-empty">Die Bestellung konnte nicht geladen werden.</div>';
      });
  }

  function ladeArtikel() {
    return fetch(API + '/baecker-artikel')
      .then(function (r) { return r.json(); })
      .then(function (res) {
        _artikel = (res && res.artikel) || [];
        render();
      })
      .catch(function () { toast('Die Artikelliste konnte nicht geladen werden.'); });
  }

  // ── Zaehler und Blinken am Reiter (Spec F9) ──
  function badge() {
    var wrap = document.getElementById('badges-baecker');
    var tab = document.querySelector('.k-tab[data-tab="baecker"]');
    var e = (_uebersicht && _uebersicht.erinnerung) || {};
    if (wrap) {
      wrap.innerHTML = e.offen
        ? '<span class="k-tab-badge show ' + (e.blinkt ? 'badge-msg blink' : 'badge-bk')
          + '" title="Bestellung für ' + esc(e.wochentag) + ' noch offen">1</span>'
        : '';
    }
    if (tab) tab.classList.toggle('bk-blink', !!e.blinkt);
  }

  // ══════════════════════════════════════════════════
  //  Darstellung
  // ══════════════════════════════════════════════════

  function render() {
    var h = host();
    if (!h) return;
    var html = subTabs();
    if (_sub === 'artikel') html += renderArtikel();
    else if (_sub === 'verlauf') html += renderVerlauf();
    else html += renderBestellung();
    h.innerHTML = html;
    icons();
  }

  function subTabs() {
    function b(id, label, ic, cnt) {
      return '<button class="k-filter-btn' + (_sub === id ? ' active' : '')
        + '" onclick="KBaecker.sub(\'' + id + '\')">' + luc(ic, 14) + ' '
        + '<span class="k-filter-label">' + label + '</span>'
        + (cnt != null ? ' <span class="k-filter-count">' + cnt + '</span>' : '')
        + '</button>';
    }
    return '<div class="k-filter-bar bk-sub">'
      + b('bestellung', 'Bestellung', 'croissant')
      + b('verlauf', 'Verlauf', 'history')
      + b('artikel', 'Artikel', 'list', _artikel.length || null)
      + '</div>';
  }

  function tagesleiste() {
    if (!_uebersicht || !_uebersicht.tage) return '';
    var h = '<div class="bk-days">';
    _uebersicht.tage.forEach(function (t) {
      var cls = 'bk-day';
      if (!t.bestelltag) cls += ' off';
      else if (t.datum === _datum) cls += ' active';
      else if (t.status === 'gesendet' || t.status === 'korrigiert') cls += ' sent';
      var d = t.datum.split('-');
      var label = t.wochentag.slice(0, 2);
      var st = !t.bestelltag ? 'kein Tag'
        : t.status === 'gesendet' ? '✓ gesendet'
        : t.status === 'korrigiert' ? '✓ korrigiert' : 'offen';
      h += '<button class="' + cls + '"'
        + (t.bestelltag ? ' onclick="KBaecker.tag(\'' + t.datum + '\')"' : ' disabled')
        + '><span>' + esc(label) + '</span>'
        + '<span class="d">' + d[2] + '.' + d[1] + '.</span>'
        + '<span class="st">' + st + '</span></button>';
    });
    return h + '</div>';
  }

  function statusKarte() {
    var gesendet = _b.gesperrt && !_korrektur;
    var e = (_uebersicht && _uebersicht.erinnerung) || {};
    var ueberfaellig = e.blinkt && e.datum === _datum;
    var cls = 'bk-stat' + (gesendet ? ' done' : (ueberfaellig ? ' late' : ''));
    var letzte = (_b.protokoll && _b.protokoll[0]) || null;

    var h = '<div class="' + cls + '">';
    h += '<div class="ico">' + luc(gesendet ? 'check-circle' : (ueberfaellig ? 'alarm-clock' : 'croissant'), 22) + '</div>';
    h += '<div class="txt">';
    if (_korrektur) {
      h += '<div class="t1">Korrektur zur Bestellung vom ' + esc(_b.datum_de) + '</div>';
      h += '<div class="t2">Original gesendet' + (letzte ? ' · ' + esc(zeitKurz(letzte.zeit)) : '')
        + ' · Änderungen werden markiert</div>';
    } else if (gesendet) {
      h += '<div class="t1">Gesendet – ' + esc(_b.wochentag) + ', ' + esc(_b.datum_de) + '</div>';
      h += '<div class="t2">' + (letzte
        ? esc(zeitKurz(letzte.zeit)) + ' von ' + esc(letzte.wer) + ' · '
          + letzte.positionen + ' Positionen · ' + letzte.stueck + ' Stück'
        : 'Bereits gesendet') + '</div>';
    } else {
      h += '<div class="t1">Bestellung für ' + esc(_b.wochentag) + ', ' + esc(_b.datum_de) + '</div>';
      h += '<div class="t2">' + (ueberfaellig
        ? '<b>Bestellschluss war um ' + esc(e.bestellschluss) + ' Uhr</b> – bitte zeitnah senden'
        : 'Noch nicht gesendet')
        + (_b.vorlage_datum_de
          ? ' · vorbelegt mit den Werten vom letzten ' + esc(_b.wochentag) + ' (' + esc(_b.vorlage_datum_de) + ')'
          : ' · keine Vorlage vorhanden, alle Mengen starten bei 0') + '</div>';
    }
    h += '</div>';
    if (gesendet) {
      h += '<button class="bk-cta ghost" onclick="KBaecker.korrektur()">' + luc('pencil', 15) + ' Korrektur senden</button>';
    } else {
      h += '<button class="bk-cta" onclick="KBaecker.vorschau()">' + luc('mail', 15) + ' '
        + (_korrektur ? 'Korrektur senden' : 'An Bäckerei senden') + '</button>';
    }
    return h + '</div>';
  }

  function zeitKurz(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return ('0' + d.getDate()).slice(-2) + '.' + ('0' + (d.getMonth() + 1)).slice(-2) + '. '
      + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) + ' Uhr';
  }

  function sichtbar(p) {
    if (p.zusatz) return false;                 // eigener Abschnitt
    if (_alleArtikel) return true;
    if (p.aktiv === false) return (p.menge || 0) > 0 || (p.retoure || 0) > 0;
    if (p.nur_wochentag != null && _b) {
      var wd = new Date(_b.datum + 'T12:00:00').getDay();
      wd = (wd + 6) % 7;                        // Montag = 0
      if (String(p.nur_wochentag) !== String(wd)) return (p.menge || 0) > 0;
    }
    return true;
  }

  function renderBestellung() {
    if (!_b) return '<div class="k-empty">Laden…</div>';
    var gesperrt = _b.gesperrt && !_korrektur;
    var alle = _b.positionen || [];
    var liste = alle.filter(sichtbar);
    var zusatz = alle.filter(function (p) { return p.zusatz; });

    var h = tagesleiste();
    if (_b.testbetrieb) {
      h += '<div class="bk-test">' + luc('flask-conical', 14)
        + ' <b>Testbetrieb</b> – die Bestellung geht an ' + esc(_b.empfaenger) + ', nicht an die Bäckerei.</div>';
    }
    h += statusKarte();

    // Werkzeugleiste
    h += '<div class="bk-tools">';
    h += '<button class="bk-btn' + (!_alleArtikel ? ' on' : '') + '" onclick="KBaecker.umfang(false)">'
      + luc('croissant', 14) + ' Übliche Artikel</button>';
    h += '<button class="bk-btn' + (_alleArtikel ? ' on' : '') + '" onclick="KBaecker.umfang(true)">'
      + 'Alle Artikel <span class="c">' + alle.filter(function (p) { return !p.zusatz; }).length + '</span></button>';
    h += '<span class="sp"></span>';
    if (!gesperrt && _b.vorlage_datum_de) {
      h += '<button class="bk-btn" onclick="KBaecker.reset()">' + luc('rotate-ccw', 14)
        + ' Auf letzten ' + esc(_b.wochentag) + ' zurücksetzen</button>';
    }
    if (_korrektur) {
      h += '<button class="bk-btn" onclick="KBaecker.verwerfen()">Verwerfen</button>';
    }
    h += '</div>';

    h += '<div class="bk-sortnote">' + luc('arrow-down-up', 12)
      + ' Sortiert nach Artikelnummer – genau wie im Formular der Bäckerei</div>';

    // Artikel, nach Warengruppe gegliedert
    if (!liste.length) {
      h += '<div class="k-empty">Keine Artikel vorhanden.</div>';
    } else {
      var letzte = null;
      liste.forEach(function (p) {
        var g = gruppeVon(p.nummer);
        if (g !== letzte) {
          var n = liste.filter(function (x) { return gruppeVon(x.nummer) === g; }).length;
          h += '<div class="bk-grp">' + esc(g) + '<span class="n">' + n + ' Positionen</span></div>';
          letzte = g;
        }
        h += zeile(p, gesperrt);
      });
    }

    // Zusatzpositionen nur fuer diesen Tag
    if (zusatz.length) {
      h += '<div class="bk-grp extra">' + luc('plus', 13) + ' Nur für diesen Tag'
        + '<span class="n">' + zusatz.length + ' Positionen</span></div>';
      zusatz.forEach(function (p) { h += zeile(p, gesperrt); });
    }
    if (!gesperrt) {
      h += '<button class="bk-addrow" onclick="KBaecker.zusatzDialog()">'
        + luc('plus', 15) + ' Weiteren Artikel für diesen Tag hinzufügen</button>';
    }

    // Fusszeile
    var pos = 0, stk = 0;
    alle.forEach(function (p) {
      if ((p.menge || 0) > 0 || (p.retoure || 0) > 0) { pos++; stk += (p.menge || 0); }
    });
    var geaendert = Object.keys(_dirty).length;
    h += '<div class="bk-foot"><div class="sum">'
      + (gesperrt ? 'Gesendet: ' : 'Bestellung: ')
      + '<b>' + pos + ' Positionen</b> · <b>' + stk + ' Stück</b>'
      + (geaendert ? ' · ' + geaendert + ' Änderung' + (geaendert === 1 ? '' : 'en') : '')
      + '</div><span class="sp"></span>';
    if (!gesperrt) {
      h += '<button class="bk-btn" onclick="KBaecker.speichern()">Entwurf speichern</button>';
      h += '<button class="bk-send" onclick="KBaecker.vorschau()">' + luc('mail', 16) + ' '
        + (_korrektur ? 'Korrektur senden' : 'An Bäckerei senden') + '</button>';
    }
    h += '</div>';
    return h;
  }

  function zeile(p, gesperrt) {
    var key = posKey(p);
    var hat = (p.menge || 0) > 0;
    var geaendert = !!_dirty[key];
    var cls = 'bk-row' + (hat ? ' has' : '') + (geaendert ? ' changed' : '')
      + (p.zusatz ? ' extra' : '') + (gesperrt ? ' locked' : '');
    var h = '<div class="' + cls + '" data-key="' + esc(key) + '">';
    h += '<div class="nr">' + esc(p.nummer || '—') + '</div>';
    h += '<div class="nm">' + esc(p.name);
    if (geaendert && p.vorbelegt !== p.menge) {
      h += ' <span class="tag diff">' + (p.vorbelegt || 0) + ' → ' + (p.menge || 0) + '</span>';
    }
    if (p.zusatz) h += ' <span class="tag ex">nur heute</span>';
    if (p.aktiv === false && !p.zusatz) h += ' <span class="tag off">ausgeblendet</span>';
    h += '</div>';

    // Vergleichswerte der letzten gleichen Wochentage
    h += '<div class="hist">';
    var v = p.verlauf || [];
    if (v.length) {
      h += '<span class="lbl">' + esc((_b.wochentag || '').slice(0, 2)) + ':</span>';
      for (var i = 0; i < 3; i++) {
        h += '<span class="v' + (i === 0 ? ' last' : '') + '">' + (v[i] != null ? v[i] : '–') + '</span>';
      }
    }
    h += '</div>';

    // +/− bewusst ohne Tab-Stopp: So springt Tab von Mengenfeld zu Mengenfeld,
    // statt an jedem Knopf hängen zu bleiben.
    h += '<div class="step">';
    h += '<button type="button" tabindex="-1" onclick="KBaecker.plus(\'' + esc(key) + '\',-1)"' + (gesperrt ? ' disabled' : '') + '>−</button>';
    h += '<input type="number" inputmode="numeric" min="0" value="' + (p.menge || 0) + '"'
      + ' data-feld="menge" data-key="' + esc(key) + '"'
      + (gesperrt ? ' readonly' : '')
      + ' onfocus="this.select()"'
      + ' oninput="KBaecker.setz(\'' + esc(key) + '\',this.value)"'
      + ' onchange="KBaecker.normiere(this,\'' + esc(key) + '\')"'
      + ' onkeydown="KBaecker.taste(event,\'' + esc(key) + '\')">';
    h += '<button type="button" tabindex="-1" onclick="KBaecker.plus(\'' + esc(key) + '\',1)"' + (gesperrt ? ' disabled' : '') + '>+</button>';
    h += '</div>';

    h += '<div class="ret"><span class="rl">Ret.</span>'
      + '<input type="number" inputmode="numeric" min="0" placeholder="–" value="'
      + ((p.retoure || 0) ? p.retoure : '') + '"'
      + ' data-feld="retoure" data-key="' + esc(key) + '"'
      + (gesperrt ? ' readonly' : '')
      + ' onfocus="this.select()"'
      + ' oninput="KBaecker.setzRet(\'' + esc(key) + '\',this.value)"'
      + ' onchange="KBaecker.normiereRet(this,\'' + esc(key) + '\')"></div>';

    if (p.zusatz && !gesperrt) {
      h += '<button class="bk-del" type="button" tabindex="-1" title="Position entfernen" onclick="KBaecker.zusatzWeg(\'' + esc(key) + '\')">✕</button>';
    }
    return h + '</div>';
  }

  // ══════════════════════════════════════════════════
  //  Bedienung
  // ══════════════════════════════════════════════════

  function finde(key) {
    return (_b.positionen || []).find(function (p) { return posKey(p) === key; });
  }

  function markiere(p) {
    var key = posKey(p);
    if ((p.menge || 0) !== (p.vorbelegt || 0)) _dirty[key] = true;
    else delete _dirty[key];
  }

  /* Zeile und Fusszeile gezielt auffrischen statt alles neu zu bauen –
     ein vollstaendiges Render wuerde den Fokus aus dem Eingabefeld werfen
     und damit das Durchtabben unmoeglich machen. */
  function frischeZeile(key) {
    var p = finde(key);
    var el = document.querySelector('#panel-baecker .bk-row[data-key="' + key.replace(/"/g, '\\"') + '"]');
    if (!p || !el) { render(); return; }
    var hat = (p.menge || 0) > 0;
    el.classList.toggle('has', hat);
    el.classList.toggle('changed', !!_dirty[key]);
    var feld = el.querySelector('.step input');
    if (feld && document.activeElement !== feld) feld.value = p.menge || 0;
    // Markierung "48 → 52" mitziehen
    var nm = el.querySelector('.nm');
    if (nm) {
      var alt = nm.querySelector('.tag.diff');
      if (_dirty[key] && (p.vorbelegt || 0) !== (p.menge || 0)) {
        if (!alt) {
          alt = document.createElement('span');
          alt.className = 'tag diff';
          nm.appendChild(alt);
        }
        alt.textContent = (p.vorbelegt || 0) + ' → ' + (p.menge || 0);
      } else if (alt) {
        alt.remove();
      }
    }
    frischeFuss();
  }

  function frischeFuss() {
    var el = document.querySelector('#panel-baecker .bk-foot .sum');
    if (!el) return;
    var pos = 0, stk = 0;
    (_b.positionen || []).forEach(function (p) {
      if ((p.menge || 0) > 0 || (p.retoure || 0) > 0) { pos++; stk += (p.menge || 0); }
    });
    var ge = Object.keys(_dirty).length;
    el.innerHTML = ((_b.gesperrt && !_korrektur) ? 'Gesendet: ' : 'Bestellung: ')
      + '<b>' + pos + ' Positionen</b> · <b>' + stk + ' Stück</b>'
      + (ge ? ' · ' + ge + ' Änderung' + (ge === 1 ? '' : 'en') : '');
  }

  function plus(key, delta) {
    var p = finde(key);
    if (!p || (_b.gesperrt && !_korrektur)) return;
    p.menge = Math.max(0, (parseInt(p.menge, 10) || 0) + delta);
    markiere(p);
    var feld = document.querySelector('#panel-baecker .bk-row[data-key="' + key.replace(/"/g, '\\"') + '"] .step input');
    if (feld) feld.value = p.menge;
    frischeZeile(key);
  }

  function setz(key, wert) {
    var p = finde(key);
    if (!p || (_b.gesperrt && !_korrektur)) return;
    var n = parseInt(wert, 10);
    p.menge = (isNaN(n) || n < 0) ? 0 : n;
    markiere(p);
    frischeZeile(key);
  }

  function setzRet(key, wert) {
    var p = finde(key);
    if (!p || (_b.gesperrt && !_korrektur)) return;
    var n = parseInt(wert, 10);
    p.retoure = (isNaN(n) || n < 0) ? 0 : n;
    frischeFuss();
  }

  /* Beim Verlassen des Feldes den angezeigten Wert bereinigen. Waehrend des
     Tippens wird bewusst nicht eingegriffen, damit der Cursor stehen bleibt. */
  function normiere(el, key) {
    setz(key, el.value);
    var p = finde(key);
    if (p) el.value = p.menge || 0;
  }

  function normiereRet(el, key) {
    setzRet(key, el.value);
    var p = finde(key);
    if (p) el.value = (p.retoure || 0) ? p.retoure : '';
  }

  /* Enter springt ins naechste Mengenfeld – so lassen sich alle Mengen
     nacheinander eingeben, ohne die Hand von der Tastatur zu nehmen. */
  function taste(ev, key) {
    if (ev.key !== 'Enter') return;
    ev.preventDefault();
    var felder = Array.prototype.slice.call(
      document.querySelectorAll('#panel-baecker .bk-row .step input:not([readonly])'));
    var i = felder.findIndex(function (f) { return f.dataset.key === key; });
    var next = felder[i + 1];
    if (next) { next.focus(); next.select(); }
    else if (felder.length) { felder[0].focus(); felder[0].select(); }
  }

  function reset() {
    (_b.positionen || []).forEach(function (p) {
      if (!p.zusatz) p.menge = p.vorbelegt || 0;
    });
    _dirty = {};
    render();
    toast('Auf die Werte vom letzten ' + _b.wochentag + ' zurückgesetzt.');
  }

  function umfang(alle) { _alleArtikel = !!alle; render(); }
  function sub(id) {
    _sub = id;
    if (id === 'artikel' && !_artikel.length) return ladeArtikel();
    if (id === 'verlauf') return ladeVerlauf();
    render();
  }
  function tag(datum) { ladeBestellung(datum); }

  function korrektur() {
    _korrektur = true;
    _dirty = {};
    (_b.positionen || []).forEach(function (p) { p.vorbelegt = p.menge || 0; });
    render();
  }

  function verwerfen() {
    _korrektur = false;
    ladeBestellung(_datum);
  }

  function nutzbarePositionen() {
    return (_b.positionen || [])
      .filter(function (p) { return (p.menge || 0) > 0 || (p.retoure || 0) > 0; })
      .map(function (p) {
        return {
          nummer: p.nummer || '', name: p.name || '',
          menge: p.menge || 0, retoure: p.retoure || 0,
          zusatz: !!p.zusatz
        };
      });
  }

  function speichern() {
    return fetch(API + '/baecker-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datum: _datum, aktion: 'speichern',
        positionen: nutzbarePositionen(),
        vorlage_datum: _b.vorlage_datum || '',
        korrekturmodus: _korrektur
      })
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        toast(res && res.success ? 'Entwurf gespeichert.'
          : (res && res.error) || 'Der Entwurf konnte nicht gespeichert werden.');
      })
      .catch(function () { toast('Keine Verbindung – der Entwurf wurde nicht gespeichert.'); });
  }

  // ── Vorschau vor dem Versand (Spec F7) ──
  function vorschau() {
    var pos = nutzbarePositionen();
    if (!pos.length) {
      toast('Die Bestellung enthält noch keine Mengen.');
      return;
    }
    var stk = pos.reduce(function (s, p) { return s + p.menge; }, 0);
    var betreff = (_korrektur ? 'Korrektur Bestellung ' : 'Bestellung ') + _b.datum_de;

    var h = '<div class="bk-dlg-h">' + luc('mail', 17) + ' '
      + (_korrektur ? 'Korrektur' : 'Bestellung') + ' an die Bäckerei senden</div>';
    h += '<div class="bk-dlg-b">';
    if (_b.testbetrieb) {
      h += '<div class="bk-test">' + luc('flask-conical', 14) + ' <b>Testbetrieb</b> – die Mail geht an '
        + esc(_b.empfaenger) + ', nicht an die Bäckerei.</div>';
    }
    h += kv('Empfänger', _b.empfaenger);
    h += kv('Betreff', betreff);
    h += kv('Anhang', 'Freundl-Bestellformular.docx');
    h += kv('Liefertag', _b.wochentag + ', ' + _b.datum_de
      + ' · Kd.-Nr. ' + _b.kd_nr + ' / Tour-Nr. ' + _b.tour_nr);
    h += '<div class="bk-prev"><table><tr><th>Nr</th><th>Artikel</th><th class="q">Menge</th><th class="q">Ret.</th></tr>';
    pos.slice(0, 40).forEach(function (p) {
      h += '<tr><td>' + esc(p.nummer || '—') + '</td><td>' + esc(p.name)
        + '</td><td class="q">' + p.menge + '</td><td class="q">' + (p.retoure || '') + '</td></tr>';
    });
    if (pos.length > 40) h += '<tr><td colspan="4" class="more">… ' + (pos.length - 40) + ' weitere</td></tr>';
    h += '</table></div>';
    h += '<div class="bk-sum">' + pos.length + ' Positionen · ' + stk + ' Stück</div>';
    h += '</div>';
    h += '<div class="bk-dlg-f">'
      + '<button class="bk-btn" onclick="KBaecker.dlgZu()">Zurück</button>'
      + '<button class="bk-send" id="bk-send-btn" onclick="KBaecker.senden()">'
      + luc('send', 15) + ' Jetzt verbindlich senden</button></div>';
    dialog(h);
  }

  function kv(k, v) {
    return '<div class="bk-kv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
  }

  function senden() {
    var btn = document.getElementById('bk-send-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Wird gesendet…'; }
    fetch(API + '/baecker-order', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        datum: _datum, aktion: _korrektur ? 'korrektur' : 'senden',
        positionen: nutzbarePositionen(),
        wer: (window.K && K.currentUser) || 'Kiosk'
      })
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        dlgZu();
        if (res && res.success) {
          toast(res.meldung || 'Bestellung gesendet.');
          _korrektur = false;
          ladeUebersicht();
          ladeBestellung(_datum);
        } else {
          toast((res && res.error) || 'Die Bestellung konnte nicht versendet werden.');
        }
      })
      .catch(function () {
        dlgZu();
        toast('Keine Verbindung – die Bestellung wurde nicht versendet.');
      });
  }

  // ── Zusatzartikel nur fuer diesen Tag (Spec F4) ──
  function zusatzDialog() {
    var h = '<div class="bk-dlg-h">' + luc('plus', 17) + ' Weiteren Artikel hinzufügen</div>';
    h += '<div class="bk-dlg-b">';
    h += '<div class="bk-field"><label>Aus der Artikelliste</label>'
      + '<input id="bk-suche" placeholder="Artikel suchen…" oninput="KBaecker.suche(this.value)"></div>';
    h += '<div class="bk-pick" id="bk-pick"></div>';
    h += '<div class="bk-or">oder frei eintragen</div>';
    h += '<div class="bk-two">'
      + '<div class="bk-field"><label>Artikelnummer</label><input id="bk-neu-nr" placeholder="optional"></div>'
      + '<div class="bk-field"><label>Bezeichnung</label><input id="bk-neu-name" placeholder="z. B. Brezen für Fest"></div>'
      + '</div>';
    h += '<div class="bk-field" style="max-width:170px"><label>Menge</label>'
      + '<input id="bk-neu-menge" type="number" min="1" value="1"></div>';
    h += '<label class="bk-chk"><input type="checkbox" id="bk-neu-dauer">'
      + '<span><b>Dauerhaft in die Artikelliste übernehmen</b>'
      + '<div class="help">Ohne Haken gilt der Artikel nur für diesen Tag.</div></span></label>';
    h += '</div>';
    h += '<div class="bk-dlg-f"><button class="bk-btn" onclick="KBaecker.dlgZu()">Abbrechen</button>'
      + '<button class="bk-send" onclick="KBaecker.zusatzFrei()">Hinzufügen</button></div>';
    dialog(h);
    if (!_artikel.length) {
      // Katalog nachladen und eine bereits getippte Suche wiederholen
      fetch(API + '/baecker-artikel').then(function (r) { return r.json(); })
        .then(function (res) {
          _artikel = (res && res.artikel) || [];
          var feld = document.getElementById('bk-suche');
          if (feld) suche(feld.value);
        }).catch(function () { /* freies Eintragen bleibt moeglich */ });
    }
  }

  function suche(text) {
    var el = document.getElementById('bk-pick');
    if (!el) return;
    var t = (text || '').trim().toLowerCase();
    if (!t) { el.innerHTML = ''; return; }
    if (!_artikel.length) {
      el.innerHTML = '<div class="bk-pk muted">Artikelliste wird geladen…</div>';
      return;
    }
    var vorhanden = {};
    (_b.positionen || []).forEach(function (p) {
      // "bereits dabei" nur, wenn der Artikel tatsaechlich bestellt wird –
      // der Katalog steht ohnehin komplett in der Liste, nur eben mit Menge 0.
      if ((p.menge || 0) > 0 || (p.retoure || 0) > 0 || p.zusatz) vorhanden[posKey(p)] = true;
    });
    var treffer = _artikel.filter(function (a) {
      return (a.name || '').toLowerCase().indexOf(t) >= 0
        || String(a.nummer || '').indexOf(t) === 0;
    }).slice(0, 6);
    if (!treffer.length) {
      el.innerHTML = '<div class="bk-pk muted">Kein Treffer – bitte unten frei eintragen.</div>';
      return;
    }
    el.innerHTML = treffer.map(function (a) {
      var key = String(a.nummer || '').trim() || (a.name || '').toLowerCase();
      var drin = vorhanden[key];
      return '<div class="bk-pk"><div class="nr">' + esc(a.nummer || '—') + '</div>'
        + '<div class="nm">' + esc(a.name)
        + '<div class="sub">' + esc(a.gruppe || '') + (a.aktiv ? '' : ' · ausgeblendet') + '</div></div>'
        + (drin ? '<span class="drin">bereits dabei</span>'
          : '<button class="add" onclick="KBaecker.zusatzAus(\'' + esc(key) + '\')">Hinzufügen</button>')
        + '</div>';
    }).join('');
    icons();
  }

  function zusatzAus(key) {
    var a = _artikel.find(function (x) {
      return (String(x.nummer || '').trim() || (x.name || '').toLowerCase()) === key;
    });
    if (!a) return;
    var p = finde(key);
    if (p) { p.menge = Math.max(1, p.menge || 0); }
    else {
      _b.positionen.push({
        nummer: a.nummer || '', name: a.name, aktiv: true,
        menge: 1, retoure: 0, vorbelegt: 0, verlauf: [], zusatz: true
      });
    }
    dlgZu();
    render();
    toast('„' + a.name + '" hinzugefügt – gilt nur für diesen Tag.');
  }

  function zusatzFrei() {
    var name = (document.getElementById('bk-neu-name') || {}).value || '';
    var nr = (document.getElementById('bk-neu-nr') || {}).value || '';
    var menge = parseInt((document.getElementById('bk-neu-menge') || {}).value, 10) || 1;
    var dauerhaft = (document.getElementById('bk-neu-dauer') || {}).checked;
    name = name.trim();
    if (!name) { toast('Bitte eine Bezeichnung angeben.'); return; }

    _b.positionen.push({
      nummer: nr.trim(), name: name, aktiv: true,
      menge: menge, retoure: 0, vorbelegt: 0, verlauf: [], zusatz: !dauerhaft
    });
    dlgZu();
    render();

    if (dauerhaft) {
      fetch(API + '/baecker-artikel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nummer: nr.trim(), name: name, aktiv: true })
      }).then(function (r) { return r.json(); })
        .then(function (res) {
          if (res && res.success) { _artikel = []; toast('„' + name + '" in die Artikelliste übernommen.'); }
          else toast((res && res.error) || 'Der Artikel wurde nur für heute übernommen.');
        }).catch(function () { toast('Der Artikel wurde nur für heute übernommen.'); });
    } else {
      toast('„' + name + '" hinzugefügt – gilt nur für diesen Tag.');
    }
  }

  function zusatzWeg(key) {
    _b.positionen = (_b.positionen || []).filter(function (p) {
      return !(p.zusatz && posKey(p) === key);
    });
    render();
  }

  // ══════════════════════════════════════════════════
  //  Artikelverwaltung (Spec F5)
  // ══════════════════════════════════════════════════

  function renderArtikel() {
    if (!_artikel.length) return '<div class="k-empty">Laden…</div>';
    var aktive = _artikel.filter(function (a) { return a.aktiv; });
    var h = '<div class="bk-tools">';
    h += '<button class="bk-btn' + (!_alleArtikel ? ' on' : '') + '" onclick="KBaecker.umfang(false)">'
      + 'Aktiv <span class="c">' + aktive.length + '</span></button>';
    h += '<button class="bk-btn' + (_alleArtikel ? ' on' : '') + '" onclick="KBaecker.umfang(true)">'
      + 'Alle <span class="c">' + _artikel.length + '</span></button>';
    h += '<span class="sp"></span>';
    h += '<button class="bk-btn primary" onclick="KBaecker.neuDialog()">' + luc('plus', 14) + ' Neuer Artikel</button>';
    h += '</div>';
    h += '<div class="bk-sortnote">' + luc('arrow-down-up', 12)
      + ' Die Artikelnummer bestimmt die Position – in der Erfassung wie im Formular</div>';

    var liste = _alleArtikel ? _artikel : aktive;
    var letzte = null;
    liste.forEach(function (a) {
      var g = a.gruppe || gruppeVon(a.nummer);
      if (g !== letzte) {
        h += '<div class="bk-grp">' + esc(g) + '</div>';
        letzte = g;
      }
      var key = String(a.nummer || '').trim() || (a.name || '').toLowerCase();
      h += '<div class="bk-art' + (a.aktiv ? '' : ' off') + '">';
      h += '<div class="nr">' + esc(a.nummer || '—') + '</div>';
      h += '<div class="nm">' + esc(a.name);
      if (a.angelegt_am) h += '<div class="sub">am ' + esc(a.angelegt_am) + ' angelegt</div>';
      h += '</div>';
      h += '<div class="use">' + (a.bestellt_in
        ? a.bestellt_in + '× bestellt' : 'noch nie bestellt') + '</div>';
      h += '<button class="bk-sw' + (a.aktiv ? '' : ' off') + '" title="'
        + (a.aktiv ? 'Ausblenden' : 'Einblenden') + '" onclick="KBaecker.aktiv(\''
        + esc(key) + '\',' + (a.aktiv ? 'false' : 'true') + ')"></button>';
      h += '</div>';
    });
    h += '<div class="bk-note">Artikel werden nie gelöscht, sondern nur ausgeblendet – '
      + 'sonst wären alte Bestellungen im Verlauf unvollständig.</div>';
    return h;
  }

  function aktiv(key, wert) {
    fetch(API + '/baecker-artikel', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key, name_key: key, aktiv: wert })
    }).then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.success) { _artikel = []; ladeArtikel(); }
        else toast((res && res.error) || 'Die Änderung konnte nicht gespeichert werden.');
      }).catch(function () { toast('Keine Verbindung – nichts geändert.'); });
  }

  function neuDialog(vorbelegt) {
    var v = vorbelegt || {};
    var h = '<div class="bk-dlg-h">' + luc('plus', 17) + ' Neuer Artikel</div><div class="bk-dlg-b">';
    h += '<div class="bk-two">'
      + '<div class="bk-field"><label>Artikelnummer</label><input id="bk-a-nr" value="' + esc(v.nummer || '') + '" placeholder="z. B. 852">'
      + '<div class="help">Bestimmt die Position</div></div>'
      + '<div class="bk-field"><label>Bezeichnung</label><input id="bk-a-name" value="' + esc(v.name || '') + '" placeholder="wie auf dem Lieferschein"></div>'
      + '</div>';
    h += '<div class="bk-note">Die Position ergibt sich automatisch aus der Nummer – '
      + 'in der Erfassung wie im Formular.</div>';
    h += '<div id="bk-a-warn"></div></div>';
    h += '<div class="bk-dlg-f"><button class="bk-btn" onclick="KBaecker.dlgZu()">Abbrechen</button>'
      + '<button class="bk-send" onclick="KBaecker.neuSpeichern(false)">Anlegen</button></div>';
    dialog(h);
  }

  function neuSpeichern(bestaetigt) {
    var nr = ((document.getElementById('bk-a-nr') || {}).value || '').trim();
    var name = ((document.getElementById('bk-a-name') || {}).value || '').trim();
    if (!name) { toast('Bitte eine Bezeichnung angeben.'); return; }
    fetch(API + '/baecker-artikel', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nummer: nr, name: name, aktiv: true, bestaetigt: !!bestaetigt })
    }).then(function (r) { return r.json().then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (o) {
        if (o.j && o.j.success) {
          dlgZu(); _artikel = []; ladeArtikel();
          toast(o.j.meldung || 'Artikel angelegt.');
          return;
        }
        if (o.s === 409) {
          var w = document.getElementById('bk-a-warn');
          if (w) {
            w.innerHTML = '<div class="bk-warn">' + luc('alert-triangle', 15) + ' ' + esc(o.j.error)
              + '<div class="row"><button class="bk-btn" onclick="KBaecker.dlgZu()">Abbrechen</button>'
              + '<button class="bk-btn on" onclick="KBaecker.neuSpeichern(true)">Trotzdem anlegen</button></div></div>';
            icons();
          }
          return;
        }
        toast((o.j && o.j.error) || 'Der Artikel konnte nicht gespeichert werden.');
      }).catch(function () { toast('Keine Verbindung – der Artikel wurde nicht gespeichert.'); });
  }

  // ══════════════════════════════════════════════════
  //  Verlauf (Spec F10)
  // ══════════════════════════════════════════════════

  var _verlauf = null;

  function ladeVerlauf() {
    fetch(API + '/baecker-order?mode=verlauf')
      .then(function (r) { return r.json(); })
      .then(function (res) { _verlauf = (res && res.verlauf) || []; render(); })
      .catch(function () { toast('Der Verlauf konnte nicht geladen werden.'); });
  }

  function renderVerlauf() {
    if (!_verlauf) return '<div class="k-empty">Laden…</div>';
    if (!_verlauf.length) return '<div class="k-empty">Noch keine Bestellungen.</div>';
    var h = '';
    _verlauf.forEach(function (e) {
      var st = e.status === 2 ? 'korrigiert' : e.status === 1 ? 'gesendet' : 'nicht bestellt';
      var cls = e.status >= 1 ? 'ok' : 'off';
      var p = (e.protokoll && e.protokoll[0]) || null;
      h += '<div class="bk-hist ' + cls + '" onclick="KBaecker.tagAusVerlauf(\'' + e.datum + '\')">';
      h += '<div class="d"><b>' + esc(e.wochentag) + '</b><span>' + esc(e.datum_de) + '</span></div>';
      h += '<div class="m">' + e.positionen + ' Positionen · ' + e.stueck + ' Stück</div>';
      h += '<div class="s">' + st + (p ? '<span>' + esc(zeitKurz(p.zeit)) + ' · ' + esc(p.wer) + '</span>' : '') + '</div>';
      h += '</div>';
    });
    return h;
  }

  function tagAusVerlauf(datum) {
    _sub = 'bestellung';
    ladeBestellung(datum);
  }

  // ══════════════════════════════════════════════════
  //  Dialog
  // ══════════════════════════════════════════════════

  function dialog(inner) {
    dlgZu();
    var ov = document.createElement('div');
    ov.id = 'bk-overlay';
    ov.className = 'bk-overlay';
    ov.innerHTML = '<div class="bk-dlg">' + inner + '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) dlgZu(); });
    document.body.appendChild(ov);
    icons();
  }

  function dlgZu() {
    var ov = document.getElementById('bk-overlay');
    if (ov) ov.remove();
  }

  // ══════════════════════════════════════════════════

  function start() {
    ladeUebersicht();
    if (_blinkTimer) clearInterval(_blinkTimer);
    _blinkTimer = setInterval(function () { ladeUebersicht(); }, 120000);
  }

  window.KBaecker = {
    onShow: onShow, start: start, sub: sub, tag: tag,
    plus: plus, setz: setz, setzRet: setzRet, taste: taste,
    normiere: normiere, normiereRet: normiereRet,
    reset: reset, umfang: umfang,
    speichern: speichern, vorschau: vorschau, senden: senden,
    korrektur: korrektur, verwerfen: verwerfen,
    zusatzDialog: zusatzDialog, zusatzAus: zusatzAus, zusatzFrei: zusatzFrei,
    zusatzWeg: zusatzWeg, suche: suche,
    neuDialog: neuDialog, neuSpeichern: neuSpeichern, aktiv: aktiv,
    tagAusVerlauf: tagAusVerlauf, dlgZu: dlgZu
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();

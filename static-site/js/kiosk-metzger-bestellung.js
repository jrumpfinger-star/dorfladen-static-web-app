/* Metzger-Bestellung im Kiosk (Spec specs/metzger-bestellung/spec.md).
 *
 * Selbststaendiges Modul (window.KMetzgerBest), unabhaengig vom grossen
 * K-Modul. Nutzt /api/metzger-order und /api/metzger-artikel.
 *
 * Kern ist das Portionsmodell (F2): Eine Position traegt eine Liste von
 * Bloecken `anzahl x menge einheit [+ vakuum]` und einen Hinweis. Damit sind
 * alle Schreibweisen des Papierformulars abbildbar - von "1/2" bis
 * "2x500g | 6x250g".
 *
 * Nicht zu verwechseln mit dem Tab "Metzger": Der behandelt
 * Kundenvorbestellungen, dieser hier die Ladenbestellung beim Metzger.
 */
window.KMetzgerBest = (function () {
  'use strict';

  var API = '/api';

  // ── Zustand ──
  var _b = null;          // aktuelle Bestellung
  var _artikel = [];      // Katalog in Formularreihenfolge
  var _vorschlaege = {};  // Artikelnummer -> Liste
  var _cfg = {};
  var _tage = [];
  var _datum = '';
  var _sub = 'bestellung';
  var _suche = '';
  // Vorgabe ist die kurze Liste: nur was der Metzger uns schon geliefert hat.
  // Von 84 Formularzeilen sind das 57 - der Rest steht nur auf dem Papier.
  var _alleArtikel = false;
  var _offen = null;      // Schluessel der Zeile mit offenem Editor
  var _entwurf = null;    // Block im Portionspad
  var _dirty = false;
  var _verlauf = [];
  var _testbetrieb = true;
  var _vorbelegtAus = null;
  var _letzte = null;      // Werte der zuletzt gesendeten Bestellung (F7)

  var MAX_VORSCHLAEGE = 5;

  // "klein/mittel/gross" sind Portionsgroessen wie kg oder Stueck - sie haben
  // mit dem Vakuumieren nichts zu tun (Spec Decision 10).
  var EINHEITEN = [['kg', 'kg'], ['g', 'g'], ['St', 'Stück'], ['cm', 'cm'],
                   ['groesse', 'Größe'], ['Schale', 'Schale'], ['Beutel', 'Beutel']];
  var GROESSEN = ['klein', 'mittel', 'groß'];
  var KACHELN = {
    kg: [[.25, '¼'], [.5, '½'], [.75, '¾'], [1, '1'], [1.5, '1½'], [2, '2'], [3, '3'], [5, '5']],
    g: [[100, '100'], [125, '125'], [200, '200'], [250, '250'], [500, '500'], [750, '750']],
    St: [[2, '2'], [3, '3'], [4, '4'], [6, '6'], [8, '8'], [10, '10'], [12, '12'], [30, '30']],
    cm: [[10, '10'], [20, '20'], [30, '30'], [50, '50'], [65, '65']],
    Schale: [[1, '1'], [2, '2'], [5, '5'], [10, '10'], [20, '20']],
    Beutel: [[1, '1'], [2, '2'], [5, '5'], [10, '10']],
    groesse: [['klein', 'klein'], ['mittel', 'mittel'], ['groß', 'groß']]
  };

  // ══════════════════════════════════════════════════
  //  Hilfen
  // ══════════════════════════════════════════════════

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function host() { return document.getElementById('metzgerbest-body'); }

  function toast(msg) {
    if (window.K && typeof K.toast === 'function') { K.toast(msg); return; }
    var d = document.createElement('div');
    d.className = 'mb-toast';
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 3200);
  }

  function authHeaders() {
    var h = { 'Content-Type': 'application/json' };
    try {
      var t = sessionStorage.getItem('cmsAuthToken') || localStorage.getItem('cmsAuthToken');
      if (t) h['X-CMS-Auth'] = t;
    } catch (e) { /* Speicher gesperrt - dann ohne Token */ }
    return h;
  }

  function fehlerText(daten, standard) {
    return (daten && daten.error) ? daten.error : standard;
  }

  function ist_groesse(e) { return GROESSEN.indexOf(e) >= 0; }
  function kacheln(e) { return KACHELN[ist_groesse(e) ? 'groesse' : e] || []; }
  function istEinheit(aktuell, knopf) {
    return knopf === 'groesse' ? ist_groesse(aktuell) : aktuell === knopf;
  }

  function posKey(p) {
    return p.nummer ? 'n' + p.nummer : 'x' + (p.name || '');
  }

  function zahl(n) {
    if (n === null || n === undefined) return '';
    if (n === .25) return '¼'; if (n === .5) return '½'; if (n === .75) return '¾';
    if (n === 1.5) return '1½';
    return String(n).replace('.', ',');
  }

  function blockText(b) {
    var kern = (b.menge === null || b.menge === undefined)
      ? b.einheit : zahl(b.menge) + ' ' + b.einheit;
    return b.anzahl + ' × ' + kern;
  }

  function posText(p) {
    var t = (p.portionen || []).map(function (b) {
      return blockText(b) + (b.vakuum ? ' (vakuumiert)' : '');
    }).join(', ');
    if (p.hinweis) t = t ? t + ' — ' + p.hinweis : p.hinweis;
    return t;
  }

  function bestellt(p) {
    return (p.portionen && p.portionen.length > 0) || !!p.hinweis;
  }

  function gleich(x, y) {
    return x.anzahl === y.anzahl && x.menge === y.menge
      && x.einheit === y.einheit && !!x.vakuum === !!y.vakuum;
  }

  function schluessel(bloecke) {
    return (bloecke || []).map(function (b) {
      return b.anzahl + 'x' + b.menge + b.einheit + (b.vakuum ? ':v' : '');
    }).join('|');
  }

  function gesperrt() { return _b && _b.status === 1; }

  // ══════════════════════════════════════════════════
  //  Parser der Papier-Schreibweise (F5)
  // ══════════════════════════════════════════════════

  var EINHEIT_ALIAS = {
    kg: 'kg', g: 'g', gr: 'g', gramm: 'g',
    st: 'St', stk: 'St', stck: 'St', 'stück': 'St', stueck: 'St',
    cm: 'cm', schale: 'Schale', schalen: 'Schale', beutel: 'Beutel'
  };
  var GROESSE_ALIAS = {
    klein: 'klein', kleine: 'klein', mittel: 'mittel',
    'groß': 'groß', 'große': 'groß', gross: 'groß'
  };

  function parse(text) {
    var bloecke = [], rest = [];
    // Trenner: was auf dem Zettel zwischen zwei Portionen stehen kann.
    // "/" nur mit Leerzeichen, sonst wuerde "1/2" zerrissen.
    String(text || '').split(/\s*(?:\+|\||\*|&|;|,|\bund\b|\s\/\s)\s*/i)
      .forEach(function (teil) {
        teil = (teil || '').trim();
        if (!teil) return;
        var b = block(teil, rest);
        if (b) bloecke.push(b);
      });
    return { bloecke: bloecke, hinweis: rest.join(' ').trim() };
  }

  function block(text, rest) {
    var s = text.trim(), anzahl = 1, vak = false, m;

    // Fuehrende Sternchen und Striche sind Notizzeichen, keine Menge.
    s = s.replace(/^[*\-–—.:•]+\s*/, '').trim();

    s = s.replace(/(^|\s)(v|vak|vakuum|✓)(\s|$)/i, function (_m, a, _b, c) {
      vak = true; return (a || '') + (c || ' ');
    }).trim();

    var mx = s.match(/^(\d+)\s*[x×]\s*/i);
    if (mx) { anzahl = parseInt(mx[1], 10) || 1; s = s.slice(mx[0].length).trim(); }

    var wort = GROESSE_ALIAS[s.toLowerCase()];
    if (wort) return fertig(anzahl, null, wort, vak);

    var menge = null, warBruch = false;
    m = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)/);
    if (m) { menge = +m[1] + (+m[2] / +m[3]); warBruch = true; s = s.slice(m[0].length).trim(); }
    if (menge === null) {
      m = s.match(/^(\d+)\s*\/\s*(\d+)/);
      if (m) { menge = +m[1] / +m[2]; warBruch = true; s = s.slice(m[0].length).trim(); }
    }
    if (menge === null) {
      m = s.match(/^(\d+(?:[.,]\d+)?)/);
      if (m) {
        menge = parseFloat(m[1].replace(',', '.'));
        warBruch = /[.,]/.test(m[1]);
        s = s.slice(m[0].length).trim();
      }
    }

    var einheit = null;
    m = s.match(/^([a-zäöüß]+)/i);
    if (m) {
      var e = EINHEIT_ALIAS[m[1].toLowerCase()];
      if (e) { einheit = e; s = s.slice(m[0].length).trim(); }
      else {
        var w = GROESSE_ALIAS[m[1].toLowerCase()];
        if (w) { einheit = w; menge = null; s = s.slice(m[0].length).trim(); }
      }
    }

    if (menge === null && einheit === null) {
      if (!mx) { if (text.trim()) rest.push(text.trim()); return null; }
      if (s) rest.push(s);
      return fertig(anzahl, 1, 'St', vak);
    }
    if (s) rest.push(s);                 // nichts wird verworfen
    if (!einheit) einheit = warBruch ? 'kg' : 'St';
    return fertig(anzahl, menge, einheit, vak);
  }

  function fertig(a, m, e, v) {
    return { anzahl: Math.max(1, a), menge: m, einheit: e, vakuum: !!v };
  }

  // ══════════════════════════════════════════════════
  //  Laden
  // ══════════════════════════════════════════════════

  function onShow() {
    if (!_b) ladeUebersicht();
    else render();
  }

  function ladeUebersicht(danach) {
    fetch(API + '/metzger-order')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _tage = d.tage || [];
        _cfg = d.config || {};
        _testbetrieb = !!d.testbetrieb;
        _datum = danach || d.aktiv;
        return ladeBestellung(_datum);
      })
      .catch(function () {
        host().innerHTML = '<div class="k-empty">Die Bestellung l\u00e4sst sich '
          + 'gerade nicht laden. Bitte sp\u00e4ter noch einmal versuchen.</div>';
      });
  }

  function ladeBestellung(datum) {
    return fetch(API + '/metzger-order/' + encodeURIComponent(datum))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _datum = datum;
        _b = d.bestellung;
        _artikel = d.artikel || [];
        _vorschlaege = d.vorschlaege || {};
        _cfg = d.config || _cfg;
        _testbetrieb = !!d.testbetrieb;
        _vorbelegtAus = d.vorbelegt_aus || null;
        _letzte = d.letzte || null;
        _dirty = false;
        _offen = null;
        _entwurf = null;
        render();
        badge();
      })
      .catch(function () {
        toast('Der Bestelltag l\u00e4sst sich gerade nicht laden.');
      });
  }

  function ladeVerlauf() {
    return fetch(API + '/metzger-order?mode=verlauf')
      .then(function (r) { return r.json(); })
      .then(function (d) { _verlauf = (d && d.verlauf) || []; render(); })
      .catch(function () { toast('Der Verlauf l\u00e4sst sich gerade nicht laden.'); });
  }

  // Erinnerung ab Bestellschluss (F13): Der Reiter blinkt, bis die Mail raus ist.
  // Im Testbetrieb bleibt er ruhig - eine Testbestellung soll niemanden aus dem
  // Laden holen. Der Testbetrieb endet, sobald der Empfänger die echte
  // Metzger-Adresse ist.
  function badge() {
    var el = document.getElementById('badges-metzgerbest');
    var tab = document.querySelector('.k-tab[data-tab="metzgerbest"]');
    if (!el) return;
    var faellig = false;
    if (!_testbetrieb) {
      var heute = new Date().toISOString().slice(0, 10);
      (_tage || []).forEach(function (t) {
        if (t.datum === heute && t.bestelltag && !t.status) faellig = true;
      });
      if (faellig) {
        var schluss = (_cfg.bestellschluss || '12:00').split(':');
        var jetzt = new Date();
        var nachSchluss = jetzt.getHours() > (+schluss[0] || 12)
          || (jetzt.getHours() === (+schluss[0] || 12) && jetzt.getMinutes() >= (+schluss[1] || 0));
        faellig = nachSchluss;
      }
    }
    el.innerHTML = faellig ? '<span class="k-badge st-new">!</span>' : '';
    if (tab) tab.classList.toggle('mb-blink', faellig);
  }

  // ══════════════════════════════════════════════════
  //  Darstellung
  // ══════════════════════════════════════════════════

  function render() {
    var el = host();
    if (!el) return;
    if (!_b) { el.innerHTML = '<div class="k-empty">Laden\u2026</div>'; return; }
    var h = '<div class="mb">' + subTabs();
    if (_sub === 'bestellung') h += tagesleiste() + statusKarte() + werkzeuge() + liste();
    else if (_sub === 'verlauf') h += verlaufAnsicht();
    else if (_sub === 'artikel') h += artikelAnsicht();
    else h += einstellungen();
    h += '</div>';
    el.innerHTML = h;
    if (_sub === 'bestellung') fuss();
  }

  function subTabs() {
    function b(id, label) {
      return '<button class="mb-sub' + (_sub === id ? ' on' : '') + '"'
        + ' onclick="KMetzgerBest.sub(\'' + id + '\')">' + label + '</button>';
    }
    return '<div class="mb-subs">' + b('bestellung', 'Bestellung')
      + b('verlauf', 'Verlauf') + b('artikel', 'Artikel')
      + b('einstellungen', 'Einstellungen') + '</div>';
  }

  function tagesleiste() {
    var h = '<div class="mb-days">';
    (_tage || []).forEach(function (t) {
      // Heute ist die Ware schon da - bestellt wird spätestens am Vortag.
      var waehlbar = t.bestellbar !== undefined ? t.bestellbar : t.bestelltag;
      var cls = 'mb-day';
      if (!waehlbar) cls += ' off';
      if (t.datum === _datum) cls += ' on';
      if (t.status === 1) cls += ' sent';
      if (t.status === 2) cls += ' korr';
      var d = t.datum.slice(8) + '.' + t.datum.slice(5, 7) + '.';
      var titel = waehlbar ? '' : (t.bestelltag
        ? ' title="Liefertag, aber zu spät — bestellt wird spätestens am Vortag"'
        : ' title="An diesem Tag liefert der Metzger nicht"');
      h += '<button class="' + cls + '"' + (waehlbar ? '' : ' disabled') + titel
        + ' onclick="KMetzgerBest.tag(\'' + t.datum + '\')">'
        + esc((t.wochentag || '').slice(0, 2))
        + '<span class="d2">' + d + '</span></button>';
    });
    return h + '</div>';
  }

  function statusKarte() {
    var s = _b.status || 0;
    var prot = (_b.protokoll || []);
    var letzte = prot.length ? prot[prot.length - 1] : null;
    var h = '<div class="mb-status' + (s ? ' gesendet' : '') + '">';
    if (s === 0) {
      h += '<b>Entwurf</b> f\u00fcr ' + esc(wochentagVon(_datum)) + ', den '
        + esc(datumDe(_datum));
      if (_vorbelegtAus) {
        h += ' <span class="mb-quelle">vorbelegt aus der Bestellung vom '
          + esc(datumDe(_vorbelegtAus)) + '</span>';
      } else {
        h += ' <span class="mb-quelle">keine fr\u00fchere Bestellung f\u00fcr '
          + 'diesen Wochentag \u2014 die Liste startet leer</span>';
      }
    } else {
      h += '<b>' + (s === 2 ? 'Korrigiert' : 'Gesendet') + '</b>';
      if (letzte) {
        h += ' am ' + esc(zeitKurz(letzte.zeit)) + ' an ' + esc(letzte.an || '')
          + ' durch ' + esc(letzte.wer || '');
      }
      h += ' <button class="mb-btn" onclick="KMetzgerBest.korrektur()">'
        + 'Korrektur senden</button>';
    }
    if (_testbetrieb) h += ' <span class="mb-test">Testbetrieb</span>';
    return h + '</div>';
  }

  function werkzeuge() {
    return '<div class="mb-bar">'
      + '<input type="search" id="mb-q" placeholder="Artikel oder Nummer suchen …"'
      + ' value="' + esc(_suche) + '" oninput="KMetzgerBest.such(this.value)">'
      + '<div class="mb-tgl">'
      + '<button class="' + (_alleArtikel ? '' : 'on') + '"'
      + ' title="Was der Metzger uns schon geliefert hat"'
      + ' onclick="KMetzgerBest.filter(false)">Übliche Artikel</button>'
      + '<button class="' + (_alleArtikel ? 'on' : '') + '"'
      + ' onclick="KMetzgerBest.filter(true)">Alle Artikel</button>'
      + '</div>'
      + '<button class="mb-btn" onclick="KMetzgerBest.zusatz()">Weiteren Artikel</button>'
      + '</div>' + sprungleiste();
  }

  function sprungleiste() {
    var gruppen = [];
    _artikel.forEach(function (a) {
      if (a.aktiv !== false && gruppen.indexOf(a.gruppe) < 0) gruppen.push(a.gruppe);
    });
    if (gruppen.length < 2) return '';
    return '<div class="mb-jump">' + gruppen.map(function (g, i) {
      return '<button onclick="KMetzgerBest.spring(' + i + ')">' + esc(g) + '</button>';
    }).join('') + '</div>';
  }

  function positionVon(a) {
    var key = a.nummer ? 'n' + a.nummer : 'x' + a.name;
    var treffer = null;
    (_b.positionen || []).forEach(function (p) {
      if (posKey(p) === key) treffer = p;
    });
    if (!treffer) {
      treffer = { nummer: a.nummer || null, name: a.name, portionen: [],
                  hinweis: '', zusatz: false };
      _b.positionen.push(treffer);
    }
    return treffer;
  }

  function sichtbar(a, p) {
    // Bereits Erfasstes bleibt immer sichtbar, auch wenn der Artikel sonst
    // nicht zu den ueblichen zaehlt - sonst verschwaende die eigene Eingabe.
    if (bestellt(p)) return _suche ? passtZurSuche(a) : true;
    if (!_alleArtikel && a.aktiv === false) return false;
    return passtZurSuche(a);
  }

  function passtZurSuche(a) {
    if (!_suche) return true;
    var s = _suche.toLowerCase();
    return (a.name || '').toLowerCase().indexOf(s) >= 0
      || String(a.nummer || '').indexOf(s) >= 0;
  }

  function liste() {
    var h = '<div class="mb-liste" id="mb-liste">';
    var gruppe = null, gi = -1, treffer = 0;
    _artikel.forEach(function (a) {
      var p = positionVon(a);
      if (!sichtbar(a, p)) return;
      if (a.gruppe !== gruppe) {
        gruppe = a.gruppe; gi++;
        h += '<div class="mb-grp" id="mb-g' + gi + '">' + esc(gruppe) + '</div>';
      }
      treffer++;
      h += zeile(a, p);
    });
    // Zusatzpositionen, die zu keinem Katalogartikel gehoeren (F8)
    var extra = (_b.positionen || []).filter(function (p) {
      return p.zusatz && !_artikel.some(function (a) {
        return (a.nummer && a.nummer === p.nummer) || a.name === p.name;
      });
    });
    if (extra.length) {
      h += '<div class="mb-grp">Nur f\u00fcr diesen Tag</div>';
      extra.forEach(function (p) {
        treffer++;
        h += zeile({ nummer: p.nummer, name: p.name, gruppe: '' }, p, true);
      });
    }
    if (!treffer) {
      h += '<div class="k-empty">Dazu findet sich kein Artikel. '
        + 'Andere Schreibweise probieren?</div>';
    }
    return h + '</div><div class="mb-foot" id="mb-foot"></div>';
  }

  function zeile(a, p, istExtra) {
    var key = posKey(p);
    var cls = 'mb-row';
    if (bestellt(p)) cls += ' has';
    if (p.zusatz) cls += ' extra';
    if (p.pruef) cls += ' pruef';
    if (_offen === key) cls += ' offen';
    var lock = gesperrt();

    var h = '<div class="' + cls + '" data-key="' + esc(key) + '">';
    h += '<div class="mb-nr' + (a.nummer ? '' : ' leer') + '">'
      + esc(a.nummer || '–') + '</div>';
    h += '<div class="mb-zeile"><div class="mb-nm">' + esc(a.name);
    if (p.zusatz) h += '<span class="mb-tag ex">nur heute</span>';
    if (p.pruef) h += '<span class="mb-tag pruef">bitte prüfen</span>';
    h += '</div><div class="mb-chips">';

    (p.portionen || []).forEach(function (b, i) {
      h += '<span class="mb-chip">'
        + '<button class="lab" title="Portion ändern"' + (lock ? ' disabled' : '')
        + ' onclick="KMetzgerBest.edit(\'' + esc(key) + '\',' + i + ')">'
        + esc(blockText(b))
        + (b.vakuum ? '<span class="vak">vak</span>' : '') + '</button>'
        + '<button class="x" title="Portion entfernen"' + (lock ? ' disabled' : '')
        + ' onclick="KMetzgerBest.weg(\'' + esc(key) + '\',' + i + ')">✕</button></span>';
    });
    if (p.hinweis) {
      h += '<span class="mb-chip hw">'
        + '<button class="lab" title="' + esc(p.hinweis) + ' — ändern"'
        + (lock ? ' disabled' : '')
        + ' onclick="KMetzgerBest.editHinweis(\'' + esc(key) + '\')">'
        + esc(p.hinweis) + '</button>'
        + '<button class="x" title="Hinweis entfernen"' + (lock ? ' disabled' : '')
        + ' onclick="KMetzgerBest.hinweisWeg(\'' + esc(key) + '\')">✕</button></span>';
    }
    if (!lock) {
      h += '<button class="mb-add" title="Portion hinzufügen"'
        + ' onclick="KMetzgerBest.edit(\'' + esc(key) + '\',-1)">+</button>';
    }
    // Anhalt beim Neuerfassen: Was zuletzt bestellt wurde, steht blass daneben,
    // solange die Zeile leer ist. Ein Tipp übernimmt es.
    var frueher = !lock && !bestellt(p) ? letzteWerte(a) : null;
    if (frueher) {
      h += '<button class="mb-frueher" title="' + esc(letzteQuelle())
        + ' — tippen übernimmt" onclick="KMetzgerBest.frueher(\'' + esc(key) + '\')">'
        + esc(frueher.map(blockText).join(' + ')) + '</button>';
    }
    if (istExtra && !lock) {
      h += '<button class="mb-add del" title="Position entfernen"'
        + ' onclick="KMetzgerBest.zusatzWeg(\'' + esc(key) + '\')">✕</button>';
    }
    h += '</div></div>';

    if (_offen === key && !lock) h += editor(key, p);
    return h + '</div>';
  }

  function editor(key, p) {
    var b = _entwurf;
    var h = '<div class="mb-ed"><div class="mb-edgrid">';

    var vs = vorschlaegeFuer(p);
    if (vs.length) {
      h += '<div class="mb-g vor"><div class="mb-lbl">Häufig bei „' + esc(p.name)
        + '" — mehrere möglich, nochmal tippen wählt ab</div><div class="mb-sugg">';
      vs.forEach(function (v, i) {
        var aktiv = drin(p, v);
        var herkunft = (v.quelle === 'bestellung'
          ? v.belege + '× so bestellt'
          : 'aus ' + v.belege + ' Lieferung' + (v.belege > 1 ? 'en' : ''))
          + (aktiv ? ' — ist enthalten, Tippen entfernt' : '');
        h += '<button class="' + esc(v.quelle) + (aktiv ? ' on' : '') + '"'
          + ' title="' + esc(herkunft) + '"'
          + ' onclick="KMetzgerBest.nimm(\'' + esc(key) + '\',' + i + ')">'
          + (aktiv ? '<span class="hak">✓</span>' : '')
          + esc((v.portionen || []).map(blockText).join(' + '))
          + ((v.portionen || []).some(function (x) { return x.vakuum; })
            ? '<span class="vak">vak</span>' : '')
          + '</button>';
      });
      h += '</div></div>';
    }

    h += '<div class="mb-g kurz"><div class="mb-lbl">Kurzeingabe wie auf dem Zettel</div>'
      + '<div class="mb-inner">'
      + '<input class="txt kurz" id="mb-pf" placeholder="z. B. 2x500g V + 6x250g"'
      + ' oninput="KMetzgerBest.vorschau(this.value)"'
      + ' onkeydown="if(event.key===\'Enter\')KMetzgerBest.kurz(\'' + esc(key) + '\')">'
      + '<button class="mb-take" onclick="KMetzgerBest.kurz(\'' + esc(key) + '\')">'
      + 'Übernehmen</button>'
      + '<span class="mb-prev" id="mb-prev"></span></div></div>';

    var aendern = b.i >= 0;
    h += '<div class="mb-g pad' + (aendern ? ' aendern' : '') + '"><div class="mb-lbl">'
      + (aendern ? 'Portion ' + (b.i + 1) + ' ändern'
                 : 'Portion hinzufügen — Kachel tippen genügt')
      + '</div><div class="mb-inner">';
    h += '<div class="mb-step"><button onclick="KMetzgerBest.anz(-1)">−</button>'
      + '<input id="mb-a" type="number" min="1" value="' + b.anzahl + '"'
      + ' oninput="KMetzgerBest.feld(\'a\',this.value)">'
      + '<button onclick="KMetzgerBest.anz(1)">+</button></div>';
    h += '<span class="mb-mal">×</span><div class="mb-einh">';
    EINHEITEN.forEach(function (e) {
      h += '<button class="' + (istEinheit(b.einheit, e[0]) ? 'on' : '') + '"'
        + ' onclick="KMetzgerBest.einheit(\'' + e[0] + '\')">' + esc(e[1]) + '</button>';
    });
    h += '</div><button class="mb-vak' + (b.vakuum ? ' on' : '') + '" id="mb-vak"'
      + ' onclick="KMetzgerBest.vakAn()"><span class="box">✓</span>vakuumieren</button>';
    h += '</div><div class="mb-quick"><div class="mb-kach">';
    kacheln(b.einheit).forEach(function (k) {
      var aktiv = aendern && (b.menge === k[0] || (b.menge === null && b.einheit === k[0]));
      var arg = (typeof k[0] === 'number') ? k[0] : "'" + k[0] + "'";
      h += '<button class="' + (aktiv ? 'on' : '') + '"'
        + ' onclick="KMetzgerBest.kachel(' + arg + ')">' + esc(k[1]) + '</button>';
    });
    h += '<input class="mb-mg" id="mb-m" type="text" placeholder="frei" value="'
      + (b.menge === null ? '' : zahl(b.menge)) + '"'
      + ' oninput="KMetzgerBest.feld(\'m\',this.value)"'
      + ' onkeydown="if(event.key===\'Enter\')KMetzgerBest.pad(\'' + esc(key) + '\')">';
    h += '</div>';
    h += '<button class="mb-ok" onclick="KMetzgerBest.pad(\'' + esc(key) + '\')">'
      + (aendern ? 'Ändern' : '+ Hinzufügen') + '</button>';
    if (aendern) {
      h += '<button class="mb-del" onclick="KMetzgerBest.loeschen(\'' + esc(key)
        + '\')">Löschen</button>';
    }
    h += '</div></div>';

    h += '<div class="mb-g hinweis"><div class="mb-lbl">Hinweis</div><div class="mb-inner">'
      + '<input class="txt" id="mb-h" placeholder="z. B. Kräuter" value="'
      + esc(p.hinweis) + '" oninput="KMetzgerBest.hinweis(\'' + esc(key)
      + '\',this.value)"></div></div>';

    h += '</div><div class="mb-acts">'
      + '<button class="mb-ok" onclick="KMetzgerBest.zu()">Fertig</button>'
      + ((p.portionen || []).length
        ? '<button class="mb-del" onclick="KMetzgerBest.allesWeg(\'' + esc(key)
          + '\')">Alle Portionen löschen</button>' : '')
      + '<span class="mb-hint">Mehrere Größen: einfach nacheinander tippen</span>'
      + '</div>';
    return h + '</div>';
  }

  function fuss() {
    var el = document.getElementById('mb-foot');
    if (!el) return;
    var s = summen();
    var h = '<span class="mb-st"><b>' + s.n + '</b> Positionen</span>'
      + '<span class="mb-st"><b>' + s.kg.toFixed(1).replace('.', ',') + '</b> kg</span>'
      + '<span class="mb-st"><b>' + s.st + '</b> Stück</span>'
      + '<span class="mb-st"><b>' + s.vak + '</b> vakuumiert</span>';
    if (s.wert > 0) {
      h += '<span class="mb-st">geschätzt mindestens <b>'
        + s.wert.toFixed(2).replace('.', ',') + ' €</b>'
        + (s.offen ? ' <span class="mb-warn">(' + s.offen + ' Position'
          + (s.offen > 1 ? 'en' : '') + ' nicht bewertbar)</span>' : '') + '</span>';
    }
    if (!gesperrt()) {
      h += '<button class="mb-btn" onclick="KMetzgerBest.speichern()">Speichern</button>'
        + '<button class="mb-send" onclick="KMetzgerBest.senden()">Bestellung senden</button>';
    }
    el.innerHTML = h;
  }

  function summen() {
    var preise = {};
    _artikel.forEach(function (a) {
      if (a.nummer && a.preis) preise[a.nummer] = a.preis;
    });
    var s = { n: 0, kg: 0, st: 0, vak: 0, wert: 0, offen: 0 };
    (_b.positionen || []).forEach(function (p) {
      if (!bestellt(p)) return;
      s.n++;
      var preis = preise[p.nummer], bewertbar = false;
      (p.portionen || []).forEach(function (b) {
        if (b.vakuum) s.vak += b.anzahl;
        if (b.einheit === 'kg' || b.einheit === 'g') {
          var kg = b.anzahl * b.menge * (b.einheit === 'g' ? .001 : 1);
          s.kg += kg;
          if (preis) { s.wert += kg * preis; bewertbar = true; }
        } else if (b.einheit === 'St' && b.menge !== null) {
          s.st += b.anzahl * b.menge;
        }
      });
      if (!bewertbar) s.offen++;
    });
    return s;
  }

  // ── Werte der letzten Bestellung (F7) ──

  function letzteWerte(a) {
    if (!_letzte || !_letzte.positionen) return null;
    var k = a.nummer ? String(a.nummer) : (a.name || '').trim().toLowerCase();
    var bl = _letzte.positionen[k];
    return (bl && bl.length) ? bl : null;
  }

  function letzteQuelle() {
    if (!_letzte) return '';
    return 'zuletzt am ' + (_letzte.wochentag ? _letzte.wochentag + ', ' : '')
      + datumDe(_letzte.datum) + ' bestellt';
  }

  function frueher(key) {
    var p = finde(key);
    if (!p || gesperrt()) return;
    var a = { nummer: p.nummer, name: p.name };
    var bl = letzteWerte(a);
    if (!bl) return;
    bl.forEach(function (b) {
      p.portionen.push({ anzahl: b.anzahl, menge: b.menge,
                         einheit: b.einheit, vakuum: !!b.vakuum });
    });
    p.pruef = false;
    _dirty = true;
    render();
  }

  // ── Vorschlaege (F4) ──

  function vorschlaegeFuer(p) {
    var liste = (p.nummer && _vorschlaege[String(p.nummer)]) || [];
    return liste.slice(0, MAX_VORSCHLAEGE);
  }

  function findeBlock(p, b) {
    var idx = -1;
    (p.portionen || []).forEach(function (z, i) {
      if (idx < 0 && gleich(z, b)) idx = i;
    });
    return idx;
  }

  function drin(p, v) {
    var bl = v.portionen || [];
    return bl.length > 0 && bl.every(function (b) { return findeBlock(p, b) >= 0; });
  }

  // ══════════════════════════════════════════════════
  //  Bedienung
  // ══════════════════════════════════════════════════

  function finde(key) {
    var t = null;
    (_b.positionen || []).forEach(function (p) { if (posKey(p) === key) t = p; });
    return t;
  }

  function edit(key, i) {
    if (gesperrt()) return;
    _offen = key;
    var p = finde(key);
    var b = (i >= 0 && p && p.portionen[i]) ? p.portionen[i] : null;
    _entwurf = b
      ? { i: i, anzahl: b.anzahl, menge: b.menge, einheit: b.einheit, vakuum: b.vakuum }
      : { i: -1, anzahl: 1, menge: null, einheit: 'kg', vakuum: false };
    render();
    inSicht();
  }

  // Der Editor darf weder hinter dem klebenden Reiterband noch hinter der
  // Fusszeile liegen - beide ueberlagern die Liste, weshalb window.innerHeight
  // als Untergrenze zu gross ist. Passt er nicht ganz, wird die Oberkante
  // angelegt, damit die Eingabe von oben nach unten lesbar bleibt (F17).
  function inSicht() {
    var ed = document.querySelector('.mb-ed');
    var box = document.getElementById('panel-metzgerbest');
    if (!ed || !box) return;
    var rahmen = box.getBoundingClientRect();
    var oben = rahmen.top;
    var unten = rahmen.bottom;
    var band = box.querySelector('.k-filter-bar');
    if (band) oben = Math.max(oben, band.getBoundingClientRect().bottom);
    var fuss = document.getElementById('mb-foot');
    if (fuss) unten = Math.min(unten, fuss.getBoundingClientRect().top);

    var b = ed.getBoundingClientRect();
    var luft = 8;
    var weg = 0;
    if (b.height > unten - oben - 2 * luft || b.top < oben + luft) {
      weg = b.top - oben - luft;            // Oberkante anlegen
    } else if (b.bottom > unten - luft) {
      weg = b.bottom - unten + luft;        // gerade so weit wie noetig
    }
    if (weg) box.scrollBy({ top: weg, behavior: 'smooth' });
  }

  function feld(k, v) {
    if (k === 'a') _entwurf.anzahl = Math.max(1, parseInt(v, 10) || 1);
    else if (k === 'm') {
      var n = parseFloat(String(v).replace(',', '.'));
      _entwurf.menge = (isFinite(n) && n > 0) ? n : null;
    }
  }

  function anz(d) {
    _entwurf.anzahl = Math.max(1, _entwurf.anzahl + d);
    var el = document.getElementById('mb-a');
    if (el) el.value = _entwurf.anzahl;
  }

  function einheit(e) {
    if (e === 'groesse') { _entwurf.einheit = 'klein'; _entwurf.menge = null; }
    else { if (ist_groesse(_entwurf.einheit)) _entwurf.menge = null; _entwurf.einheit = e; }
    render();
  }

  // Kachel tippen legt sofort eine Portion an - so entstehen mehrere
  // verschiedene Groessen mit je einem Tipp.
  function kachel(wert) {
    if (typeof wert === 'string') { _entwurf.einheit = wert; _entwurf.menge = null; }
    else _entwurf.menge = wert;
    if (_entwurf.i >= 0) render();
    else pad(_offen);
  }

  function vakAn() {
    _entwurf.vakuum = !_entwurf.vakuum;
    var el = document.getElementById('mb-vak');
    if (el) el.className = 'mb-vak' + (_entwurf.vakuum ? ' on' : '');
  }

  function pad(key) {
    var p = finde(key);
    if (!p) return;
    if (_entwurf.menge === null && !ist_groesse(_entwurf.einheit)) {
      toast('Bitte eine Menge tippen oder eine Kachel w\u00e4hlen.');
      return;
    }
    var b = {
      anzahl: _entwurf.anzahl,
      menge: ist_groesse(_entwurf.einheit) ? null : _entwurf.menge,
      einheit: _entwurf.einheit,
      vakuum: !!_entwurf.vakuum
    };
    if (_entwurf.i >= 0) {
      p.portionen[_entwurf.i] = b;
      _entwurf = { i: -1, anzahl: _entwurf.anzahl, menge: null,
                   einheit: _entwurf.einheit, vakuum: _entwurf.vakuum };
    } else {
      p.portionen.push(b);
      _entwurf.menge = null;
    }
    p.pruef = false;
    _dirty = true;
    render();
    inSicht();
  }

  function nimm(key, i) {
    var p = finde(key);
    if (!p) return;
    var v = vorschlaegeFuer(p)[i];
    if (!v) return;
    // Mehrfachauswahl: zuschalten oder wieder abwaehlen.
    if ((v.portionen || []).every(function (b) { return findeBlock(p, b) >= 0; })) {
      (v.portionen || []).forEach(function (b) {
        var k = findeBlock(p, b);
        if (k >= 0) p.portionen.splice(k, 1);
      });
    } else {
      (v.portionen || []).forEach(function (b) {
        if (findeBlock(p, b) < 0) {
          p.portionen.push({ anzahl: b.anzahl, menge: b.menge,
                             einheit: b.einheit, vakuum: !!b.vakuum });
        }
      });
    }
    p.pruef = false;
    _dirty = true;
    render();
    inSicht();
  }

  function vorschau(text) {
    var r = parse(text);
    var el = document.getElementById('mb-prev');
    if (!el) return;
    if (!r.bloecke.length && !r.hinweis) { el.textContent = ''; el.className = 'mb-prev'; return; }
    var t = r.bloecke.map(function (b) {
      return blockText(b) + (b.vakuum ? ' (vak)' : '');
    }).join('  +  ');
    if (r.hinweis) t += (t ? '  ·  ' : '') + 'Hinweis: ' + r.hinweis;
    el.textContent = '→ ' + t;
    el.className = r.bloecke.length ? 'mb-prev' : 'mb-prev bad';
  }

  function kurz(key) {
    var el = document.getElementById('mb-pf');
    var p = finde(key);
    if (!el || !p || !el.value.trim()) return;
    var r = parse(el.value);
    p.portionen = r.bloecke;
    p.hinweis = r.hinweis;
    p.pruef = !r.bloecke.length && !!r.hinweis;
    _dirty = true;
    _offen = null; _entwurf = null;
    render();
  }

  function weg(key, i) {
    var p = finde(key);
    if (!p || gesperrt()) return;
    p.portionen.splice(i, 1);
    _dirty = true;
    if (_offen === key) { _offen = null; _entwurf = null; }
    render();
  }

  function allesWeg(key) {
    var p = finde(key);
    if (!p) return;
    p.portionen = [];
    p.pruef = false;
    _entwurf = { i: -1, anzahl: 1, menge: null, einheit: _entwurf.einheit, vakuum: false };
    _dirty = true;
    render();
  }

  function loeschen(key) {
    var p = finde(key);
    if (!p) return;
    if (_entwurf.i >= 0) p.portionen.splice(_entwurf.i, 1);
    _entwurf = { i: -1, anzahl: 1, menge: null, einheit: _entwurf.einheit, vakuum: false };
    _dirty = true;
    render();
  }

  function hinweis(key, v) {
    var p = finde(key);
    if (p) { p.hinweis = v; _dirty = true; }
  }

  function hinweisWeg(key) {
    var p = finde(key);
    if (!p || gesperrt()) return;
    p.hinweis = '';
    p.pruef = false;
    _dirty = true;
    if (_offen === key) { _offen = null; _entwurf = null; }
    render();
  }

  function editHinweis(key) {
    edit(key, -1);
    var el = document.getElementById('mb-h');
    if (el) { el.focus(); el.select(); }
  }

  function zu() { _offen = null; _entwurf = null; render(); }
  function such(v) { _suche = v; render(); }
  function filter(alle) { _alleArtikel = !!alle; render(); }

  function spring(i) {
    var el = document.getElementById('mb-g' + i);
    if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }

  function sub(id) {
    _sub = id;
    if (id === 'verlauf') ladeVerlauf(); else render();
  }

  function tag(datum) {
    if (datum === _datum) return;
    if (_dirty && !window.confirm) { /* kein nativer Dialog erzwungen */ }
    if (_dirty) {
      dialogFrage('Die \u00c4nderungen sind noch nicht gespeichert. '
        + 'Trotzdem den Tag wechseln?', function () { ladeBestellung(datum); });
      return;
    }
    ladeBestellung(datum);
  }

  // ── Zusatzartikel (F8) ──

  function zusatz() {
    dialogEingabe('Weiteren Artikel f\u00fcr diesen Tag', function (name, nummer) {
      if (!name) { toast('Bitte eine Bezeichnung eintragen.'); return false; }
      var nr = parseInt(nummer, 10);
      _b.positionen.push({
        nummer: isFinite(nr) ? nr : null, name: name,
        portionen: [], hinweis: '', zusatz: true
      });
      _dirty = true;
      render();
      return true;
    });
  }

  function zusatzWeg(key) {
    _b.positionen = (_b.positionen || []).filter(function (p) {
      return posKey(p) !== key;
    });
    _dirty = true;
    render();
  }

  // ══════════════════════════════════════════════════
  //  Speichern und Senden
  // ══════════════════════════════════════════════════

  function nutzbare() {
    return (_b.positionen || []).filter(bestellt).map(function (p) {
      return { nummer: p.nummer, name: p.name, portionen: p.portionen,
               hinweis: p.hinweis, zusatz: !!p.zusatz };
    });
  }

  function speichern(still) {
    return fetch(API + '/metzger-order/' + encodeURIComponent(_datum) + '/speichern', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ positionen: nutzbare() })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _dirty = false;
        if (!still) toast('Der Entwurf ist gespeichert.');
        return true;
      })
      .catch(function (e) {
        toast(e.message || 'Der Entwurf konnte nicht gespeichert werden.');
        return false;
      });
  }

  function senden() { versandDialog(false); }
  function korrektur() { versandDialog(true); }

  function versandDialog(korr) {
    var s = summen();
    if (!s.n) { toast('Es ist noch nichts bestellt.'); return; }
    var zeilen = (_b.positionen || []).filter(bestellt).map(function (p) {
      return (p.nummer ? p.nummer + ' ' : '') + p.name + ' — ' + posText(p);
    });
    var h = '<div class="mb-dlg-kopf">'
      + (korr ? 'Korrektur senden' : 'Bestellung senden')
      + (_testbetrieb ? ' <span class="mb-test">Testbetrieb</span>' : '') + '</div>'
      + '<div class="mb-dlg-meta"><b>An:</b> ' + esc(_cfg.empfaenger || '') + '<br>'
      + '<b>Betreff:</b> ' + (korr ? 'Korrektur Bestellung ' : 'Bestellung ')
      + esc(datumDe(_datum)) + '<br>'
      + '<b>Anhang:</b> Bestellung-Metzger-Mair.pdf</div>'
      + '<div class="mb-dlg-text">' + zeilen.map(esc).join('<br>')
      + '<br><br>Davon vakuumiert: ' + s.vak + ' Portionen</div>';
    dialog(h, korr ? 'Korrektur absenden' : 'Jetzt senden', function () {
      return abschicken(korr);
    });
  }

  function abschicken(korr) {
    var pfad = korr ? '/korrektur' : '/senden';
    return fetch(API + '/metzger-order/' + encodeURIComponent(_datum) + pfad, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ positionen: nutzbare(), wer: 'Kiosk' })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        toast(korr ? 'Die Korrektur ist raus.' : 'Die Bestellung ist raus.');
        _dirty = false;
        return ladeUebersicht(_datum);
      })
      .catch(function (e) {
        toast(e.message || 'Die Bestellung konnte nicht versendet werden. '
          + 'Der Entwurf bleibt erhalten.');
      });
  }

  // ══════════════════════════════════════════════════
  //  Weitere Unterreiter
  // ══════════════════════════════════════════════════

  function verlaufAnsicht() {
    if (!_verlauf.length) {
      return '<div class="k-empty">Noch keine gesendete Bestellung. '
        + 'Sobald die erste raus ist, steht sie hier.</div>';
    }
    return '<div class="mb-verlauf">' + _verlauf.map(function (v) {
      return '<div class="mb-vrow"><div><b>' + esc(v.wochentag) + ', '
        + esc(datumDe(v.datum)) + '</b>'
        + (v.status === 2 ? ' <span class="mb-tag ex">korrigiert</span>' : '')
        + '</div><div class="mb-vmeta">' + v.summen.positionen + ' Positionen · '
        + String(v.summen.kg).replace('.', ',') + ' kg · '
        + v.summen.vakuum + ' vakuumiert</div>'
        + (v.hat_dokument
          ? '<a class="mb-btn" target="_blank" rel="noopener" href="' + API
            + '/metzger-order/' + encodeURIComponent(v.datum)
            + '/dokument">Formular ansehen</a>' : '')
        + '</div>';
    }).join('') + '</div>';
  }

  function artikelAnsicht() {
    return '<div class="mb-artikel">' + _artikel.map(function (a) {
      return '<div class="mb-arow' + (a.aktiv === false ? ' aus' : '') + '">'
        + '<span class="mb-nr' + (a.nummer ? '' : ' leer') + '">'
        + esc(a.nummer || '–') + '</span>'
        + '<span class="mb-aname">' + esc(a.name) + '</span>'
        + '<span class="mb-agrp">' + esc(a.gruppe || '') + '</span>'
        + '<span class="mb-apreis">' + (a.preis
          ? String(a.preis).replace('.', ',') + ' €/kg' : '—') + '</span>'
        + '<button class="mb-btn" onclick="KMetzgerBest.aktiv(\''
        + esc(a.name) + '\',' + (a.aktiv === false) + ')">'
        + (a.aktiv === false ? 'Einblenden' : 'Ausblenden') + '</button>'
        + '</div>';
    }).join('') + '</div>';
  }

  function aktiv(name, an) {
    fetch(API + '/metzger-artikel', {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({ alt_name: name, aktiv: !!an })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _artikel = d.artikel || _artikel;
        render();
      })
      .catch(function (e) {
        toast(e.message || 'Die \u00c4nderung konnte nicht gespeichert werden.');
      });
  }

  function einstellungen() {
    var tage = _cfg.bestelltage || [];
    var namen = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    return '<div class="mb-cfg">'
      + '<label>Empfänger<input id="mb-c-mail" type="email" value="'
      + esc(_cfg.empfaenger || '') + '"></label>'
      + '<label>Kunden-Nr.<input id="mb-c-kd" value="' + esc(_cfg.kd_nr || '') + '"></label>'
      + '<label>Bestellschluss<input id="mb-c-schluss" value="'
      + esc(_cfg.bestellschluss || '12:00') + '"></label>'
      + '<div class="mb-cfg-tage">Bestelltage' + namen.map(function (n, i) {
        return '<label class="mb-cbx"><input type="checkbox" data-tag="' + i + '"'
          + (tage.indexOf(i) >= 0 ? ' checked' : '') + '> ' + n + '</label>';
      }).join('') + '</div>'
      + '<button class="mb-send" onclick="KMetzgerBest.cfgSpeichern()">Speichern</button>'
      + (_testbetrieb ? '<p class="mb-quelle">Solange der Empfänger nicht die '
        + 'Metzgerei selbst ist, läuft alles im Testbetrieb.</p>' : '')
      + '</div>';
  }

  function cfgSpeichern() {
    var tage = [];
    document.querySelectorAll('.mb-cfg [data-tag]').forEach(function (cb) {
      if (cb.checked) tage.push(parseInt(cb.getAttribute('data-tag'), 10));
    });
    var neu = {
      empfaenger: (document.getElementById('mb-c-mail') || {}).value || '',
      kd_nr: (document.getElementById('mb-c-kd') || {}).value || '',
      bestellschluss: (document.getElementById('mb-c-schluss') || {}).value || '',
      bestelltage: tage
    };
    fetch(API + '/metzger-order/config', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ config: neu })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _cfg = d.config || _cfg;
        toast('Die Einstellungen sind gespeichert.');
        ladeUebersicht(_datum);
      })
      .catch(function (e) {
        toast(e.message || 'Die Einstellungen konnten nicht gespeichert werden.');
      });
  }

  // ══════════════════════════════════════════════════
  //  Dialoge (keine nativen alert/confirm, Konstitution 6)
  // ══════════════════════════════════════════════════

  function huelle(inhalt) {
    var w = document.createElement('div');
    w.className = 'mb-overlay';
    w.innerHTML = '<div class="mb-dlg">' + inhalt + '</div>';
    document.body.appendChild(w);
    w.addEventListener('click', function (ev) { if (ev.target === w) w.remove(); });
    return w;
  }

  function dialog(inhalt, knopf, aktion) {
    var w = huelle(inhalt + '<div class="mb-dlg-acts">'
      + '<button class="mb-btn" data-ab>Abbrechen</button>'
      + '<button class="mb-send" data-ok>' + esc(knopf) + '</button></div>');
    w.querySelector('[data-ab]').onclick = function () { w.remove(); };
    w.querySelector('[data-ok]').onclick = function () {
      w.remove();
      aktion();
    };
  }

  function dialogFrage(text, ja) {
    var w = huelle('<div class="mb-dlg-text">' + esc(text) + '</div>'
      + '<div class="mb-dlg-acts"><button class="mb-btn" data-ab>Zurück</button>'
      + '<button class="mb-send" data-ok>Weiter</button></div>');
    w.querySelector('[data-ab]').onclick = function () { w.remove(); };
    w.querySelector('[data-ok]').onclick = function () { w.remove(); ja(); };
  }

  function dialogEingabe(titel, ja) {
    var w = huelle('<div class="mb-dlg-kopf">' + esc(titel) + '</div>'
      + '<div class="mb-dlg-form">'
      + '<label>Bezeichnung<input id="mb-z-name" autofocus></label>'
      + '<label>Nummer (falls bekannt)<input id="mb-z-nr" inputmode="numeric"></label>'
      + '</div><div class="mb-dlg-acts">'
      + '<button class="mb-btn" data-ab>Abbrechen</button>'
      + '<button class="mb-send" data-ok>Übernehmen</button></div>');
    w.querySelector('[data-ab]').onclick = function () { w.remove(); };
    w.querySelector('[data-ok]').onclick = function () {
      var n = (document.getElementById('mb-z-name') || {}).value || '';
      var nr = (document.getElementById('mb-z-nr') || {}).value || '';
      if (ja(n.trim(), nr) !== false) w.remove();
    };
  }

  // ══════════════════════════════════════════════════

  function datumDe(iso) {
    if (!iso || iso.length < 10) return iso || '';
    return iso.slice(8) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
  }

  function wochentagVon(iso) {
    var t = (_tage || []).filter(function (x) { return x.datum === iso; })[0];
    return t ? t.wochentag : '';
  }

  function zeitKurz(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return datumDe(iso.slice(0, 10)) + ' ' + iso.slice(11, 16) + ' Uhr';
  }

  return {
    onShow: onShow, sub: sub, tag: tag, such: such, filter: filter, spring: spring,
    edit: edit, feld: feld, anz: anz, einheit: einheit, kachel: kachel,
    vakAn: vakAn, pad: pad, nimm: nimm, vorschau: vorschau, kurz: kurz,
    weg: weg, allesWeg: allesWeg, loeschen: loeschen,
    hinweis: hinweis, hinweisWeg: hinweisWeg, editHinweis: editHinweis, zu: zu,
    zusatz: zusatz, zusatzWeg: zusatzWeg, frueher: frueher,
    speichern: speichern, senden: senden, korrektur: korrektur,
    aktiv: aktiv, cfgSpeichern: cfgSpeichern,
    badge: badge
  };
})();

/* Getraenke-Bestellung im Kiosk (Spec specs/getraenke-bestellung/spec.md).
 *
 * Selbststaendiges Modul (window.KGetraenke), unabhaengig vom grossen
 * K-Modul. Nutzt /api/getraenke-order und /api/getraenke-artikel.
 *
 * Der entscheidende Unterschied zu Baecker und Metzger: Bei Getraenke Kratzer
 * wird **unregelmaessig** bestellt. Es gibt deshalb keine Tagesleiste, sondern
 * einen frei waehlbaren Liefertermin, aus dem die Kalenderwoche fuer den
 * Betreff entsteht (Spec F1). Bestellt wird ausschliesslich in ganzen Kisten -
 * ein Schrittzaehler je Zeile genuegt.
 */
window.KGetraenke = (function () {
  'use strict';

  var API = '/api';

  // Ein Artikel gilt als "ueblich", wenn er in mindestens zwei der
  // ausgewerteten Bestellungen vorkam. Alles darunter ist Gelegenheitsware und
  // steht erst unter "Alle Artikel" - sonst erschlaegt die Liste den Nutzer.
  var UEBLICH_AB = 2;
  var MAX_MENGE = 99;

  // ── Zustand ──
  var _artikel = [];        // Katalog vom Server
  var _neu = [];            // im Kiosk angelegte Artikel (Spec F7)
  var _gruppen = [];
  var _pfand = {};
  var _menge = {};          // Schluessel -> Kisten
  var _letzte = null;       // zuletzt gesendete Bestellung als Vorlage
  var _cfg = {};
  var _datum = '';
  var _status = 0;
  var _bestellbar = true;
  var _testbetrieb = true;
  var _verlauf = [];
  var _filter = 'ueblich';
  var _suche = '';
  var _sub = 'bestellung';
  var _geladen = false;
  var _sichern = null;      // Zeitgeber der stillen Sicherung
  var _neuZaehler = 0;

  // ══════════════════════════════════════════════════
  //  Hilfen
  // ══════════════════════════════════════════════════

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function host() { return document.getElementById('getraenke-body'); }
  function $(id) { return document.getElementById(id); }

  function toast(msg) {
    if (window.K && typeof K.toast === 'function') { K.toast(msg); return; }
    var d = document.createElement('div');
    d.className = 'gk-toast';
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

  function eur(n) {
    return (Number(n) || 0).toLocaleString('de-DE',
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' \u20ac';
  }

  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  /** Schluessel einer Zeile. Die Nummern sind bei Kratzer Zeichenketten
   *  ("KA40015") und duerfen fehlen - dann traegt der Name. */
  function key(a) {
    return a.nummer ? String(a.nummer) : 'x' + (a.name || '');
  }

  /** Grundbestand plus alles, was im Kiosk angelegt wurde. Ueberall dort, wo
   *  sonst _artikel stuende, muss der Gesamtbestand stehen - sonst tauchen
   *  neue Artikel weder in der Liste noch in der Mail auf. */
  function katalog() {
    return _artikel.filter(function (a) { return a.aktiv !== false; }).concat(_neu);
  }

  function finde(k) {
    var alle = katalog();
    for (var i = 0; i < alle.length; i++) if (key(alle[i]) === k) return alle[i];
    return null;
  }

  // ── Datum und Kalenderwoche (Spec F1.2) ──
  function kalenderwoche(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return null;
    var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7));
    var start = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - start) / 86400000 + 1) / 7);
  }

  function deutsch(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('de-DE',
      { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  var TAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
              'Freitag', 'Samstag', 'Sonntag'];

  /** Datum fuer die Bestellmail - Wortlaut identisch mit _mail_text() im
   *  Server (api/getraenke-order/__init__.py). Vorschau und Versand duerfen
   *  nicht auseinanderlaufen. */
  function langesDatum(iso) {
    var d = new Date(iso + 'T00:00:00');
    if (isNaN(d.getTime())) return iso;
    var wt = TAGE[(d.getDay() + 6) % 7];
    return wt + ', den ' + ('0' + d.getDate()).slice(-2) + '.'
      + ('0' + (d.getMonth() + 1)).slice(-2) + '.' + d.getFullYear();
  }

  function heuteIso() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2)
      + '-' + ('0' + d.getDate()).slice(-2);
  }

  function inZukunft(iso) { return !!iso && iso > heuteIso(); }

  // ── Summen (Spec F8) ──
  function summen() {
    var s = { kisten: 0, positionen: 0, wert: 0, pfand: 0, ohnePreis: 0 };
    var alle = katalog();
    for (var i = 0; i < alle.length; i++) {
      var a = alle[i], n = _menge[key(a)] || 0;
      if (!n) continue;
      s.kisten += n;
      s.positionen++;
      if (a.preis) s.wert += n * a.preis; else s.ohnePreis++;
      s.pfand += n * (a.pfand || _pfand[a.gebinde] || 0);
    }
    return s;
  }

  function positionen() {
    var out = [];
    var alle = katalog();
    for (var i = 0; i < alle.length; i++) {
      var a = alle[i], n = _menge[key(a)] || 0;
      if (!n) continue;
      out.push({
        nummer: a.nummer || '', name: a.name || '',
        bestelltext: a.bestelltext || a.name || '', gebinde: a.gebinde || '',
        gruppe: a.gruppe || '', menge: n, preis: a.preis === undefined ? null : a.preis,
        // Einmalig angelegte Artikel gelten nur fuer diese Bestellung (F7.6).
        zusatz: !!(a.neu && !a.dauerhaft)
      });
    }
    return out;
  }

  function letzteMengen() {
    var out = {};
    if (!_letzte) return out;
    (_letzte.positionen || []).forEach(function (p) {
      out[key(p)] = p.menge;
    });
    return out;
  }

  // ══════════════════════════════════════════════════
  //  Laden und Sichern
  // ══════════════════════════════════════════════════

  function onShow() {
    if (_geladen) { zeichne(); return; }
    laden();
  }

  function laden() {
    var h = host();
    if (!h) return;
    h.innerHTML = '<div class="k-empty">Bestellung wird geladen \u2026</div>';
    fetch(API + '/getraenke-order', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error('leer');
        _cfg = d.config || {};
        _testbetrieb = !!d.testbetrieb;
        _datum = d.termin || '';
        return ladeTag(_datum);
      })
      .catch(function () {
        h.innerHTML = '<div class="k-empty">Die Bestellung konnte gerade nicht '
          + 'geladen werden. Bitte den Reiter noch einmal \u00f6ffnen.</div>';
      });
  }

  function ladeTag(datum) {
    return fetch(API + '/getraenke-order/' + encodeURIComponent(datum),
      { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error('leer');
        _artikel = d.artikel || [];
        _gruppen = d.gruppen || [];
        _pfand = d.pfand || {};
        _letzte = d.letzte || null;
        _cfg = d.config || _cfg;
        _testbetrieb = !!d.testbetrieb;
        _bestellbar = d.bestellbar !== false;
        var b = d.bestellung || {};
        _status = b.status || 0;
        _menge = {};
        _neu = [];
        (b.positionen || []).forEach(function (p) {
          _menge[key(p)] = p.menge;
          // Einmalige Artikel stehen nicht im Katalog und muessen aus der
          // gespeicherten Bestellung wiederhergestellt werden.
          if (p.zusatz) {
            _neu.push({
              nummer: p.nummer, name: p.name, bestelltext: p.bestelltext,
              gebinde: p.gebinde, gruppe: p.gruppe, preis: p.preis,
              pfand: _pfand[p.gebinde], ueblich: null, bestellungen: 0,
              aktiv: true, neu: true, dauerhaft: false
            });
          }
        });
        _geladen = true;
        zeichne();
      });
  }

  /** Stille Sicherung, damit ein Reiterwechsel nichts kostet (Spec F10.1). */
  function sichern() {
    if (_status !== 0 || !_datum) return;
    clearTimeout(_sichern);
    _sichern = setTimeout(function () {
      fetch(API + '/getraenke-order/' + encodeURIComponent(_datum) + '/speichern', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ positionen: positionen() })
      }).catch(function () { /* Der Entwurf steht weiter im Formular. */ });
    }, 900);
  }

  function ladeVerlauf() {
    return fetch(API + '/getraenke-order?mode=verlauf', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) { _verlauf = (d && d.verlauf) || []; })
      .catch(function () { _verlauf = []; });
  }

  // ══════════════════════════════════════════════════
  //  Mengen
  // ══════════════════════════════════════════════════

  /** Menge setzen.
   *
   *  ``vonFeld`` bedeutet: Die Zahl kam aus dem Eingabefeld, in dem gerade
   *  geschrieben wird. Dann wird die Zeile nur aufgefrischt — ein
   *  vollstaendiges Neuzeichnen wuerde das Feld unter den Fingern
   *  wegziehen (Fokus, Tabulator und zweite Ziffer gingen verloren).
   */
  function setze(k, n, vonFeld) {
    n = Math.max(0, Math.min(MAX_MENGE, Math.round(Number(n) || 0)));
    if (n) _menge[k] = n; else delete _menge[k];
    frischeZeile(k);
    if (!vonFeld) {
      var feld = $('gk-list') && $('gk-list').querySelector(
        '[data-menge="' + String(k).replace(/"/g, '\\"') + '"]');
      if (feld) feld.value = n;
    }
    sichern();
  }

  /** Enter springt ins naechste Mengenfeld — so lassen sich alle Mengen
   *  nacheinander eingeben, ohne die Hand von der Tastatur zu nehmen. */
  function naechstesFeld(k) {
    var felder = Array.prototype.slice.call(
      document.querySelectorAll('#gk-list .gk-row [data-menge]'));
    var i = -1;
    felder.forEach(function (f, n) { if (f.dataset.menge === k) i = n; });
    var next = felder[i + 1] || felder[0];
    if (next) { next.focus(); next.select(); }
  }

  function uebernimmLetzte() {
    var m = letzteMengen();
    if (!Object.keys(m).length) {
      toast('Es liegt noch keine fr\u00fchere Bestellung vor.');
      return;
    }
    _menge = m;
    zeichneListe();
    sichern();
    toast('Bestellung vom ' + (_letzte.datum_de || _letzte.datum) + ' \u00fcbernommen.');
  }

  function leeren() {
    _menge = {};
    _neu = _neu.filter(function (a) { return a.dauerhaft; });
    zeichneListe();
    sichern();
  }

  // ══════════════════════════════════════════════════
  //  Zeichnen
  // ══════════════════════════════════════════════════

  function subs(extra) {
    var eintraege = [['bestellung', 'Bestellung'], ['artikel', 'Artikel'],
                     ['verlauf', 'Verlauf']];
    return '<div class="gk-subs' + (extra ? ' ' + extra : '') + '">' + eintraege.map(function (e) {
      return '<button class="gk-sub' + (_sub === e[0] ? ' on' : '') + '" '
        + 'data-sub="' + e[0] + '">' + e[1] + '</button>';
    }).join('') + '</div>';
  }

  function zeichne() {
    var h = host();
    if (!h) return;
    h.className = 'gk';
    // Nur die Bestellansicht ist in festen Kopf, Liste und Fußzeile geteilt.
    var panel = document.getElementById('panel-getraenke');
    if (panel) panel.classList.toggle('k-geteilt', _sub !== 'artikel' && _sub !== 'verlauf');
    if (_sub === 'artikel') { h.innerHTML = subs() + artikelAnsicht(); bindeAllgemein(); return; }
    if (_sub === 'verlauf') { h.innerHTML = subs() + verlaufAnsicht(); bindeAllgemein(); return; }

    var kw = kalenderwoche(_datum);
    /* Aufteilung wie beim Bäcker: fester Kopf, scrollende Liste, Fußzeile
       (Spec kiosk-bestellreiter-mobil, F1/F6). Vorher gab dieser Reiter
       alles als einen 5276 px hohen Block aus — die erste Artikelzeile lag
       unterhalb des Bildschirms, und der Kopf scrollte mit weg. */
    h.innerHTML = '<div class="gk-fest">' + subs()
      + kontextZeile(kw)
      +   '<div class="gk-bar k-suchzeile">'
      +     '<input type="search" id="gk-q" placeholder="Getr\u00e4nk oder Gebinde suchen \u2026" value="' + esc(_suche) + '">'
      +     KFilter.markup(umfaenge(), _filter)
      +     KFilter.zeile(umfaenge(), _filter)
      +   '</div>'
      + '</div>'
      + '<div class="gk-list k-liste" id="gk-list"></div>'
      + '<div class="gk-foot" id="gk-foot"></div>'
      + detailBlatt(kw)
      + KFilter.blatt(umfaenge(), _filter);

    bindeAllgemein();
    bindeBestellung();
    zeichneListe();
    var panel = document.getElementById('panel-getraenke');
    if (panel && window.KFilter) {
      KFilter.binde(panel, function (wahl) { _filter = wahl; zeichne(); });
    }
  }

  /** Die drei Umfänge samt Trefferzahlen (Spec kiosk-erfassung-filter, F7). */
  function umfaenge() {
    var alt = _filter, altSuche = _suche;
    var zaehle = function (u) {
      _filter = u; _suche = '';
      var n = katalog().filter(sichtbar).length;
      _filter = alt; _suche = altSuche;
      return n;
    };
    return [
      ['ueblich', '\u00dcbliche', zaehle('ueblich'), '\u00dcbliche Artikel'],
      ['alle', 'Alle', zaehle('alle'), 'Alle Artikel'],
      ['best', 'Nur erfasste', zaehle('best'), 'Nur erfasste']
    ];
  }

  /* ── Kontextzeile und Detailblatt (Spec kiosk-bestellreiter-mobil) ──────
     Eine Zeile trägt den Zustand: Termin, Kalenderwoche und ob schon
     gesendet wurde. Terminwahl, Übernahme der letzten Bestellung, Filter
     und Sprungmarken stehen im Blatt dahinter — sie werden je Bestellung
     einmal gebraucht, nicht dauernd. */
  function kontextZeile(kw) {
    var cls = 'gk-kontext' + (_status ? ' gesendet' : '') + (_testbetrieb ? ' test' : '');
    var z2;
    if (_status) z2 = 'Bereits ' + (_status === 2 ? 'korrigiert' : 'gesendet');
    else if (_testbetrieb) z2 = 'Testbetrieb \u2013 geht nicht an ' + esc(_cfg.name || 'den Lieferanten');
    else z2 = 'Noch nicht gesendet';
    return '<div class="' + cls + '">'
      + '<div class="ico">' + ikone(_status ? 'check-circle' : 'cup-soda') + '</div>'
      + '<div class="txt">'
      + '<div class="z1">' + (kw ? 'KW ' + kw + ' \u00b7 ' + esc(deutsch(_datum)) : '\u2014') + '</div>'
      + '<div class="z2">' + z2 + '</div></div>'
      /* Ist dieser Termin schon abgeschickt, war nicht zu erkennen, wie man
         die naechste Bestellung beginnt — der Termin lag allein im Blatt.
         Jetzt steht der Weg dorthin sichtbar in der Zeile. */
      + (_status ? '<button class="gk-neubest" id="gk-neubest" '
          + 'title="F\u00fcr einen anderen Liefertermin bestellen">'
          + ikone('calendar-plus') + '<span class="lang">Neue Bestellung</span></button>' : '')
      + '<button class="gk-mehr" id="gk-mehr" title="Termin, Filter und weitere Schritte">'
      + ikone('info') + '</button></div>';
  }

  function ikone(name) {
    return '<i data-lucide="' + name + '"></i>';
  }

  function detailBlatt(kw) {
    var h = '<div class="gk-blatt" id="gk-blatt" hidden>';
    h += '<div class="gk-blatt-kopf"><h4>Zur Bestellung</h4>'
      + '<div class="gk-blatt-sub">' + esc(_cfg.name || 'Lieferant')
      + (kw ? ' \u00b7 KW ' + kw : '') + '</div></div>';

    h += '<div class="gk-blatt-t">Liefertermin \u00b7 neue Bestellung</div>';
    h += '<div class="gk-blatt-hinweis">Jeder Liefertermin hat seine eigene '
      + 'Bestellung. F\u00fcr eine <b>neue Bestellung</b> hier einfach ein '
      + 'sp\u00e4teres Datum w\u00e4hlen \u2014 die Liste startet dann neu.</div>';
    h += '<div class="gk-blatt-z"><label for="gk-datum">Termin</label>'
      + '<input type="date" id="gk-datum" value="' + esc(_datum) + '"></div>';
    h += '<button class="gk-take" id="gk-take">' + esc(takeText()) + '</button>';

    h += '<div class="gk-blatt-t">Zur Bestellung</div>';
    h += '<div class="gk-blatt-z" id="gk-blatt-summen"></div>';

    /* Auf dem Telefon steht der Bereichswechsel nur hier, damit der feste
       Kopf der Bestellansicht schmal bleibt (Spec F1). */
    h += '<div class="gk-blatt-t gk-nur-tel">Bereich</div>';
    h += subs('im-blatt');

    /* Die Umfänge standen hier im Blatt. Sie sind Bedienung, nicht Auskunft,
       und stehen deshalb jetzt neben der Suche (Spec kiosk-erfassung-filter,
       F7). */

    if (_gruppen.length) {
      h += '<div class="gk-blatt-t">Zur Warengruppe springen</div>';
      h += '<div class="gk-jump" id="gk-jump">' + _gruppen.map(function (g) {
        return '<button data-jump="' + esc(slug(g)) + '">' + esc(g) + '</button>';
      }).join('') + '</div>';
    }
    if (_testbetrieb) {
      h += '<div class="gk-blatt-z klein">Testbetrieb: Die Bestellung geht an '
        + esc(_cfg.empfaenger || '') + ', nicht an ' + esc(_cfg.name || 'den Lieferanten')
        + '. Die echte Adresse wird im CMS eingetragen, sobald sie freigegeben ist.</div>';
    }
    h += '<button class="gk-blatt-zu" id="gk-blatt-zu">Schlie\u00dfen</button>';
    return h + '</div>';
  }

  /* Achtung: Weiter unten gibt es ein `blatt(id, inhalt)`, das Überlagerungen
     baut (Artikel anlegen, Versand). Funktionsdeklarationen werden hochgezogen
     — zwei gleichnamige, und die spätere gewinnt für die ganze Datei. Genau
     das ließ den „i"-Knopf ins Leere laufen. Diese hier heißt deshalb
     unverwechselbar. */
  function blattZeigen(auf) {
    var el = $('gk-blatt');
    if (!el) return;
    el.hidden = !auf;
    if (auf && window.dlLockScroll) dlLockScroll();
    else if (!auf && window.dlUnlockScroll) dlUnlockScroll();
  }

  function takeText() {
    if (!_letzte) return 'Keine fr\u00fchere Bestellung';
    return 'Letzte Bestellung \u00fcbernehmen (' + (_letzte.datum_de || _letzte.datum) + ')';
  }

  function sichtbar(a) {
    var n = _menge[key(a)] || 0;
    if (_suche) {
      // Die Suche sticht den Filter: gesucht wird im Gesamtbestand (F6.3).
      var q = _suche.toLowerCase();
      return ((a.name || '') + ' ' + (a.gebinde || '') + ' ' + (a.bestelltext || ''))
        .toLowerCase().indexOf(q) >= 0;
    }
    if (_filter === 'best') return n > 0;
    if (_filter === 'alle') return true;
    // Selbst angelegte Artikel bleiben immer sichtbar: Sie haben noch keine
    // Bestellhistorie und fielen sonst sofort aus der ueblichen Liste (F6.2).
    return !!a.neu || (a.bestellungen || 0) >= UEBLICH_AB || n > 0;
  }

  function zeichneListe() {
    var liste = $('gk-list');
    if (!liste) return;
    var alle = katalog();
    var sichtbare = alle.filter(sichtbar);
    liste.innerHTML = '';

    if (!sichtbare.length) {
      liste.innerHTML = '<div class="gk-empty">Kein Getr\u00e4nk gefunden. '
        + 'Suche leeren, auf \u201eAlle Artikel\u201c wechseln oder unten einen '
        + 'neuen Artikel anlegen.</div>';
    }

    var letzte = letzteMengen();
    var gruppe = null;
    sichtbare.forEach(function (a) {
      if (a.gruppe !== gruppe) {
        gruppe = a.gruppe;
        var kisten = 0;
        alle.forEach(function (x) {
          if (x.gruppe === gruppe) kisten += _menge[key(x)] || 0;
        });
        var kopf = document.createElement('div');
        kopf.className = 'gk-grp';
        kopf.id = 'gk-grp-' + slug(gruppe);
        kopf.innerHTML = esc(gruppe)
          + (kisten ? '<span class="gsum">' + kisten + ' Kisten</span>' : '');
        liste.appendChild(kopf);
      }
      liste.appendChild(zeile(a, letzte[key(a)] || 0));
    });

    fusszeile();
  }

  /** Die Merkzeichen am Namen. Ausgelagert, weil die Zeile beim Tippen
   *  punktgenau aufgefrischt wird und dabei nur dieser Teil neu entsteht. */
  function tagsHtml(a, menge, letzte) {
    var tags = '';
    if (!menge && letzte) tags += '<span class="gk-tag vor">letzte: ' + letzte + '</span>';
    if (menge && letzte && menge !== letzte) tags += '<span class="gk-tag chg">war ' + letzte + '</span>';
    // Sechs Sorten wurden bestellt, aber in keiner Rechnung abgerechnet:
    // Preis und Artikelnummer fehlen (Spec F2.3).
    if (!a.preis && !a.neu) {
      tags += '<span class="gk-tag ohne" title="In keiner vorliegenden Rechnung '
        + 'abgerechnet \u2014 Preis unbekannt">ohne Preis</span>';
    }
    if (a.neu) {
      tags += a.dauerhaft
        ? '<span class="gk-tag dauer" title="Bleibt in der Artikelliste">neu \u00b7 dauerhaft</span>'
        : '<span class="gk-tag einmal" title="Gilt nur f\u00fcr diese Bestellung">nur diese Bestellung</span>';
    }
    return tags;
  }

  /** Vorschlaege: "ueblich" (Median der bisherigen Mengen) und "letzte"
   *  (Menge der juengsten Bestellung), sofern beide sich unterscheiden (F4).
   *  Sie tragen keinen Tab-Stopp, damit die Tabulatortaste von Mengenfeld zu
   *  Mengenfeld springt. */
  function suggHtml(a, k, menge, letzte) {
    var vor = [];
    if (a.ueblich) vor.push({ n: a.ueblich, l: '\u00fcblich ' + a.ueblich });
    if (letzte && letzte !== a.ueblich) vor.push({ n: letzte, l: 'letzte ' + letzte });
    return vor.map(function (v) {
      return '<button type="button" tabindex="-1" data-set="' + esc(k) + '" data-n="' + v.n + '"'
        + (menge === v.n ? ' class="on"' : '') + '>'
        + (menge === v.n ? '<span class="hak">\u2713</span>' : '') + v.l + '</button>';
    }).join('');
  }

  function zeile(a, letzte) {
    var k = key(a);
    var menge = _menge[k] || 0;
    var row = document.createElement('div');
    row.className = 'gk-row' + (menge ? ' has' : '')
      + (menge && letzte && menge !== letzte ? ' chg' : '');
    row.setAttribute('data-key', k);
    // Der Vergleichswert haengt an der Zeile, damit das Auffrischen beim
    // Tippen ihn nicht neu suchen muss.
    row.setAttribute('data-letzte', letzte || 0);

    row.innerHTML =
      '<div class="gk-geb">' + esc(a.gebinde || '\u2014') + '</div>'
      + '<div class="gk-zeile">'
      +   '<div class="gk-nm">' + esc(a.name)
      +     '<span class="gk-tags">' + tagsHtml(a, menge, letzte) + '</span>'
      +     '<span class="gk-pr">'
      +       '<span class="gk-geb-klein">' + esc(a.gebinde || '\u2014') + ' \u00b7 </span>'
      +       (a.preis ? eur(a.preis) + ' / Kiste' : 'Preis nicht belegt') + '</span>'
      +   '</div>'
      +   '<div class="gk-chips">'
      +     '<div class="gk-step">'
      /* +/- ohne Tab-Stopp: So springt die Tabulatortaste von Menge zu
         Menge, statt an jedem Knopf haengen zu bleiben. */
      +       '<button type="button" tabindex="-1" data-minus="' + esc(k) + '" aria-label="Eine Kiste weniger"'
      +         (menge ? '' : ' disabled') + '>\u2212</button>'
      +       '<input type="number" min="0" max="99" inputmode="numeric" value="' + menge + '" '
      +         'data-menge="' + esc(k) + '" aria-label="Kisten ' + esc(a.name) + '" '
      /* Beim Antippen ist der Wert markiert - eine neue Zahl ersetzt ihn,
         statt sich davorzuschieben. Auch beim Klick, nicht nur beim
         Hineinspringen: Ein zweiter Klick ins selbe Feld loest kein `focus`
         mehr aus, und genau dort blieb der alte Wert sonst stehen. */
      +         'onfocus="this.select()" onclick="this.select()">'
      +       '<button type="button" tabindex="-1" data-plus="' + esc(k) + '" aria-label="Eine Kiste mehr">+</button>'
      +     '</div>'
      +     '<div class="gk-sugg">' + suggHtml(a, k, menge, letzte) + '</div>'
      +     (menge && a.preis ? '<span class="gk-kisteninfo">' + eur(menge * a.preis) + '</span>' : '')
      +   '</div>'
      + '</div>';
    return row;
  }

  /** Eine Zeile punktgenau auffrischen, ohne sie neu zu bauen.
   *
   *  Frueher zeichnete jede Mengenaenderung die ganze Liste neu. Damit wurde
   *  auch das Eingabefeld weggeworfen, in dem gerade getippt wurde: Der Fokus
   *  ging verloren, die Tabulatortaste landete im Nichts und eine zweite
   *  Ziffer kam nie an. Das Eingabefeld selbst wird hier bewusst nicht
   *  angefasst, solange darin geschrieben wird.
   */
  function frischeZeile(k) {
    var row = $('gk-list') && $('gk-list').querySelector(
      '.gk-row[data-key="' + String(k).replace(/"/g, '\\"') + '"]');
    var a = finde(k);
    if (!row || !a) { zeichneListe(); return; }

    var menge = _menge[k] || 0;
    var letzte = Number(row.getAttribute('data-letzte')) || 0;

    row.classList.toggle('has', !!menge);
    row.classList.toggle('chg', !!(menge && letzte && menge !== letzte));

    var minus = row.querySelector('[data-minus]');
    if (minus) minus.disabled = !menge;

    var feld = row.querySelector('[data-menge]');
    if (feld && document.activeElement !== feld) feld.value = menge;

    var tags = row.querySelector('.gk-tags');
    if (tags) tags.innerHTML = tagsHtml(a, menge, letzte);

    var sugg = row.querySelector('.gk-sugg');
    if (sugg) sugg.innerHTML = suggHtml(a, k, menge, letzte);

    var info = row.querySelector('.gk-kisteninfo');
    if (menge && a.preis) {
      if (!info) {
        info = document.createElement('span');
        info.className = 'gk-kisteninfo';
        row.querySelector('.gk-chips').appendChild(info);
      }
      info.textContent = eur(menge * a.preis);
    } else if (info) {
      info.remove();
    }

    frischeGruppe(a.gruppe);
    fusszeile();
  }

  /** Die Kistenzahl in der Warengruppen-Ueberschrift mitziehen. */
  function frischeGruppe(gruppe) {
    var kopf = $('gk-grp-' + slug(gruppe || ''));
    if (!kopf) return;
    var kisten = 0;
    katalog().forEach(function (x) {
      if (x.gruppe === gruppe) kisten += _menge[key(x)] || 0;
    });
    var sum = kopf.querySelector('.gsum');
    if (kisten) {
      if (!sum) {
        sum = document.createElement('span');
        sum.className = 'gsum';
        kopf.appendChild(sum);
      }
      sum.textContent = kisten + ' Kisten';
    } else if (sum) {
      sum.remove();
    }
  }

  function fusszeile() {
    var s = summen();
    var foot = $('gk-foot');
    if (!foot) return;
    var kann = s.positionen > 0 && inZukunft(_datum);
    /* „Alles leeren" und „Artikel anlegen" standen hier und schoben die
       Fußzeile auf 181 px — fast ein Drittel des Telefonbildschirms. Sie
       stehen jetzt am Listenende, wo man sie sucht (Spec F2). In der
       Fußzeile bleibt, was die Bestellung abschließt. */
    foot.innerHTML =
      '<span class="gk-st"><b>' + s.kisten + '</b> Kisten</span>'
      + '<span class="gk-st"><b>' + s.positionen + '</b> Positionen</span>'
      + '<span class="gk-st extra">Warenwert ca. <b>' + eur(s.wert) + '</b>'
      +   (s.ohnePreis ? ' <span title="Positionen ohne belegten Preis">(+' + s.ohnePreis
          + ' ohne Preis)</span>' : '') + '</span>'
      + '<span class="gk-st extra" title="Kistenpfand f\u00fcr alle Kisten. Berechnet wird nur, '
      +   'was nicht als Leergut zur\u00fcckgeht.">Pfand max. <b>' + eur(s.pfand) + '</b></span>'
      + '<button class="gk-send" id="gk-send"' + (kann ? '' : ' disabled') + '>'
      +   (_status ? 'Korrektur pr\u00fcfen &amp; senden' : 'Bestellung pr\u00fcfen &amp; senden') + '</button>'
      + (inZukunft(_datum) ? '' : '<span class="gk-st" style="flex:1 1 100%;color:#b91c1c">'
          + 'Dieser Liefertermin liegt nicht in der Zukunft. Bitte einen sp\u00e4teren Termin w\u00e4hlen.</span>');
    $('gk-send').onclick = vorschau;

    /* Warenwert und Pfand stehen auf dem Telefon nicht in der Fußzeile —
       sie sind Zusatzinfo und kosteten dort eine ganze Zeile. Im Blatt
       stehen sie vollständig. */
    var sum = $('gk-blatt-summen');
    if (sum) {
      sum.innerHTML = 'Warenwert ca. <b>' + eur(s.wert) + '</b>'
        + (s.ohnePreis ? ' (+' + s.ohnePreis + ' ohne Preis)' : '')
        + ' \u00b7 Pfand max. <b>' + eur(s.pfand) + '</b>';
    }

    // Am Listenende: anlegen und leeren.
    var liste = $('gk-list');
    if (liste) {
      var ende = document.createElement('div');
      ende.className = 'gk-listenende';
      ende.innerHTML = '<button class="gk-neuknopf" id="gk-neu">+ Artikel anlegen</button>'
        + (s.positionen ? '<button class="gk-leeren" id="gk-leeren">Alles leeren</button>' : '');
      liste.appendChild(ende);
      $('gk-neu').onclick = anlegenOeffnen;
      if ($('gk-leeren')) $('gk-leeren').onclick = leeren;
    }
  }

  // ══════════════════════════════════════════════════
  //  Ereignisse
  // ══════════════════════════════════════════════════

  function bindeAllgemein() {
    var h = host();
    if (!h) return;
    h.querySelectorAll('.gk-sub').forEach(function (b) {
      b.onclick = function () {
        _sub = b.dataset.sub;
        if (_sub === 'verlauf') { ladeVerlauf().then(zeichne); return; }
        zeichne();
      };
    });
  }

  function bindeBestellung() {
    $('gk-datum').addEventListener('change', function (e) {
      var neu = e.target.value;
      if (!neu) return;
      _datum = neu;
      ladeTag(_datum).catch(function () {
        toast('Der Termin konnte nicht geladen werden.');
      });
    });
    $('gk-take').addEventListener('click', uebernimmLetzte);
    $('gk-q').addEventListener('input', function (e) {
      _suche = e.target.value.trim();
      zeichneListe();
    });
    host().querySelectorAll('.gk-tgl button').forEach(function (b) {
      b.onclick = function () {
        _filter = b.dataset.filter;
        zeichne();
      };
    });
    var sprung = $('gk-jump');
    if (sprung) sprung.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || !b.dataset.jump) return;
      var ziel = $('gk-grp-' + b.dataset.jump);
      blattZeigen(false);
      if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Termin, Filter und Sprungmarken stehen im Blatt hinter dem „i".
    var mehr = $('gk-mehr');
    if (mehr) mehr.addEventListener('click', function () { blattZeigen(true); });
    var zu = $('gk-blatt-zu');
    if (zu) zu.addEventListener('click', function () { blattZeigen(false); });
    /* „Neue Bestellung" öffnet dasselbe Blatt und stellt den Termin scharf —
       ein Datum genügt, den Rest macht der Kiosk. */
    var neubest = $('gk-neubest');
    if (neubest) neubest.addEventListener('click', function () {
      blattZeigen(true);
      var d = $('gk-datum');
      if (d) {
        d.scrollIntoView({ block: 'center' });
        d.focus();
        if (d.showPicker) { try { d.showPicker(); } catch (e) { /* nicht überall erlaubt */ } }
      }
    });

    // Ein Zuhoerer fuer die ganze Liste: Die Zeilen werden bei jeder Aenderung
    // neu gezeichnet, einzeln gebundene Zuhoerer gingen dabei verloren.
    var liste = $('gk-list');
    liste.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.plus) setze(b.dataset.plus, (_menge[b.dataset.plus] || 0) + 1);
      else if (b.dataset.minus) setze(b.dataset.minus, (_menge[b.dataset.minus] || 0) - 1);
      else if (b.dataset.set) {
        var k = b.dataset.set, n = Number(b.dataset.n);
        setze(k, _menge[k] === n ? 0 : n);   // Nochmal tippen nimmt zurueck.
      }
    });
    liste.addEventListener('change', function (e) {
      // Beim Verlassen den angezeigten Wert bereinigen (leeres Feld -> 0).
      if (e.target.dataset && e.target.dataset.menge) {
        var k = e.target.dataset.menge;
        setze(k, e.target.value);
        e.target.value = _menge[k] || 0;
      }
    });
    /* Waehrend des Tippens mitrechnen, aber das Feld nicht anfassen: So
       kommen auch zweistellige Mengen an und der Cursor bleibt stehen. */
    liste.addEventListener('input', function (e) {
      if (e.target.dataset && e.target.dataset.menge) {
        setze(e.target.dataset.menge, e.target.value, true);
      }
    });
    liste.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.target.dataset || !e.target.dataset.menge) return;
      e.preventDefault();
      naechstesFeld(e.target.dataset.menge);
    });
  }

  // ══════════════════════════════════════════════════
  //  Artikel anlegen (Spec F7)
  // ══════════════════════════════════════════════════

  /** Wie beim Metzger: gleiche Bezeichnung ohne Sonderzeichen gilt als
   *  Dublette. Zwei gleich benannte Artikel wuerden in Vorbelegung und
   *  Verlauf verschmelzen. Gewarnt wird, verboten nicht (Spec F7.4). */
  function flach(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }

  function dublette(text) {
    var f = flach(text);
    return katalog().filter(function (a) {
      return flach(a.bestelltext) === f || flach(a.name) === f;
    })[0] || null;
  }

  function blatt(id, inhalt) {
    var alt = $(id);
    if (alt) alt.remove();
    var o = document.createElement('div');
    o.className = 'gk-overlay';
    o.id = id;
    o.innerHTML = '<div class="gk-dlg" role="dialog" aria-modal="true">' + inhalt + '</div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) { if (e.target === o) o.remove(); });
    var esc_ = function (e) {
      if (e.key === 'Escape') { o.remove(); document.removeEventListener('keydown', esc_); }
    };
    document.addEventListener('keydown', esc_);
    return o;
  }

  function anlegenOeffnen() {
    var gebinde = [];
    katalog().forEach(function (a) {
      if (a.gebinde && gebinde.indexOf(a.gebinde) < 0) gebinde.push(a.gebinde);
    });
    var o = blatt('gk-neu-blatt',
      '<header><h3>Neuer Artikel</h3>'
      + '<p>F\u00fcr Sorten, die noch auf keiner Rechnung standen \u2014 etwa eine '
      + 'neue Adelholzener-Saisonsorte.</p></header>'
      + '<div class="gk-body">'
      +   '<div class="gk-feld"><label for="gkn-text">Bezeichnung f\u00fcr die Bestellmail *</label>'
      +     '<input type="text" id="gkn-text" autocomplete="off" placeholder="z. B. Adelh. Rhabarber PET 0,5l">'
      +     '<span class="hilf">Genau so, wie es der Lieferant lesen soll.</span></div>'
      +   '<div class="gk-feldreihe">'
      +     '<div class="gk-feld"><label for="gkn-gebinde">Gebinde</label>'
      +       '<input type="text" id="gkn-gebinde" list="gkn-gebindeliste" placeholder="12x0,50">'
      +       '<datalist id="gkn-gebindeliste">' + gebinde.map(function (g) {
                return '<option value="' + esc(g) + '">';
              }).join('') + '</datalist></div>'
      +     '<div class="gk-feld"><label for="gkn-menge">Kisten</label>'
      +       '<input type="number" id="gkn-menge" min="1" max="99" value="1"></div>'
      +   '</div>'
      +   '<div class="gk-feld"><label for="gkn-gruppe">Warengruppe</label>'
      +     '<select id="gkn-gruppe">' + _gruppen.map(function (g) {
              return '<option value="' + esc(g) + '">' + esc(g) + '</option>';
            }).join('') + '</select></div>'
      +   '<div class="gk-feldreihe">'
      +     '<div class="gk-feld"><label for="gkn-nr">Artikel-Nr. beim Lieferanten</label>'
      +       '<input type="text" id="gkn-nr" placeholder="optional, z. B. KA50123"></div>'
      +     '<div class="gk-feld"><label for="gkn-preis">Preis je Kiste</label>'
      +       '<input type="text" id="gkn-preis" inputmode="decimal" placeholder="optional, z. B. 6,69"></div>'
      +   '</div>'
      +   '<label class="gk-haken"><input type="checkbox" id="gkn-dauer">'
      +     '<span><b>Dauerhaft in die Artikelliste \u00fcbernehmen.</b> Ohne Haken gilt '
      +     'der Artikel nur f\u00fcr diese eine Bestellung.</span></label>'
      +   '<div class="gk-warn" id="gkn-warn" hidden></div>'
      +   '<div class="gk-vorschau" id="gkn-vorschau"></div>'
      + '</div>'
      + '<footer><button class="ok" id="gkn-ok">Hinzuf\u00fcgen</button>'
      + '<button class="zu" id="gkn-zu">Abbrechen</button></footer>');

    var letzteGruppe = _gruppen.length ? _gruppen[_gruppen.length - 1] : '';
    $('gkn-gruppe').value = _gruppen.indexOf('Erfrischungsgetr\u00e4nke PET 0,5 l') >= 0
      ? 'Erfrischungsgetr\u00e4nke PET 0,5 l' : letzteGruppe;

    ['gkn-text', 'gkn-menge'].forEach(function (id) {
      $(id).addEventListener('input', neuVorschau);
    });
    $('gkn-text').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') anlegen();
    });
    $('gkn-ok').onclick = anlegen;
    $('gkn-zu').onclick = function () { o.remove(); };
    neuVorschau();
    $('gkn-text').focus();
  }

  function neuVorschau() {
    var text = ($('gkn-text').value || '').trim();
    var n = Math.max(1, Number($('gkn-menge').value) || 1);
    $('gkn-vorschau').innerHTML = text
      ? 'Zeile in der Mail:<br><b>' + n + (n === 1 ? ' Kiste ' : ' Kisten ') + esc(text) + '</b>'
      : 'Zeile in der Mail: \u2026 Bezeichnung eingeben';

    var doppelt = text ? dublette(text) : null;
    var warn = $('gkn-warn');
    if (doppelt) {
      warn.innerHTML = '\u201e' + esc(doppelt.name) + '\u201c (' + esc(doppelt.gebinde || '\u2014')
        + ') gibt es schon. Trotzdem anlegen? Besser: Blatt schlie\u00dfen und die '
        + 'vorhandene Zeile benutzen \u2014 dazu auf \u201eAlle Artikel\u201c umschalten.';
      warn.hidden = false;
    } else {
      warn.hidden = true;
    }
  }

  function anlegen() {
    var text = ($('gkn-text').value || '').trim();
    if (!text) {
      toast('Bitte eine Bezeichnung f\u00fcr die Bestellmail eintragen.');
      $('gkn-text').focus();
      return;
    }
    var menge = Math.max(1, Math.min(MAX_MENGE, Number($('gkn-menge').value) || 1));
    var gebinde = ($('gkn-gebinde').value || '').trim();
    var preis = Number(($('gkn-preis').value || '').replace(',', '.')) || null;
    var dauerhaft = $('gkn-dauer').checked;
    var nr = ($('gkn-nr').value || '').trim().toUpperCase();
    var gruppe = $('gkn-gruppe').value;

    var eintrag = {
      nummer: nr || ('NEU-' + (++_neuZaehler)),
      name: text, bestelltext: text, gebinde: gebinde, gruppe: gruppe,
      preis: preis, pfand: _pfand[gebinde] || null,
      bestellungen: 0, ueblich: null, aktiv: true,
      neu: true, dauerhaft: dauerhaft
    };
    _neu.push(eintrag);
    _menge[key(eintrag)] = menge;

    var blattEl = $('gk-neu-blatt');
    if (blattEl) blattEl.remove();
    // Damit die frische Zeile sicher sichtbar ist - unter "Uebliche Artikel"
    // fiele ein Artikel sonst durch den Filter.
    _suche = '';
    if ($('gk-q')) $('gk-q').value = '';
    zeichneListe();
    sichern();

    var ziel = host().querySelector('[data-key="' + (window.CSS && CSS.escape
      ? CSS.escape(key(eintrag)) : key(eintrag)) + '"]');
    if (ziel) ziel.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (!dauerhaft) {
      toast('\u201e' + text + '\u201c hinzugef\u00fcgt \u2014 gilt nur f\u00fcr diese Bestellung.');
      return;
    }
    dauerhaftAnlegen(eintrag, false);
  }

  function dauerhaftAnlegen(eintrag, trotzdem) {
    fetch(API + '/getraenke-artikel', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({
        nummer: eintrag.nummer.indexOf('NEU-') === 0 ? '' : eintrag.nummer,
        name: eintrag.name, bestelltext: eintrag.bestelltext,
        gebinde: eintrag.gebinde, gruppe: eintrag.gruppe,
        preis: eintrag.preis, trotzdem: !!trotzdem
      })
    })
      .then(function (r) {
        return r.json().then(function (d) { return { status: r.status, d: d }; });
      })
      .then(function (a) {
        if (a.status === 409) {
          frageDublette(eintrag, a.d && a.d.error);
          return;
        }
        if (!a.d || !a.d.success) {
          toast(fehlerText(a.d, 'Der Artikel konnte nicht dauerhaft gespeichert werden. '
            + 'Er gilt vorerst nur f\u00fcr diese Bestellung.'));
          eintrag.dauerhaft = false;
          zeichneListe();
          return;
        }
        uebernimmServerartikel(eintrag, a.d.artikel);
        toast('\u201e' + eintrag.name + '\u201c angelegt und dauerhaft in die '
          + 'Artikelliste \u00fcbernommen.');
      })
      .catch(function () {
        toast('Der Artikel konnte nicht dauerhaft gespeichert werden. '
          + 'Er gilt vorerst nur f\u00fcr diese Bestellung.');
        eintrag.dauerhaft = false;
        zeichneListe();
      });
  }

  /** Nach dem dauerhaften Anlegen zaehlt die Nummer, die der Server vergeben
   *  hat. Behielte der Kiosk seinen vorlaeufigen Schluessel ("NEU-1"), stuende
   *  die erfasste Menge unter einem Schluessel, den der Katalog nicht kennt -
   *  beim naechsten Laden waere die Zeile wieder leer, obwohl die Bestellung
   *  gespeichert ist. */
  function uebernimmServerartikel(eintrag, katalogNeu) {
    if (!katalogNeu || !katalogNeu.length) return;
    var f = flach(eintrag.name);
    var treffer = null;
    for (var i = katalogNeu.length - 1; i >= 0; i--) {
      if (flach(katalogNeu[i].name) === f) { treffer = katalogNeu[i]; break; }
    }
    if (!treffer) return;

    var menge = _menge[key(eintrag)] || 0;
    delete _menge[key(eintrag)];
    _neu = _neu.filter(function (a) { return a !== eintrag; });
    _artikel = katalogNeu;
    if (menge) _menge[key(treffer)] = menge;
    zeichneListe();
    sichern();
  }

  function frageDublette(eintrag, text) {    var o = blatt('gk-dub-blatt',
      '<header><h3>Artikel gibt es schon</h3></header>'
      + '<div class="gk-body"><div class="gk-warn">' + esc(text
        || 'Ein Artikel mit dieser Bezeichnung ist bereits angelegt.') + '</div>'
      + '<p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0">Zwei gleich '
      + 'benannte Artikel verschmelzen in Vorbelegung und Verlauf. F\u00fcr diese '
      + 'Bestellung ist der Artikel bereits erfasst.</p></div>'
      + '<footer><button class="ok" id="gkd-ok">Trotzdem dauerhaft anlegen</button>'
      + '<button class="zu" id="gkd-zu">Nur diese Bestellung</button></footer>');
    $('gkd-ok').onclick = function () { o.remove(); dauerhaftAnlegen(eintrag, true); };
    $('gkd-zu').onclick = function () {
      o.remove();
      eintrag.dauerhaft = false;
      zeichneListe();
      toast('\u201e' + eintrag.name + '\u201c gilt nur f\u00fcr diese Bestellung.');
    };
  }

  // ══════════════════════════════════════════════════
  //  Mailtext und Versand (Spec F9, F10)
  // ══════════════════════════════════════════════════

  function betreff() {
    var kw = kalenderwoche(_datum);
    return (_status ? 'Korrektur der Bestellung' : 'Bestellung')
      + ' f\u00fcr Dorfladen Oberornau' + (kw ? ' KW ' + kw : '');
  }

  /** Aufbau exakt wie in den bisher von Hand getippten Mails: je Warengruppe
   *  ein Block, getrennt durch eine Leerzeile. Die Bezeichnung ist die
   *  gewachsene Schreibweise des Ladens - bei Kratzer soll nichts
   *  Ungewohntes ankommen (Spec F9). */
  function mailtext() {
    var alle = katalog();
    // Gruppenreihenfolge wie im Server (_mail_text): bekannte Warengruppen
    // nach Katalograng, alles Uebrige alphabetisch dahinter. Eine Gruppe darf
    // nicht durchs Raster fallen - sonst zeigte die Vorschau weniger an, als
    // versendet wird.
    var vorhanden = [];
    alle.forEach(function (a) {
      if (!_menge[key(a)]) return;
      var g = a.gruppe || '';
      if (vorhanden.indexOf(g) < 0) vorhanden.push(g);
    });
    var rang = function (g) {
      var i = _gruppen.indexOf(g);
      return i < 0 ? _gruppen.length : i;
    };
    vorhanden.sort(function (a, b) {
      return (rang(a) - rang(b)) || (a < b ? -1 : a > b ? 1 : 0);
    });

    var bloecke = vorhanden.map(function (g) {
      return alle.filter(function (a) {
        return (a.gruppe || '') === g && _menge[key(a)];
      }).map(function (a) {
        var n = _menge[key(a)];
        return n + (n === 1 ? ' Kiste ' : ' Kisten ')
          + (a.bestelltext || ((a.name || '') + ' ' + (a.gebinde || '')).trim());
      }).join('\n');
    });

    var wt = langesDatum(_datum);
    return 'Guten Tag,\n\n'
      + (_status ? 'bitte korrigieren Sie unsere Bestellung - es gilt die folgende Liste'
                 : 'bitte liefern Sie uns')
      + ' zum ' + wt + ':\n\n'
      + bloecke.join('\n\n') + '\n\n'
      + 'Kd.-Nr. ' + (_cfg.kd_nr || '')
      + (_cfg.tour ? ', Tour ' + _cfg.tour : '') + '\n\n'
      + 'Mit freundlichen Gr\u00fc\u00dfen\nDorfladen Oberornau';
  }

  function vorschau() {
    var s = summen();
    if (!s.positionen) { toast('Es ist noch nichts bestellt.'); return; }
    if (!inZukunft(_datum)) {
      toast('Bitte einen Liefertermin in der Zukunft w\u00e4hlen.');
      return;
    }
    var o = blatt('gk-send-blatt',
      '<header><h3>' + (_status ? 'Korrektur senden' : 'Bestellung senden') + '</h3>'
      + '<p>An ' + esc(_cfg.empfaenger || '') + (_testbetrieb
          ? ' <b>(Testbetrieb \u2014 nicht an ' + esc(_cfg.name || 'den Lieferanten') + ')</b>'
          : '')
      + ' \u00b7 ' + s.positionen + ' Positionen \u00b7 ' + s.kisten + ' Kisten \u00b7 '
      + 'Warenwert ca. ' + eur(s.wert) + '</p></header>'
      + '<div class="gk-body"><pre id="gk-mailtext">' + esc(betreff() + '\n\n' + mailtext()) + '</pre></div>'
      + '<footer><button class="ok" id="gks-ok">Jetzt senden</button>'
      + '<button class="zu" id="gks-zu">Zur\u00fcck</button></footer>');
    $('gks-zu').onclick = function () { o.remove(); };
    $('gks-ok').onclick = function () {
      $('gks-ok').disabled = true;
      $('gks-ok').textContent = 'Wird gesendet \u2026';
      senden(o);
    };
  }

  function senden(o) {
    var korrektur = _status === 1 || _status === 2;
    fetch(API + '/getraenke-order/' + encodeURIComponent(_datum)
      + (korrektur ? '/korrektur' : '/senden'), {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ positionen: positionen(), wer: 'Kiosk' })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) {
          if ($('gks-ok')) {
            $('gks-ok').disabled = false;
            $('gks-ok').textContent = 'Jetzt senden';
          }
          toast(fehlerText(d, 'Die Bestellung konnte nicht versendet werden. '
            + 'Der Entwurf bleibt erhalten.'));
          return;
        }
        o.remove();
        _status = d.status || 1;
        // Einmalige Artikel gehoeren zu dieser Bestellung; mit ihr enden sie.
        var einmalig = _neu.filter(function (a) { return !a.dauerhaft; }).length;
        _neu = _neu.filter(function (a) { return a.dauerhaft; });
        zeichne();
        toast('Bestellung an ' + (d.empfaenger || _cfg.empfaenger) + ' gesendet.'
          + (einmalig ? ' ' + einmalig + ' einmalige(r) Artikel f\u00e4llt wieder weg.' : ''));
      })
      .catch(function () {
        if ($('gks-ok')) {
          $('gks-ok').disabled = false;
          $('gks-ok').textContent = 'Jetzt senden';
        }
        toast('Die Bestellung konnte nicht versendet werden. Der Entwurf bleibt erhalten.');
      });
  }

  // ══════════════════════════════════════════════════
  //  Artikelpflege (Spec F11)
  // ══════════════════════════════════════════════════

  function artikelAnsicht() {
    if (!_artikel.length) return '<div class="k-empty">Es sind noch keine Artikel hinterlegt.</div>';
    var html = '<div class="gk-panel"><h3>Artikel bei ' + esc(_cfg.name || 'Kratzer') + '</h3>'
      + '<p style="font-size:12px;color:#6b7280;line-height:1.5;margin:0 0 10px">'
      + 'Ausgeblendete Artikel verschwinden aus der Bestellliste, bleiben aber hier '
      + 'stehen. Gel\u00f6scht wird nichts \u2014 sonst rissen L\u00fccken in Vorbelegung '
      + 'und Verlauf.</p>';
    var gruppe = null;
    _artikel.forEach(function (a, i) {
      if (a.gruppe !== gruppe) {
        gruppe = a.gruppe;
        html += '<div class="gk-grp" style="margin-top:14px">' + esc(gruppe) + '</div>';
      }
      html += '<div class="gk-arow' + (a.aktiv === false ? ' aus' : '') + '">'
        + '<span class="gk-anr">' + esc(a.nummer || '\u2014') + '</span>'
        + '<span class="gk-anm">' + esc(a.name)
        + (a.aktiv === false ? '<span class="gk-tag aus">ausgeblendet</span>' : '') + '</span>'
        + '<span class="gk-anr">' + esc(a.gebinde || '\u2014') + '</span>'
        + '<span class="gk-anr">' + (a.preis ? eur(a.preis) : 'ohne Preis') + '</span>'
        + '<button data-aktiv="' + i + '">'
        + (a.aktiv === false ? 'Einblenden' : 'Ausblenden') + '</button>'
        + '</div>';
    });
    return html + '</div>';
  }

  function artikelUmschalten(i) {
    var a = _artikel[i];
    if (!a) return;
    fetch(API + '/getraenke-artikel', {
      method: 'PATCH', headers: authHeaders(),
      body: JSON.stringify({
        alt_nummer: a.nummer || '', alt_name: a.nummer ? '' : a.name,
        aktiv: a.aktiv === false
      })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) {
          toast(fehlerText(d, 'Die \u00c4nderung konnte nicht gespeichert werden.'));
          return;
        }
        _artikel = d.artikel || _artikel;
        zeichne();
        toast(a.aktiv === false ? '\u201e' + a.name + '\u201c wieder eingeblendet.'
                                : '\u201e' + a.name + '\u201c ausgeblendet.');
      })
      .catch(function () {
        toast('Die \u00c4nderung konnte nicht gespeichert werden.');
      });
  }

  function verlaufAnsicht() {
    if (!_verlauf.length) {
      return '<div class="k-empty">Es wurde noch keine Bestellung \u00fcber den '
        + 'Kiosk versendet.</div>';
    }
    return '<div class="gk-panel"><h3>Gesendete Bestellungen</h3><div class="gk-verlauf">'
      + _verlauf.map(function (v) {
          return '<div>' + esc(v.datum_de || v.datum) + ' \u00b7 KW ' + (v.kw || '')
            + '<span>' + (v.summen ? v.summen.kisten + ' Kisten \u00b7 '
              + v.summen.positionen + ' Positionen \u00b7 ' + eur(v.summen.wert) : '')
            + '</span>'
            + (v.status === 2 ? '<span>zuletzt korrigiert</span>' : '')
            + '</div>';
        }).join('') + '</div></div>';
  }

  // Ein Zuhoerer fuer die Artikelpflege - die Liste wird komplett neu gebaut.
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-aktiv]') : null;
    if (!b || !host() || !host().contains(b)) return;
    artikelUmschalten(Number(b.dataset.aktiv));
  });

  return {
    onShow: onShow,
    // Fuer Tests und die Konsole
    mailtext: mailtext, summen: summen, katalog: katalog,
    setze: setze, anlegenOeffnen: anlegenOeffnen
  };
})();

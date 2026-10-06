/* Drax-Bestellung im Kiosk (Spec specs/drax-bestellung/spec.md).
 *
 * Selbststaendiges Modul (window.KDrax), unabhaengig vom grossen K-Modul.
 * Nutzt /api/drax-order und /api/drax-artikel.
 *
 * Der Unterschied zum Metzger ist der Kern der Sache: Bei Drax gibt es kein
 * Portionsmodell. Die Muehle verkauft in festen Gebinden, und WELCHES Gebinde
 * gemeint ist, steckt bereits in der Artikelnummer - 40401, 40402, 40405 und
 * 40408 sind dasselbe Weizenmehl in 1 / 2,5 / 5 / 12,5 kg. Zu erfassen bleibt
 * deshalb nur eine Stueckzahl je Nummer. Das macht die Zeile schmal genug,
 * dass die Artikelnummer eine eigene Spalte bekommt: Danach sucht, wer das
 * Blatt gegenliest.
 *
 * Preise kommen hier bewusst nicht vor (Spec F3): Der Laden bestellt nach
 * Bedarf, nicht nach Budget, und eine Summe am Schirm haette nur zu Fragen
 * gefuehrt, die die Rechnung ohnehin beantwortet.
 */
window.KDrax = (function () {
  'use strict';

  var API = '/api';

  // ── Zustand ──
  var _b = null;            // aktuelle Bestellung {datum,status,positionen,…}
  var _artikel = [];        // Katalog, nach Warengruppe und Haeufigkeit
  var _gruppen = [];        // [{id,name}] in Formularreihenfolge
  var _cfg = {};
  var _tage = [];
  var _datum = '';
  var _sub = 'bestellung';
  var _suche = '';
  // Eigene Suche im Reiter „Artikel". Bewusst getrennt von `_suche`: Die
  // beiden Reiter zeigen verschiedene Listen, und ein beim Umschalten
  // mitwanderndes Suchwort haette den Artikelstamm unerwartet gefiltert.
  var _asuche = '';
  var _nurBestellt = false;
  var _verlauf = [];
  var _testbetrieb = true;
  var _vorbelegtAus = null;   // {art,text} - woher die Mengen stammen
  var _nurLesen = false;
  var _korrekturMoeglich = false;
  var _schluss = '';          // ISO-Zeitpunkt des Bestellschlusses
  var _verstrichen = false;
  var _dirty = false;
  var _korrektur = false;     // Gesendetes wird gerade nachtraeglich geaendert
  var _korrekturBasis = null; // Mengen bei Beginn der Korrektur
  var _mengen = {};           // nr -> Stueck, die Arbeitsfassung
  var _vorbelegt = {};        // nr -> true, solange unveraendert uebernommen
  var _speicherLauf = null;
  var _uhr = null;            // Zaehler fuer den Countdown im Kopf
  var _alleArtikel = [];      // Artikelstamm inkl. ausgeblendeter (Reiter)
  var _bearbeitet = null;     // Artikel, der gerade im Dialog liegt
  var _dlgJa = null;          // Rueckruf der offenen Rueckfrage
  var _vOffen = {};           // Liefertag -> Verlaufszeile aufgeklappt
  var _vDetail = {};          // Liefertag -> Positionen | 'laedt' | 'fehler'

  var TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag',
              'Freitag', 'Samstag'];
  var STATUS_ENTWURF = 0, STATUS_GESENDET = 1, STATUS_KORRIGIERT = 2;
  // So lange wartet das Speichern nach der letzten Eingabe. Kurz genug, dass
  // nichts verloren geht, lang genug, dass das Halten der Plus-Taste nicht
  // ein Dutzend Schreibvorgaenge ausloest.
  var SPEICHER_VERZUG = 1200;

  // ══════════════════════════════════════════════════
  //  Hilfen
  // ══════════════════════════════════════════════════

  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function host() { return document.getElementById('drax-body'); }

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

  function ikone(name) {
    return '<i data-lucide="' + name + '" style="width:16px;height:16px"></i>';
  }

  // ══════════════════════════════════════════════════
  //  Dialog (mittige Karte)
  // ══════════════════════════════════════════════════

  /* Dieselbe Dialogkarte wie bei Metzger, Bäcker und Getränken: Auf dem
     Telefon ein Blatt von unten, darüber mittig über abgedunkeltem Grund.
     Die Gestalt steckt in den gemeinsamen Regeln der Kiosk-Stylesheets
     (.dx-overlay / .dx-dlg) - so sieht die Artikelpflege in allen vier
     Bestellmodulen gleich aus. (Spec listen-harmonie, F9) */
  function dialog(inneres) {
    dlgZu();
    var ov = document.createElement('div');
    ov.id = 'dx-overlay';
    ov.className = 'dx-overlay';
    ov.innerHTML = '<div class="dx-dlg">' + inneres + '</div>';
    ov.addEventListener('click', function (e) { if (e.target === ov) dlgZu(); });
    document.body.appendChild(ov);
    if (window.dlRefreshIcons) window.dlRefreshIcons();
    var erstes = ov.querySelector('input, select, textarea');
    if (erstes) erstes.focus();
  }

  function dlgZu() {
    var ov = document.getElementById('dx-overlay');
    if (ov) ov.remove();
    _dlgJa = null;
  }

  /* Rückfrage vor einem Schritt, der sich nicht zurücknehmen lässt. Kein
     natives `confirm` (Konstitution 6) - es sieht auf jedem Gerät anders
     aus und lässt sich nicht lesbar formulieren. */
  function dlgFrage(titel, text, knopf, ja) {
    dialog('<div class="dx-dlg-h">' + ikone('help-circle') + ' ' + esc(titel)
      + '</div><div class="dx-dlg-b"><p class="dx-hint">' + esc(text) + '</p></div>'
      + '<div class="dx-dlg-f">'
      + '<button class="dx-btn" onclick="KDrax.dlgZu()">Abbrechen</button>'
      + '<button class="dx-send" onclick="KDrax.dlgJa()">' + esc(knopf)
      + '</button></div>');
    _dlgJa = ja;
  }

  function dlgJa() {
    var f = _dlgJa;
    dlgZu();
    if (typeof f === 'function') f();
  }

  function datumDe(iso) {
    if (!iso || iso.length < 10) return iso || '';
    return iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);
  }

  function wochentagVon(iso) {
    if (!iso || iso.length < 10) return '';
    // Bewusst aus den Feldern gebaut und nicht ueber Date.parse: Ein
    // ISO-Datum ohne Zeitzone gilt als UTC und kippt abends auf den Vortag.
    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    return TAGE[d.getDay()];
  }

  function gruppeName(id) {
    for (var i = 0; i < _gruppen.length; i++) {
      if (_gruppen[i].id === id) return _gruppen[i].name;
    }
    return id || 'Sonstiges';
  }

  function gesperrt() {
    if (_korrektur) return false;
    if (_nurLesen) return true;
    return _b ? _b.bestellbar === false : false;
  }

  function istGesendet() {
    var s = _b ? (_b.status || 0) : 0;
    return s === STATUS_GESENDET || s === STATUS_KORRIGIERT;
  }

  function summen() {
    var n = 0, st = 0;
    Object.keys(_mengen).forEach(function (nr) {
      if (_mengen[nr] > 0) { n++; st += _mengen[nr]; }
    });
    return { n: n, st: st, vorbelegt: Object.keys(_vorbelegt).length };
  }

  /** Die Arbeitsfassung als Liste, in der Reihenfolge des Katalogs. */
  function positionen() {
    var aus = [];
    _artikel.forEach(function (a) {
      if (_mengen[a.nr] > 0) aus.push({ nr: a.nr, menge: _mengen[a.nr] });
    });
    // Was im Katalog nicht (mehr) steht, darf trotzdem nicht verschwinden -
    // sonst faellt eine gespeicherte Position beim naechsten Speichern weg.
    var bekannt = {};
    _artikel.forEach(function (a) { bekannt[a.nr] = true; });
    Object.keys(_mengen).forEach(function (nr) {
      if (!bekannt[nr] && _mengen[nr] > 0) aus.push({ nr: nr, menge: _mengen[nr] });
    });
    return aus;
  }

  /** Mengen und Vorbelegungsmarken aus einer geladenen Bestellung ziehen. */
  function uebernehmen(order) {
    _mengen = {};
    _vorbelegt = {};
    (order.positionen || []).forEach(function (p) {
      if (!p || !p.nr) return;
      var m = parseInt(p.menge, 10);
      if (!(m > 0)) return;
      _mengen[p.nr] = m;
      // „uebernommen" heisst: aus einer frueheren Lieferung vorgeschlagen und
      // noch von niemandem bestaetigt. Die Marke faellt bei der ersten
      // Aenderung weg (Spec F2).
      if (p.uebernommen) _vorbelegt[p.nr] = true;
    });
  }

  // ══════════════════════════════════════════════════
  //  Laden
  // ══════════════════════════════════════════════════

  function onShow() {
    if (!_b) ladeUebersicht();
    else { render(); starteUhr(); }
  }

  function ladeUebersicht(danach) {
    return fetch(API + '/drax-order')
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
        var el = host();
        if (el) {
          el.innerHTML = '<div class="k-empty">Die Drax-Bestellung l\u00e4sst '
            + 'sich gerade nicht laden. Bitte sp\u00e4ter noch einmal '
            + 'versuchen.</div>';
        }
      });
  }

  function ladeBestellung(datum) {
    return fetch(API + '/drax-order/' + encodeURIComponent(datum))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _datum = datum;
        _b = d.bestellung || {};
        /* Die Zustandsangaben stehen NEBEN der Bestellung, nicht darin.
           Ohne dieses Nachziehen bliebe `bestellbar` undefined, und ein
           vergangener Liefertag boete weiter „Korrigieren" an. */
        _b.bestellbar = d.bestellbar;
        _artikel = d.artikel || [];
        _gruppen = d.gruppen || [];
        _cfg = d.config || _cfg;
        _testbetrieb = !!d.testbetrieb;
        _vorbelegtAus = d.vorbelegt_aus || null;
        _nurLesen = !!d.nur_lesen;
        _korrekturMoeglich = !!d.korrektur_moeglich;
        _schluss = d.bestellschluss || '';
        _verstrichen = !!d.schluss_verstrichen;
        _korrektur = false;
        _korrekturBasis = null;
        _dirty = false;
        uebernehmen(_b);
        render();
        starteUhr();
        badge();
      })
      .catch(function () {
        toast('Der Liefertag l\u00e4sst sich gerade nicht laden.');
      });
  }

  function ladeVerlauf() {
    return fetch(API + '/drax-order?mode=verlauf')
      .then(function (r) { return r.json(); })
      .then(function (d) { _verlauf = (d && d.verlauf) || []; render(); })
      .catch(function () { toast('Der Verlauf l\u00e4sst sich gerade nicht laden.'); });
  }

  function ladeArtikelstamm() {
    return fetch(API + '/drax-artikel', { headers: authHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _alleArtikel = d.artikel || [];
        if (d.gruppen && d.gruppen.length) _gruppen = d.gruppen;
        render();
      })
      .catch(function () {
        toast('Der Artikelstamm l\u00e4sst sich gerade nicht laden.');
      });
  }

  /* Erinnerung ab Bestellschluss (Spec F8): Der Reiter blinkt, bis die Mail
     raus ist. Im Testbetrieb bleibt er ruhig - eine Testbestellung soll
     niemanden aus dem Laden holen. */
  function badge() {
    var el = document.getElementById('badges-drax');
    var tab = document.querySelector('.k-tab[data-tab="drax"]');
    if (!el) return;
    var faellig = false;
    if (!_testbetrieb) {
      (_tage || []).forEach(function (t) {
        if (!t.bestellbar || !t.schluss_verstrichen) return;
        if (t.status === STATUS_GESENDET || t.status === STATUS_KORRIGIERT) return;
        faellig = true;
      });
    }
    el.innerHTML = faellig ? '<span class="k-badge st-new">!</span>' : '';
    if (tab) tab.classList.toggle('mb-blink', faellig);
  }

  // ══════════════════════════════════════════════════
  //  Bestellschluss
  // ══════════════════════════════════════════════════

  /* Drei Zustaende, drei Farben: noch Zeit, es eilt, erledigt. Der Countdown
     ist der eigentliche Zweck dieser Zeile - „Mittwoch 12:00" allein sagt
     niemandem, ob das heute in zwei Stunden ist oder erst naechste Woche. */
  function schlussZustand() {
    if (istGesendet() && !_korrektur) {
      return {
        art: 'gesendet',
        text: 'Bestellung f\u00fcr ' + datumDe(_datum) + ' ist versendet.'
          + (_korrekturMoeglich
            ? ' \u00c4nderungen nur noch \u00fcber \u201eKorrektur senden\u201c.'
            : '')
      };
    }
    if (_b && _b.bestellbar === false) {
      return { art: 'gesendet', text: 'Dieser Liefertag ist vorbei \u2013 '
        + 'nur noch zum Nachsehen.' };
    }
    if (!_schluss) return { art: 'offen', text: '' };
    var ziel = new Date(_schluss);
    var jetzt = new Date();
    if (_verstrichen || jetzt >= ziel) {
      return { art: 'eilt', text: 'Der Bestellschluss war '
        + wochentagVon(_schluss.slice(0, 10)) + ', ' + datumDe(_schluss.slice(0, 10))
        + ' um ' + _schluss.slice(11, 16) + ' Uhr \u2013 bitte sofort senden '
        + 'oder bei der M\u00fchle anrufen.' };
    }
    var min = Math.floor((ziel - jetzt) / 60000);
    var rest;
    if (min < 60) rest = 'noch ' + min + ' Minute' + (min === 1 ? '' : 'n');
    else if (min < 48 * 60) {
      var std = Math.floor(min / 60);
      rest = 'noch ' + std + ' Stunde' + (std === 1 ? '' : 'n');
    } else rest = 'noch ' + Math.floor(min / 1440) + ' Tage';
    return { art: 'offen', text: 'Bestellschluss: '
      + wochentagVon(_schluss.slice(0, 10)) + ', ' + datumDe(_schluss.slice(0, 10))
      + ' um ' + _schluss.slice(11, 16) + ' Uhr (' + rest + ').' };
  }

  /* Der Countdown wird nicht neu gezeichnet, sondern nur beschriftet: Ein
     render() je Minute haette den Rollstand und offene Eingabefelder
     getroffen. */
  function starteUhr() {
    if (_uhr) clearInterval(_uhr);
    _uhr = setInterval(function () {
      var el = document.getElementById('dx-schluss');
      if (!el) { clearInterval(_uhr); _uhr = null; return; }
      var z = schlussZustand();
      el.className = 'dx-schluss ' + z.art;
      el.textContent = z.text;
    }, 60000);
  }

  // ══════════════════════════════════════════════════
  //  Darstellung
  // ══════════════════════════════════════════════════

  function render() {
    var el = host();
    if (!el) return;
    if (!_b) { el.innerHTML = '<div class="k-empty">Laden\u2026</div>'; return; }

    /* Fester Kopf, rollende Liste, feste Fussleiste - das Hausgeruest aus
       Abschnitt 15 des Kiosk-CSS (Spec kiosk-bestellreiter-mobil). Ohne die
       Klasse waechst das Panel mit dem Inhalt und die Sendeknoepfe liegen
       auf dem Telefon unter dem Bildschirmrand. Artikelstamm und Verlauf
       sind Lesetexte und rollen wie gewohnt am Stueck. */
    var panel = document.getElementById('panel-drax');
    if (panel) panel.classList.toggle('k-geteilt', _sub === 'bestellung');

    /* Der Rollstand der Liste muss das Neuzeichnen ueberleben - sonst
       springt die Liste bei jeder Mengenaenderung an den Anfang. */
    var alt = el.querySelector('.dx-liste');
    var stand = alt ? alt.scrollTop : 0;

    var h = '<div class="dx">';
    if (_sub === 'bestellung') {
      h += renderBestellung();
    } else {
      h += '<div class="mb-kopffest">' + subTabs() + '</div>';
      if (_sub === 'verlauf') h += verlaufAnsicht();
      else if (_sub === 'artikel') h += artikelAnsicht();
      else h += hinweisEinstellungen();
    }
    h += '</div>';
    el.innerHTML = h;

    if (_sub === 'bestellung') {
      var neu = el.querySelector('.dx-liste');
      if (neu && stand) neu.scrollTop = stand;
      fuss();
    }
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  function renderBestellung() {
    var h = '<div class="dx-fest">';
    h += subTabs();
    h += tagesleiste();
    var z = schlussZustand();
    h += '<div class="dx-schluss ' + z.art + '" id="dx-schluss">' + esc(z.text) + '</div>';
    h += kontextZeile();
    h += '<div class="dx-bar">'
      + '<input type="search" id="dx-q" placeholder="Artikel oder Nummer suchen \u2026"'
      + ' value="' + esc(_suche) + '" oninput="KDrax.such(this.value)">'
      + '<div class="dx-tgl">'
      + '<button class="' + (_nurBestellt ? '' : 'on') + '"'
      + ' onclick="KDrax.filter(\'alle\')">Alle</button>'
      + '<button class="' + (_nurBestellt ? 'on' : '') + '"'
      + ' onclick="KDrax.filter(\'best\')">Nur bestellt</button>'
      + '</div></div>';
    h += sprungleiste();
    h += '</div>';
    h += liste();
    h += '<div class="dx-foot" id="dx-foot"></div>';
    return h;
  }

  function subTabs() {
    function b(id, label) {
      return '<button class="mb-sub' + (_sub === id ? ' on' : '') + '"'
        + ' onclick="KDrax.sub(\'' + id + '\')">' + label + '</button>';
    }
    /* Kein Zaehler am Reiter: Die nackte Zahl war nicht zu deuten - die
       Fussleiste nennt Positionen und Stueck ohnehin mit Worten. Beim
       Baecker bedeutet dasselbe Plaettchen die Groesse des Katalogs; ein
       Gestaltungsmittel mit zwei Bedeutungen ist schlechter als keines.

       Auch kein "Einstellungen"-Reiter mehr: Stammdaten werden im CMS
       gepflegt - so wie bei Metzger, Baecker und Getraenken. Der Kiosk ist
       die Arbeitsflaeche der Verkaeuferinnen, nicht die Verwaltung. */
    return '<div class="mb-subs">' + b('bestellung', 'Bestellung')
      + b('verlauf', 'Verlauf') + b('artikel', 'Artikel') + '</div>';
  }

  function tagesleiste() {
    // Beschriftung, damit unmissverstaendlich ist, wofuer die Plaettchen
    // stehen: Es sind LIEFERtage, nicht die Tage, an denen bestellt wird.
    var h = '<div class="dx-days-lbl">Liefertag w\u00e4hlen</div><div class="dx-days">';
    (_tage || []).forEach(function (t) {
      var cls = 'dx-day';
      if (t.datum === _datum) cls += ' on';
      if (t.status === STATUS_GESENDET) cls += ' sent';
      if (t.status === STATUS_KORRIGIERT) cls += ' korr';
      if (!t.bestellbar) cls += ' off';
      var unten;
      if (t.status === STATUS_KORRIGIERT) unten = 'korrigiert';
      else if (t.status === STATUS_GESENDET) unten = 'gesendet';
      else if (t.positionen) unten = t.positionen + ' Pos.';
      else if (!t.bestellbar) unten = 'vorbei';
      else if (t.schluss_verstrichen) unten = 'Schluss vorbei';
      else unten = (t.wochentag || '').slice(0, 2);
      h += '<button class="' + cls + '" onclick="KDrax.tagWahl(\''
        + t.datum + '\')">' + esc(t.datum.slice(8) + '.' + t.datum.slice(5, 7) + '.')
        + '<span class="d2">' + esc(unten) + '</span></button>';
    });
    return h + '</div>';
  }

  /* Zwei Textzeilen: wer liefert und in welchem Zustand die Bestellung ist.
     Der Liefertag steht in der markierten Kachel darueber, nicht doppelt. */
  /* Woher die Mengen stammen, ist die wichtigste Auskunft der Zeile (F2) -
     sie darf nicht vom Testbetriebs-Hinweis verdraengt werden. Der laeuft,
     bis die Bestelladresse der Muehle freigegeben ist, also womoeglich
     wochenlang. Deshalb bekommt er ein eigenes Schild neben der Anschrift. */
  function kontextZeile() {
    var gesendet = istGesendet() && !_korrektur;
    var prot = (_b.protokoll || []);
    var letzte = prot.length ? prot[prot.length - 1] : null;
    var cls = 'dx-kontext' + (gesendet ? ' gesendet' : '') + (_testbetrieb ? ' test' : '');
    var z2;
    if (_korrektur) z2 = 'Korrektur \u2013 Mengen \u00e4ndern, dann senden';
    else if (gesendet) {
      z2 = (_b.status === STATUS_KORRIGIERT ? 'Korrigiert' : 'Gesendet')
        + (letzte && letzte.zeit ? ' am ' + esc(letzte.zeit.slice(0, 16).replace('T', ' um ')) : '');
    } else if (_b.bestellbar === false) z2 = 'Dieser Liefertag ist vorbei';
    else if (_vorbelegtAus && _vorbelegtAus.text) z2 = _vorbelegtAus.text;
    else z2 = 'Noch nicht gesendet';
    return '<div class="' + cls + '">'
      + '<div class="ico">' + ikone(gesendet ? 'check-circle' : 'wheat') + '</div>'
      + '<div class="txt"><div class="z1">Drax M\u00fchle'
      + (_cfg.kd_nr ? ' \u00b7 KDNr ' + esc(_cfg.kd_nr) : '')
      + (_testbetrieb ? '<span class="dx-test">Testbetrieb</span>' : '') + '</div>'
      + '<div class="z2">' + esc(z2) + '</div></div></div>';
  }

  function sprungleiste() {
    var zahl = {};
    _artikel.forEach(function (a) { zahl[a.gruppe] = (zahl[a.gruppe] || 0) + 1; });
    var h = '';
    _gruppen.forEach(function (g) {
      if (!zahl[g.id]) return;
      h += '<button onclick="KDrax.springe(\'' + esc(g.id) + '\')">'
        + esc(g.name) + ' <span>' + zahl[g.id] + '</span></button>';
    });
    return h ? '<div class="dx-jump">' + h + '</div>' : '';
  }

  function sichtbar(a) {
    if (_nurBestellt && !(_mengen[a.nr] > 0)) return false;
    var q = _suche.trim().toLowerCase();
    if (!q) return true;
    return (a.name + ' ' + a.nr + ' ' + (a.kassenname || '')).toLowerCase()
      .indexOf(q) >= 0;
  }

  function liste() {
    var h = '<div class="dx-liste k-liste">', letzte = null, n = 0;
    var sperre = gesperrt();
    _artikel.forEach(function (a) {
      if (!sichtbar(a)) return;
      n++;
      if (a.gruppe !== letzte) {
        if (letzte !== null) h += '</div>';
        letzte = a.gruppe;
        h += '<div class="dx-grp" data-gruppe="' + esc(a.gruppe) + '">'
          + esc(gruppeName(a.gruppe)) + '</div><div class="dx-grpbox">';
      }
      h += zeile(a, sperre);
    });
    if (letzte !== null) h += '</div>';
    h += '</div>';
    if (!n) {
      return '<div class="dx-liste k-liste"><div class="k-empty">'
        + (_nurBestellt
          ? 'Noch nichts bestellt. \u00dcber \u201eAlle\u201c kommen Sie zur '
            + 'vollst\u00e4ndigen Liste.'
          : 'Kein Artikel passt zur Suche.')
        + '</div></div>';
    }
    return h;
  }

  function zeile(a, sperre) {
    var m = _mengen[a.nr] || 0;
    var cls = 'dx-row';
    if (m > 0) cls += _vorbelegt[a.nr] ? ' vor' : ' has';
    if (sperre) cls += ' fest';
    var h = '<div class="' + cls + '">'
      + '<div class="dx-nr">' + esc(a.nr) + '</div>'
      + '<div class="dx-nm">' + esc(a.name)
      + (a.einheit ? '<span class="dx-eh">' + esc(a.einheit) + '</span>'
                   : '<span class="dx-eh stk">St\u00fcck</span>')
      + (_vorbelegt[a.nr] ? '<span class="dx-tag vor">\u00fcbernommen</span>' : '')
      + (a.kassenname
        ? '<span class="dx-alt">Kasse: ' + esc(a.kassenname) + '</span>' : '')
      + '</div>';
    if (sperre) {
      h += '<div class="dx-cnt fest">' + (m > 0 ? '<b>' + m + '</b>' : '\u2013') + '</div>';
    } else {
      h += '<div class="dx-cnt">'
        + '<button type="button" aria-label="weniger ' + esc(a.name) + '"'
        + ' onclick="KDrax.plus(\'' + esc(a.nr) + '\',-1)">\u2212</button>'
        + '<input inputmode="numeric" aria-label="Menge ' + esc(a.name) + '"'
        + ' value="' + (m || '') + '" onchange="KDrax.setz(\'' + esc(a.nr) + '\',this.value)">'
        + '<button type="button" aria-label="mehr ' + esc(a.name) + '"'
        + ' onclick="KDrax.plus(\'' + esc(a.nr) + '\',1)">+</button>'
        + '</div>';
    }
    return h + '</div>';
  }

  function fuss() {
    var el = document.getElementById('dx-foot');
    if (!el) return;
    var s = summen();
    var h = '<span class="dx-st"><b>' + s.n + '</b> Positionen</span>'
      + '<span class="dx-st"><b>' + s.st + '</b> St\u00fcck</span>';
    if (s.vorbelegt) {
      h += '<span class="dx-st uebern"><b>' + s.vorbelegt + '</b> \u00fcbernommen</span>';
    }
    if (_korrektur) {
      // Kein Entwurfs-Speichern waehrend der Korrektur: Das wuerde die
      // gesendete Bestellung ueberschreiben, bevor die Mail heraus ist.
      h += '<button class="dx-btn" onclick="KDrax.verwerfen()">Verwerfen</button>'
        + '<button class="dx-send" onclick="KDrax.korrekturSenden()">Korrektur senden</button>';
    } else if (istGesendet()) {
      h += '<button class="dx-btn" onclick="KDrax.formular()">Formular ansehen</button>';
      if (_korrekturMoeglich) {
        h += '<button class="dx-btn" onclick="KDrax.korrektur()">Korrigieren</button>';
      } else {
        h += '<span class="dx-note">' + ikone('lock')
          + ' Geliefert \u2013 nur zum Nachsehen</span>';
      }
    } else if (gesperrt()) {
      h += '<span class="dx-note">' + ikone('lock')
        + ' Dieser Liefertag ist vorbei</span>';
    } else {
      h += '<span class="dx-autosave" id="dx-autosave"></span>'
        + '<button class="dx-btn" onclick="KDrax.speichern()">Speichern</button>'
        + '<button class="dx-send"' + (s.n ? '' : ' disabled')
        + ' onclick="KDrax.senden()">Bestellung senden</button>';
    }
    el.innerHTML = h;
    if (window.lucide && lucide.createIcons) lucide.createIcons();
  }

  // ══════════════════════════════════════════════════
  //  Mengen
  // ══════════════════════════════════════════════════

  function setzeMenge(nr, m) {
    if (!(m > 0)) delete _mengen[nr];
    else _mengen[nr] = m;
    // Angefasst ist bestaetigt: Die blaue Marke faellt weg, sobald jemand
    // die vorgeschlagene Menge veraendert (Spec F2).
    delete _vorbelegt[nr];
    _dirty = true;
    planeSpeichern();
  }

  function plus(nr, d) {
    setzeMenge(nr, (_mengen[nr] || 0) + d);
    zeichneZeile(nr);
  }

  function setz(nr, wert) {
    var m = parseInt(String(wert).replace(/\D/g, ''), 10);
    setzeMenge(nr, m > 0 ? m : 0);
    zeichneZeile(nr);
  }

  /* Nur die eine Zeile neu zeichnen, nicht die ganze Liste: Bei 96 Artikeln
     kostete ein voller Durchlauf je Tastendruck spuerbar Zeit, und der
     Rollstand musste jedes Mal gerettet werden. */
  function zeichneZeile(nr) {
    var el = host();
    if (!el) return;
    var a = null;
    for (var i = 0; i < _artikel.length; i++) {
      if (_artikel[i].nr === nr) { a = _artikel[i]; break; }
    }
    var felder = el.querySelectorAll('.dx-row');
    for (var j = 0; j < felder.length; j++) {
      var nrEl = felder[j].querySelector('.dx-nr');
      if (!nrEl || nrEl.textContent !== nr) continue;
      if (_nurBestellt && !(_mengen[nr] > 0)) { render(); return; }
      if (a) {
        var huelle = document.createElement('div');
        huelle.innerHTML = zeile(a, gesperrt());
        felder[j].replaceWith(huelle.firstChild);
      }
      break;
    }
    fuss();
    var sub = el.querySelector('.mb-subs .dx-cnt');
    if (sub) sub.textContent = summen().n;
  }

  function such(wert) {
    _suche = wert || '';
    // Nur die Liste neu aufbauen - sonst verloere das Suchfeld den Fokus.
    var el = host();
    if (!el) return;
    var alt = el.querySelector('.dx-liste');
    if (!alt) { render(); return; }
    var huelle = document.createElement('div');
    huelle.innerHTML = liste();
    alt.replaceWith(huelle.firstChild);
  }

  function filter(was) {
    _nurBestellt = was === 'best';
    render();
  }

  function springe(gid) {
    _suche = '';
    _nurBestellt = false;
    render();
    var el = host();
    if (!el) return;
    var ziel = el.querySelector('.dx-grp[data-gruppe="' + gid + '"]');
    var liste = el.querySelector('.dx-liste');
    if (ziel && liste) liste.scrollTop = ziel.offsetTop - liste.offsetTop - 6;
  }

  function tagWahl(datum) {
    if (datum === _datum) return;
    var weiter = function () { ladeBestellung(datum); };
    if (_dirty && !_korrektur) { speichern(true).then(weiter, weiter); return; }
    if (_korrektur) {
      dlgFrage('Korrektur verwerfen?',
        'Die Korrektur ist noch nicht gesendet. Beim Wechsel des Liefertags '
        + 'geht sie verloren.', 'Trotzdem wechseln', weiter);
      return;
    }
    weiter();
  }

  function sub(id) {
    _sub = id;
    if (id === 'verlauf' && !_verlauf.length) { ladeVerlauf(); return; }
    if (id === 'artikel' && !_alleArtikel.length) { ladeArtikelstamm(); return; }
    render();
  }

  // ══════════════════════════════════════════════════
  //  Speichern und Senden
  // ══════════════════════════════════════════════════

  function planeSpeichern() {
    if (_korrektur || gesperrt()) return;
    if (_speicherLauf) clearTimeout(_speicherLauf);
    var el = document.getElementById('dx-autosave');
    if (el) el.textContent = '';
    _speicherLauf = setTimeout(function () { speichern(true); }, SPEICHER_VERZUG);
  }

  function speichern(still) {
    if (_speicherLauf) { clearTimeout(_speicherLauf); _speicherLauf = null; }
    if (gesperrt() || _korrektur) return Promise.resolve();
    var el = document.getElementById('dx-autosave');
    if (el) el.textContent = 'Speichert \u2026';
    return fetch(API + '/drax-order/' + encodeURIComponent(_datum) + '/speichern', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ positionen: positionen() })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _dirty = false;
        var e2 = document.getElementById('dx-autosave');
        if (e2) e2.textContent = 'Gespeichert';
        if (!still) toast('Der Entwurf ist gespeichert.');
        tagZahlAktualisieren();
      })
      .catch(function (e) {
        var e2 = document.getElementById('dx-autosave');
        if (e2) e2.textContent = '';
        toast(e.message || 'Der Entwurf konnte nicht gespeichert werden.');
      });
  }

  /** Die Kachel des aktuellen Tages mitziehen, ohne neu zu laden. */
  function tagZahlAktualisieren() {
    var s = summen();
    (_tage || []).forEach(function (t) {
      if (t.datum === _datum) t.positionen = s.n;
    });
  }

  function senden() {
    var s = summen();
    if (!s.n) { toast('Es ist noch nichts bestellt.'); return; }
    var wohin = _testbetrieb
      ? 'An die Testadresse ' + (_cfg.empfaenger || '') + ' \u2013 die M\u00fchle '
        + 'bekommt nichts.'
      : 'An ' + (_cfg.empfaenger || 'die M\u00fchle') + '.';
    dlgFrage('Bestellung senden?',
      wochentagVon(_datum) + ', ' + datumDe(_datum) + ' \u2013 ' + s.n
      + ' Positionen, ' + s.st + ' St\u00fcck. ' + wohin + ' Danach ist der '
      + 'Tag gesperrt; \u00c4nderungen gehen nur noch als Korrektur.',
      'Senden', function () { sendeLauf('senden', false); });
  }

  function korrektur() {
    _korrektur = true;
    _korrekturBasis = JSON.parse(JSON.stringify(_mengen));
    render();
    toast('Korrektur begonnen. Die M\u00fchle bekommt ein neues Blatt mit '
      + 'Korrekturvermerk.');
  }

  function verwerfen() {
    dlgFrage('Korrektur verwerfen?',
      'Die begonnene Korrektur wird verworfen; es gilt wieder der gesendete '
      + 'Stand.', 'Verwerfen', function () {
        if (_korrekturBasis) _mengen = _korrekturBasis;
        _korrektur = false;
        _korrekturBasis = null;
        render();
      });
  }

  function korrekturSenden() {
    var s = summen();
    if (!s.n) {
      toast('Eine Korrektur ohne Position geht nicht. Zum vollst\u00e4ndigen '
        + 'Widerruf bitte bei der M\u00fchle anrufen.');
      return;
    }
    dlgFrage('Korrektur senden?',
      datumDe(_datum) + ' \u2013 ' + s.n + ' Positionen, ' + s.st
      + ' St\u00fcck. Die M\u00fchle erh\u00e4lt ein Blatt mit '
      + 'Korrekturvermerk; entfallene Positionen stehen durchgestrichen '
      + 'darauf.', 'Korrektur senden',
      function () { sendeLauf('korrektur', true); });
  }

  function sendeLauf(aktion, istKorrektur) {
    var knopf = document.querySelector('#dx-foot .dx-send');
    if (knopf) { knopf.disabled = true; knopf.textContent = 'Wird gesendet \u2026'; }
    fetch(API + '/drax-order/' + encodeURIComponent(_datum) + '/' + aktion, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ positionen: positionen(), wer: wer() })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _korrektur = false;
        _korrekturBasis = null;
        _dirty = false;
        toast(d.testbetrieb
          ? 'Testbestellung versendet \u2013 die M\u00fchle hat nichts bekommen.'
          : (istKorrektur ? 'Die Korrektur ist bei der M\u00fchle.'
                          : 'Die Bestellung ist bei der M\u00fchle.'));
        return ladeUebersicht(_datum);
      })
      .catch(function (e) {
        toast(e.message || 'Die Bestellung konnte nicht versendet werden.');
        render();
      });
  }

  function wer() {
    try {
      return (window.K && K.benutzerName && K.benutzerName()) || 'Kiosk';
    } catch (e) { return 'Kiosk'; }
  }

  /** Das gesendete Formular ansehen - genau das Blatt, das die Muehle hat. */
  function formular() {
    window.open(API + '/drax-order/' + encodeURIComponent(_datum) + '/dokument',
      '_blank', 'noopener');
  }

  // ══════════════════════════════════════════════════
  //  Verlauf
  // ══════════════════════════════════════════════════

  function verlaufAnsicht() {
    if (!_verlauf.length) {
      return '<div class="k-empty">Noch keine Lieferungen erfasst.</div>';
    }
    var h = '<div class="dx-card"><h3>Bisherige Lieferungen</h3>'
      + '<p class="dx-hint">Die \u00e4lteren Zeilen stammen aus den '
      + 'Rechnungen der M\u00fchle \u2013 sie zeigen, was tats\u00e4chlich '
      + 'geliefert wurde, auch aus der Zeit vor diesem Bestellschirm. '
      + 'Antippen zeigt die einzelnen Positionen.</p>'
      + '<div class="dl-vliste">';
    _verlauf.forEach(function (l) { h += verlaufZeile(l); });
    return h + '</div></div>';
  }

  function verlaufZeile(l) {
    var offen = !!_vOffen[l.datum];
    var eigen = l.quelle === 'bestellung';
    var h = '<div class="dl-vzeile' + (offen ? ' auf' : '') + '">'
      + '<div class="dl-vkopf" onclick="KDrax.verlaufAuf(\''
      + esc(l.datum) + '\')">'
      + ikone(offen ? 'chevron-down' : 'chevron-right')
      + '<b>' + esc(datumDe(l.datum)) + '</b>'
      + '<span class="dx-pill ' + (l.ausnahme ? 'ab' : 'do') + '">'
      + esc(l.wochentag || '') + (l.ausnahme ? ' \u2013 Ausnahme' : '')
      + '</span>'
      + '<span class="dl-vstatus">' + (l.positionen || 0) + ' Positionen, '
      + (l.stueck || 0) + ' St\u00fcck</span>'
      + '<span class="dl-vstatus">' + (eigen ? 'eigene Bestellung'
          : 'Rechnung ' + esc(l.rechnung || '')) + '</span>'
      + '</div>';
    if (offen) h += verlaufDetail(l);
    h += '<div class="dl-vfuss">';
    if (eigen && l.hat_dokument) {
      h += '<a class="dx-btn klein" href="' + API + '/drax-order/'
        + encodeURIComponent(l.datum) + '/dokument" target="_blank"'
        + ' rel="noopener">' + ikone('file-text') + ' Formular</a>';
    }
    // Rechnungszeilen sind Belege der Muehle - sie lassen sich nicht loeschen.
    if (eigen) {
      h += '<button class="dx-btn klein weg" onclick="KDrax.bestellungWeg(\''
        + esc(l.datum) + '\')">' + ikone('trash-2') + ' L\u00f6schen</button>';
    }
    return h + '</div></div>';
  }

  function verlaufDetail(l) {
    var d = _vDetail[l.datum];
    if (d === 'laedt') return '<div class="dl-vliste2">Wird geladen \u2026</div>';
    if (d === 'fehler') {
      return '<div class="dl-vliste2">Die Positionen konnten nicht geladen '
        + 'werden.</div>';
    }
    if (!d || !d.length) {
      return '<div class="dl-vliste2">Zu diesem Tag sind keine Positionen '
        + 'hinterlegt.</div>';
    }
    var h = '<div class="dl-vliste2"><table class="dl-vtab"><thead><tr>'
      + '<th>Nr</th><th>Artikel</th><th class="r">Menge</th>'
      + '</tr></thead><tbody>';
    d.forEach(function (p) {
      h += '<tr><td>' + esc(p.nr || '') + '</td><td>' + esc(p.name || '')
        + (p.einheit ? ' <span class="dx-eh">' + esc(p.einheit) + '</span>' : '')
        + '</td><td class="r">' + (p.menge || 0) + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  function verlaufAuf(datum) {
    if (_vOffen[datum]) {
      delete _vOffen[datum];
      render();
      return;
    }
    _vOffen[datum] = true;
    // Positionen erst beim Aufklappen holen - der Verlauf reicht Jahre
    // zurueck, alles vorab zu laden waere Verschwendung.
    if (_vDetail[datum] === undefined) {
      _vDetail[datum] = 'laedt';
      fetch(API + '/drax-order/' + encodeURIComponent(datum) + '/positionen', {
        headers: authHeaders()
      })
        .then(function (r) { return r.json(); })
        .then(function (dd) {
          if (!dd || !dd.success) throw new Error(fehlerText(dd, ''));
          _vDetail[datum] = dd.positionen || [];
          render();
        })
        .catch(function () { _vDetail[datum] = 'fehler'; render(); });
    }
    render();
  }

  function bestellungWeg(datum) {
    dlgFrage('Bestellung l\u00f6schen?',
      datumDe(datum) + ': Die gespeicherte Bestellung wird entfernt. Eine '
      + 'bereits versendete E-Mail holt das nicht zur\u00fcck \u2013 dazu '
      + 'bitte bei der M\u00fchle anrufen.', 'L\u00f6schen', function () {
        fetch(API + '/drax-order/' + encodeURIComponent(datum) + '/loeschen', {
          method: 'POST', headers: authHeaders(), body: '{}'
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.success) throw new Error(fehlerText(d, ''));
            delete _vOffen[datum];
            delete _vDetail[datum];
            toast('Die Bestellung ist gel\u00f6scht.');
            if (datum === _datum) ladeBestellung(datum);
            return ladeVerlauf();
          })
          .catch(function (e) {
            toast(e.message || 'Die Bestellung konnte nicht gel\u00f6scht werden.');
          });
      });
  }

  // ══════════════════════════════════════════════════
  //  Artikelstamm
  // ══════════════════════════════════════════════════

  /* Dieselben Bausteine wie bei Metzger, Bäcker und Getränken: Zähler,
     Suche und der grüne Knopf im Kopf, darunter je Warengruppe ein
     .dl-liste mit .dl-zeile. Die frühere Tabelle war der einzige
     Artikelstamm im Kiosk, der anders aussah. (Spec listen-harmonie) */
  function artikelAnsicht() {
    var treffer = _alleArtikel.filter(passtZurArtikelsuche);
    var h = '<div class="dx-card">'
      + '<div class="dx-akopf">'
      + '<span class="dx-azahl">' + (_asuche
        ? treffer.length + ' von ' + _alleArtikel.length
        : _alleArtikel.length + ' Artikel') + '</span>'
      + '<input type="search" class="dx-asuche" id="dx-aq"'
      + ' placeholder="Artikel oder Nummer suchen \u2026"'
      + ' value="' + esc(_asuche) + '" oninput="KDrax.asuch(this.value)">'
      + '<button class="dx-send" onclick="KDrax.neuMaske()">'
      + '+ Neuer Artikel</button></div>'
      + '<p class="dx-hint">Bezeichnung und Einheit stammen aus den Rechnungen '
      + '\u2013 das ist die Schreibweise, unter der die M\u00fchle den Artikel '
      + 'f\u00fchrt, und genau so steht sie auf dem Bestellblatt. Die '
      + '<b>Artikelnummer l\u00e4sst sich nicht \u00e4ndern</b>: Sie ist der '
      + 'Schl\u00fcssel der M\u00fchle und tr\u00e4gt die Gebindegr\u00f6\u00dfe '
      + '(40401 / 40402 / 40405 = 1 / 2,5 / 5 kg).</p>';
    if (!treffer.length) {
      h += '<div class="k-empty">Kein Artikel passt zum Suchwort.</div>';
    } else {
      var gruppe = null;
      var offen = false;
      treffer.forEach(function (a) {
        if (a.gruppe !== gruppe) {
          if (offen) h += '</div>';
          gruppe = a.gruppe;
          // Je Gruppe ein eigenes Raster, damit keine Zeile aus einer
          // anderen Warengruppe danebenrutscht.
          h += '<div class="dx-grp">' + esc(gruppeName(gruppe)) + '</div>'
            + '<div class="dl-liste">';
          offen = true;
        }
        h += artikelZeile(a);
      });
      if (offen) h += '</div>';
    }
    h += '<p class="dx-hint">Nie bestellte Artikel werden gel\u00f6scht. '
      + 'Bereits bestellte oder gelieferte Artikel werden nur ausgeblendet, '
      + 'damit fr\u00fchere Bestellungen vollst\u00e4ndig bleiben.</p>';
    return h + '</div>';
  }

  function passtZurArtikelsuche(a) {
    var q = _asuche.trim().toLowerCase();
    if (!q) return true;
    return (a.name + ' ' + a.nr + ' ' + (a.kassenname || '')).toLowerCase()
      .indexOf(q) >= 0;
  }

  /* Dieselben Zeichnungen wie bei Metzger und Getränken - nicht über
     `ikone()`, damit die Symbole auch dann stehen, wenn Lucide noch nicht
     geantwortet hat. Die Beschriftung bleibt im `aria-label`: Sie wird
     vorgelesen, und die Wächter finden sie weiterhin. (Spec listen-harmonie) */
  var IK_STIFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
  var IK_AUGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/>'
    + '<circle cx="12" cy="12" r="3"/></svg>';
  var IK_AUGE_ZU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="m3 3 18 18"/><path d="M10.6 5.1A10.9 10.9 0 0 1 12 5c6.5 0 10 7 10 7'
    + 'a18 18 0 0 1-2.4 3.4M6.6 6.6A18 18 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4-.8"/></svg>';
  var IK_WEG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"'
    + ' stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/>'
    + '<path d="M10 11v6"/><path d="M14 11v6"/></svg>';

  function artikelZeile(a) {
    var aus = a.aktiv === false;
    var nr = esc(a.nr);
    var unten = a.kassenname ? 'Kasse: ' + a.kassenname
                             : (a.einheit || 'St\u00fcck');
    return '<div class="dl-zeile dx-arow' + (aus ? ' aus' : '') + '">'
      + '<span class="dl-nr">' + nr + '</span>'
      + '<span class="dl-nm"><b>' + esc(a.name)
      + (aus ? ' <span class="dl-tag">ausgeblendet</span>' : '')
      + (a.nur_rechnung ? ' <span class="dl-tag">nur Rechnung</span>' : '')
      + '</b><span class="dl-sub">' + esc(unten) + '</span></span>'
      + '<span class="dl-meta"><b>' + (a.haeufigkeit || '\u2014') + '</b>'
      + (a.lieferungen ? a.lieferungen + '\u00d7 geliefert' : 'nie geliefert')
      + '</span>'
      + '<button class="dl-ik" onclick="KDrax.bearbeiten(\'' + nr + '\')"'
      + ' title="Bearbeiten" aria-label="Bearbeiten: ' + esc(a.name) + '">'
      + IK_STIFT + '</button>'
      + '<button class="dl-ik weg" onclick="KDrax.loeschen(\'' + nr + '\')"'
      + ' title="L\u00f6schen" aria-label="L\u00f6schen: ' + esc(a.name) + '">'
      + IK_WEG + '</button>'
      + '<button class="dl-ik' + (aus ? '' : ' an') + '"'
      + ' onclick="KDrax.sichtbarkeit(\'' + nr + '\',' + (aus ? 'true' : 'false') + ')"'
      + ' title="' + (aus ? 'Ausgeblendet \u2014 klicken zum Einblenden'
                          : 'Sichtbar \u2014 klicken zum Ausblenden') + '"'
      + ' aria-label="' + (aus ? 'Einblenden: ' : 'Ausblenden: ') + esc(a.name) + '">'
      + (aus ? IK_AUGE_ZU : IK_AUGE) + '</button>'
      + '</div>';
  }

  /* Anlegen und Bearbeiten teilen sich eine Maske - die Felder sind
     dieselben, nur die Artikelnummer liegt beim Bearbeiten fest. */
  function artikelMaske(a) {
    var neu = !a;
    var opt = _gruppen.map(function (g) {
      var sel = !neu && a.gruppe === g.id ? ' selected' : '';
      return '<option value="' + esc(g.id) + '"' + sel + '>' + esc(g.name)
        + '</option>';
    }).join('');
    var h = '<div class="dx-dlg-h">' + ikone(neu ? 'plus' : 'pencil') + ' '
      + (neu ? 'Neuer Artikel' : 'Artikel bearbeiten') + '</div>'
      + '<div class="dx-dlg-b">'
      + '<div class="dx-feld"><label for="dx-n-nr">Artikelnummer</label>'
      + '<input id="dx-n-nr" inputmode="numeric" maxlength="5" placeholder="40401"'
      + ' value="' + (neu ? '' : esc(a.nr)) + '"' + (neu ? '' : ' readonly') + '>'
      + '<div class="dx-hint">' + (neu
        ? 'Genau so, wie sie bei der M\u00fchle lautet \u2013 sie steht auf '
          + 'jeder Rechnung. Eine falsche Nummer bestellt einen anderen Artikel.'
        : 'Die Nummer ist der Schl\u00fcssel der M\u00fchle und l\u00e4sst sich '
          + 'nicht \u00e4ndern.') + '</div></div>'
      + '<div class="dx-feld"><label for="dx-n-name">Bezeichnung der M\u00fchle</label>'
      + '<input id="dx-n-name" placeholder="Weizenmehl Type 405"'
      + ' value="' + (neu ? '' : esc(a.name || '')) + '"></div>'
      + '<div class="dx-feld"><label for="dx-n-eh">Einheit</label>'
      + '<input id="dx-n-eh" placeholder="1 kg"'
      + ' value="' + (neu ? '' : esc(a.einheit || '')) + '"></div>'
      + '<div class="dx-feld"><label for="dx-n-gr">Warengruppe</label>'
      + '<select id="dx-n-gr">' + opt + '</select></div>';
    if (!neu) {
      h += '<p class="dx-hint">' + (a.haeufigkeit || a.lieferungen
        ? 'Dieser Artikel wurde bereits bestellt \u2013 er l\u00e4sst sich '
          + 'nur noch ausblenden, nicht l\u00f6schen.'
        : 'Dieser Artikel wurde noch nie bestellt.') + '</p>';
    }
    h += '<div id="dx-warn"></div></div><div class="dx-dlg-f">'
      + '<button class="dx-btn" onclick="KDrax.dlgZu()">Abbrechen</button>'
      + '<button class="dx-send" onclick="KDrax.'
      + (neu ? 'neuSpeichern()' : 'aendernSpeichern()') + '">'
      + (neu ? 'Anlegen' : 'Speichern') + '</button></div>';
    dialog(h);
  }

  function neuMaske() {
    _bearbeitet = null;
    artikelMaske(null);
  }

  function bearbeiten(nr) {
    var a = null;
    _alleArtikel.forEach(function (x) { if (x.nr === nr) a = x; });
    if (!a) { toast('Der Artikel wurde nicht gefunden.'); return; }
    _bearbeitet = a;
    artikelMaske(a);
  }

  function maskenWerte() {
    var w = function (id) {
      return ((document.getElementById(id) || {}).value || '').trim();
    };
    return { nr: w('dx-n-nr'), name: w('dx-n-name'), einheit: w('dx-n-eh'),
             gruppe: w('dx-n-gr') };
  }

  function neuSpeichern(trotzdem) {
    var v = maskenWerte();
    if (!v.name) { toast('Bitte eine Bezeichnung eintragen.'); return; }
    fetch(API + '/drax-artikel', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ nr: v.nr, name: v.name, einheit: v.einheit,
        gruppe: v.gruppe, trotzdem: !!trotzdem })
    })
      .then(function (r) {
        return r.json().then(function (d) { return { s: r.status, d: d }; });
      })
      .then(function (x) {
        if (x.s === 409 && !trotzdem) {
          // Dublettenverdacht: Die Rückfrage steht im selben Blatt, damit
          // die eingetippten Felder nicht verloren gehen.
          var warn = document.getElementById('dx-warn');
          if (warn) {
            warn.innerHTML = '<p class="dx-hint">' + esc(x.d.error) + '</p>'
              + '<button class="dx-btn" onclick="KDrax.neuSpeichern(true)">'
              + 'Trotzdem anlegen</button>';
          } else {
            toast(x.d.error);
          }
          return;
        }
        if (!x.d || !x.d.success) throw new Error(fehlerText(x.d, ''));
        _alleArtikel = x.d.artikel || _alleArtikel;
        dlgZu();
        toast('Der Artikel ist angelegt.');
        // Die Bestellliste muss ihn sofort kennen - sonst faellt die Menge
        // beim naechsten Speichern durch die Katalogpruefung.
        _artikel = _alleArtikel.filter(function (a) { return a.aktiv !== false; });
        render();
      })
      .catch(function (e) {
        toast(e.message || 'Der Artikel konnte nicht angelegt werden.');
      });
  }

  function aendernSpeichern() {
    if (!_bearbeitet) { dlgZu(); return; }
    var v = maskenWerte();
    if (!v.name) { toast('Bitte eine Bezeichnung eintragen.'); return; }
    var a = _bearbeitet;
    if (v.name === (a.name || '') && v.einheit === (a.einheit || '')
        && v.gruppe === (a.gruppe || '')) { dlgZu(); return; }
    dlgZu();
    artikelPatch({ nr: a.nr, name: v.name, einheit: v.einheit, gruppe: v.gruppe },
      'Der Artikel ist gespeichert.');
  }

  /* Löschen (Spec artikel-loeschen, F1/F2): Ob wirklich gelöscht oder nur
     ausgeblendet wird, entscheidet der Server - nur er kennt alle
     Bestellungen und die Lieferhistorie. */
  function loeschen(nr) {
    var a = null;
    _alleArtikel.forEach(function (x) { if (x.nr === nr) a = x; });
    if (!a) { toast('Der Artikel wurde nicht gefunden.'); return; }
    var bestellt = (a.haeufigkeit || 0) > 0 || (a.lieferungen || 0) > 0;
    dlgFrage('Artikel l\u00f6schen?',
      'Artikel ' + nr + ' \u2013 \u201e' + (a.name || '') + '\u201c entfernen? '
      + 'Fr\u00fchere Bestellungen bleiben unber\u00fchrt.' + (bestellt
        ? ' Dieser Artikel wurde bereits bestellt \u2013 er wird deshalb nur '
          + 'ausgeblendet.' : ''),
      'L\u00f6schen', function () {
        fetch(API + '/drax-artikel?nr=' + encodeURIComponent(nr), {
          method: 'DELETE', headers: authHeaders()
        })
          .then(function (r) { return r.json(); })
          .then(function (d) {
            if (!d || !d.success) throw new Error(fehlerText(d, ''));
            _alleArtikel = d.artikel || _alleArtikel;
            _artikel = _alleArtikel.filter(function (x) { return x.aktiv !== false; });
            toast(d.meldung || 'Der Artikel wurde gel\u00f6scht.');
            render();
          })
          .catch(function (e) {
            toast(e.message || 'Der Artikel konnte nicht gel\u00f6scht werden.');
          });
      });
  }

  function sichtbarkeit(nr, wiederEin) {
    artikelPatch({ nr: nr, aktiv: !!wiederEin },
      wiederEin ? 'Der Artikel ist wieder in der Liste.'
                : 'Der Artikel erscheint nicht mehr im Bestellschirm.');
  }

  function artikelPatch(daten, meldung) {
    fetch(API + '/drax-artikel', {
      method: 'PATCH', headers: authHeaders(), body: JSON.stringify(daten)
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _alleArtikel = d.artikel || _alleArtikel;
        _artikel = _alleArtikel.filter(function (a) { return a.aktiv !== false; });
        toast(meldung);
        render();
      })
      .catch(function (e) {
        toast(e.message || 'Die \u00c4nderung konnte nicht gespeichert werden.');
      });
  }

  function asuch(wert) {
    _asuche = wert || '';
    render();
    // Nach dem Neuzeichnen steht der Mauszeiger sonst im Nichts - das
    // Suchfeld ist ein neues Element und muss den Fokus zurueckbekommen.
    var el = document.getElementById('dx-aq');
    if (el) {
      el.focus();
      var n = el.value.length;
      try { el.setSelectionRange(n, n); } catch (e) { /* type=search */ }
    }
  }

  // ═════════════════════════════════════════════════
  //  Einstellungen – sie stehen im CMS
  // ═════════════════════════════════════════════════

  /* Das fruehere Einstellungsformular samt `configSpeichern()` ist
     entfallen. Es waere ein zweiter Weg gewesen, dieselben Stammdaten am
     CMS vorbei zu aendern - und zwar einer ohne die dortigen Pruefungen.
     Drax war das letzte der vier Bestellmodule mit eigenem Reiter; Metzger,
     Baecker und Getraenke hatten ihn laengst abgegeben. Der Kiosk ist die
     Arbeitsflaeche der Verkaeuferinnen, nicht die Verwaltung.

     Der Hinweis bleibt: Wer den Reiter noch als Lesezeichen hat oder aus
     Gewohnheit sucht, soll nicht vor einer leeren Flaeche stehen. */
  function hinweisEinstellungen() {
    return '<div class="k-empty">Die Einstellungen zur Drax-Bestellung '
      + 'werden jetzt im CMS gepflegt: <b>CMS \u2192 Einstellungen \u2192 '
      + 'Drax-Bestellung</b>.<br>Dort stehen Empf\u00e4nger, Liefertag, '
      + 'Bestellschluss und Kunden-Nr.</div>';
  }

  return {
    onShow: onShow, sub: sub, such: such, asuch: asuch, filter: filter,
    springe: springe, tagWahl: tagWahl, plus: plus, setz: setz,
    speichern: function () { return speichern(false); },
    senden: senden, korrektur: korrektur, korrekturSenden: korrekturSenden,
    verwerfen: verwerfen, formular: formular,
    neuMaske: neuMaske, neuSpeichern: neuSpeichern, bearbeiten: bearbeiten,
    aendernSpeichern: aendernSpeichern, loeschen: loeschen,
    sichtbarkeit: sichtbarkeit,
    verlaufAuf: verlaufAuf, bestellungWeg: bestellungWeg,
    dlgZu: dlgZu, dlgJa: dlgJa
  };
})();

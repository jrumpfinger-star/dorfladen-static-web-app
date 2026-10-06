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
  var _aNeu = false;          // Maske „Artikel anlegen" offen

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
       auf dem Telefon unter dem Bildschirmrand. Artikelstamm, Verlauf und
       Einstellungen sind Lesetexte und rollen wie gewohnt am Stueck. */
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
      else h += einstellungen();
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
    function b(id, label, zahl) {
      return '<button class="mb-sub' + (_sub === id ? ' on' : '') + '"'
        + ' onclick="KDrax.sub(\'' + id + '\')">' + label
        + (zahl !== undefined && zahl !== null
          ? ' <span class="dx-cnt">' + zahl + '</span>' : '')
        + '</button>';
    }
    var s = summen();
    return '<div class="mb-subs">' + b('bestellung', 'Bestellung', s.n)
      + b('verlauf', 'Verlauf') + b('artikel', 'Artikel')
      + b('einst', 'Einstellungen') + '</div>';
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
        letzte = a.gruppe;
        h += '<div class="dx-grp" data-gruppe="' + esc(a.gruppe) + '">'
          + esc(gruppeName(a.gruppe)) + '</div>';
      }
      h += zeile(a, sperre);
    });
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
    if (_dirty && !_korrektur) speichern(true).then(weiter, weiter);
    else if (_korrektur && !bestaetige('Die Korrektur ist noch nicht gesendet. '
        + 'Beim Wechsel geht sie verloren. Trotzdem wechseln?')) return;
    else weiter();
  }

  function bestaetige(frage) {
    return window.confirm(frage);
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
    if (!bestaetige('Bestellung f\u00fcr ' + wochentagVon(_datum) + ', '
        + datumDe(_datum) + ' senden?\n\n' + s.n + ' Positionen, ' + s.st
        + ' St\u00fcck.\n' + wohin + '\n\nDanach ist der Tag gesperrt; '
        + '\u00c4nderungen gehen nur noch als Korrektur.')) return;
    sendeLauf('senden', false);
  }

  function korrektur() {
    _korrektur = true;
    _korrekturBasis = JSON.parse(JSON.stringify(_mengen));
    render();
    toast('Korrektur begonnen. Die M\u00fchle bekommt ein neues Blatt mit '
      + 'Korrekturvermerk.');
  }

  function verwerfen() {
    if (!bestaetige('Die Korrektur verwerfen und zum gesendeten Stand '
        + 'zur\u00fcck?')) return;
    if (_korrekturBasis) _mengen = _korrekturBasis;
    _korrektur = false;
    _korrekturBasis = null;
    render();
  }

  function korrekturSenden() {
    var s = summen();
    if (!s.n) {
      toast('Eine Korrektur ohne Position geht nicht. Zum vollst\u00e4ndigen '
        + 'Widerruf bitte bei der M\u00fchle anrufen.');
      return;
    }
    if (!bestaetige('Korrektur f\u00fcr ' + datumDe(_datum) + ' senden?\n\n'
        + s.n + ' Positionen, ' + s.st + ' St\u00fcck.\n\nDie M\u00fchle '
        + 'erh\u00e4lt ein Blatt mit Korrekturvermerk; entfallene Positionen '
        + 'stehen durchgestrichen darauf.')) return;
    sendeLauf('korrektur', true);
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
      + 'geliefert wurde, auch aus der Zeit vor diesem Bestellschirm.</p>'
      + '<table class="dx-tab"><thead><tr><th>Liefertag</th><th>Wochentag</th>'
      + '<th class="r">Positionen</th><th class="r">St\u00fcck</th>'
      + '<th>Herkunft</th></tr></thead><tbody>';
    _verlauf.forEach(function (l) {
      h += '<tr><td><b>' + esc(datumDe(l.datum)) + '</b></td>'
        + '<td><span class="dx-pill ' + (l.ausnahme ? 'ab' : 'do') + '">'
        + esc(l.wochentag || '') + (l.ausnahme ? ' \u2013 Ausnahme' : '')
        + '</span></td>'
        + '<td class="r">' + (l.positionen || 0) + '</td>'
        + '<td class="r">' + (l.stueck || 0) + '</td>'
        + '<td>' + (l.quelle === 'bestellung'
          ? 'eigene Bestellung'
            + (l.hat_dokument
              ? ' <a href="' + API + '/drax-order/' + encodeURIComponent(l.datum)
                + '/dokument" target="_blank" rel="noopener">Formular</a>' : '')
          : 'Rechnung ' + esc(l.rechnung || ''))
        + '</td></tr>';
    });
    return h + '</tbody></table></div>';
  }

  // ══════════════════════════════════════════════════
  //  Artikelstamm
  // ══════════════════════════════════════════════════

  function artikelAnsicht() {
    var q = _asuche.trim().toLowerCase();
    var h = '<div class="dx-card"><h3>Artikelstamm</h3>'
      + '<p class="dx-hint">Bezeichnung und Einheit stammen aus den Rechnungen '
      + '\u2013 das ist die Schreibweise, unter der die M\u00fchle den Artikel '
      + 'f\u00fchrt, und genau so steht sie auf dem Bestellblatt. Die '
      + '<b>Artikelnummer l\u00e4sst sich nicht \u00e4ndern</b>: Sie ist der '
      + 'Schl\u00fcssel der M\u00fchle und tr\u00e4gt die Gebindegr\u00f6\u00dfe '
      + '(40401 / 40402 / 40405 = 1 / 2,5 / 5 kg).</p>'
      + '<div class="dx-bar"><input type="search" id="dx-aq"'
      + ' placeholder="Artikel filtern \u2026" value="' + esc(_asuche) + '"'
      + ' oninput="KDrax.asuch(this.value)">'
      + '<button class="dx-btn" onclick="KDrax.neuMaske()">Artikel anlegen</button>'
      + '</div>';
    if (_aNeu) h += neuMaskeMarkup();
    h += '<table class="dx-tab"><thead><tr><th>Nr</th><th>Bezeichnung</th>'
      + '<th>Einheit</th><th>Gruppe</th><th class="r">Verkauft</th>'
      + '<th class="r">Lieferungen</th><th></th></tr></thead><tbody>';
    var n = 0;
    _alleArtikel.forEach(function (a) {
      if (q && (a.name + ' ' + a.nr + ' ' + (a.kassenname || '')).toLowerCase()
        .indexOf(q) < 0) return;
      n++;
      var aus = a.aktiv === false;
      h += '<tr' + (aus ? ' class="aus"' : '') + '>'
        + '<td class="nr">' + esc(a.nr) + '</td>'
        + '<td><b>' + esc(a.name) + '</b>'
        + (a.nur_rechnung ? '<span class="dx-tag neu">nur Rechnung</span>' : '')
        + (a.kassenname ? '<div class="dx-alt">Kasse: ' + esc(a.kassenname)
          + '</div>' : '') + '</td>'
        + '<td>' + esc(a.einheit || 'St\u00fcck') + '</td>'
        + '<td><span class="dx-pill">' + esc(gruppeName(a.gruppe)) + '</span></td>'
        + '<td class="r">' + (a.haeufigkeit || '\u2013') + '</td>'
        + '<td class="r">' + (a.lieferungen || '\u2013') + '</td>'
        + '<td class="r"><button class="dx-btn klein" onclick="KDrax.umbenennen(\''
        + esc(a.nr) + '\')">Umbenennen</button>'
        + '<button class="dx-btn klein" onclick="KDrax.sichtbarkeit(\''
        + esc(a.nr) + '\',' + (aus ? 'true' : 'false') + ')">'
        + (aus ? 'Einblenden' : 'Ausblenden') + '</button></td></tr>';
    });
    h += '</tbody></table>';
    if (!n) h += '<div class="k-empty">Kein Artikel passt zum Suchwort.</div>';
    return h + '</div>';
  }

  function neuMaskeMarkup() {
    var opt = _gruppen.map(function (g) {
      return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>';
    }).join('');
    return '<div class="dx-neu">'
      + '<div class="dx-feld"><label for="dx-n-nr">Artikelnummer</label>'
      + '<input id="dx-n-nr" inputmode="numeric" maxlength="5" placeholder="40401"></div>'
      + '<div class="dx-feld"><label for="dx-n-name">Bezeichnung der M\u00fchle</label>'
      + '<input id="dx-n-name" placeholder="Weizenmehl Type 405 1 kg"></div>'
      + '<div class="dx-feld"><label for="dx-n-eh">Einheit</label>'
      + '<input id="dx-n-eh" placeholder="1 kg"></div>'
      + '<div class="dx-feld"><label for="dx-n-gr">Warengruppe</label>'
      + '<select id="dx-n-gr">' + opt + '</select></div>'
      + '<p class="dx-hint">Die Nummer muss genau so lauten wie bei der '
      + 'M\u00fchle \u2013 sie steht auf jeder Rechnung. Eine falsche Nummer '
      + 'bestellt einen anderen Artikel.</p>'
      + '<div class="dx-feld-wz">'
      + '<button class="dx-btn" onclick="KDrax.neuMaske(false)">Abbrechen</button>'
      + '<button class="dx-send" onclick="KDrax.neuSpeichern()">Anlegen</button>'
      + '</div></div>';
  }

  function neuMaske(auf) {
    _aNeu = auf === undefined ? !_aNeu : !!auf;
    render();
  }

  function neuSpeichern(trotzdem) {
    var nr = (document.getElementById('dx-n-nr') || {}).value || '';
    var name = (document.getElementById('dx-n-name') || {}).value || '';
    var eh = (document.getElementById('dx-n-eh') || {}).value || '';
    var gr = (document.getElementById('dx-n-gr') || {}).value || '';
    fetch(API + '/drax-artikel', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ nr: nr.trim(), name: name.trim(), einheit: eh.trim(),
        gruppe: gr, trotzdem: !!trotzdem })
    })
      .then(function (r) {
        return r.json().then(function (d) { return { s: r.status, d: d }; });
      })
      .then(function (x) {
        if (x.s === 409 && !trotzdem) {
          if (bestaetige(x.d.error)) neuSpeichern(true);
          return;
        }
        if (!x.d || !x.d.success) throw new Error(fehlerText(x.d, ''));
        _alleArtikel = x.d.artikel || _alleArtikel;
        _aNeu = false;
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

  function umbenennen(nr) {
    var a = null;
    _alleArtikel.forEach(function (x) { if (x.nr === nr) a = x; });
    if (!a) return;
    var neu = window.prompt('Bezeichnung, wie die M\u00fchle sie f\u00fchrt:\n'
      + '(Artikelnummer ' + nr + ' bleibt unver\u00e4ndert)', a.name || '');
    if (neu === null) return;
    neu = neu.trim();
    if (!neu || neu === a.name) return;
    artikelPatch({ nr: nr, name: neu }, 'Die Bezeichnung ist ge\u00e4ndert.');
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
    var el = host();
    var tab = el && el.querySelector('.dx-tab tbody');
    if (!tab) { render(); return; }
    // Nur den Tabellenrumpf tauschen, damit das Suchfeld den Fokus behaelt.
    var huelle = document.createElement('div');
    huelle.innerHTML = artikelAnsicht();
    var neu = huelle.querySelector('.dx-tab tbody');
    if (neu) tab.replaceWith(neu);
  }

  // ══════════════════════════════════════════════════
  //  Einstellungen
  // ══════════════════════════════════════════════════

  function einstellungen() {
    var wo = function (n) {
      return TAGE.map(function (t, i) {
        // Die Konfiguration zaehlt wie Python: Montag 0 bis Sonntag 6.
        var wert = (i + 6) % 7;
        return '<option value="' + wert + '"' + (wert === n ? ' selected' : '')
          + '>' + t + '</option>';
      }).join('');
    };
    var h = '';
    if (_testbetrieb) {
      h += '<div class="dx-warn"><b>Testbetrieb.</b> Solange hier nicht die '
        + 'echte Bestelladresse der M\u00fchle steht, geht jede Bestellung an '
        + esc(_cfg.empfaenger || 'die Testadresse') + ' \u2013 die M\u00fchle '
        + 'bekommt nichts. So war es auch beim B\u00e4cker, bis die Adresse '
        + 'best\u00e4tigt war.</div>';
    }
    h += '<div class="dx-card"><h3>Empf\u00e4nger</h3>'
      + feld('dx-c-mail', 'E-Mail der M\u00fchle', _cfg.empfaenger || '', 'email')
      + feld('dx-c-name', 'Anzeigename', _cfg.empfaenger_name || '')
      + feld('dx-c-kd', 'Kunden-Nr.', _cfg.kd_nr || '')
      + '<p class="dx-hint">Aus den Rechnungen bekannt: DRAX-M\u00dcHLE GmbH, '
      + 'Hochhaus 5, 83562 Rechtmehring, Telefon 0 80 72 / 82 76.</p></div>';
    h += '<div class="dx-card"><h3>Rhythmus</h3>'
      + '<div class="dx-feld"><label for="dx-c-lt">Liefertag</label>'
      + '<select id="dx-c-lt">' + wo(_cfg.liefertag === undefined ? 3 : _cfg.liefertag)
      + '</select></div>'
      + '<div class="dx-feld"><label for="dx-c-bt">Bestellschluss am</label>'
      + '<select id="dx-c-bt">'
      + wo(_cfg.bestellschluss_tag === undefined ? 2 : _cfg.bestellschluss_tag)
      + '</select></div>'
      + feld('dx-c-uhr', 'Bestellschluss um', _cfg.bestellschluss || '12:00')
      + '<p class="dx-hint">Die ausgewerteten Rechnungen best\u00e4tigen den '
      + 'Rhythmus: sechs der sieben Lieferungen kamen an einem Donnerstag, '
      + 'eine am Montag, 17.08.2026.</p></div>';
    h += '<div class="dx-feld-wz">'
      + '<button class="dx-send" onclick="KDrax.configSpeichern()">'
      + 'Einstellungen speichern</button></div>';
    return h;
  }

  function feld(id, label, wert, typ) {
    return '<div class="dx-feld"><label for="' + id + '">' + esc(label) + '</label>'
      + '<input id="' + id + '" type="' + (typ || 'text') + '" value="'
      + esc(wert) + '"></div>';
  }

  function configSpeichern() {
    var v = function (id) {
      var el = document.getElementById(id);
      return el ? el.value : '';
    };
    var neu = {
      empfaenger: v('dx-c-mail').trim(),
      empfaenger_name: v('dx-c-name').trim(),
      kd_nr: v('dx-c-kd').trim(),
      liefertag: parseInt(v('dx-c-lt'), 10),
      bestellschluss_tag: parseInt(v('dx-c-bt'), 10),
      bestellschluss: v('dx-c-uhr').trim()
    };
    fetch(API + '/drax-order/config', {
      method: 'POST', headers: authHeaders(), body: JSON.stringify({ config: neu })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _cfg = d.config || _cfg;
        _testbetrieb = !!d.testbetrieb;
        toast('Die Einstellungen sind gespeichert.');
        // Liefertag oder Schluss koennen sich geaendert haben - die
        // Tagesleiste muss darauf neu aufbauen.
        return ladeUebersicht();
      })
      .catch(function (e) {
        toast(e.message || 'Die Einstellungen konnten nicht gespeichert werden.');
      });
  }

  return {
    onShow: onShow, sub: sub, such: such, asuch: asuch, filter: filter,
    springe: springe, tagWahl: tagWahl, plus: plus, setz: setz,
    speichern: function () { return speichern(false); },
    senden: senden, korrektur: korrektur, korrekturSenden: korrekturSenden,
    verwerfen: verwerfen, formular: formular,
    neuMaske: neuMaske, neuSpeichern: neuSpeichern, umbenennen: umbenennen,
    sichtbarkeit: sichtbarkeit, configSpeichern: configSpeichern
  };
})();

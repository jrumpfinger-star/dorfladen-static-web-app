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
  var _umfang = 'ueblich';        // ueblich | alle | best (Spec F7)
  var _offen = null;      // Schluessel der Zeile mit offenem Editor
  var _entwurf = null;    // Block im Portionspad
  var _dirty = false;
  var _verlauf = [];
  var _testbetrieb = true;
  var _vorbelegtAus = null;
  var _letzte = null;      // Werte der zuletzt gesendeten Bestellung (F7)
  var _korrektur = false;  // Gesendetes wird gerade nachtraeglich geaendert
  var _korrekturBasis = null;  // Stand bei Beginn der Korrektur

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

  function gesperrt() {
    // Eine gesendete Bestellung ist schreibgeschuetzt - AUSSER im
    // Korrekturmodus. Ohne diese Ausnahme bot der Kopf zwar „Korrektur
    // senden" an, aber saemtliche Felder blieben starr: Man konnte nichts
    // aendern und verschickte die unveraenderte Bestellung noch einmal.
    return istGesendet() && !_korrektur;
  }

  /** Roher Versandstand - unabhaengig vom Korrekturmodus. */
  function istGesendet() {
    return !!(_b && (_b.status === 1 || _b.status === 2));
  }

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
        _korrektur = false;
        _korrekturBasis = null;
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
    /* Der Rollstand der Liste muss das Neuzeichnen überleben. Vorher fiel er
       auf 0, weil `.k-liste` neu entstand — danach verschob `inSicht()` um
       einen Betrag aus den neuen Maßen, und die Liste sprang nach jeder
       Portion irgendwohin (Spec kiosk-erfassung-filter, F2). */
    var alt = el.querySelector('.k-liste');
    var stand = alt ? alt.scrollTop : 0;
    var h;
    if (_sub === 'bestellung') {
      // Wie beim Bäcker: fester Kopf, scrollende Liste, Fußzeile. Vorher gab
      // dieser Reiter alles als einen hohen Block aus — auf dem Telefon lag
      // die erste Artikelzeile weit unter dem Bildschirm (Spec
      // kiosk-bestellreiter-mobil, F1).
      h = renderBestellung();
    } else {
      h = '<div class="mb">' + subTabs();
      if (_sub === 'verlauf') h += verlaufAnsicht();
      else if (_sub === 'artikel') h += artikelAnsicht();
      else h += hinweisEinstellungen();
      h += '</div>';
    }
    el.innerHTML = h;
    var neu = el.querySelector('.k-liste');
    if (neu && stand) neu.scrollTop = stand;
    var panel = document.getElementById('panel-metzgerbest');
    if (panel) panel.classList.toggle('k-geteilt', _sub === 'bestellung');
    icons();
    if (_sub === 'bestellung') { fuss(); bindeFilter(); }
  }

  function icons() { if (window.lucide) try { lucide.createIcons(); } catch (e) {} }

  function ikone(name) { return '<i data-lucide="' + name + '"></i>'; }

  /* Fester Kopf, scrollende Liste, Fußzeile (Spec F1). Der Kopf trägt nur
     noch Liefertag, Zustandszeile und Suche; Termin-Details, Bereichswechsel,
     Filter, Sprungmarken und selten gebrauchte Schritte stehen im Blatt
     hinter dem „i". */
  function renderBestellung() {
    var h = '<div class="mb-fest">';
    /* Der Bereichswechsel gehört sichtbar in den Kopf: Über ihn erreicht man
       die Artikelverwaltung. Beim Umbau lag er nur noch im Blatt hinter dem
       „i" — dort hat ihn niemand gesucht. Auf dem Telefon bleibt er im Blatt
       (Platz), ab Tablet steht er wieder oben. */
    h += subTabs('nur-breit');
    h += tagesleiste();
    h += kontextZeile();
    /* Suche und Filter stehen nebeneinander. Der Filter war im Blatt hinter
       dem „i" gelandet, wo ihn niemand sucht (Spec kiosk-erfassung-filter,
       F7). Je nach Bildschirmhöhe erscheint die Filterzeile oder das
       Trichter-Symbol — beides steht im Markup, CSS entscheidet. */
    h += '<div class="mb-bar k-suchzeile">'
      + '<input type="search" id="mb-q" placeholder="Artikel oder Nummer suchen \u2026"'
      + ' value="' + esc(_suche) + '" oninput="KMetzgerBest.such(this.value)">'
      + KFilter.markup(umfaenge(), _umfang)
      + KFilter.zeile(umfaenge(), _umfang) + '</div>';
    h += '</div>';                                   // mb-fest
    h += liste();
    h += '<div class="mb-foot" id="mb-foot"></div>';
    h += detailBlatt();
    h += KFilter.blatt(umfaenge(), _umfang);
    return h;
  }

  /** Die drei Umfänge samt Trefferzahlen (Spec kiosk-erfassung-filter, F7). */
  function umfaenge() {
    var alt = _umfang;
    var zaehle = function (u) {
      _umfang = u;
      var n = 0;
      _artikel.forEach(function (a) { if (sichtbar(a, positionVon(a))) n++; });
      return n;
    };
    var werte = [
      ['ueblich', '\u00dcbliche', zaehle('ueblich'), '\u00dcbliche Artikel'],
      ['alle', 'Alle', zaehle('alle'), 'Alle Artikel'],
      ['best', 'Nur erfasste', zaehle('best'), 'Nur erfasste']
    ];
    _umfang = alt;
    return werte;
  }

  function bindeFilter() {
    var panel = document.getElementById('panel-metzgerbest');
    if (!panel || !window.KFilter) return;
    KFilter.binde(panel, function (wahl) { umfang(wahl); });
  }

  function umfang(u) { _umfang = u; render(); }

  /* ── Kontextzeile statt Statuskarte (Spec F3) ──────────────────────────
     Zwei Textzeilen: wer liefert und in welchem Zustand die Bestellung ist.
     Der Liefertag steht in der markierten Kachel darüber, nicht doppelt. */
  function kontextZeile() {
    var s = _b.status || 0;
    var gesendet = s && !_korrektur;
    var prot = (_b.protokoll || []);
    var letzte = prot.length ? prot[prot.length - 1] : null;
    var cls = 'mb-kontext' + (gesendet ? ' gesendet' : '') + (_testbetrieb ? ' test' : '');
    var z1 = esc(_cfg.name || 'Metzgerei');
    var z2;
    if (_korrektur) z2 = 'Korrektur \u2013 Mengen \u00e4ndern, dann senden';
    else if (gesendet) z2 = (s === 2 ? 'Korrigiert' : 'Gesendet')
      + (letzte ? ' ' + esc(zeitKurz(letzte.zeit)) : '');
    else if (_b.bestellbar === false) z2 = 'Dieser Tag ist geliefert';
    else if (_testbetrieb) z2 = 'Testbetrieb \u2013 geht nicht an die Metzgerei';
    else z2 = 'Noch nicht gesendet';
    return '<div class="' + cls + '">'
      + '<div class="ico">' + ikone(gesendet ? 'check-circle' : 'beef') + '</div>'
      + '<div class="txt"><div class="z1">' + z1 + '</div>'
      + '<div class="z2">' + z2 + '</div></div>'
      + '<button class="mb-mehr" onclick="KMetzgerBest.blatt(true)"'
      + ' title="Liefertag, Vorbelegung und weitere Schritte">' + ikone('info')
      + '</button></div>';
  }

  /* Das Blatt hinter dem „i": alles, was den Kopf nicht dauerhaft belasten
     muss, aber erreichbar bleiben soll (Spec F3). */
  function detailBlatt() {
    var s = _b.status || 0;
    var gesendet = s && !_korrektur;
    var prot = (_b.protokoll || []);
    var letzte = prot.length ? prot[prot.length - 1] : null;
    var z = function (text) { return '<div class="mb-blatt-z"><div>' + text + '</div></div>'; };

    var h = '<div class="mb-blatt" id="mb-blatt" hidden>';
    h += '<div class="mb-blatt-kopf"><h4>Zur Bestellung</h4>'
      + '<div class="mb-blatt-sub">' + esc(wochentagVon(_datum)) + ', '
      + esc(datumDe(_datum)) + ' \u00b7 ' + esc(_cfg.name || 'Metzgerei') + '</div></div>';

    if (s === 0) {
      h += z(_vorbelegtAus
        ? 'Vorbelegt aus der Bestellung vom ' + esc(datumDe(_vorbelegtAus))
        : 'Keine fr\u00fchere Bestellung f\u00fcr diesen Wochentag \u2013 die Liste startet leer');
    } else {
      h += z('<b>' + (s === 2 ? 'Korrigiert' : 'Gesendet') + '</b>'
        + (letzte ? ' am ' + esc(zeitKurz(letzte.zeit)) + ' an ' + esc(letzte.an || '')
          + (letzte.wer ? ' durch ' + esc(letzte.wer) : '') : ''));
    }
    if (_testbetrieb) {
      h += z('<b>Testbetrieb</b> \u2013 die Bestellung geht an '
        + esc(_cfg.empfaenger || '') + ', nicht an die Metzgerei.');
    }

    // Bereichswechsel: auf dem Telefon nur hier, damit der Kopf schmal bleibt.
    h += '<div class="mb-blatt-t mb-nur-tel">Bereich</div>';
    h += subTabs('im-blatt');

    /* Die Umfänge standen früher hier. Sie sind Bedienung, nicht Auskunft,
       und gehören deshalb neben die Suche (Spec kiosk-erfassung-filter, F7). */

    var jump = sprungleiste();
    if (jump) h += '<div class="mb-blatt-t">Zur Warengruppe springen</div>' + jump;

    h += '<div class="mb-blatt-wz">';
    h += notizKnopf();
    if (!gesperrt()) {
      h += '<button class="mb-btn" onclick="KMetzgerBest.blatt(false);KMetzgerBest.zusatz()">'
        + 'Weiteren Artikel</button>';
    }
    h += '</div>';
    h += '<button class="mb-blatt-zu" onclick="KMetzgerBest.blatt(false)">Schlie\u00dfen</button>';
    return h + '</div>';
  }

  function blatt(auf) {
    var el = document.getElementById('mb-blatt');
    if (!el) return;
    el.hidden = !auf;
    if (auf && window.dlLockScroll) dlLockScroll();
    else if (!auf && window.dlUnlockScroll) dlUnlockScroll();
  }

  function subTabs(extra) {
    function b(id, label) {
      return '<button class="mb-sub' + (_sub === id ? ' on' : '') + '"'
        + ' onclick="KMetzgerBest.blatt(false);KMetzgerBest.sub(\'' + id + '\')">' + label + '</button>';
    }
    // Kein „Einstellungen"-Reiter mehr: Stammdaten (Empfänger, Bestelltage,
    // Kunden-Nr.) werden im CMS gepflegt – so wie beim Bäcker. Der Kiosk ist
    // die Arbeitsfläche der Verkäuferinnen, nicht die Verwaltung.
    return '<div class="mb-subs' + (extra ? ' ' + extra : '') + '">' + b('bestellung', 'Bestellung')
      + b('verlauf', 'Verlauf') + b('artikel', 'Artikel') + '</div>';
  }

  function tagesleiste() {
    // Beschriftung, damit unmissverständlich ist, wofür die Plättchen stehen:
    // Es sind LIEFERtage, nicht die Tage, an denen bestellt wird.
    var h = '<div class="mb-days-lbl">Liefertag wählen</div>';
    h += '<div class="mb-days">';
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
    // Die Suche sticht den Umfang: gesucht wird im Gesamtbestand.
    if (_suche) return passtZurSuche(a);
    // Bereits Erfasstes bleibt immer sichtbar, auch wenn der Artikel sonst
    // nicht zu den ueblichen zaehlt - sonst verschwaende die eigene Eingabe.
    if (bestellt(p)) return true;
    if (_umfang === 'best') return false;      // nur was erfasst ist
    if (_umfang === 'alle') return true;
    return a.aktiv !== false;                  // "ueblich"
  }

  function passtZurSuche(a) {
    if (!_suche) return true;
    var s = _suche.toLowerCase();
    return (a.name || '').toLowerCase().indexOf(s) >= 0
      || String(a.nummer || '').indexOf(s) >= 0;
  }

  function liste() {
    var h = '<div class="mb-liste k-liste" id="mb-liste">';
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
    /* Zusatzartikel am Listenende — dort, wo man ihn sucht: wenn ein Artikel
       fehlt und man bis unten gescrollt hat. Der Umfang-Umschalter stand hier
       ebenfalls und war damit an zwei Orten; er steht jetzt nur noch neben
       der Suche (Spec kiosk-erfassung-filter, F7.4). */
    if (!gesperrt()) {
      h += '<button class="mb-addrow" onclick="KMetzgerBest.zusatz()">'
        + '+ Weiteren Artikel f\u00fcr diesen Tag</button>';
    }
    return h + '</div>';
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
      h += '<button class="mb-add" type="button" title="'
        + (_offen === key ? 'Erfassung schlie\u00dfen' : 'Portionen erfassen') + '"'
        + ' onclick="KMetzgerBest.umschalten(\'' + esc(key) + '\')">'
        + (_offen === key ? '\u2212' : '+') + '</button>';
    }
    // Anhalt beim Neuerfassen: Was zuletzt bestellt wurde, steht blass daneben,
    // solange die Zeile leer ist. Ein Tipp übernimmt es.
    var frueher = !lock && !bestellt(p) ? letzteWerte(a) : null;
    // Die Blöcke werden mit „|" getrennt: Ein „+" zwischen den Mengen las
    // sich wie ein Rechenzeichen und ging in „1 × 2 kg" unter.
    if (frueher) {
      h += '<button class="mb-frueher" title="' + esc(letzteQuelle())
        + ' — tippen übernimmt" onclick="KMetzgerBest.frueher(\'' + esc(key) + '\')">'
        + esc(frueher.map(blockText).join(' | ')) + '</button>';
    }
    if (istExtra && !lock) {
      h += '<button class="mb-add del" title="Position entfernen"'
        + ' onclick="KMetzgerBest.zusatzWeg(\'' + esc(key) + '\')">✕</button>';
    }
    h += '</div></div>';

    if (_offen === key && !lock) h += editor(key, p);
    return h + '</div>';
  }

  /* ── Die Erfassung (Spec kiosk-erfassung-filter, F3–F6) ────────────────
     Zwei Reihen statt vier Gruppen: oben Anzahl · vak · Einheit, darunter
     die Mengen. Kein Bestätigungsknopf — eine Kachel legt an, ein freies Maß
     der Haken im Feld oder die Eingabetaste. „Fertig" entfällt, das „−" an
     der Zeile schließt. Kurzeingabe und Hinweisfeld erscheinen nur, wenn der
     Schirm hoch genug ist; sonst führt ein Knopf zum Hinweis-Blatt. */
  function editor(key, p) {
    var b = _entwurf;
    var h = '<div class="mb-ed">';

    var vs = vorschlaegeFuer(p);
    if (vs.length) {
      h += '<div class="mb-sugg">';
      vs.forEach(function (v, i) {
        var aktiv = drin(p, v);
        var herkunft = (v.quelle === 'bestellung'
          ? v.belege + '\u00d7 so bestellt'
          : 'aus ' + v.belege + ' Lieferung' + (v.belege > 1 ? 'en' : ''))
          + (aktiv ? ' \u2014 ist enthalten, Tippen entfernt' : '');
        h += '<button type="button" class="' + esc(v.quelle) + (aktiv ? ' on' : '') + '"'
          + ' title="' + esc(herkunft) + '"'
          + ' onclick="KMetzgerBest.nimm(\'' + esc(key) + '\',' + i + ')">'
          + (aktiv ? '<span class="hak">\u2713</span>' : '')
          + esc((v.portionen || []).map(blockText).join(' + '))
          + ((v.portionen || []).some(function (x) { return x.vakuum; })
            ? '<span class="vak">vak</span>' : '')
          + '</button>';
      });
      h += '</div>';
    }

    // Reihe 1: Anzahl → vak → Einheit
    h += '<div class="mb-erf">';
    h += '<div class="mb-step">'
      + '<button type="button" tabindex="-1" onclick="KMetzgerBest.anz(-1)">\u2212</button>'
      + '<input id="mb-a" type="number" min="1" inputmode="numeric" value="' + b.anzahl + '"'
      + ' aria-label="Anzahl" onfocus="this.select()" onclick="this.select()"'
      + ' oninput="KMetzgerBest.feld(\'a\',this.value)">'
      + '<button type="button" tabindex="-1" onclick="KMetzgerBest.anz(1)">+</button></div>';
    h += '<button type="button" class="mb-vak' + (b.vakuum ? ' on' : '') + '" id="mb-vak"'
      + ' title="vakuumieren" onclick="KMetzgerBest.vakAn()">'
      + '<span class="box"><i data-lucide="check"></i></span>vak</button>';
    h += '<div class="mb-einh">';
    EINHEITEN.forEach(function (e) {
      h += '<button type="button" class="' + (istEinheit(b.einheit, e[0]) ? 'on' : '') + '"'
        + ' onclick="KMetzgerBest.einheit(\'' + e[0] + '\')">' + esc(e[1]) + '</button>';
    });
    h += '</div></div>';

    // Reihe 2: Mengen — Kacheln und freies Maß
    h += '<div class="mb-mengen"><div class="mb-kach">';
    kacheln(b.einheit).forEach(function (k) {
      var aktiv = b.i >= 0 && (b.menge === k[0] || (b.menge === null && b.einheit === k[0]));
      var arg = (typeof k[0] === 'number') ? k[0] : "'" + k[0] + "'";
      h += '<button type="button" class="' + (aktiv ? 'on' : '') + '"'
        + ' onclick="KMetzgerBest.kachel(' + arg + ')">' + esc(k[1]) + '</button>';
    });
    h += '</div>';
    h += '<span class="mb-frei" id="mb-frei">'
      + '<input class="mb-mg" id="mb-m" type="text" inputmode="decimal" placeholder="frei"'
      + ' aria-label="Eigenes Ma\u00df" value="'
      + (b.menge === null ? '' : zahl(b.menge)) + '"'
      + ' onfocus="this.select()" onclick="this.select()"'
      + ' oninput="KMetzgerBest.freiTipp(this)"'
      + ' onkeydown="if(event.key===\'Enter\'){event.preventDefault();'
      + 'KMetzgerBest.frei(\'' + esc(key) + '\')}">'
      + '<button type="button" class="mb-frei-ok" id="mb-frei-ok" hidden'
      + ' title="Diese Menge hinzuf\u00fcgen"'
      + ' onclick="KMetzgerBest.frei(\'' + esc(key) + '\')">'
      + '<i data-lucide="check"></i></button></span></div>';

    // Nur auf hohen Schirmen (CSS blendet sie darunter aus)
    h += '<div class="mb-g kurz"><div class="mb-lbl">Kurzeingabe wie auf dem Zettel</div>'
      + '<div class="mb-inner">'
      + '<input class="txt mono" id="mb-pf" placeholder="z. B. 2x500g V + 6x250g"'
      + ' oninput="KMetzgerBest.vorschau(this.value)"'
      + ' onkeydown="if(event.key===\'Enter\')KMetzgerBest.kurz(\'' + esc(key) + '\')">'
      + '<button class="mb-take" onclick="KMetzgerBest.kurz(\'' + esc(key) + '\')">'
      + '\u00dcbernehmen</button>'
      + '<span class="mb-prev" id="mb-prev"></span></div></div>';
    h += '<div class="mb-g hinweis"><div class="mb-lbl">Hinweis</div><div class="mb-inner">'
      + '<input class="txt" id="mb-h" placeholder="z. B. Kräuter" value="'
      + esc(p.hinweis) + '" oninput="KMetzgerBest.hinweis(\'' + esc(key)
      + '\',this.value)"></div></div>';

    h += '<div class="mb-acts">'
      /* Ohne Hinweisfeld wäre der Hinweis auf dem Telefon unerreichbar. */
      + '<button class="mb-btn mb-hw-knopf" onclick="KMetzgerBest.hinweisBlatt(\''
      + esc(key) + '\')">Hinweis \u2026</button>'
      + ((p.portionen || []).length
        ? '<button class="mb-del" onclick="KMetzgerBest.allesWeg(\'' + esc(key)
          + '\')">Alle Portionen löschen</button>' : '')
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
    if (_korrektur) {
      // Korrektur: kein Entwurfs-Speichern, sonst wuerde die gesendete
      // Bestellung ueberschrieben.
      h += '<button class="mb-btn" onclick="KMetzgerBest.verwerfen()">Verwerfen</button>'
        + '<button class="mb-send" onclick="KMetzgerBest.korrekturSenden()">Korrektur senden</button>';
    } else if (!gesperrt()) {
      h += '<span class="mb-autosave"></span>';
      h += '<button class="mb-btn" onclick="KMetzgerBest.speichern()">Speichern</button>'
        + '<button class="mb-send" onclick="KMetzgerBest.senden()">Bestellung senden</button>';
    } else {
      // Gesendet und keine Korrektur offen: nur noch lesbar, aber die
      // Korrektur muss von hier aus erreichbar sein (F32).
      h += '<button class="mb-btn" onclick="KMetzgerBest.korrektur()">Korrigieren</button>';
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
    markiereGeaendert();
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

  /** `+` öffnet, `−` schließt — ein Knopf statt zweier (Spec F5). */
  function umschalten(key) {
    if (_offen === key) { zu(); return; }
    edit(key, -1);
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
    zeigeGanz(key);
  }

  /* Artikel UND Erfassung zusammen ins Bild holen — der Artikel zuerst.
     Vorher wurde die Oberkante des EDITORS angelegt; dadurch wanderte der
     Artikelname aus dem Bild und man erfasste blind (Spec F1). */
  function zeigeGanz(key) {
    var liste = document.querySelector('#panel-metzgerbest .k-liste');
    if (!liste || !key) return;
    var row = liste.querySelector('.mb-row[data-key="'
      + String(key).replace(/"/g, '\\"') + '"]');
    if (!row) return;
    var l = liste.getBoundingClientRect();
    var r = row.getBoundingClientRect();
    var luft = 4;
    var weg = 0;
    if (r.height > l.height - 2 * luft || r.top < l.top + luft) {
      weg = r.top - l.top - luft;            // Oberkante der Zeile anlegen
    } else if (r.bottom > l.bottom - luft) {
      weg = r.bottom - l.bottom + luft;
    }
    if (weg) liste.scrollTop += weg;
  }

  function feld(k, v) {
    if (k === 'a') _entwurf.anzahl = Math.max(1, parseInt(v, 10) || 1);
    else if (k === 'm') {
      var n = parseFloat(String(v).replace(',', '.'));
      _entwurf.menge = (isFinite(n) && n > 0) ? n : null;
    }
  }

  /* Ohne Bestätigungsknopf muss jede Änderung an einer bereits erfassten
     Portion sofort durchschreiben — sonst ginge sie verloren (Spec F4). */
  function schreibeDurch() {
    if (!_entwurf || _entwurf.i < 0) return false;
    var p = finde(_offen);
    if (!p || !p.portionen[_entwurf.i]) return false;
    if (_entwurf.menge === null && !ist_groesse(_entwurf.einheit)) return false;
    p.portionen[_entwurf.i] = {
      anzahl: _entwurf.anzahl,
      menge: ist_groesse(_entwurf.einheit) ? null : _entwurf.menge,
      einheit: _entwurf.einheit,
      vakuum: !!_entwurf.vakuum
    };
    markiereGeaendert();
    return true;
  }

  function anz(d) {
    _entwurf.anzahl = Math.max(1, _entwurf.anzahl + d);
    var el = document.getElementById('mb-a');
    if (el) el.value = _entwurf.anzahl;
    if (schreibeDurch()) { render(); zeigeGanz(_offen); }
  }

  function einheit(e) {
    if (e === 'groesse') { _entwurf.einheit = 'klein'; _entwurf.menge = null; }
    else { if (ist_groesse(_entwurf.einheit)) _entwurf.menge = null; _entwurf.einheit = e; }
    schreibeDurch();
    render();
    zeigeGanz(_offen);
  }

  // Kachel tippen legt sofort eine Portion an - so entstehen mehrere
  // verschiedene Groessen mit je einem Tipp. Auch beim Ändern wirkt sie
  // sofort; einen Knopf „Ändern" gibt es nicht mehr (Spec F4).
  function kachel(wert) {
    if (typeof wert === 'string') { _entwurf.einheit = wert; _entwurf.menge = null; }
    else _entwurf.menge = wert;
    pad(_offen);
  }

  function vakAn() {
    _entwurf.vakuum = !_entwurf.vakuum;
    var el = document.getElementById('mb-vak');
    if (el) el.className = 'mb-vak' + (_entwurf.vakuum ? ' on' : '');
    if (schreibeDurch()) { render(); zeigeGanz(_offen); }
  }

  /* Freies Maß: Der Haken erscheint erst, wenn eine gültige Zahl dasteht.
     Vorher gab es „+ Hinzufügen" — irreführend, weil eine Kachel bereits
     anlegt (Spec F4). */
  function freiTipp(el) {
    feld('m', el.value);
    var wrap = document.getElementById('mb-frei');
    var ok = document.getElementById('mb-frei-ok');
    var gut = _entwurf.menge !== null;
    if (ok) ok.hidden = !gut;
    if (wrap) wrap.classList.toggle('bereit', gut);
  }

  function frei(key) {
    var el = document.getElementById('mb-m');
    if (el) feld('m', el.value);
    if (_entwurf.menge === null) {
      toast('Bitte eine Menge eintippen oder eine Kachel w\u00e4hlen.');
      if (el) el.focus();
      return;
    }
    pad(key);
  }

  /** Hinweis-Blatt, wenn das Feld auf niedrigen Schirmen entfällt (F6). */
  function hinweisBlatt(key) {
    var p = finde(key);
    if (!p || gesperrt()) return;
    dialogEingabe1('Hinweis zu \u201e' + p.name + '\u201c', p.hinweis || '',
      function (wert) {
        p.hinweis = (wert || '').trim();
        p.pruef = false;
        markiereGeaendert();
        render();
        zeigeGanz(key);
      });
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
    markiereGeaendert();
    render();
    zeigeGanz(key);
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
    markiereGeaendert();
    render();
    zeigeGanz(key);
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
    markiereGeaendert();
    _offen = null; _entwurf = null;
    render();
  }

  function weg(key, i) {
    var p = finde(key);
    if (!p || gesperrt()) return;
    p.portionen.splice(i, 1);
    markiereGeaendert();
    if (_offen === key) { _offen = null; _entwurf = null; }
    render();
  }

  function allesWeg(key) {
    var p = finde(key);
    if (!p) return;
    p.portionen = [];
    p.pruef = false;
    _entwurf = { i: -1, anzahl: 1, menge: null, einheit: _entwurf.einheit, vakuum: false };
    markiereGeaendert();
    render();
  }

  function loeschen(key) {
    var p = finde(key);
    if (!p) return;
    if (_entwurf.i >= 0) p.portionen.splice(_entwurf.i, 1);
    _entwurf = { i: -1, anzahl: 1, menge: null, einheit: _entwurf.einheit, vakuum: false };
    markiereGeaendert();
    render();
  }

  function hinweis(key, v) {
    var p = finde(key);
    if (p) { p.hinweis = v; markiereGeaendert(); }
  }

  function hinweisWeg(key) {
    var p = finde(key);
    if (!p || gesperrt()) return;
    p.hinweis = '';
    p.pruef = false;
    markiereGeaendert();
    if (_offen === key) { _offen = null; _entwurf = null; }
    render();
  }

  function editHinweis(key) {
    edit(key, -1);
    var el = document.getElementById('mb-h');
    if (el) { el.focus(); el.select(); }
  }

  /* ── Hinweis zur ganzen Bestellung (Spec bestell-freitext) ───────────
     Nicht zu verwechseln mit dem Positions-Hinweis darüber: Dieser Text
     gilt für die gesamte Bestellung und wird auf dem Bestellformular
     mitgedruckt. Erfasst wird er im gemeinsamen Textgestalter. */
  function notizKnopf() {
    if (!window.KNotiz) return '';
    var da = KNotiz.hatText(_b && _b.notiz);
    var vorschau = da ? KNotiz.kurz(_b.notiz, 34) : '';
    return '<button class="kn-knopf' + (da ? ' hat' : '') + '"'
      + ' onclick="KMetzgerBest.notizOeffnen()" title="'
      + (da ? 'Hinweis für die Metzgerei ändern' : 'Hinweis für die Metzgerei hinzufügen')
      + '">' + (da ? 'Hinweis ändern' : 'Hinweis hinzufügen')
      + (da ? '<span class="kn-vorschau">' + esc(vorschau) + '</span>' : '')
      + '</button>';
  }

  function notizOeffnen() {
    if (!window.KNotiz || !_b) return;
    var nurLesen = gesperrt();
    KNotiz.oeffnen({
      html: (_b.notiz && _b.notiz.html) || '',
      gesperrt: nurLesen,
      titel: 'Hinweis für die Metzgerei',
      erklaerung: 'Dieser Text wird oben auf dem Bestellformular mitgedruckt.',
      uebernehmen: function (wert) {
        _b.notiz = wert;
        markiereGeaendert();
        fuss();
      }
    });
  }

  function zu() {
    // Offene Änderungen an einer bestehenden Portion nicht verlieren (F4).
    schreibeDurch();
    _offen = null; _entwurf = null; render();
  }
  function such(v) { _suche = v; render(); }
  function filter(alle) { umfang(alle ? 'alle' : 'ueblich'); }

  function spring(i) {
    blatt(false);
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
      markiereGeaendert();
      render();
      return true;
    });
  }

  function zusatzWeg(key) {
    _b.positionen = (_b.positionen || []).filter(function (p) {
      return posKey(p) !== key;
    });
    markiereGeaendert();
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

  /* ── Stille Sicherung ────────────────────────────────────────────────
     Erfasste Mengen lagen bisher nur im Speicher des Browsers. Ein Neuladen
     - etwa durch die Versionspruefung nach einem Update oder ein
     versehentliches F5 - warf alles weg. Deshalb wird jede Aenderung nach
     kurzer Ruhe automatisch als Entwurf abgelegt. */
  var _autoTimer = null;
  var _autoLaeuft = false;
  function markiereGeaendert() {
    _dirty = true;
    // Bewusst `istGesendet()` statt `gesperrt()`: Im Korrekturmodus sind die
    // Felder zwar frei, aber ein stiller Entwurfs-Speicher wuerde die bereits
    // gesendete Bestellung ueberschreiben. Korrekturen gehen nur ueber den
    // ausdruecklichen Versand.
    if (!_b || !_datum || istGesendet()) return;
    if (_autoTimer) clearTimeout(_autoTimer);
    _autoTimer = setTimeout(function () {
      _autoTimer = null;
      if (_autoLaeuft) { markiereGeaendert(); return; }   // spaeter erneut
      _autoLaeuft = true;
      speichern(true).then(function (ok) {
        _autoLaeuft = false;
        var el = document.querySelector('#panel-metzgerbest .mb-autosave');
        if (el) {
          el.textContent = ok ? 'automatisch gesichert' : 'Sicherung fehlgeschlagen';
          el.className = 'mb-autosave' + (ok ? ' ok' : ' fehl');
        }
      });
    }, 1500);
  }

  function istGeaendert() { return !!_dirty; }

  function speichern(still) {
    return fetch(API + '/metzger-order/' + encodeURIComponent(_datum) + '/speichern', {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ positionen: nutzbare(), notiz: (_b && _b.notiz) || null })
    }).then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.success) throw new Error(fehlerText(d, ''));
        _dirty = false;
        if (!still) toast('Der Entwurf ist gespeichert.');
        return true;
      })
      .catch(function (e) {
        // Die stille Sicherung meldet sich in der Fusszeile, nicht per Toast –
        // sonst blinkt bei jedem Verbindungsaussetzer eine Meldung auf.
        if (!still) toast(e.message || 'Der Entwurf konnte nicht gespeichert werden.');
        return false;
      });
  }

  function senden() { versandDialog(false); }

  /* Korrektur ist zweistufig: erst die Felder freigeben, dann senden. Vorher
     sprang der Knopf sofort in den Versanddialog - man verschickte die
     unveraenderte Bestellung ein zweites Mal. */
  function korrektur() {
    if (!istGesendet()) return;
    _korrektur = true;
    _korrekturBasis = JSON.stringify(nutzbare());
    render();
    toast('Mengen ändern und dann „Korrektur senden".');
  }

  function verwerfen() {
    _korrektur = false;
    _korrekturBasis = null;
    ladeBestellung(_datum);
  }

  function korrekturSenden() {
    if (JSON.stringify(nutzbare()) === _korrekturBasis) {
      toast('Nichts geändert – es gibt nichts zu korrigieren.');
      return;
    }
    versandDialog(true);
  }

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
      body: JSON.stringify({ positionen: nutzbare(), notiz: (_b && _b.notiz) || null,
                             wer: 'Kiosk' })
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

  /* Die Stammdaten sind ins CMS gezogen. Wer den alten Reiter noch als
     Lesezeichen hat, landet hier und wird weitergeschickt statt vor einer
     leeren Seite zu stehen. */
  function hinweisEinstellungen() {
    return '<div class="k-empty">Die Einstellungen zur Metzger-Bestellung '
      + 'werden jetzt im CMS gepflegt: <b>CMS \u2192 Einstellungen \u2192 '
      + 'Metzger-Bestellung</b>.<br>Dort stehen Empf\u00e4nger, Liefertage, '
      + 'Bestellschluss und Kunden-Nr.</div>';
  }

  // Das frühere Einstellungsformular samt `cfgSpeichern()` ist entfallen. Es
  // wäre ein zweiter Weg gewesen, dieselben Stammdaten am CMS vorbei zu
  // ändern – und zwar einer ohne die dortigen Prüfungen.

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

  /** Ein einzelnes Textfeld im gewohnten Blatt — für den Positions-Hinweis,
   *  wenn das Feld auf niedrigen Schirmen entfällt (Spec F6). */
  function dialogEingabe1(titel, wert, ja) {
    var w = huelle('<div class="mb-dlg-kopf">' + esc(titel) + '</div>'
      + '<div class="mb-dlg-form">'
      + '<label>Hinweis<input id="mb-hw-feld" placeholder="z. B. Kräuter" value="'
      + esc(wert) + '" autofocus></label>'
      + '</div><div class="mb-dlg-acts">'
      + '<button class="mb-btn" data-ab>Abbrechen</button>'
      + '<button class="mb-send" data-ok>Übernehmen</button></div>');
    w.querySelector('[data-ab]').onclick = function () { w.remove(); };
    w.querySelector('[data-ok]').onclick = function () {
      var v = (document.getElementById('mb-hw-feld') || {}).value || '';
      w.remove();
      ja(v);
    };
    var f = document.getElementById('mb-hw-feld');
    if (f) { f.focus(); f.select(); }
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
    blatt: blatt, umfang: umfang, umschalten: umschalten,
    freiTipp: freiTipp, frei: frei, hinweisBlatt: hinweisBlatt,
    edit: edit, feld: feld, anz: anz, einheit: einheit, kachel: kachel,
    vakAn: vakAn, pad: pad, nimm: nimm, vorschau: vorschau, kurz: kurz,
    weg: weg, allesWeg: allesWeg, loeschen: loeschen,
    hinweis: hinweis, hinweisWeg: hinweisWeg, editHinweis: editHinweis, zu: zu,
    notizOeffnen: notizOeffnen,
    zusatz: zusatz, zusatzWeg: zusatzWeg, frueher: frueher,
    speichern: speichern, senden: senden, korrektur: korrektur,
    verwerfen: verwerfen, korrekturSenden: korrekturSenden,
    aktiv: aktiv,
    istGeaendert: istGeaendert,
    badge: badge
  };
})();

#!/usr/bin/env node
/*
 * Erzeugt die beiden CMS-Seiten aus static-site/cms-klassisch.html.
 *
 * Siehe specs/cms-redesign/plan.md, Abschnitt 3.2 "Die Umformungsregeln".
 *
 * Zwei Ausgaben aus derselben Quelle - genau wie beim Kiosk:
 *   cms.html       die Seite, mit der gearbeitet wird
 *   cms-neu.html   dieselbe Seite mit Entwurfshinweis, Ziel der Pruefwerkzeuge
 *
 * `cms-klassisch.html` bleibt die einzige Stelle, an der die Fachlogik
 * gepflegt wird - und der Rueckfallweg, falls im Betrieb etwas auffaellt.
 *
 * Grundsatz wie beim Kiosk-Umbau: Alles, was keine Regel trifft, wird
 * zeichengleich uebernommen. Dadurch bleiben saemtliche Bedienfunktionen
 * bauartbedingt erhalten - es wird nur das Geruest und das Aussehen ersetzt.
 * Nachgewiesen wird das von tools/pruef-cms-abgleich.js.
 *
 * Greift ein Anker nicht, bricht das Werkzeug ab. Ein stillschweigend
 * uebersprungener Umbau waere der gefaehrlichste Fehler.
 *
 * Aufruf:  node tools/build-cms-neu.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const wurzel = path.resolve(__dirname, '..');
const quelle = path.join(wurzel, 'static-site', 'cms-klassisch.html');
const zielBetrieb = path.join(wurzel, 'static-site', 'cms.html');
const zielVorschau = path.join(wurzel, 'static-site', 'cms-neu.html');
const basisBlatt = path.join(wurzel, 'static-site', 'css', 'cms-base.css');

// Wird je Durchlauf gesetzt: nur die Vorschau traegt den Entwurfshinweis.
let vorschau = false;

/* ══════════════════════════════════════════════════════════════════════
   Die Bereiche und ihre Gruppen (Spec F3)

   15 Reiter passen nicht in eine Leiste. Sie werden gruppiert - die
   Reihenfolge folgt dem Arbeitsablauf im Laden, nicht der bisherigen
   Reihenfolge im Markup.

   WICHTIG: `cmsTab()` setzt `tab.className = 'cms-tab' + (aktiv?' active':'')`
   und ueberschreibt damit die gesamte Klassenliste des Knopfes. Die Knoepfe
   duerfen deshalb KEINE weiteren Klassen tragen - die Gestaltung haengt an
   den Huellen darum.
   ══════════════════════════════════════════════════════════════════════ */

const GRUPPEN = [
  { name: 'Laden',   farbe: '#2e7d4f', ids: ['wp', 'hours', 'ang', 'sort'] },
  { name: 'Website', farbe: '#1d4ed8', ids: ['hp', 'news', 'gallery', 'cfg'] },
  { name: 'Verkauf', farbe: '#b45309', ids: ['orders', 'metzger', 'stats'] },
  { name: 'Kanäle',  farbe: '#7c3aed', ids: ['social', 'push'] },
  { name: 'System',  farbe: '#688073', ids: ['settings', 'help'] },
];

/* Verweise auf eigene Seiten statt CMS-Bereiche: Sie stehen in der genannten
   Gruppe, sind aber Links (kein data-id, kein Umschalten). In der Quelle
   (cms-klassisch.html) stehen sie ebenfalls - dort als <a class="cms-tab">,
   das von U3 nicht als Reiter gezaehlt wird. */
const VERWEISE = [
  { gruppe: 'Verkauf', html:
    '      <a class="cms-tab" href="/inventur" title="Zur Inventur">'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;">'
    + '<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>'
    + '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>'
    + '<path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg> Inventur</a>' },
];

/* ── Werkzeug-Gerüst ─────────────────────────────────────────────────── */

const regeln = [];
function regel(nr, titel, fn) { regeln.push({ nr: nr, titel: titel, fn: fn }); }

function ersetzeEinmal(text, von, bis, neu, wer) {
  const a = text.indexOf(von);
  if (a < 0) throw new Error(wer + ': Anfang nicht gefunden: ' + JSON.stringify(von.slice(0, 60)));
  const b = text.indexOf(bis, a + von.length);
  if (b < 0) throw new Error(wer + ': Ende nicht gefunden: ' + JSON.stringify(bis.slice(0, 60)));
  return { text: text.slice(0, a) + neu + text.slice(b), entfernt: b - a };
}

/* ══════════════════════════════════════════════════════════════════════
   U1  Gestaltungsblatt auslagern
   ══════════════════════════════════════════════════════════════════════ */

regel('U1', 'Gestaltungsblatt auslagern', function (t) {
  const von = '<style>\n';
  const a = t.indexOf(von);
  if (a < 0) throw new Error('U1: <style> nicht gefunden');
  const b = t.indexOf('</style>\n', a);
  if (b < 0) throw new Error('U1: </style> nicht gefunden');
  const inhalt = t.slice(a + von.length, b);

  // Der bestehende Block wird ausgelagert und weiter geladen, damit kein
  // Element unformatiert bleibt. Das neue Blatt liegt darueber.
  const kopf = '/* ERZEUGT aus static-site/cms-klassisch.html durch\n'
    + '   tools/build-cms-neu.js. Nicht von Hand aendern.\n'
    + '   Grundlage fuer css/cms-neu.css. */\n';
  fs.writeFileSync(basisBlatt, kopf + inhalt, 'utf8');

  const neu =
    '<link rel="stylesheet" href="/css/cms-base.css">\n'
    + '<!-- Das gemeinsame Designschema (Werte) vor dem Seitenblatt. -->\n'
    + '<link rel="stylesheet" href="/css/dl-design.css">\n'
    + '<link rel="stylesheet" href="/css/cms-neu.css">\n';

  return {
    text: t.slice(0, a) + neu + t.slice(b + '</style>\n'.length),
    info: inhalt.split('\n').length + ' Zeilen nach css/cms-base.css ausgelagert'
  };
});

/* ══════════════════════════════════════════════════════════════════════
   U2  Kopfzeile ersetzen

   Alle Bedienelemente der alten Kopfzeile bleiben erhalten - samt
   Kennungen, onclick-Aufrufen und dem Logo-Bild, das cms.js ueber
   `#cms-app img[src^="data:image"]` sucht.
   ══════════════════════════════════════════════════════════════════════ */

const KOPF = `  <!-- ═══ Kopfzeile (Rasterbereich "hd") ═══ -->
  <header class="cmsneu-kopf">
    <button type="button" class="cmsneu-menue" id="cmsneu-menue-btn" aria-expanded="false" aria-controls="cms-tabs-scroll" aria-label="CMS-Bereich wechseln" title="Bereich wechseln">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      <span class="cmsneu-menue-txt">Bereich</span>
    </button>
    <div class="cmsneu-marke" onclick="if(window!==window.parent){window.parent.postMessage('closeMittagPopup','*')}else{location.href='/index.html'}" title="Zurück zur Website">
      <img id="cms-header-logo" src="" alt="Dorfladen Oberornau">
      <h1>Dorfladen&nbsp;CMS</h1>
    </div>
    <div class="cmsneu-kopf-info">
      <span id="cms-status">Lade...</span>
      <span id="cms-version"></span>
    </div>
    <div class="cmsneu-kopf-acts">
      <a href="/kiosk.html" class="cms-btn cms-btn-gray" id="cms-back-kiosk" aria-label="Zum Kiosk" title="Zum Kiosk">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
        <span class="cmsneu-lang">Kiosk</span>
      </a>
      <a href="/index.html" class="cms-btn cms-btn-gray" id="cms-back-website" aria-label="Zur Website" onclick="if(window!==window.parent){event.preventDefault();window.parent.postMessage('closeMittagPopup','*')}" title="Zur Website">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        <span class="cmsneu-lang">Website</span>
      </a>
    </div>
  </header>

`;

regel('U2', 'Kopfzeile ersetzen', function (t) {
  const von = '  <div class="cms-flex cms-between cms-mb" style="align-items: center; border-bottom:';
  const bis = '  <div class="cms-tabs-wrap">';
  const r = ersetzeEinmal(t, von, bis, KOPF, 'U2');
  return { text: r.text, info: 'neue Kopfzeile, alle 5 Kennungen erhalten' };
});

/* ══════════════════════════════════════════════════════════════════════
   U3  Navigation ersetzen

   Die Reiterknoepfe werden NICHT neu geschrieben, sondern aus der Quelle
   uebernommen und nur neu gruppiert. So koennen weder Beschriftung noch
   Sinnbild noch Kennung verlorengehen - sie stammen weiter aus cms.html.
   Entfernt wird ausschliesslich die bunte Schriftfarbe; sie wird zum
   Farbpunkt der Gruppe.
   ══════════════════════════════════════════════════════════════════════ */

function reiterAusQuelle(text) {
  const a = text.indexOf('  <div class="cms-tabs-wrap">');
  if (a < 0) throw new Error('U3: Reiterleiste nicht gefunden');
  const b = text.indexOf('  <!-- Wochenplan -->', a);
  if (b < 0) throw new Error('U3: Ende der Reiterleiste nicht gefunden');
  const block = text.slice(a, b);

  const gefunden = new Map();
  const re = /<button\s+class="cms-tab[^"]*"([^>]*)>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const attr = m[1];
    const id = (attr.match(/data-id="([^"]+)"/) || [])[1];
    if (!id) throw new Error('U3: Reiter ohne data-id');
    gefunden.set(id, { attr: attr, innen: m[2].trim() });
  }
  return { block: block, reiter: gefunden, von: a, bis: b };
}

function navigation(reiter) {
  const zeilen = [];
  zeilen.push('  <!-- ═══ Navigation (Rasterbereich "nav") ═══ -->');
  zeilen.push('  <div class="cms-tabs-wrap cmsneu-nav">');
  zeilen.push('  <div class="cms-tabs" id="cms-tabs-scroll">');

  GRUPPEN.forEach(function (g) {
    zeilen.push('    <div class="cmsneu-gruppe" style="--gruppe:' + g.farbe + '">');
    zeilen.push('      <div class="cmsneu-gruppe-kopf">' + g.name + '</div>');
    g.ids.forEach(function (id) {
      const r = reiter.get(id);
      if (!r) throw new Error('U3: Reiter "' + id + '" fehlt in der Quelle');
      // Die bunte Schriftfarbe entfaellt; die Gruppe traegt die Farbe.
      let attr = r.attr.replace(/\s*style="color:[^"]*"/, '');
      const aktiv = /class="cms-tab active"/.test('class="cms-tab active"') && id === 'wp';
      zeilen.push('      <button class="cms-tab' + (aktiv ? ' active' : '') + '"'
        + attr + '>' + r.innen + '</button>');
    });
    VERWEISE.filter(function (v) { return v.gruppe === g.name; })
      .forEach(function (v) { zeilen.push(v.html); });
    zeilen.push('    </div>');
  });

  zeilen.push('  </div>');
  zeilen.push('  </div>');
  zeilen.push('');
  return zeilen.join('\n');
}

regel('U3', 'Navigation ersetzen', function (t) {
  const q = reiterAusQuelle(t);
  const verteilt = GRUPPEN.reduce(function (n, g) { return n + g.ids.length; }, 0);
  if (verteilt !== q.reiter.size) {
    throw new Error('U3: ' + q.reiter.size + ' Reiter in der Quelle, aber '
      + verteilt + ' in den Gruppen verteilt');
  }
  return {
    text: t.slice(0, q.von) + navigation(q.reiter) + t.slice(q.bis),
    info: q.reiter.size + ' Reiter in ' + GRUPPEN.length + ' Gruppen'
  };
});

/* ══════════════════════════════════════════════════════════════════════
   U4  Rasterhülle

   `#cms-app` wird zur Rasterhuelle: Kopf, Navigation und Inhalt liegen in
   benannten Bereichen, und nur der Inhalt rollt. Die Panels wandern dafuer
   in einen Inhaltsbehaelter.
   ══════════════════════════════════════════════════════════════════════ */

regel('U4', 'Rasterhülle um Kopf, Navigation und Inhalt', function (t) {
  // Die Klasse cms-wrap traegt im Altbestand die Seitenbreite und den
  // Aussenabstand. Beides macht jetzt das Raster.
  const von = '<div class="cms-wrap" id="cms-app" lang="de" style="display:none">';
  if (t.indexOf(von) < 0) throw new Error('U4: #cms-app nicht gefunden');
  const neu = '<div class="cms-wrap cmsneu-app" id="cms-app" lang="de" style="display:none">';
  t = t.replace(von, neu);

  // Inhaltsbehaelter: beginnt nach der Navigation, endet vor </div> von #cms-app.
  const nachNav = '  <!-- Wochenplan -->';
  const i = t.indexOf(nachNav);
  if (i < 0) throw new Error('U4: Anfang der Panels nicht gefunden');
  t = t.slice(0, i) + '  <main class="cmsneu-inhalt" id="cmsneu-inhalt">\n' + t.slice(i);

  const ende = '<div id="cms-modal-wrap"';
  const j = t.indexOf(ende);
  if (j < 0) throw new Error('U4: #cms-modal-wrap nicht gefunden');
  // Vor dem Dialogbehaelter steht das schliessende </div> von #cms-app.
  const schluss = t.lastIndexOf('</div>', j);
  if (schluss < 0) throw new Error('U4: Ende von #cms-app nicht gefunden');
  t = t.slice(0, schluss) + '</main>\n' + t.slice(schluss);

  return { text: t, info: 'Kopf, Navigation und Inhalt liegen im Raster' };
});

/* ══════════════════════════════════════════════════════════════════════
   U5  Inline-Gestaltung auf das Schema ziehen (Spec F4)

   Das CMS traegt 1 725 style-Attribute im Markup. Sie werden NICHT
   entfernt, sondern umgewertet: Es bleiben gleich viele Attribute in
   gleicher Reihenfolge, nur ihre Werte kommen aus dem Designschema.
   Damit bleibt jeder Lese- und Schreibzugriff aus cms.js gueltig.

   Nicht angefasst werden:
     - Eigenschaften aus `zustand` (display, width, transform ...)
     - eigene Eigenschaften (--name)
     - alles innerhalb von <script>-Bloecken
     - Werte, die die Tabelle nicht kennt - sie werden berichtet
   ══════════════════════════════════════════════════════════════════════ */

const tabelle = JSON.parse(fs.readFileSync(
  path.join(__dirname, 'cms-stilwerte.json'), 'utf8'));

const ZUSTAND = new Set(tabelle.zustand);
const FARBEIGEN = new Set(tabelle.farbEigenschaften);

const bericht = { umgestellt: 0, unveraendert: 0, offen: new Map() };

function skriptbereiche(text) {
  const out = [];
  const re = /<script\b[^>]*>[\s\S]*?<\/script>/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push([m.index, m.index + m[0].length]);
  return out;
}

function werteUm(deklaration) {
  const i = deklaration.indexOf(':');
  if (i < 0) return { text: deklaration, geaendert: false, gepflegt: true };
  const eigen = deklaration.slice(0, i).trim().toLowerCase();
  const wert = deklaration.slice(i + 1);

  // Zustand und eigene Eigenschaften bleiben unberuehrt.
  if (eigen.startsWith('--') || ZUSTAND.has(eigen)) {
    return { text: deklaration, geaendert: false, gepflegt: true };
  }

  let neu = wert;

  if (FARBEIGEN.has(eigen)) {
    neu = neu.replace(/#[0-9a-fA-F]{3,8}/g, function (h) {
      return tabelle.farben[h.toLowerCase()] || h;
    });
  }

  const masse = tabelle.masse[eigen];
  if (masse) {
    const schluessel = neu.trim().replace(/\s+/g, ' ');
    if (masse[schluessel]) neu = neu.replace(schluessel, masse[schluessel]);
  }

  const geaendert = neu !== wert;
  // Als "offen" gilt, was gestalterisch ist, aber nicht zugeordnet werden
  // konnte - der Arbeitsvorrat fuer die naechste Runde.
  const gepflegt = geaendert || !(FARBEIGEN.has(eigen) || tabelle.masse[eigen]);
  return {
    text: deklaration.slice(0, i + 1) + neu,
    geaendert: geaendert,
    gepflegt: gepflegt,
    schluessel: eigen + ':' + wert.trim().replace(/\s+/g, ' ')
  };
}

regel('U5', 'Inline-Gestaltung auf das Schema ziehen', function (t) {
  const tabu = skriptbereiche(t);
  const imSkript = function (i) {
    return tabu.some(function (b) { return i >= b[0] && i < b[1]; });
  };

  const re = /style="([^"]*)"/g;
  let m, out = '', zuletzt = 0;
  while ((m = re.exec(t)) !== null) {
    if (imSkript(m.index)) continue;
    // Bilddaten und Verweise enthalten Semikolons - dort wird nicht zerlegt.
    if (/url\(|data:/.test(m[1])) continue;

    const teile = m[1].split(';');
    const neu = teile.map(function (d) {
      if (!d.trim()) return d;
      const r = werteUm(d);
      if (r.geaendert) bericht.umgestellt++;
      else bericht.unveraendert++;
      if (!r.gepflegt) {
        bericht.offen.set(r.schluessel, (bericht.offen.get(r.schluessel) || 0) + 1);
      }
      return r.text;
    }).join(';');

    if (neu !== m[1]) {
      out += t.slice(zuletzt, m.index) + 'style="' + neu + '"';
      zuletzt = m.index + m[0].length;
    }
  }
  out += t.slice(zuletzt);

  const offen = Array.from(bericht.offen.values()).reduce(function (a, b) { return a + b; }, 0);
  return {
    text: out,
    info: bericht.umgestellt + ' umgestellt, ' + bericht.unveraendert
      + ' unverändert, ' + offen + ' offen ('
      + bericht.offen.size + ' verschiedene)'
  };
});

/* ══════════════════════════════════════════════════════════════════════
   U5b Kartenköpfe vereinheitlichen

   Die Farbe eines Kartenkopfs war frueher eine Wegweisung: Push violett,
   Einstellungen indigo, Metzger rot. Diese Aufgabe hat jetzt der Farbpunkt
   der Navigationsgruppe. Uebrig blieben 22 verschiedene Kopffarben, die
   ohne diesen Zusammenhang zufaellig wirkten - und zwei grosse rote Koepfe
   beim Metzger lasen sich, als sei etwas schiefgegangen.

   Warum hier und nicht im Gestaltungsblatt? Viele dieser Koepfe tragen ihr
   `background` inline MIT `!important`. Eine Regel im Blatt kaeme dagegen
   nicht an - inline `!important` schlaegt alles. Also wird der Wert selbst
   gesetzt.

   Ausgenommen bleibt der Hinweiskopf (bernstein): Er bildet die gelbe
   Hinweisbox der Website ab und sagt damit etwas ueber den Inhalt aus.
   ══════════════════════════════════════════════════════════════════════ */

regel('U5b', 'Kartenköpfe vereinheitlichen', function (t) {
  let vereinheitlicht = 0, belassen = 0;
  const text = t.replace(
    /(<div\b[^>]*class="cms-card-header"[^>]*style=")([^"]*)(")/g,
    function (ganz, vorn, stil, hinten) {
      const neu = stil.split(';').map(function (d) {
        const i = d.indexOf(':');
        if (i < 0) return d;
        const eigen = d.slice(0, i).trim().toLowerCase();
        if (eigen !== 'background' && eigen !== 'background-color') return d;
        // Bernstein bleibt: Der Hinweiskopf sagt etwas aus.
        if (/--amb/.test(d)) { belassen++; return d; }
        vereinheitlicht++;
        const wichtig = /!important/.test(d) ? '!important' : '';
        return d.slice(0, i + 1) + 'var(--gr)' + wichtig;
      }).join(';');
      return vorn + neu + hinten;
    });
  return {
    text: text,
    info: vereinheitlicht + ' Kartenköpfe auf die Hausfarbe, '
      + belassen + ' als Hinweis belassen'
  };
});

/* ══════════════════════════════════════════════════════════════════════
   U6  Hilfeschicht einbinden

   Sie ergaenzt die Oberflaeche von aussen (Navigationsblatt auf dem
   Telefon) und ruft nichts in cms.js auf.
   ══════════════════════════════════════════════════════════════════════ */

regel('U5c', 'Angebotsgestaltung im gemeinsamen Designerstil', function (t) {
  const start = t.indexOf('<div id="cms-cfg-plakat"');
  const end = t.indexOf('<!-- ============ SUB-TAB: HP-Sonderangebote', start);
  if (start < 0 || end < 0) throw new Error('U5c: Angebotsdesign nicht gefunden');
  const section = t.slice(start, end).replace('<div id="cms-cfg-plakat"', '<div data-offer-workspaces id="cms-cfg-plakat"').replace(/(<div class="cms-card-header"[^>]*>)([^<]*)(<\/div>)/g, (_, before, title, after) => {
    const label = /Template/.test(title) ? 'Vorlage' : /Farben/.test(title) ? 'Farben'
      : /Preisschild-Form/.test(title) ? 'Preisschildform' : /Preisschild/.test(title) ? 'Preisschild und Marker'
      : /Dekoration/.test(title) ? 'Dekoration' : title.replace(/&#\d+;\s*/g, '');
    return before + label + after;
  });
  return { text: t.slice(0, start) + section + t.slice(end), info: 'Feldkennungen und Funktionen erhalten' };
});

regel('U5d', 'Wochenplan nach freigegebenem Mockup', function (t) {
  const start = t.indexOf('  <div id="cms-panel-wp">');
  const end = t.indexOf('    <div id="cms-wp-loading"', start);
  if (start < 0 || end < 0) throw new Error('U5d: Wochenplan-Steuerung nicht gefunden');
  const buttons = t.slice(start, end).match(/<button\b[^>]*>[\s\S]*?<\/button>/g) || [];
  function button(action, name, content) {
    const matches = buttons.filter(b => action === 'help'
      ? b.includes("cmsSwitchHelpTopic('wp-help')") : b.includes('data-action="' + action + '"'));
    if (matches.length !== 1) throw new Error('U5d: Wochenplan-Aktion nicht eindeutig: ' + action);
    return matches[0].slice(0, matches[0].indexOf('>')).replace(/\sstyle="[^"]*"/g, '')
      + ' aria-label="' + name + '">' + content + '</button>';
  }
  function icon(name, drawing) {
    return '<i data-lucide="' + name + '" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + drawing + '</svg></i>';
  }
  const header = '  <div id="cms-panel-wp">\n'
    + '    <section class="cms-wp-controls" aria-label="Wochenplan steuern">\n'
    + '      <div class="cms-wp-heading"><h2>Wochenplan</h2>'
    + button('openAddMeal', 'Gericht', icon('plus', '<path d="M12 5v14M5 12h14"/>') + '<span>Gericht</span>')
    + button('help', 'Hilfe zum Wochenplan', icon('circle-help', '<circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01"/>')) + '</div>\n'
    + '      <nav class="cms-week-nav" aria-label="Woche wählen">'
    + button('weekPrev', 'Vorherige Woche', icon('chevron-left', '<path d="m15 18-6-6 6-6"/>'))
    + '<div class="cms-wp-week-label" aria-live="polite"><div id="cms-wp-title">KW --</div><div id="cms-wp-range"></div></div>'
    + button('weekNext', 'Nächste Woche anzeigen', icon('chevron-right', '<path d="m9 18 6-6-6-6"/>'))
    + '<div class="cms-wp-presets">' + button('weekThis', 'Diese Woche', 'Diese Woche')
    + button('weekNxt', 'Nächste Woche', 'N&auml;chste Woche') + '</div></nav>\n'
    + '      <div class="cms-wp-exports" role="group" aria-label="Vorschau und Ausgabe">'
    + button('previewWP', 'Vorschau', icon('eye', '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>') + '<span>Vorschau</span>')
    + button('printWP', 'Drucken', icon('printer', '<path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/><path d="M18 12h.01"/>') + '<span>Drucken</span>')
    + button('waageWP', 'Auf die Waage', icon('scale', '<path d="m16 16 3-8 3 8c-1.6 1-4.4 1-6 0ZM2 16l3-8 3 8c-1.6 1-4.4 1-6 0ZM7 21h10M12 3v18M3 7l9-4 9 4"/>') + '<span>Waage</span>')
    + button('shareWP', 'Teilen', icon('share-2', '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>') + '<span>Teilen</span>')
    + '</div>\n    </section>\n';
  return { text: t.slice(0, start) + header + t.slice(end), info: 'alle zehn Wochenplan-Aktionen und Kennungen erhalten' };
});

regel('U6', 'Hilfeschicht einbinden', function (t) {
  const anker = '</body>';
  const i = t.lastIndexOf(anker);
  if (i < 0) throw new Error('U6: </body> nicht gefunden');
  const neu = '<script src="/js/cms-neu-shell.js"></script>\n';
  return {
    text: t.slice(0, i) + neu + t.slice(i),
    info: 'cms-neu-shell.js nach allen Skripten geladen'
  };
});

/* ══════════════════════════════════════════════════════════════════════
   U7  Titel und Entwurfshinweis (Spec F5)

   Nur die Vorschau traegt den Hinweis. Die Seite, mit der gearbeitet wird,
   heisst wie eh und je und traegt keinen Streifen.
   ══════════════════════════════════════════════════════════════════════ */

regel('U7', 'Entwurf kennzeichnen', function (t) {
  if (!vorschau) return { text: t, info: 'kein Hinweis (Seite für den Betrieb)' };

  const von = '<title>Dorfladen CMS</title>';
  if (t.indexOf(von) < 0) throw new Error('U7: Titel nicht gefunden');
  t = t.replace(von, '<title>Dorfladen CMS (Entwurf)</title>');

  const anker = '<body>\n';
  if (t.indexOf(anker) < 0) throw new Error('U7: <body> nicht gefunden');
  const streifen = '<body>\n'
    + '<div class="cmsneu-hinweis" role="status">Entwurf des neuen CMS — '
    + '<b>wirkt auf echte Daten</b> '
    + '<a href="/cms-klassisch.html">· gewohnte Fassung</a></div>\n';
  t = t.replace(anker, streifen);

  return { text: t, info: 'Titel und Hinweisstreifen gesetzt' };
});

/* ══════════════════════════════════════════════════════════════════════
   Ablauf
   ══════════════════════════════════════════════════════════════════════ */

function baue(ziel, istVorschau) {
  vorschau = istVorschau;
  bericht.umgestellt = 0;
  bericht.unveraendert = 0;
  bericht.offen.clear();

  let text = fs.readFileSync(quelle, 'utf8');
  const vorher = text.length;

  // Die Quelle traegt Windows-Zeilenenden. Alle Anker sind mit \n
  // geschrieben; deshalb wird fuer die Umformung vereinheitlicht und am
  // Ende zurueckgestellt.
  const crlf = text.indexOf('\r\n') >= 0;
  if (crlf) text = text.replace(/\r\n/g, '\n');

  console.log('');
  console.log('Umbau: cms-klassisch.html -> ' + path.basename(ziel)
    + '   (' + (istVorschau ? 'Vorschau mit Hinweis' : 'Seite fuer den Betrieb') + ')');
  console.log('────────────────────────────────────────────────────────────────────────');

  regeln.forEach(function (r) {
    let erg;
    try {
      erg = r.fn(text);
    } catch (e) {
      console.log('  ' + r.nr + '   ABBRUCH  ' + r.titel + ' – ' + e.message);
      console.log('');
      console.log('  Es wurde nichts geschrieben. Ein stillschweigend übersprungener');
      console.log('  Umbau wäre der gefährlichste Fehler.');
      process.exit(1);
    }
    text = erg.text;
    console.log('  ' + r.nr.padEnd(4) + ' ok      ' + r.titel + ' – ' + erg.info);
  });

  if (crlf) text = text.replace(/\n/g, '\r\n');
  fs.writeFileSync(ziel, text, 'utf8');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('geschrieben: ' + path.relative(wurzel, ziel)
    + '  (' + vorher + ' → ' + text.length + ' Zeichen)');
}

function main() {
  if (!fs.existsSync(quelle)) {
    console.error('Quelle fehlt: ' + quelle);
    process.exit(2);
  }

  baue(zielBetrieb, false);
  baue(zielVorschau, true);

  // Der Arbeitsvorrat: was gestalterisch ist, aber noch keine Zuordnung hat.
  if (bericht.offen.size) {
    const sortiert = Array.from(bericht.offen.entries())
      .sort(function (a, b) { return b[1] - a[1]; });
    console.log('');
    console.log('Noch nicht zugeordnet (' + sortiert.length + ' verschiedene, '
      + 'die 15 häufigsten):');
    sortiert.slice(0, 15).forEach(function (e) {
      console.log('  ' + String(e[1]).padStart(4) + '  ' + e[0]);
    });
    const rest = path.join(wurzel, 'tools', 'cms-stilwerte-offen.txt');
    fs.writeFileSync(rest, sortiert.map(function (e) {
      return e[1] + '\t' + e[0];
    }).join('\n') + '\n', 'utf8');
    console.log('  vollständige Liste: ' + path.relative(wurzel, rest));
  }

  console.log('');
  console.log('Jetzt prüfen:  node tools/pruef-cms-abgleich.js');
}

main();

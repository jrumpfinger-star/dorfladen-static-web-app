#!/usr/bin/env node
/*
 * Erzeugt static-site/cms-neu.html aus static-site/cms.html.
 *
 * Siehe specs/cms-redesign/plan.md, Abschnitt 3.2 "Die Umformungsregeln".
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
const quelle = path.join(wurzel, 'static-site', 'cms.html');
const ziel = path.join(wurzel, 'static-site', 'cms-neu.html');
const basisBlatt = path.join(wurzel, 'static-site', 'css', 'cms-base.css');

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
  const kopf = '/* ERZEUGT aus static-site/cms.html durch tools/build-cms-neu.js.\n'
    + '   Nicht von Hand aendern. Grundlage fuer css/cms-neu.css. */\n';
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
    <button type="button" class="cmsneu-menue" id="cmsneu-menue-btn" aria-expanded="false" aria-controls="cms-tabs-scroll" title="Bereich wechseln">
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
      <a href="/kiosk.html" class="cms-btn cms-btn-gray" id="cms-back-kiosk" title="Zum Kiosk">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8"/><path d="M12 16v4"/></svg>
        <span class="cmsneu-lang">Kiosk</span>
      </a>
      <a href="/index.html" class="cms-btn cms-btn-gray" id="cms-back-website" onclick="if(window!==window.parent){event.preventDefault();window.parent.postMessage('closeMittagPopup','*')}" title="Zur Website">
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
   U6  Hilfeschicht einbinden

   Sie ergaenzt die Oberflaeche von aussen (Navigationsblatt auf dem
   Telefon) und ruft nichts in cms.js auf.
   ══════════════════════════════════════════════════════════════════════ */

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
   U7  Titel und Hinweisstreifen (Spec F5)
   ══════════════════════════════════════════════════════════════════════ */

regel('U7', 'Entwurf kennzeichnen', function (t) {
  const von = '<title>Dorfladen CMS</title>';
  if (t.indexOf(von) < 0) throw new Error('U7: Titel nicht gefunden');
  t = t.replace(von, '<title>Dorfladen CMS (Entwurf)</title>');

  const anker = '<body>\n';
  if (t.indexOf(anker) < 0) throw new Error('U7: <body> nicht gefunden');
  const streifen = '<body>\n'
    + '<div class="cmsneu-hinweis" role="status">Entwurf des neuen CMS — '
    + '<b>wirkt auf echte Daten</b> <a href="/cms.html">· gewohnte Fassung</a></div>\n';
  t = t.replace(anker, streifen);

  return { text: t, info: 'Titel und Hinweisstreifen gesetzt' };
});

/* ══════════════════════════════════════════════════════════════════════
   Ablauf
   ══════════════════════════════════════════════════════════════════════ */

function main() {
  if (!fs.existsSync(quelle)) {
    console.error('Quelle fehlt: ' + quelle);
    process.exit(2);
  }
  let text = fs.readFileSync(quelle, 'utf8');
  const vorher = text.length;

  // Die Quelle traegt Windows-Zeilenenden. Alle Anker sind mit \n
  // geschrieben; deshalb wird fuer die Umformung vereinheitlicht und am
  // Ende zurueckgestellt.
  const crlf = text.indexOf('\r\n') >= 0;
  if (crlf) text = text.replace(/\r\n/g, '\n');

  console.log('Umbau: cms.html -> cms-neu.html');
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
    console.log('  ' + r.nr + '   ok      ' + r.titel + ' – ' + erg.info);
  });

  if (crlf) text = text.replace(/\n/g, '\r\n');
  fs.writeFileSync(ziel, text, 'utf8');
  console.log('────────────────────────────────────────────────────────────────────────');
  console.log('geschrieben: ' + path.relative(wurzel, ziel)
    + '  (' + vorher + ' → ' + text.length + ' Zeichen)');
  console.log('');
  console.log('Jetzt prüfen:  node tools/pruef-cms-abgleich.js');
}

main();

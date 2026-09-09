#!/usr/bin/env node
/*
 * Erzeugt static-site/kiosk-neu.html aus static-site/kiosk.html.
 *
 * Siehe specs/kiosk-umbau/plan.md, Abschnitt "Die Umformungsregeln".
 *
 * Grundsatz: Alles, was keine Regel trifft, wird zeichengleich uebernommen.
 * Dadurch bleiben saemtliche Bedienfunktionen des Kiosks bauartbedingt
 * erhalten - es wird nur das Geruest und das Aussehen ersetzt.
 *
 * Greift ein Anker nicht, bricht das Werkzeug ab. Ein stillschweigend
 * uebersprungener Umbau waere der gefaehrlichste Fehler.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const wurzel = path.resolve(__dirname, '..');
// Quelle ist der gewohnte Kiosk. Er bleibt unter `kiosk-klassisch.html`
// erreichbar - als Rueckfallweg, falls im Betrieb etwas auffaellt, und als
// einzige Stelle, an der die Fachlogik gepflegt wird.
const quelle = path.join(wurzel, 'static-site', 'kiosk-klassisch.html');
// Zwei Ausgaben aus derselben Quelle:
//   kiosk.html      - die Seite, mit der gearbeitet wird
//   kiosk-neu.html  - dieselbe Seite mit Umbau-Hinweis, Ziel der Pruefwerkzeuge
const zielLive = path.join(wurzel, 'static-site', 'kiosk.html');
const zielVorschau = path.join(wurzel, 'static-site', 'kiosk-neu.html');

const REITER = [
  { id: 'mittag', icon: 'utensils', text: 'Mittagstisch', kurz: 'Mittag', badges: true },
  { id: 'abhol', icon: 'shopping-cart', text: 'Online-Shop', kurz: 'Shop', badges: true, aktiv: true },
  { id: 'metzger', icon: 'beef', text: 'Metzger', kurz: 'Metzger', badges: true },
  { id: 'baecker', icon: 'croissant', text: 'Bäcker', kurz: 'Bäcker', badges: true },
  { id: 'metzgerbest', icon: 'ham', text: 'Metzger Mair', kurz: 'Mair', badges: true },
  { id: 'kontakt', icon: 'message-square', text: 'Kontakt', kurz: 'Kontakt', badges: true, aus: true },
  { id: 'social', icon: 'share-2', text: 'Social', kurz: 'Social', badges: false },
  { id: 'kalender', icon: 'calendar-days', text: 'Kalender', kurz: 'Termine', badges: true }
];

/* ── Neue Kopfzeile (Rasterbereich "hd") ──────────────────────────────────
 * Alle Bedienelemente der alten Kopfzeile bleiben erhalten, samt Kennungen
 * und onclick-Aufrufen. Der Ton-Knopf bekommt sein Innenleben von
 * _initMuteBtn() gesetzt und darf deshalb nur das Symbol enthalten.
 */
const KOPF = `<!-- ═══ Header ═══ -->
<header class="k-header">
  <div class="k-header-brand">
    <span class="k-header-logo"><i data-lucide="store"></i></span>
    <h1><span class="lang">Dorfladen&nbsp;Kiosk</span><span class="kurz">Kiosk</span></h1>
  </div>
  <div class="k-header-when">
    <div class="k-date" id="k-date"></div>
    <div class="k-clock" id="k-clock"></div>
  </div>
  <div id="k-sparkline" title="Bestellungen heute"></div>
  <div class="k-header-acts">
    <button class="k-hbtn" id="k-kunden-btn" onclick="K.switchTab('kunden')" title="Stammkunden verwalten" aria-label="Stammkunden verwalten"><i data-lucide="users"></i></button>
    <a class="k-hbtn" href="/index.html" title="Zur Website" aria-label="Zur Website"><i data-lucide="house"></i></a>
    <a class="k-hbtn" href="/cms.html" title="Zum CMS" aria-label="Zum CMS"><i data-lucide="settings"></i></a>
    <button class="k-hbtn" id="k-mute-btn" onclick="K.toggleMute()" title="Ton ein/aus" aria-label="Ton ein oder aus"><i data-lucide="volume-2"></i></button>
    <button class="k-hbtn" onclick="K.openModal('modal-help')" title="Hilfe" aria-label="Hilfe"><i data-lucide="help-circle"></i></button>
    <button class="k-hbtn" onclick="K.refresh()" title="Aktualisieren" aria-label="Aktualisieren"><i data-lucide="refresh-cw"></i></button>
  </div>
</header>

`;

/* ── Neue Reiterleiste (Rasterbereich "nav") ──────────────────────────────
 * Muss weiterhin erfuellen:
 *   - Element traegt class="k-tab" und data-tab (switchTab, setTabs)
 *   - Sichtbarkeit wird ueber style.display gesteuert (setTabs)
 *   - .k-tabs ist gemeinsamer Vorfahr fuer die Zaehler-Klicks (Zeile 5066)
 *   - Zaehler landen in #badges-<id>
 */
function reiterleiste() {
  const zeilen = REITER.map(function (r) {
    const aus = r.aus ? ' style="display:none"' : '';
    const aktiv = r.aktiv ? ' active' : '';
    const badges = r.badges
      ? `\n    <span class="k-tab-badges" id="badges-${r.id}"></span>`
      : '';
    return `  <div class="k-tab${aktiv}" data-tab="${r.id}" onclick="K.switchTab('${r.id}')"${aus}>
    <span class="k-tab-icon"><i data-lucide="${r.icon}"></i></span>
    <span class="k-tab-lbl"><span class="lang">${r.text}</span><span class="kurz">${r.kurz}</span></span>${badges}
  </div>`;
  });
  return `<!-- ═══ Tab bar ═══ -->
<nav class="k-tabs" aria-label="Bereiche">
${zeilen.join('\n')}
</nav>

`;
}

/* ── Hinweisstreifen: der Zweitkiosk wirkt auf echte Daten (F11) ────────── */
const HINWEIS = `<div class="k-umbau-hinweis" id="k-umbau-hinweis">
  <i data-lucide="hard-hat"></i>
  <span><strong>Umbau-Ansicht.</strong> Sie arbeitet auf den <strong>echten Daten</strong> – jede Änderung wirkt sofort.</span>
  <a href="/kiosk.html">Zur gewohnten Ansicht</a>
</div>
`;

// ─────────────────────────────────────────────────────────────────────────

const regeln = [];
let crlfGlobal = false;
// Wird je Durchlauf gesetzt: Die Vorschau traegt Hinweisstreifen und
// Titelzusatz, die Seite fuer den Betrieb nicht.
let vorschau = true;

function regel(nr, zweck, fn) {
  regeln.push({ nr: nr, zweck: zweck, fn: fn });
}

function ersetzeEinmal(text, von, bis, neu, nr) {
  const a = text.indexOf(von);
  if (a < 0) throw new Error(`${nr}: Anker nicht gefunden: ${JSON.stringify(von.slice(0, 60))}`);
  if (text.indexOf(von, a + 1) >= 0) throw new Error(`${nr}: Anker kommt mehrfach vor: ${JSON.stringify(von.slice(0, 60))}`);
  const b = text.indexOf(bis, a + von.length);
  if (b < 0) throw new Error(`${nr}: Endanker nicht gefunden: ${JSON.stringify(bis.slice(0, 60))}`);
  return { text: text.slice(0, a) + neu + text.slice(b), ersetzt: text.slice(a, b) };
}

regel('R1', 'Gestaltungsblatt auslagern', function (t) {
  const a = t.indexOf('  <style>\n');
  if (a < 0) throw new Error('R1: <style> nicht gefunden');
  const b = t.indexOf('  </style>\n', a);
  if (b < 0) throw new Error('R1: </style> nicht gefunden');
  const inhalt = t.slice(a + '  <style>\n'.length, b);

  // Der bestehende Block wird als Grundlage ausgelagert, damit kein Element
  // unformatiert bleibt - er deckt rund 320 Klassen ab, davon 190 aus den
  // Modulen (mb-, kal-, bk-, kk-, pk-, fm-, st-, soc-). Das neue
  // Gestaltungsblatt liegt darueber und ueberschreibt gezielt.
  const basis = path.join(wurzel, 'static-site', 'css', 'kiosk-base.css');
  const kopfzeile =
    '/* ERZEUGT aus static-site/kiosk.html durch tools/build-kiosk-neu.js.\n' +
    '   Nicht von Hand aendern. Grundlage fuer kiosk-neu.css. */\n';
  let css = kopfzeile + inhalt.replace(/^ {4}/gm, '');
  if (crlfGlobal) css = css.replace(/\n/g, '\r\n');
  fs.writeFileSync(basis, css, 'utf8');

  const neu =
    '  <link rel="stylesheet" href="/css/kiosk-base.css">\n' +
    // Das gemeinsame Designschema (Werte) liegt vor dem Seitenblatt.
    // Siehe specs/cms-redesign, F1: ein Wert, eine Stelle.
    '  <link rel="stylesheet" href="/css/dl-design.css">\n' +
    '  <link rel="stylesheet" href="/css/kiosk-neu.css">\n';
  return {
    text: t.slice(0, a) + neu + t.slice(b + '  </style>\n'.length),
    info: `${inhalt.split('\n').length} Zeilen nach css/kiosk-base.css ausgelagert`
  };
});

regel('R7a', 'Titel kennzeichnen', function (t) {
  // Nur die Vorschau traegt den Zusatz. Die Seite, mit der gearbeitet wird,
  // heisst wie eh und je.
  if (!vorschau) return { text: t, info: 'Titel bleibt (Seite fuer den Betrieb)' };
  const von = '<title>Kiosk – Dorfladen Oberornau</title>';
  if (t.indexOf(von) < 0) throw new Error('R7a: Titel nicht gefunden');
  return { text: t.replace(von, '<title>Kiosk (Umbau) – Dorfladen Oberornau</title>'), info: 'Titel gesetzt' };
});

regel('R2', 'Kopfzeile ersetzen', function (t) {
  const r = ersetzeEinmal(t, '<!-- ═══ Header ═══ -->\n', '<!-- ═══ Tab bar ═══ -->', KOPF, 'R2');
  return { text: r.text, info: 'neue Kopfzeile mit allen 6 Bedienelementen' };
});

regel('R3', 'Reiterleiste ersetzen', function (t) {
  const r = ersetzeEinmal(t, '<!-- ═══ Tab bar ═══ -->\n', '<!-- ═══ Panels ═══ -->', reiterleiste(), 'R3');
  return { text: r.text, info: `${REITER.length} Reiter, davon ${REITER.filter(function (x) { return x.aus; }).length} ausgeblendet` };
});

regel('R4', 'Rasterhülle um Kopf, Reiter, Inhalt und Fußleiste', function (t) {
  const auf = '<body>\n';
  if (t.indexOf(auf) < 0) throw new Error('R4: <body> nicht gefunden');
  // Der Hinweisstreifen gehoert nur in die Vorschau - er warnt davor, dass
  // die Zweitseite auf echten Daten arbeitet. In der Seite fuer den Betrieb
  // waere er sinnlos und wuerde nur Hoehe kosten.
  t = t.replace(auf, auf + '\n' + (vorschau ? HINWEIS : '') + '<div class="k-app">\n');
  const zu = '<!-- ═══ New order modal ═══ -->';
  if (t.indexOf(zu) < 0) throw new Error('R4: Ende-Anker nicht gefunden');
  t = t.replace(zu, '</div><!-- /k-app -->\n\n' + zu);
  return { text: t, info: 'Kopf, Reiter, .k-main und .k-bottom liegen im Raster; Dialoge bleiben ausserhalb' };
});

regel('R6', 'Hilfeschicht einbinden', function (t) {
  const von = '<script src="/js/env-banner.js"></script>';
  if (t.indexOf(von) < 0) throw new Error('R6: Anker für Skripteinbindung nicht gefunden');
  return {
    text: t.replace(von, von + '\n<script src="/js/kiosk-neu-shell.js"></script>'),
    info: 'kiosk-neu-shell.js nach allen Modulen geladen'
  };
});

// ─────────────────────────────────────────────────────────────────────────

function bauen(ziel, istVorschau) {
  vorschau = istVorschau;
  let text = fs.readFileSync(quelle, 'utf8');
  // Zeilenenden fuer die Verarbeitung vereinheitlichen und am Ende
  // unveraendert zurueckschreiben, damit die Datei byteweise vergleichbar bleibt.
  const crlf = text.indexOf('\r\n') >= 0;
  crlfGlobal = crlf;
  if (crlf) text = text.replace(/\r\n/g, '\n');
  const vorher = text.length;

  console.log('\nUmbau: ' + path.basename(quelle) + ' -> ' + path.basename(ziel)
    + (istVorschau ? '   (Vorschau mit Hinweis)' : '   (Seite fuer den Betrieb)'));
  console.log('─'.repeat(72));
  for (const r of regeln) {
    let e;
    try {
      e = r.fn(text);
    } catch (err) {
      console.error(`  ${r.nr}  FEHLER  ${r.zweck}`);
      console.error(`        ${err.message}`);
      console.error('\nAbbruch: ' + path.basename(ziel) + ' wurde nicht geschrieben.');
      process.exit(2);
    }
    text = e.text;
    console.log(`  ${r.nr.padEnd(4)} ok      ${r.zweck} – ${e.info}`);
  }
  console.log('─'.repeat(72));

  const kopf =
    '<!-- ════════════════════════════════════════════════════════════════\n' +
    '     ERZEUGTE DATEI - NICHT VON HAND AENDERN.\n' +
    '     Quelle:  static-site/kiosk-klassisch.html\n' +
    '     Werkzeug: tools/build-kiosk-neu.js   (node tools/build-kiosk-neu.js)\n' +
    '     Regeln:  specs/kiosk-umbau/plan.md\n' +
    '     ════════════════════════════════════════════════════════════════ -->\n';
  text = text.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n' + kopf);

  const nachher = text.length;
  if (crlf) text = text.replace(/\n/g, '\r\n');
  fs.writeFileSync(ziel, text, 'utf8');
  console.log(`geschrieben: ${path.relative(wurzel, ziel)}  (${vorher} → ${nachher} Zeichen)`);
}

function main() {
  if (!fs.existsSync(quelle)) {
    console.error('Quelle fehlt: ' + quelle);
    process.exit(1);
  }
  bauen(zielLive, false);
  bauen(zielVorschau, true);
}

main();

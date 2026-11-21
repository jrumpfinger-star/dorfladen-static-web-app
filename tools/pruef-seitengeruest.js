#!/usr/bin/env node
/*
 * Prueft das Geruest aller HTML-Seiten: Stimmen die Tags, und liegen
 * Geschwister-Flaechen wirklich nebeneinander?
 *
 * Anlass: Ein einzelnes ueberzaehliges </div> im CMS (hinter dem
 * Aktualisieren-Knopf der Statistik) schloss #cms-panel-stats rund 120
 * Zeilen zu frueh. Zwei Dinge gingen dadurch kaputt, und beide zeigten
 * sich erst Wochen spaeter im Betrieb:
 *
 *   1. Der Statistik-Inhalt stand AUSSERHALB seiner Flaeche. cmsTab()
 *      blendet Flaechen ueber deren id aus - was daneben liegt, erreicht
 *      es nicht. Die Statistik blieb darum unter jedem Reiter stehen.
 *   2. Das naechste </div> schloss den gemeinsamen Behaelter. Alle
 *      Flaechen danach rutschten eine Ebene heraus und standen
 *      ungestaltet ueber die volle Breite.
 *
 * Im Diff ist so etwas fast unsichtbar - eine Zeile mit </div> zwischen
 * lauter anderen Zeilen mit </div>. Diese Pruefung findet es sofort.
 *
 * Geprueft wird rein statisch, ohne Browser: schnell, und im CI ohne
 * Playwright-Installation lauffaehig.
 *
 * Aufruf:
 *   node tools/pruef-seitengeruest.js            (alle Seiten)
 *   node tools/pruef-seitengeruest.js cms.html   (einzelne Seiten)
 *
 * Rueckgabe: 0 = sauber, 1 = Befunde, 2 = Werkzeugfehler.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const WURZEL = path.join(__dirname, '..', 'static-site');

/* Elemente ohne Schluss-Tag. */
const LEER = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img',
  'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

/* Ihr Inhalt ist Text, kein Markup: Ein `if(a<b)` in einem Skript darf
   nicht als Tag gelesen werden. */
const TEXT_ELEMENTE = new Set(['script', 'style', 'textarea', 'title']);

/* Familien, die im Markup Geschwister sein MUESSEN. Liegen sie auf
   verschiedenen Ebenen, ist das Geruest zerrissen - genau der Fehler,
   der diese Pruefung veranlasst hat.

   Nur Familien aufnehmen, die wirklich nebeneinander stehen sollen; sonst
   meldet die Pruefung Fehlalarme und wird uebersehen. */
const FAMILIEN = [
  { vorsilbe: 'cms-panel-', was: 'CMS-Reiterflaechen' },
  { vorsilbe: 'mob-popup-', was: 'Handy-Blaetter' },
  { vorsilbe: 'dt-modal-', was: 'Desktop-Masken' },
];

/**
 * Zerlegt HTML in Tags und meldet zu jedem die Zeile.
 *
 * Bewusst kein vollstaendiger Parser - nur so viel, wie das Zaehlen der
 * Ebenen braucht. Die drei Fallen, ueber die eine naive Zerlegung
 * stolpert, sind beruecksichtigt: Kommentare, Textelemente und
 * Anfuehrungszeichen in Attributen (`onclick="if(a>b)"` endet nicht beim
 * ersten `>`).
 */
function tags(text) {
  const gefunden = [];
  let i = 0;
  let zeile = 1;

  const zaehleZeilen = (bis) => {
    for (let k = i; k < bis; k++) if (text[k] === '\n') zeile++;
  };

  while (i < text.length) {
    const auf = text.indexOf('<', i);
    if (auf < 0) break;
    zaehleZeilen(auf);
    i = auf;

    if (text.startsWith('<!--', i)) {
      const zu = text.indexOf('-->', i + 4);
      const bis = zu < 0 ? text.length : zu + 3;
      zaehleZeilen(bis);
      i = bis;
      continue;
    }
    // <!DOCTYPE ...> und andere Erklaerungen
    if (text.startsWith('<!', i) || text.startsWith('<?', i)) {
      const zu = text.indexOf('>', i);
      const bis = zu < 0 ? text.length : zu + 1;
      zaehleZeilen(bis);
      i = bis;
      continue;
    }

    // Tag-Ende suchen, Anfuehrungszeichen dabei achten.
    let j = i + 1;
    let hochkomma = null;
    while (j < text.length) {
      const c = text[j];
      if (hochkomma) { if (c === hochkomma) hochkomma = null; }
      else if (c === '"' || c === "'") hochkomma = c;
      else if (c === '>') break;
      j++;
    }
    if (j >= text.length) break;

    const roh = text.slice(i + 1, j);
    const zeileDesTags = zeile;
    zaehleZeilen(j + 1);
    i = j + 1;

    const m = /^(\/?)\s*([a-zA-Z][\w:-]*)/.exec(roh);
    if (!m) continue;
    const schluss = m[1] === '/';
    const name = m[2].toLowerCase();
    const selbstSchliessend = /\/\s*$/.test(roh);

    gefunden.push({ name, schluss, selbstSchliessend, roh, zeile: zeileDesTags });

    /* Inhalt von Skripten und Stilen ueberspringen. Das Element selbst
       bleibt gezaehlt: Auf- und Schluss-Tag heben sich auf. */
    if (!schluss && !selbstSchliessend && TEXT_ELEMENTE.has(name)) {
      const marke = new RegExp('</\\s*' + name, 'i');
      const rest = text.slice(i);
      const treffer = marke.exec(rest);
      if (treffer) {
        const bis = i + treffer.index;
        zaehleZeilen(bis);
        i = bis;
      }
    }
  }
  return gefunden;
}

function kennung(roh) {
  const m = /\sid\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(roh);
  if (!m) return '';
  return m[2] !== undefined ? m[2] : (m[3] !== undefined ? m[3] : m[4]);
}

function pruefeSeite(datei) {
  const text = fs.readFileSync(datei, 'utf8');
  const befunde = [];
  const stapel = [];
  const ueberzaehlig = [];
  const nachFamilie = new Map();
  let tiefe = 0;

  for (const t of tags(text)) {
    if (!t.schluss) {
      const id = kennung(t.roh);
      if (id) {
        for (const f of FAMILIEN) {
          if (!id.startsWith(f.vorsilbe)) continue;
          if (!nachFamilie.has(f.vorsilbe)) nachFamilie.set(f.vorsilbe, []);
          nachFamilie.get(f.vorsilbe).push({ id, tiefe, zeile: t.zeile });
        }
      }
      if (!LEER.has(t.name) && !t.selbstSchliessend) {
        stapel.push(t);
        tiefe++;
      }
    } else {
      if (LEER.has(t.name)) continue;
      if (!stapel.length) { ueberzaehlig.push(t); continue; }
      stapel.pop();
      tiefe--;
    }
  }

  if (ueberzaehlig.length) {
    befunde.push('ueberzaehlige Schluss-Tags: '
      + ueberzaehlig.slice(0, 3).map((t) => `</${t.name}> Zeile ${t.zeile}`).join(', '));
  }
  if (stapel.length) {
    befunde.push('nicht geschlossen: '
      + stapel.slice(-3).map((t) => `<${t.name}> Zeile ${t.zeile}`).join(', '));
  }

  for (const f of FAMILIEN) {
    const treffer = nachFamilie.get(f.vorsilbe);
    if (!treffer || treffer.length < 2) continue;
    const tiefen = [...new Set(treffer.map((x) => x.tiefe))];
    if (tiefen.length === 1) continue;

    /* Die Mehrheit gibt die richtige Ebene vor; gemeldet werden die
       Ausreisser - dort steht das verrutschte Tag davor. */
    const haeufig = tiefen
      .map((t) => [t, treffer.filter((x) => x.tiefe === t).length])
      .sort((a, b) => b[1] - a[1])[0][0];
    const ausreisser = treffer.filter((x) => x.tiefe !== haeufig);
    befunde.push(`${f.was} liegen nicht nebeneinander (erwartet Ebene ${haeufig}): `
      + ausreisser.map((x) => `${x.id} auf Ebene ${x.tiefe}, Zeile ${x.zeile}`).join('; '));

    /* Der Bruch liegt dort, wo die Ebene von einem Familienmitglied zum
       naechsten wechselt - genau dazwischen steht das ueberzaehlige oder
       fehlende Tag. Dieser Hinweis spart das Durchsuchen der ganzen
       Datei. Bewusst ueber den Wechsel und nicht ueber den ersten
       Ausreisser: Ist die Mehrheit verrutscht, zeigt der erste Ausreisser
       auf das gesunde Element und damit in die falsche Richtung. */
    for (let k = 1; k < treffer.length; k++) {
      if (treffer[k].tiefe === treffer[k - 1].tiefe) continue;
      befunde.push(`  -> verrutschtes Tag zwischen Zeile ${treffer[k - 1].zeile}`
        + ` (${treffer[k - 1].id}) und Zeile ${treffer[k].zeile} (${treffer[k].id})`);
      break;
    }
  }

  return befunde;
}

function main() {
  const wahl = process.argv.slice(2);
  let dateien;
  if (wahl.length) {
    dateien = wahl.map((n) => (path.isAbsolute(n) ? n : path.join(WURZEL, n)));
  } else {
    dateien = fs.readdirSync(WURZEL)
      .filter((n) => n.endsWith('.html'))
      .sort()
      .map((n) => path.join(WURZEL, n));
  }

  const kaputt = [];
  for (const d of dateien) {
    const befunde = pruefeSeite(d);
    const name = path.basename(d);
    if (befunde.length) {
      kaputt.push([name, befunde]);
      console.log('  ' + name.padEnd(32) + befunde.length + ' Befund(e)');
    } else {
      console.log('  ' + name.padEnd(32) + 'ok');
    }
  }

  console.log('');
  console.log('  ' + dateien.length + ' Seite(n) geprueft');
  if (!kaputt.length) {
    console.log('  0 Befunde.');
    return;
  }
  console.log('  ' + kaputt.length + ' Seite(n) mit Befund:');
  for (const [name, befunde] of kaputt) {
    console.log('');
    console.log('  ' + name);
    befunde.forEach((b) => console.log('      ' + b));
  }
  process.exit(1);
}

try {
  main();
} catch (e) {
  console.error(e);
  process.exit(2);
}

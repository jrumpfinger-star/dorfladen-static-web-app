#!/usr/bin/env node
/*
 * Fully Kiosk fernabfragen — lesen und gezielt umstellen.
 *
 * Anlass: Auf dem Ladentablett liessen sich keine Bilder aufnehmen. Fully
 * Kiosk sperrt Datei-Uploads standardmaessig und verschluckt den Dialog
 * kommentarlos — am Geraet sieht man nur, dass "nichts passiert". Ueber die
 * REST-Schnittstelle von Remote Admin laesst sich nachsehen, welche Schalter
 * wirklich stehen, statt sich durch 350+ Einstellungen zu tippen.
 *
 * Aufrufe:
 *   node tools/fully-admin.js info              Geraet und Fully-Zustand
 *   node tools/fully-admin.js kamera            Bild-/Kamera-Schalter zeigen
 *   node tools/fully-admin.js kamera --an       fehlende Schalter einschalten
 *   node tools/fully-admin.js suche upload      beliebige Einstellungen suchen
 *   node tools/fully-admin.js setze <key> <wert>
 *
 * Beispiel aus dem Betrieb: Auf dem 12-Zoll-Tablett war die Schrift zu
 * klein. Gemessen wurden 1143x638 CSS-Pixel bei Pixelverhaeltnis 1,75.
 * Geholfen hat `setze fontSize 125` — die Zeilenhoehe bleibt dabei
 * gleich, weil sie von der Antippgroesse bestimmt wird.
 *
 * Die Befehlsnamen folgen der REST-Schnittstelle von Fully
 * (getDeviceInfo, listSettings, setBooleanSetting, setStringSetting).
 *
 * Passwort:
 *   Wird abgefragt (verdeckt) oder aus der Umgebungsvariable FULLY_PW
 *   gelesen. Es wird NICHT gespeichert und gehoert nicht ins Repo.
 *
 * Geraet:
 *   Standard 192.168.1.175:2323, anders per FULLY_HOST oder --host=...
 */
'use strict';

const STD_HOST = process.env.FULLY_HOST || '192.168.1.175:2323';

/* Die Schluesselnamen der Einstellungen werden bewusst NICHT fest
   verdrahtet: Fully benennt sie je nach Version unterschiedlich. Der
   Bestand wird stattdessen durchsucht — was da ist, wird gefunden. */
const KAMERA_MUSTER = /upload|camera|webcam|microphone|videocapture/i;

/* Diese Schalter muessen fuer die Bildaufnahme im Kiosk auf `true` stehen.
   Erkannt wird anhand des Schluesselnamens, siehe oben. */
const NOETIG = [
  { was: 'Dateiauswahl (<input type="file">)', muster: /^fileupload/i },
  { was: 'Kamera-Aufnahme (capture="environment")', muster: /^(camera|photo).*upload|^uploadfromcamera/i },
  { was: 'Webcam-Zugriff (Barcode-Scanner)', muster: /^(webcam|videocapture).*(access|enabled)|^enablewebcam/i },
];

function argWert(name) {
  const t = process.argv.find((a) => a.startsWith('--' + name + '='));
  return t ? t.slice(name.length + 3) : null;
}

const HOST = argWert('host') || STD_HOST;

/** Passwort verdeckt einlesen — es soll nicht im Terminal stehenbleiben. */
function passwortFragen() {
  if (process.env.FULLY_PW) return Promise.resolve(process.env.FULLY_PW);
  return new Promise((loesen, ablehnen) => {
    if (!process.stdin.isTTY) {
      ablehnen(new Error(
        'Kein Terminal fuer die Eingabe. Bitte FULLY_PW setzen, z. B.:\n' +
        '  $env:FULLY_PW="..."; node tools/fully-admin.js kamera'));
      return;
    }
    process.stdout.write('Remote-Admin-Passwort: ');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let eingabe = '';
    process.stdin.on('data', function tippen(stueck) {
      const z = stueck.toString('utf8');
      if (z === '\r' || z === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdin.removeListener('data', tippen);
        process.stdout.write('\n');
        loesen(eingabe);
      } else if (z === '\u0003') {           // Strg+C
        process.stdout.write('\n');
        process.exit(130);
      } else if (z === '\u007f' || z === '\b') {
        eingabe = eingabe.slice(0, -1);
      } else {
        eingabe += z;
      }
    });
  });
}

/**
 * Einen Befehl an Remote Admin schicken.
 *
 * Das Passwort steht bei Fully zwangslaeufig in der Abfragezeichenkette —
 * die Schnittstelle kennt es nicht anders. Deshalb wird hier nur im
 * lokalen Netz gearbeitet und der Aufruf nirgends mitgeschrieben.
 */
async function ruf(cmd, pw, zusatz = {}) {
  const p = new URLSearchParams({ cmd, type: 'json', password: pw, ...zusatz });
  let antwort;
  try {
    antwort = await fetch(`http://${HOST}/?${p}`, {
      signal: AbortSignal.timeout(20000),
    });
  } catch (e) {
    /* `fetch failed` allein sagt niemandem etwas. Der haeufigste Fall ist
       ein schlafendes oder umgezogenes Tablett — das gehoert benannt. */
    const grund = (e && e.name === 'TimeoutError')
      ? 'antwortet nicht innerhalb von 20 Sekunden'
      : 'ist nicht erreichbar';
    throw new Error(
      HOST + ' ' + grund + '.\n' +
      '  Zu pruefen: Tablett wach und im WLAN? Remote Admin eingeschaltet?\n' +
      '  Andere Adresse per --host=IP:2323 oder FULLY_HOST.');
  }
  const roh = await antwort.text();
  let daten;
  try {
    daten = JSON.parse(roh);
  } catch (e) {
    throw new Error(
      'Das Geraet hat kein JSON geliefert. Ist unter ' + HOST +
      ' wirklich Fully Remote Admin erreichbar?');
  }
  if (daten && daten.status === 'Error') {
    /* "Please login" heisst hier immer: falsches Passwort. Das klar zu
       benennen spart die Suche an der falschen Stelle. */
    const hinweis = /login/i.test(daten.statustext || '')
      ? ' — das Passwort stimmt nicht (Fully Settings → Remote Administration → Remote Admin Password).'
      : '';
    throw new Error((daten.statustext || 'Unbekannter Fehler') + hinweis);
  }
  return daten;
}

function jaNein(w) {
  return (w === true || w === 'true') ? 'AN' : (w === false || w === 'false') ? 'aus' : String(w);
}

async function zeigeInfo(pw) {
  const d = await ruf('getDeviceInfo', pw);
  const felder = [
    ['Geraet', d.deviceModel], ['Android', d.androidVersion],
    ['Fully', d.appVersionName], ['Webview', d.webviewVersion],
    ['IP', d.ip4], ['Akku', d.batteryLevel != null ? d.batteryLevel + ' %' : null],
    ['Am Strom', d.isPlugged], ['Bildschirm an', d.screenOn],
    ['Kiosk-Modus', d.kioskMode], ['Im Vordergrund', d.foregroundApp],
    ['Aktuelle Seite', d.currentPageUrl],
  ];
  console.log('\nGeraet ' + HOST);
  console.log('─'.repeat(64));
  for (const [k, v] of felder) {
    if (v !== undefined && v !== null && v !== '') {
      console.log('  ' + k.padEnd(18) + jaNein(v));
    }
  }
}

async function ladeEinstellungen(pw) {
  const d = await ruf('listSettings', pw);
  /* Fully liefert je nach Version die Werte direkt oder unter `settings`. */
  const s = (d && typeof d.settings === 'object' && d.settings) ? d.settings : d;
  delete s.status;
  delete s.statustext;
  return s;
}

async function zeigeKamera(pw, einschalten) {
  const s = await ladeEinstellungen(pw);
  const treffer = Object.keys(s).filter((k) => KAMERA_MUSTER.test(k)).sort();

  console.log('\nBild- und Kamera-Schalter auf ' + HOST);
  console.log('─'.repeat(64));
  if (!treffer.length) {
    console.log('  Keine passenden Einstellungen gefunden.');
    console.log('  Mit "suche <begriff>" laesst sich der Bestand durchsehen.');
    return;
  }
  for (const k of treffer) console.log('  ' + k.padEnd(42) + jaNein(s[k]));

  /* Bewertung: Fuer jeden noetigen Punkt den passenden Schluessel suchen.
     Fehlt ein Punkt ganz, wird das gesagt statt stillschweigend uebergangen. */
  console.log('\nBewertung fuer die Bildaufnahme im Kiosk');
  console.log('─'.repeat(64));
  const zuSetzen = [];
  for (const n of NOETIG) {
    const k = treffer.find((t) => n.muster.test(t));
    if (!k) {
      console.log('  ?   ' + n.was + ' — kein passender Schalter gefunden');
      continue;
    }
    const an = (s[k] === true || s[k] === 'true');
    console.log('  ' + (an ? 'ok ' : 'AUS') + ' ' + n.was + '  [' + k + ']');
    if (!an) zuSetzen.push(k);
  }

  if (!zuSetzen.length) {
    console.log('\n  Alle noetigen Schalter stehen an. Klemmt es trotzdem, liegt es');
    console.log('  an der Android-Kameraberechtigung fuer Fully oder an der Option');
    console.log('  "Disable Camera" im Kiosk-Modus.');
    return;
  }
  if (!einschalten) {
    console.log('\n  Zum Einschalten:  node tools/fully-admin.js kamera --an');
    return;
  }
  console.log('');
  for (const k of zuSetzen) {
    await ruf('setBooleanSetting', pw, { key: k, value: 'true' });
    console.log('  eingeschaltet: ' + k);
  }
  /* Gegenprobe: Ein Setzbefehl, den niemand nachprueft, ist wertlos. */
  const neu = await ladeEinstellungen(pw);
  const offen = zuSetzen.filter((k) => !(neu[k] === true || neu[k] === 'true'));
  console.log(offen.length
    ? '\n  NICHT uebernommen: ' + offen.join(', ') + ' (PLUS-Lizenz aktiv?)'
    : '\n  Gegengeprueft: alle Schalter stehen jetzt an.');
}

async function zeigeSuche(pw, begriff) {
  const s = await ladeEinstellungen(pw);
  const treffer = Object.keys(s)
    .filter((k) => k.toLowerCase().includes(begriff.toLowerCase())).sort();
  console.log('\n' + treffer.length + ' Treffer fuer "' + begriff + '"');
  console.log('─'.repeat(64));
  for (const k of treffer) console.log('  ' + k.padEnd(42) + jaNein(s[k]));
}

async function haupt() {
  const befehl = (process.argv[2] || 'info').toLowerCase();
  const pw = await passwortFragen();

  if (befehl === 'info') return zeigeInfo(pw);
  if (befehl === 'kamera') return zeigeKamera(pw, process.argv.includes('--an'));
  if (befehl === 'suche') {
    const b = process.argv[3];
    if (!b) throw new Error('Bitte einen Suchbegriff angeben, z. B. "suche upload".');
    return zeigeSuche(pw, b);
  }
  if (befehl === 'setze') {
    const k = process.argv[3];
    const w = process.argv[4];
    if (!k || w === undefined) throw new Error('Aufruf: setze <schluessel> <wert>');
    const cmd = (w === 'true' || w === 'false') ? 'setBooleanSetting' : 'setStringSetting';
    await ruf(cmd, pw, { key: k, value: w });
    console.log('  gesetzt: ' + k + ' = ' + w);
    return;
  }
  throw new Error('Unbekannter Befehl "' + befehl + '". Bekannt: info, kamera, suche, setze.');
}

haupt().catch((e) => {
  console.error('\nFehler: ' + e.message + '\n');
  process.exit(1);
});

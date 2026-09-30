# WhatsApp-Hinweis im CMS — Specification

**Status:** umgesetzt
**Gemeldet:** „Ist dieser Text dynamisch? Wenn nein, bitte in CMS
einrichten und dynamisch machen (HTML-Editor). ‚mit Onlineshop!!!'
entfällt."

## Befund

Nicht dynamisch: Der Text stand fest in `static-site/index.html`
(`.wa-info-text`).

## Requirements

### F1: Pflegbar im CMS

- Neues Feld `whatsapp_info` im Homepage-Reiter, mit HTML-Editor
  (fett, kursiv, unterstrichen, Listen, Link).
- Das Feld erscheint auch dann, wenn es noch nie gespeichert wurde —
  vorbelegt mit dem heutigen Text, damit man ihn bearbeitet statt bei
  null anzufangen.
- „mit Onlineshop!!!" entfällt aus Standardtext und Vorbelegung.
- Leer oder nur Leerraum/`<br>` → der Standardtext bleibt stehen.
- Der QR-Code daneben bleibt fest.

### F2: Nur bereinigt auf die Startseite

Der Text landet per `innerHTML` auf der öffentlichen Startseite. Erlaubt
ist genau, was der Editor erzeugt: `b strong i em u br p div span a ul
ol li`. Alles andere:

- `script style iframe object embed svg math …` → samt Inhalt entfernt
- unbekannte Elemente → Hülle weg, Text bleibt
- alle Attribute entfernt, außer `href` bei Links — und das nur für
  `http(s):`, `mailto:`, `tel:`. `javascript:` verliert das Ziel.
- Externe Links bekommen `target="_blank" rel="noopener"`.
- Einzige erlaubte Klasse: `wa-qr-hint` (blendet den QR-Satz auf dem
  Handy aus).

### Stolperstein beim Bau

`app.js` (und damit `window._dlFlagsReady`) lädt erst am Seitenende. Ein
Skript direkt am Hinweis hätte die Zusage nie gesehen und den CMS-Text
nie eingesetzt. Deshalb wird erst nach `DOMContentLoaded` nachgesehen.

## Test Cases

`tests/whatsapp-info-cms.spec.js`, TC-WA-01 bis TC-WA-08.
TC-WA-07 prüft, dass Vorbelegung (`cms.js`) und Rückfall (`index.html`)
denselben Text tragen.

## Gegenproben

1. Ohne die Änderung an `index.html`/`cms.js`: alle 8 fallen.
2. **Nur die Bereinigung ausgehebelt** (`el.innerHTML=roh`): TC-WA-04,
   -05, -06 fallen — die Bereinigung trägt nachweislich.

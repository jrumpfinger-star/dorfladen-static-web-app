# Plan — `Escape` schließt überall

Zu [spec.md](./spec.md), Nachtrag R6–R10. Entschieden mit dem Nutzer am
06.10.2026: **ein gemeinsamer Tastenwächter**, und er **gilt auch für die
Klappen**.

## Leitgedanke

Der Wächter schließt nichts selbst. Er sucht das oberste offene
Überlagerer-Element und ruft **dessen vorhandenen Schließweg** auf —
`mobClosePopup`, `closeDtModal`, `closeLightbox`, den Schließknopf des
Dialogs. Das ist der entscheidende Punkt: Diese Funktionen führen Buch über
die Seitenrolle (`dlLockScroll`/`dlUnlockScroll`), über den Verlauf
(`pushPopupState`) und über Aufräumarbeiten im Blatt. Wer stattdessen nur
`classList.remove('open')` ruft, hinterlässt eine Seite, die sich nicht mehr
rollen lässt — genau der Fehler, den TC-DM-13 abfängt.

## Architektur

### Die Registratur

In `theme.js` entsteht eine Liste von **Bauart-Beschreibungen**. Jede nennt
drei Dinge: woran man ein offenes Exemplar erkennt, wie man es schließt, und
wie dringlich es ist (die Stapelordnung).

| Rang | Bauart | Erkennung | Schließweg |
|---:|---|---|---|
| 60 | Bestätigung `dl-confirm` | vorhanden im Baum | eigener Wächter, greift zuerst |
| 50 | Lightbox | `.lightbox-overlay.active`, `#solightbox.active` | `closeLightbox()` / `soCloseLightbox()` |
| 40 | Handy-Blatt | `[id^="mob-popup-"].open` | `mobClosePopup(kurz)` |
| 40 | Desktop-Maske | `[id^="dt-modal-"].open` | `closeDtModal(kurz)` |
| 30 | Freier Dialog | `[role="dialog"]`, sichtbar | Schließknopf drücken |
| 10 | Klappe (R9) | `#mob-nav.open`, Filterblatt, Navigationsblätter | vorhandener Schließaufruf |

Höherer Rang schließt zuerst. Bei gleichem Rang entscheidet, was später im
Baum steht beziehungsweise höher liegt (`z-index`) — das ist in aller Regel
das zuletzt geöffnete.

### Die Vorfahrt (R8)

Die bestehenden Wächter in `dl-confirm.js`, den vier Bestellmodulen,
`social-poster.js`, `hilfe-popup.js` und `app.js` sind **im Dokument**
registriert. Der gemeinsame Wächter hängt sich ebenfalls an `document`,
läuft aber in der **Blasenphase** und prüft zuerst, ob das Ereignis schon
verbraucht ist. Dafür bekommen die bestehenden Wächter an der Stelle, an der
sie schließen, ein `e.preventDefault()` mit; der gemeinsame Wächter steigt
bei `e.defaultPrevented` aus. So schließt nie mehr als ein Dialog je Tastendruck.

Kein Umbau der bestehenden Wächter darüber hinaus — sie bleiben, wo sie sind.

### Die Sperren (R10)

Der Wächter steigt aus, wenn

- `e.defaultPrevented` gesetzt ist,
- das Ziel ein offenes `<select>` oder ein `contenteditable` ist,
- ein natives `<dialog open>` im Spiel ist,
- `e.isComposing` läuft (Eingabehilfen asiatischer Schriften, der Vollständigkeit halber).

## Dateien

| Datei | Änderung |
|---|---|
| `static-site/js/theme.js` | **Kern.** Registratur + Wächter, rund 60 Zeilen, als eigene gekapselte Einheit ans Dateiende. Exportiert `window.dlEscapeRegistrieren(beschreibung)` für Nachzügler. |
| `static-site/js/app.js` | Lightbox-Wächter (Z. 930) behält Pfeiltasten, ergänzt `preventDefault` beim Schließen. Gleiches im News-Overlay. |
| `static-site/js/dl-confirm.js` | `preventDefault` im bestehenden Wächter. |
| `static-site/js/kiosk-{drax,baecker,getraenke}.js`, `kiosk-metzger-bestellung.js` | je ein `preventDefault` im vorhandenen Wächter. |
| `static-site/js/social-poster.js`, `hilfe-popup.js`, `js/social.js` | dito. |
| `static-site/js/pwa.js` | Die beiden Masken (`push-settings-overlay`, `push-ios-hint-overlay`) melden sich über `dlEscapeRegistrieren` an — sie werden zur Laufzeit erzeugt und passen in keine der Sammelbauarten. |
| `static-site/sortiment.html` | `#solightbox` anmelden (eigener Schließname). |
| `static-site/cms.html`, `cms-neu.html`, `cms-klassisch.html` | `herooverlay` anmelden. |
| `static-site/js/mobile.js`, `js/kiosk-filter.js`, `js/kiosk-neu-shell.js`, `js/cms-neu-shell.js` | Klappen anmelden (R9). |
| `specs/dialoge-modal/spec.md` | bereits nachgezogen (R6–R10, TC-DM-08…13). |

Keine HTML-Datei ändert ihren Elementbaum. `flyer-wurstaktion.html` und
`help-workflows.html` bleiben unberührt — sie führen keine Dialoge.

## Reihenfolge

1. **Messen.** `escape_inventar.py` um eine genaue Zählung erweitern: je
   Dialog ausweisen, ob ein Wächter ihn erreicht. Das ist der Vorher-Stand.
2. **Kern bauen.** Wächter und Registratur in `theme.js`. Erst die drei
   Sammelbauarten (Handy-Blatt, Desktop-Maske, Lightbox) — damit sind die
   meisten der 30 Dialoge erledigt.
3. **Vorfahrt setzen.** `preventDefault` in den neun Dateien mit eigenem
   Wächter. Danach TC-DM-09 im Browser: Bestellmaske über Kiosk-Dialog,
   einmal `Escape`, nur der obere geht.
4. **Nachzügler anmelden.** `pwa.js`, `herooverlay`, `solightbox`.
5. **Klappen anmelden** (R9) — zuletzt, weil am wenigsten riskant.
6. **Gegenprobe.** Browser an je einer Bauart plus maschinell: jeder Dialog
   wird von genau einem Wächter erreicht; Seitenrolle nach `Escape` frei.
7. **Playwright.** TC-DM-08 bis TC-DM-13 als Testfälle, nach dem Muster der
   vorhandenen Dialog-Tests.

Commits entlang dieser Schritte, nicht in einem Stück. Nach dem Push live
auf der Feature-SWA prüfen.

## Risiken

| Risiko | Gegenmittel |
|---|---|
| Zwei Dialoge schließen gleichzeitig | R8-Vorfahrt, TC-DM-09 vor allem anderen |
| Seitenrolle bleibt gesperrt | Nie Klassen entfernen, immer die vorhandene Schließfunktion rufen; TC-DM-13 |
| `Escape` nimmt einer Eingabe die Taste weg | R10-Sperren; TC-DM-12 |
| Ein Dialog wird vom Wächter nicht erfasst | Schritt 1 misst vorher und nachher, die Lücke wird sichtbar |
| `theme.js` lädt im `<head>` vor den Dialogen | Der Wächter hängt an `document` und wertet erst beim Tastendruck aus — Reihenfolge egal |

## Nicht Teil dieses Plans

- Fokusfang im Dialog (Tabulator läuft weiter durch die Seite dahinter).
  Gehört zur Modalität, ist aber eine eigene Aufgabe.
- `flyer-*.html` und die Mockups.

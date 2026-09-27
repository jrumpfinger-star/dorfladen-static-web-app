# Anmeldung auf dem Handy — Specification

**Status:** umgesetzt
**Gemeldet:** „Anmeldung muss bei mobile auf der Startseite sichtbar
sein. Außerdem funktioniert die Anmeldung auf mobile nicht aus Menü.
Hast du das UI nicht gecheckt?"

## Overview

Nach der Umstellung von „Mein Konto" auf das modale Fenster (Spec
konto-modal) wurden nur die Desktop-Wege geprüft (`#tb-konto`). Zwei
unabhängige Fehler blieben dadurch unentdeckt — berechtigt kritisiert.

## Fehler 1: Kein sichtbarer Einstieg auf dem Handy

`#tb-konto` sitzt in der Kopfleiste `.tb`, die unter 640px per CSS
vollständig verschwindet (`@media(max-width:640px){.tb{display:none}}`).
Der einzige verbleibende Weg war das Hamburger-Menü — kein direkt
sichtbarer Einstieg auf der Startseite selbst.

## Fehler 2: Anmeldung aus dem Menü öffnete das Fenster und schloss es sofort wieder

### Ursache

Ein Wettlauf zweier unabhängiger Verlaufs-Mechanismen:

1. Jeder Link **innerhalb** des mobilen Menüs (`#mob-nav`) rief beim
   Klick unbedingt `window.removePopupState()` auf — das schließt das
   Menü selbst über einen `history.back()`.
2. Genau derselbe Klick auf „Mein Konto" öffnete **gleichzeitig** das
   modale Fenster, das dafür einen **eigenen, separaten**
   Verlaufseintrag anlegt (`_mtPopupHist`, `history.pushState(...)`).
3. Das `history.back()` aus Schritt 1 holte diesen gerade erst
   angelegten Eintrag sofort wieder herunter. Der globale
   `popstate`-Beobachter sah das offene Fenster und schloss es
   augenblicklich (`closeMittagPopup(true)`).
4. `closeMittagPopup()` setzt `iframe.src=''` — ein leerer String lässt
   den Browser die **aktuelle Seite** in den Rahmen laden. Gemessen:
   `iframe.src` zeigte danach auf die Startseite selbst, nicht auf
   `/mein-konto`.

Für die Kundin sah es aus, als passiere beim Antippen gar nichts.

### Warum es unbemerkt blieb

Es gibt bereits eine neuere, korrekt abgesicherte Automatik
(`_dlOverlaySync` in `pwa.js`), die genau diesen Fall behandelt — sie
prüft eigens, ob das modale Fenster offen ist (`_dlMtPopupOffen()`),
bevor sie den Verlaufseintrag abräumt. Der **direkte** Aufruf in
`mobile.js` umging diese Absicherung vollständig, weil er unbedingt
und ohne jede Prüfung feuerte.

## Requirements

### F1: Ein direkt sichtbarer Einstieg auf dem Handy

#### F1 Behaviour / Acceptance

- Ein Konto-Symbol (`#mob-header-konto`) steht in der mobilen
  Kopfleiste, neben dem Menü-Knopf — sichtbar, ohne das Menü zu öffnen.
- Zeigt denselben An-/Abgemeldet-Zustand wie die Desktop-Kopfleiste
  (Kreis-Umriss vs. gefüllter Kreis mit Initialen).
- Führt zum selben modalen Fenster wie `#tb-konto`.

### F2: Kein Wettlauf beim Öffnen aus dem Menü

#### F2 Behaviour / Acceptance

- Der direkte `removePopupState()`-Aufruf beim Schließen des Menüs
  entfällt; die bereits vorhandene, korrekt abgesicherte Automatik in
  `pwa.js` übernimmt das Abräumen des Verlaufseintrags.
- Ein Klick auf „Mein Konto" **im Menü** öffnet das Fenster und hält es
  offen — das Menü schließt sich dabei sauber.
- Die Anmeldung **innerhalb** dieses Fensters gelingt, und das
  Konto-Symbol (Desktop **und** mobil) zeigt danach sofort den
  angemeldeten Zustand.

#### Test Cases

Siehe `tests/konto-mobil-sichtbar.spec.js`, TC-MS-01 bis TC-MS-04.

## Umsetzung

- `static-site/index.html`: neues `#mob-header-konto` in `.mob-header`;
  `dlKontoStand()` aktualisiert es mit.
- `static-site/css/mobile.css`: `.mob-header-konto` / `-ic`, an
  `.mob-header-menu` angelehnt.
- `static-site/js/mobile.js`: der direkte `removePopupState()`-Aufruf
  im Auto-Close-Handler für Menü-Links entfällt ersatzlos — die
  bestehende Automatik in `pwa.js` übernimmt.

## Gegenprobe

Ohne die drei geänderten Dateien (`git stash`) fallen alle vier
Wächter. TC-MS-03 ist der direkte Beweis für Fehler 2: `iframe.src`
zeigt danach auf die Startseite statt auf `/mein-konto`.

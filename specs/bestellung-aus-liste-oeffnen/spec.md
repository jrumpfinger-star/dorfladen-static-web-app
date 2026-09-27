# Aus der Liste eine Bestellung öffnen — Specification

**Status:** umgesetzt
**Gemeldet:** „Von hier aus kann man aber nicht die Bestellung bearbeiten."
(mit Bildschirmfoto der Liste „Meine Bestellungen" auf der Startseite)

## Overview

Auf der Startseite sammelt eine Kachel die eigenen Vorbestellungen. Ab
**zwei** Bestellungen öffnet ein Klick darauf eine Liste. Von dort sollte
ein Klick auf eine Bestellung das Statusfenster öffnen — mit Storno-Knopf
und Nachrichtenfeld.

Gemessen wurde: Das Fenster ging auf **und sofort wieder zu**. Für die
Kundin sah es so aus, als passiere gar nichts.

## Ursache

Nicht die Liste und nicht das Statusfenster waren schuld, sondern die
Verwaltung des Browser-Verlaufs in `static-site/js/pwa.js`.

1. Die Liste öffnet sich. Ein Beobachter erkennt „ein Overlay ist offen"
   und legt einen Verlaufseintrag an, damit die Zurück-Taste die Liste
   schließt statt die Seite zu verlassen.
2. Der Klick auf eine Bestellung schließt die Liste und öffnet das
   Statusfenster (`mt-popup-overlay`), das **seinen eigenen** Eintrag
   mitbringt.
3. Der Beobachter läuft danach erneut. Das Statusfenster steht bewusst
   nicht in seiner Liste — also hält er alles für geschlossen und räumt
   seinen Eintrag mit `history.back()` ab.
4. Dieser Rücksprung trifft nicht mehr den eigenen Eintrag, sondern den
   des Statusfensters, das darüber liegt. Das Fenster schließt sich.

### Warum es so lange unbemerkt blieb

Bei **einer** Bestellung zeigt die Startseite sie direkt in der Kachel —
ohne Liste, ohne Popup, ohne Verlaufseintrag. Dann gibt es nichts
abzuräumen, und der Weg funktioniert. Der Fehler brauchte also
mindestens zwei offene Bestellungen.

Belegt durch Messung vor der Korrektur:

| Fall | Statusfenster | `history.back()` |
|------|---------------|------------------|
| 1 Bestellung (Kachel direkt) | offen | 0× |
| 2 Bestellungen (über die Liste) | geschlossen | 1× |

## Requirements

### F1: Aus der Liste führt der Klick zur Bestellung

#### F1 Behaviour / Acceptance

- Ein Klick auf einen Eintrag öffnet das Statusfenster, und es **bleibt**
  offen.
- Dort sind **Storno-Knopf** und **Nachrichtenfeld** erreichbar — das ist
  das „Bearbeiten", das gefehlt hat.
- Der Weg mit nur einer Bestellung bleibt unverändert.
- Dieselbe Stelle gibt es ein zweites Mal in der Fleisch- und Wurstliste;
  sie war ebenso betroffen und wird mit abgedeckt.

#### F1 Test Cases

**TC-BL-01: Ab zwei Bestellungen öffnet ein Klick in der Liste die Bestellung**

- **Given:** Zwei Mittagsbestellungen (eine offen, eine storniert).
- **When:** Kachel öffnen, ersten Eintrag anklicken.
- **Expected:** `#mt-popup-overlay` trägt die Klasse `open` — auch nach
  einer Wartezeit, in der das fehlerhafte `history.back()` gefeuert wäre.

**TC-BL-02: Dort lässt sich die Bestellung auch stornieren**

- **Expected:** Im Rahmen sind `#bs-cancel-btn` und `#bs-comment` sichtbar.

**TC-BL-03: Mit nur einer Bestellung führt die Kachel weiterhin hin**

- **Expected:** Unverändert; dieser Weg war nie betroffen und muss grün
  bleiben. Fällt er, ist die Korrektur zu breit geraten.

**TC-BL-05: Auch aus der Fleischliste lässt sich eine Bestellung öffnen**

- **Hinweis:** Das Fleisch-Banner erscheint nur bei laufender Aktion. Der
  Wächter öffnet die Liste deshalb selbst, statt sich von der Tagesaktion
  abhängig zu machen.

### F2: Die Zurück-Taste bleibt heil

#### F2 Description

Die Korrektur greift in die Verlaufsverwaltung ein. Sie darf den
eigentlichen Zweck nicht beschädigen: Die Zurück-Taste soll Dialoge
schließen, nicht die Seite verlassen.

#### F2 Behaviour / Acceptance

- Das Statusfenster zählt für das **Abräumen** als offenes Overlay — sonst
  träfe der Rücksprung den falschen Eintrag.
- Für das **Anlegen** zählt es weiterhin nicht. Sonst lägen zwei Einträge
  für denselben Dialog vor und die Zurück-Taste bräuchte zwei Drücke.

#### F2 Test Cases

**TC-BL-04: Die Zurück-Taste schließt das Fenster, ohne die Seite zu verlassen**

- **Expected:** Nach `goBack()` ist `#mt-popup-overlay` zu, und die Adresse
  zeigt weiterhin die Startseite.

## Umsetzung

`static-site/js/pwa.js`, `_dlOverlaySync()`: Das Abräumen unterbleibt,
solange `#mt-popup-overlay` offen ist.

## Gegenprobe

Ohne die Korrektur (`git stash` auf `pwa.js`) fallen TC-BL-01, TC-BL-02
und TC-BL-04 — und **TC-BL-03 bleibt grün**. Genau dieses Muster erklärt,
warum der Fehler im Laden so lange unentdeckt blieb.

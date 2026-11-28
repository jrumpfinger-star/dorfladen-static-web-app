# Kiosk: Wochenplan im Menü, Getränke ans Ende — Specification

**Status:** Angenommen (Entscheidungen vom 25.11.2026: eingebetteter Reiter, Getränke-Sichtbarkeit unverändert)

**Owner:** Dorfladen Oberornau

## Overview

Der Reiter „Getränke" wird kaum noch gebraucht und soll im Kiosk-Menü ganz
ans Ende. Der Wochenplan (Mittagstisch-Plakat, bisher nur im CMS) soll auch im
Kiosk aufrufbar sein, als eigener Reiter direkt unter „Angebote".

Neue Reihenfolge: Mittagstisch, Abholung, Metzger, Bäcker, Metzger-Bestellung,
Drax, Kontakt, Social, Kalender, Werbebilder, **Angebote, Wochenplan,
Getränke**.

## Goals

- Reiter „Getränke" steht als letzter Reiter der Leiste.
- Neuer Reiter „Wochenplan" steht direkt nach „Angebote".
- Der Wochenplan im Kiosk ist der CMS-Wochenplan, unverändert in Funktion
  und Aussehen (Woche wählen, Gerichte pflegen, Vorschau, Teilen, Drucken,
  Speichern/Verwerfen).

## Non-Goals

- Keine Änderung an Inhalt, Daten oder Funktionen des Wochenplans.
- Keine Änderung an Inhalt oder Funktion des Getränke-Reiters.
- Keine zweite Pflege-Logik für den Wochenplan (keine Kopie des CMS-Codes).
- Kein neuer Feature-Schalter im CMS für den Wochenplan-Reiter.

## Requirements

### F1: Getränke ganz am Ende

- Reihenfolge laut Overview, in Quelle `kiosk-klassisch.html`, in der
  Reiterliste des Generators `tools/build-kiosk-neu.js` und damit in
  `kiosk.html` / `kiosk-neu.html`.
- Der Feature-Schalter „Getränke" (`defaultAn`) und alle Badges bleiben.
- Der Generatorlauf verändert die ausgelieferten Dateien nicht (TC-S8a/S8c).

### F2: Reiter „Wochenplan" unter „Angebote"

- Neuer Reiter `wochenplan` mit Text „Wochenplan" (am Telefon kurz „Woche"),
  auf jeder
  Zielgröße vollständig sichtbar (Spec kiosk-umbau F1).
- Er ist immer sichtbar, sobald der Kiosk bedienbar ist (der Kiosk liegt
  bereits hinter der Passwortabfrage).

### F3: Der Wochenplan ist der CMS-Wochenplan (Einbettung)

- Das Panel zeigt `/cms.html?embed=wochenplan` in einem Rahmen. Der
  Embed-Modus des CMS blendet CMS-Kopf, CMS-Reiterleiste und Footer aus und
  zeigt nur das Wochenplan-Panel.
- Es wird erst beim ersten Öffnen des Reiters geladen und beim Wiederöffnen
  nicht neu geladen (kein Verlust ungespeicherter Eingaben).
- Der Rahmen füllt den verfügbaren Platz unter der Reiterleiste; es scrollt
  nur der Inhalt im Rahmen, nicht die Kiosk-Seite.
- Im Embed-Modus legt das CMS beim Wechsel des Bereichs keine Verlaufseinträge
  an und setzt keinen Homepage-Anker. Dialoge behalten ihren Zurück-Eintrag wie
  im CMS (Zurück schließt zuerst den Dialog). Android-Zurück im Kiosk verhält
  sich sonst wie bisher.
- Die Hilfe zum Wochenplan öffnet im Embed-Modus immer als Popup (ohne CMS-
  Navigation gäbe es sonst keinen Weg zurück).
- Anmeldung: Es gilt dieselbe Anmeldung wie im Kiosk. Fehlt sie, zeigt das CMS
  im Rahmen seine Anmeldung.

### F4: Kein Verlust bei offenem Wochenplan

- Solange der Reiter „Wochenplan" offen ist, lädt sich der Kiosk bei einem
  Update nicht selbst neu (wie bei den anderen Bearbeitungs-Reitern).
- Der Rahmen bleibt beim Reiterwechsel erhalten; offene Dialoge und Eingaben
  gehen nicht verloren.

### F5: Funktionserhalt (Vorher/Nachher)

| Funktion | Vorher | Nachher |
| --- | --- | --- |
| Reiter Getränke (Bestellung, Badge, Schalter) | an 6. Stelle | gleich, nur letzter Reiter |
| Reiter Angebote | letzter Reiter | gleich, vor Wochenplan |
| CMS-Reiter Wochenplan | nur im CMS | unverändert im CMS, zusätzlich im Kiosk |
| Alle anderen Kiosk-Reiter | — | unverändert |

### F6: Alle Zielgrößen

- 375×667, 768×1024, 1280×800, 686×1095: Reiterleiste vollständig, Wochenplan
  bedienbar, kein Seitenüberlauf.

## Data & Contracts

- Neue URL-Variante `/cms.html?embed=wochenplan` (nur Darstellung). Keine neue
  API, keine Änderung an Schnittstellen und gespeicherten Daten.
- Tests dürfen nichts Echtes schreiben (API-Aufrufe werden abgefangen).

## Clarifications

- Entschieden: eingebetteter Reiter statt Unterpunkt oder Link.
- Entschieden: Getränke-Sichtbarkeit bleibt wie bisher (nur Position).

## Test Cases

| ID | Prüfung |
| --- | --- |
| TC-F1-01 | Reihenfolge der Reiter im Kiosk: …, Angebote, Wochenplan, Getränke; Getränke ist letzter |
| TC-F1-02 | Generatorlauf verändert `kiosk.html`/`kiosk-neu.html` nicht; `tools/pruef-kiosk-neu.js` grün |
| TC-F1-03 | Getränke-Schalter ausgeschaltet blendet den Reiter weiter aus |
| TC-F2-01 | Reiter „Wochenplan" sichtbar und anwählbar auf allen vier Zielgrößen |
| TC-F3-01 | Panel lädt `/cms.html?embed=wochenplan`; im Rahmen kein CMS-Kopf, keine CMS-Reiterleiste |
| TC-F3-02 | Wochenplan-Funktionen im Rahmen erreichbar (Gericht, Hilfe als Popup, Woche, Vorschau, Drucken, Waage, Teilen) |
| TC-F3-03 | Rahmen lädt erst beim ersten Öffnen und nicht erneut beim Wiederöffnen |
| TC-F3-04 | Im Embed-Modus kein Verlaufseintrag beim Bereichswechsel und kein Homepage-Anker; CMS ohne `embed` unverändert |
| TC-F3-05 | Seite scrollt nicht; Rahmen füllt Platz unter der Leiste |
| TC-F4-01 | Rahmen bleibt beim Reiterwechsel erhalten (siehe TC-F3-03); Auto-Reload-Schutz über `isBusy()` (Code-Review) |
| TC-F6-01 | Kein horizontaler Überlauf auf allen vier Zielgrößen |

## Traceability

| Requirement | Test Cases |
| --- | --- |
| F1 | TC-F1-01…03 |
| F2 | TC-F2-01 |
| F3 | TC-F3-01…05 |
| F4 | TC-F4-01 |
| F6 | TC-F6-01 |

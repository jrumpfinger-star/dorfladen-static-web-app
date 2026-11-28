# Aktions-Editor: Ansicht, Vorschauanteil und Artikelbilder — Specification

**Status:** Implemented

**Owner:** Dorfladen

**Last updated:** 2026-11-22

## Overview

Der Aktions-Editor (Angebote/CMS, `angebote-editor.js`, `angebote-design.js`,
`angebote.css`) teilt die Fläche in Werkzeuge und Vorschau. Auf dem Handy
startete er bisher in „Nur Eingaben“ und zeigte die Vorschau nicht; im
CMS-Modal erhielt die Vorschau durch widersprüchliche Zeilenvorlagen zu viel
Platz. Gespeicherte Aktionen mit Layout suchten fehlende Artikelbilder nie
erneut, obwohl die Bilder in SharePoint vorhanden sind. Vanilla HTML/CSS/JS,
Azure Static Web App; Ansichten: 375×667, 768×1024, 1280×800, Ladentablett.

## Goals

- Geteilte Ansicht ist überall der Standard.
- Die Vorschau nimmt höchstens rund 40 % der Arbeitsfläche ein.
- Vorhandene Artikelbilder erscheinen auch in bereits gespeicherten Aktionen.

## Non-Goals

- Keine Änderung der wählbaren Ansichten „Nur Eingaben“ / „Nur Motiv“, des Zooms
  oder des Vollbilds.
- Keine Änderung der Bildablage in SharePoint/Dataverse.

## Requirements

### F1: Geteilte Ansicht als Standard

#### F1 Behaviour / Acceptance

- Beim Öffnen steht `data-workspace-view="split"` auf Handy, Tablet und Desktop.
- „Nur Eingaben“ und „Nur Motiv“ bleiben über die Arbeitsansicht wählbar; eine
  ausdrückliche Wahl bleibt erhalten.

#### F1 Test Cases

**TC-F1-01: Standard ist geteilt**

- **Setup:** Aktion mit zwei Artikeln im Editor öffnen.
- **Expected:** `data-workspace-view="split"`; Werkzeuge und Vorschau sichtbar.

### F2: Vorschau ≈ 40 %

#### F2 Behaviour / Acceptance

- Desktop/Tablet nebeneinander: Vorschau ≤ 40 % der Breite (Werkzeuge 60 %),
  ausgenommen die vorhandene Mindestbreite der Vorschau von 262 px.
- Handy untereinander: Vorschau höchstens 40 %, im Aktions-Editor 34 % der
  Höhe, damit die aktive Feldfläche mindestens 50 % der Werkzeugspalte bleibt
  (UI-Designstandard 3.1). Werkzeuge stehen oben.
- Gilt für Aktions-Editor und Design-Bereich.

#### F2 Test Cases

**TC-F2-01: Aktions-Editor-Anteil** — Vorschauanteil >28 % (Handy) bzw. >36 %
und ≤ 40 %, Werkzeuge größer als Vorschau.

**TC-F2-02: Design-Bereich-Anteil** — Anteil >36 % und ≤ 40 % (Handy,
Desktop, Tablet-Mindestbreite berücksichtigt).

### F4: Artikelbilder erneut suchen

#### F4 Behaviour / Acceptance

- Beim Öffnen einer gespeicherten Aktion werden Artikel ohne Bild, die einen
  Strichcode oder eine Artikelnummer haben, erneut über die Bildsuche gesucht,
  auch wenn die Aktion bereits ein Layout hat.
- Scheitert die Suche für einen Artikel, bleiben die anderen Artikel
  unberührt; es erscheint kein Gesamtfehler.
- Artikel ohne Kennung werden bei vorhandenem Layout nicht gesucht.
- Fehlt der Graph-Token, protokolliert die API eine Warnung.
- Bewusst entfernte Bilder können beim nächsten Öffnen wieder gefunden werden;
  es gibt kein Merkmal „Bild bewusst entfernt“.

#### F4 Test Cases

**TC-F4-01: Nachsuche und Fehlertoleranz** — Aktion mit Layout, ein Artikel mit
Kennung ohne Bild, ein Artikel ohne Kennung, ein Artikel mit Bild:
`restore_images` ist wahr, der Artikel mit Kennung erhält `cms:<Strichcode>`,
die anderen bleiben unverändert; ohne fehlende Bilder ist es falsch.

### F5: Wochenwechsel wie im bisherigen CMS

#### F5 Behaviour / Acceptance

- Ab Samstag und Sonntag zeigt „Diese Woche“ die kommende Woche (Mo–So),
  „Nächste Woche“ die übernächste. Montag bis Freitag unverändert.
- Gemeinsame Berechnung `AngeboteModell.weekRange(filter)` für die
  CMS-Übersicht und die Aktionsübersicht des Editors.

#### F5 Test Cases

**TC-F5-01** (Test `TC-WO-F1-01`): Fr 20.11., Sa 21.11., So 22.11., Mo 23.11. —
„Diese Woche“ und „Nächste Woche“ zeigen jeweils genau die erwartete Aktion.

### F6: Darstellung der CMS-Aktionsübersicht wie im Original

#### F6 Behaviour / Acceptance

- Überschrift „Sonderangebote“ mit Hilfe-„?“, Wochenwahl und Buttons in den
  Farben der bisherigen Liste (aktiv dunkelgrün, Vorschau grau, Teilen grün,
  Löschen rot sichtbar, Waage weiß); keine Vorschaukachel und keine Kennzeichnung
  als Badge.
- Alle Funktionen bleiben: „+ Sonderaktion“, „+ Getränkeaktion“, Bearbeiten,
  Vorschau, Teilen, Waage, Löschen, Duplizieren (im ⋯-Menü), Aktionsart und
  Speicherstand stehen in der Metazeile, Feature-Bestand.
- Datumsformat bleibt TT.MM.JJJJ.

#### F6 Test Cases

**TC-F6-01**: Angepasste Tests TC-F66-09 und TC-F55-02 prüfen, dass Löschen direkt
sichtbar ist und das ⋯-Menü Duplizieren enthält.

## Data & Contracts

- `POST /api/werbebilder?sharepoint=1` mit `{articles:[{artikelnummer, edeka_nr, strichcode}]}`
  liefert `[{dl_artikelnummer, dl_bild_base64, source}]`.
- `AngeboteDataverse.actions(rows)[i].restore_images`, `restoreImages(data)`.

## Open Questions

Keine.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01 | Plan F1/F2 | T1 |
| F2 | TC-F2-01, TC-F2-02 | Plan F1/F2 | T1, T2 |
| F4 | TC-F4-01 | Plan F4 | T3 |

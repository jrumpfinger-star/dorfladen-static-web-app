# Kiosk-Gesamtumbau — Tasks

> Derived from `plan.md`. Ordered, dependency-aware, checkable units of work.
> `[P]` marks tasks that can run in parallel (no shared files / no ordering
> dependency). Each task references the spec requirement or test case it serves.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Complete tasks top-to-bottom unless marked `[P]`.
- A task is done only when its referenced Test Cases pass.
- Keep commits small; reference the task id in the commit message.
- Geprüft wird **mit echten Daten** über den Dev-Proxy, nicht mit Beispieldaten.
- Geprüft wird bei **allen** Breiten: 320, 360, 375, 390, 412, 430, 744, 768,
  1024, 1280, 1920 px.

## Setup

- [ ] **T001** Dev-Proxy auf Port 8787 mit `static-site` als Wurzel starten und
      erreichbar prüfen (`/kiosk.html` lädt, `/api/lunch-order` antwortet).
- [ ] **T002** Ist-Zustand festhalten: Funktionsverzeichnis aus `kiosk.html`
      und allen Modulen als Datei ablegen, damit T031 dagegen prüfen kann.
      — dient `F7` / `TC-F7-01`

## Core Implementation

### Umformung und Gerüst

- [ ] **T010** `tools/build-kiosk-neu.js` anlegen: liest `static-site/kiosk.html`,
      wendet die Regeln R1–R7 an, schreibt `static-site/kiosk-neu.html`.
      Bricht mit klarer Meldung ab, wenn ein Anker fehlt. Meldet je Regel, ob
      sie gegriffen hat. — dient `F7`, `F11`
- [ ] **T011** Regel R1 (Gestaltungsblatt auslagern) und R7 (Titel und
      Hinweisstreifen „Umbau — wirkt auf echte Daten"). — dient `F11` / `TC-F11-01`
- [ ] **T012** Regel R2/R3/R4: neue Kopfzeile, neue Reiterleiste, Rasterhülle.
      — dient `F1` / `TC-F1-01`, `TC-F1-02`, `TC-F1-03`

### Gestaltungsblatt

- [ ] **T013** `static-site/css/kiosk-neu.css` — Grundlage: Farbwerte,
      Schriftgrade, Abstandsraster, `container-type:inline-size`, die fünf
      Umschaltpunkte 640/940/1180/1620 px. — dient `F2` / `TC-F2-01`…`TC-F2-03`
- [ ] **T014** Reiterleiste gestalten: Telefon unten, ab 640 px links schmal,
      ab 1180 px links breit mit Symbol neben Beschriftung. Zähler in jeder
      Anordnung sichtbar. — dient `F1`, `F9` / `TC-F1-01`, `TC-F1-02`, `TC-F9-01`
- [ ] **T015** Feste Kopfbereiche: nur die Liste scrollt, Kopfzeile, Tagesleiste,
      Überblick und Filterleiste bleiben stehen. — dient `F3` / `TC-F3-01`, `TC-F3-02`
- [ ] **T016** 44-px-Regel als durchgehende Grundregel für alle Antippflächen
      (`.k-btn`, `.k-filter-btn`, `.k-tab`, Stepper, Auswahlfelder, Schalter).
      — dient `F4` / `TC-F4-01`, `TC-F4-02`
- [ ] **T017** Blattmuster für Dialoge: `.mb-ed`, `.mb-dlg`, `.mb-overlay`,
      `.k-modal` werden am Telefon zum Blatt am unteren Rand, ab 1180 px zur
      angedockten Spalte neben der Liste. Ersetzt die Notlösung `inSicht()`.
      — dient `F6` / `TC-F6-01`, `TC-F6-02`, `TC-F6-03`
- [ ] **T018** Listen und Karten: Zweizeilenumbruch statt Abschneiden bei langen
      Artikel- und Kundennamen, `line-height` mindestens 1,25 für Umlaute,
      saubere Ausrichtung an der Rasterkante. — dient `F2`, `F10`
- [ ] **T019** Modulgruppen abdecken: `bk-*` (Bäcker), `mb-*` (Metzger Mair),
      `kal-*` (Kalender), `kk-*`/`pk-*` (Kontakt), `fm-*` (Fleisch), `st-*`,
      `soc-*` (Social). Prüflauf meldet Elemente ohne wirksame Regel.
      — dient `F7`, `F10` / `TC-F10-01`

### Bedienhilfen

- [ ] **T020** `static-site/js/kiosk-neu-shell.js` anlegen: additive Schicht,
      beobachtet die Panel-Container und hängt Hilfen an, ohne Modulfunktionen
      zu ändern. — dient `F5`
- [ ] **T021** Vorbelegung: Erfassungsformulare öffnen mit Werten aus dem
      letzten vergleichbaren Vorgang statt leer. — dient `F5` / `TC-F5-01`
- [ ] **T022** Ein-Klick-Normalfall: Der häufigste Abschluss eines Vorgangs ist
      mit einem Antippen erledigt, ohne Zwischendialog. — dient `F5` / `TC-F5-02`
- [ ] **T023** Vorschläge statt Tippen: antippbare Mengen, Einheiten, Kunden und
      Textbausteine; freie Eingabe bleibt möglich. — dient `F5` / `TC-F5-03`
- [ ] **T024** Klartext und Fehlervermeidung: unmögliche Eingaben werden nicht
      angeboten, Meldungen ohne Fehlercodes und Feldnamen.
      — dient `F5` / `TC-F5-04`
- [ ] **T025** Rückgängig oder Rückfrage bei jeder löschenden und versendenden
      Aktion. — dient `F5` / `TC-F5-05`
- [ ] **T026** Regel R5: Katalog im Reiter „Social" — Einträge als ruhige Zeilen
      mit „Bearbeiten", Felder nur für den offenen Eintrag. Statt 469
      gleichzeitig offener Felder höchstens 20. — dient `F5` / `TC-F5-06`

### Reiter einzeln durcharbeiten

Jeder dieser Punkte umfasst: alle Breiten prüfen, alle Erfassungsdialoge öffnen,
alle Funktionen des Reiters aus dem Verzeichnis durchklicken.

- [ ] **T030** Reiter „Mittagstisch" (80 Funktionen im Rahmen und im Reiter)
      — dient `F1`–`F7`, `F9`, `F10`
- [ ] **T031** Reiter „Bäcker" (28 Funktionen, 34 Artikel, längste Namen)
- [ ] **T032** Reiter „Metzger Mair" (31 Funktionen, heute 5 672 px hoch,
      118 zu kleine Flächen, Mengendialog außerhalb des Bildschirms) —
      der schwierigste Reiter
- [ ] **T033** Reiter „Social" (15 Funktionen, Katalogumbau aus T026)
- [ ] **T034** Reiter „Kalender" (rund 28 bedienbare Funktionen,
      `addEventListener` statt `onclick`)
- [ ] **T035** Reiter „Kontakt" (12 Funktionen)
- [ ] **T036** Ausgeblendete Reiter „Online-Shop" und „Metzger (alt)": mit
      umgebaut, bleiben ausgeblendet, erfüllen nach dem Einblenden alle Regeln.
      — dient `F8` / `TC-F8-01`, `TC-F8-02`

## Tests

- [ ] **T040** `tests/kiosk-neu-funktionen.spec.js`: Abgleich des
      Funktionsverzeichnisses zwischen `kiosk.html` und `kiosk-neu.html`.
      Keine Funktion darf fehlen. — deckt `TC-F7-01`
- [ ] **T041** Selbsttest der Umformung: alle Regeln R1–R7 haben gegriffen, und
      außerhalb der Regelbereiche ist die erzeugte Datei zeichengleich mit
      `kiosk.html`. — deckt `TC-F7-03`
- [ ] **T042** `tests/kiosk-neu.spec.js`: F1–F4, F6, F9, F10 über alle elf
      Prüfbreiten und alle acht Reiter, mit echten Daten.
      — deckt `TC-F1-*`, `TC-F2-*`, `TC-F3-*`, `TC-F4-*`, `TC-F6-*`, `TC-F9-*`, `TC-F10-01`
- [ ] **T043** [P] Bestehende Playwright-Tests unter `tests/` gegen
      `kiosk-neu.html` laufen lassen. — deckt `TC-F7-02`

## Validation & Rollout

- [ ] **T050** Vollständiger Prüflauf mit echten Daten über alle Reiter, alle
      Breiten, alle Erfassungsdialoge. Null Befunde.
- [ ] **T051** Abnahme durch den Auftraggeber am lokalen Zweitkiosk.
      — deckt `TC-F11-01`
- [ ] **T052** Version erhöhen, veröffentlichen, Dev-Proxys beenden.

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010–T012 | F1, F7, F11 | TC-F1-01, TC-F1-02, TC-F1-03, TC-F11-01 |
| T013 | F2 | TC-F2-01, TC-F2-02, TC-F2-03 |
| T014 | F1, F9 | TC-F1-01, TC-F1-02, TC-F9-01 |
| T015 | F3 | TC-F3-01, TC-F3-02 |
| T016 | F4 | TC-F4-01, TC-F4-02 |
| T017 | F6 | TC-F6-01, TC-F6-02, TC-F6-03 |
| T018 | F2, F10 | TC-F2-02, TC-F10-01 |
| T019 | F7, F10 | TC-F10-01 |
| T020–T025 | F5 | TC-F5-01 … TC-F5-05 |
| T026 | F5 | TC-F5-06 |
| T030–T035 | F1–F7, F9, F10 | alle |
| T036 | F8 | TC-F8-01, TC-F8-02 |
| T040 | F7 | TC-F7-01 |
| T041 | F7 | TC-F7-03 |
| T042 | F1–F4, F6, F9, F10 | alle genannten |
| T043 | F7 | TC-F7-02 |
| T051 | F11 | TC-F11-01 |

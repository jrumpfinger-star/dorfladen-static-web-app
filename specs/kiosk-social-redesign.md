# Kiosk Social-Tab – Redesign

## Kontext
Der Social-Tab im Kiosk ist aktuell 1:1 CMS-Code mit Inline-Styles und eigener Farbgebung (`#e1306c` Instagram-Pink, `#25D366` WhatsApp-Grün, `#1f2937` für Kategorie-Header). Er soll visuell zum Rest des Kiosk passen: `k-*` CSS-Klassen, Kiosk-Farbschema (`--c-pri`, `--c-green`, `--c-border`), gleiche Card/Button/Form-Patterns.

## Scope
- **Visuelles Redesign** des Social-Tabs im Kiosk
- **Feature-Abgleich Kiosk ↔ CMS**: fehlende Funktionen ergänzen
- Betroffen: `kiosk.html` (HTML-Struktur des Social-Panels) + `social.js` (dynamisch gerenderte HTML-Fragmente) + `cms.html` / `cms.js` (Feature-Parität)
- `social-poster.js` bleibt unverändert (Canvas-Rendering hat eigene Farblogik)

## Betroffene Dateien
| Datei | Änderungen |
|-------|-----------|
| `static-site/kiosk.html` | Social-Panel HTML: Sub-Tabs, Katalog-Formular, Neuer-Post-Formular, Vorschau, Teilen-Buttons |
| `static-site/js/social.js` | Dynamisch gerenderte HTML: `socialRenderKatalog()`, `socialBuildPostItems()`, `socialSubTab()` |
| `static-site/cms.html` | Tagesinfo-Button ergänzen, Verlauf-Tab entfernen |
| `static-site/cms.js` | Verlauf-Tab aus `socialSubTab()` entfernen |

## Design-Prinzipien (aus kiosk-ui.md)
- **Handlungsorientiert** – Labels aus Verkäuferinnen-Perspektive
- **k-Klassen verwenden** – `k-btn`, `k-btn-confirm`, `k-btn-outline`, `k-btn-sm`, `k-field`, `k-order` (Cards), `k-filter-bar`
- **Kiosk-Farben** – `var(--c-green)`, `var(--c-pri)`, `var(--c-border)`, `var(--c-muted)`, `var(--c-bg)`
- **Lucide Icons** – kein Emoji in produktiven UI-Elementen
- **Touch-optimiert** – `min-height: var(--touch-min)` für alle klickbaren Elemente

## Anforderungen

### Sub-Tab-Leiste
- [ ] RD-01: Sub-Tabs als `k-filter-bar` + `k-filter-btn` statt eigener Pill-Buttons
- [ ] RD-01b: Aktiver Sub-Tab mit grünem Hintergrund (konsistent mit Shop-Filtern)
- [ ] RD-01c: Accordion-Schritt-Nummern (1–4) als Kiosk-Stepper statt farbige Boxen

### Katalog Sub-Tab

#### Produkt-Hinzufügen-Formular
- [ ] RD-02: Formular in `k-order`-Card (weißer Hintergrund, border-radius, border-left Akzent)
- [ ] RD-02b: Header mit `var(--c-green)` statt `#e1306c`
- [ ] RD-02c: Inputs verwenden `k-field` Klassen (Label + Input Styling)
- [ ] RD-02d: "Hinzufügen"-Button als `k-btn k-btn-confirm` statt inline pink Button
- [ ] RD-02e: Paste-Zone behält Dashed-Border, aber mit Kiosk-Farben (`var(--c-border)`)

#### Kategorien verwalten
- [ ] RD-03: Button als `k-btn k-btn-outline` statt eigener grauer Button
- [ ] RD-03b: Manager-Panel verwendet Kiosk-Borders und -Rundungen

#### Katalog-Liste (dynamisch aus social.js)
- [ ] RD-04: Kategorie-Header mit `var(--c-pri)` (Dorfladen-Grün) statt `#1f2937` (Dunkelgrau)
- [ ] RD-04b: Kategorie-Header als `k-dish-sep-row`-Pattern (grüner Gradient) statt schwarze Box
- [ ] RD-04c: Produkt-Zeilen mit `k-order`-ähnlichem Stil
- [ ] RD-04d: Action-Buttons (Bearbeiten, Löschen, Bild) als `k-tool` Buttons
- [ ] RD-04e: Edit-Row mit Kiosk-Inputs (`k-field`) und -Buttons (`k-btn`)

### Neuer Post Sub-Tab

#### Schritt 1: Titel & Text
- [ ] RD-05: Card mit Kiosk-Styling (k-order oder eigene Section)
- [ ] RD-05b: Header in Kiosk-Grün statt WhatsApp-Grün
- [ ] RD-05c: Inputs als `k-field` Klassen

#### Schritt 2: Produkte auswählen
- [ ] RD-06: Mittagessen-Box mit Kiosk-Farben statt gelber Border
- [ ] RD-06b: Produkt-Checkboxen mit `accent-color: var(--c-green)` statt `#e1306c`
- [ ] RD-06c: Kategorie-Chips als `k-filter-btn`-ähnliche Pills
- [ ] RD-06d: "Frei erfassen"-Button als `k-btn k-btn-outline`

#### Schritt 3: Vorschau
- [ ] RD-07: Card-Header in Kiosk-Grün
- [ ] RD-07b: "Vorschau aktualisieren"-Button als `k-btn k-btn-confirm`

#### Schritt 4: Teilen & Veröffentlichen
- [ ] RD-08: WhatsApp-Button behält eigene Grünfarbe (Markenfarbe), aber `k-btn` Klassen/Sizing
- [ ] RD-08b: Instagram-Button behält Gradient (Markenfarbe), aber `k-btn` Klassen/Sizing
- [ ] RD-08c: "Bild speichern" als `k-btn k-btn-outline`
- [ ] RD-08d: "Nur als Tagesinfo" als `k-btn k-btn-outline` mit grüner Border

### Feature-Abgleich Kiosk ↔ CMS

#### Tagesinfo veröffentlichen
- [x] RD-11: CMS – "Nur als Tagesinfo veröffentlichen"-Button im Social-Post-Bereich ergänzen (wie im Kiosk)
- [x] RD-11b: Funktion `socialPublishTagesinfo()` existiert bereits in `social-poster.js` – nur Button-HTML im CMS fehlt

#### Heutige Posts anzeigen (Kiosk + CMS)
- [x] RD-12: In beiden Oberflächen anzeigen, welche Posts/Tagesinfos **heute** bereits veröffentlicht wurden
- [x] RD-12b: Kompakte Anzeige mit Titel und Anzahl Produkte (nur aktueller Tag)
- [x] RD-12c: Daten aus `GET /api/social-post` laden, nach heutigem Datum filtern
- [x] RD-12d: Anzeige unterhalb des Teilen-Bereichs (kein eigener Tab)

#### Verlauf-Tab entfernen
- [x] RD-13: CMS – Sub-Tab "Verlauf" entfernen (kein Mehrwert, wird durch Tagesinfo-Historie ersetzt)
- [x] RD-13b: Kiosk – kein Verlauf-Tab nötig (war nie vorhanden)
- [x] RD-13c: `socialSubTab()` in `social.js` und `cms.js` bereinigen: `verlauf`-Referenzen entfernen

### Neue CSS-Klassen in kiosk.html
- [ ] RD-09: `k-social-step` – Klapbarer Schritt-Container (1–4)
- [ ] RD-09b: `k-social-step-hdr` – Schritt-Header mit Nummer, Icon, Titel
- [ ] RD-09c: `k-social-step.open` – Offener Schritt zeigt Body

### Status-Meldungen
- [ ] RD-10: Status-Box (`#soc-kat-status`, `#soc-post-status`) mit Kiosk-Toast oder k-order-ähnlichem Stil

## Nicht enthalten
- Canvas-Poster-Rendering (social-poster.js) – behält eigene Farblogik
- Funktionale Änderungen an der API oder Datenstruktur
- CMS visuelles Styling (cms.js behält eigenes Design-System)

## Akzeptanzkriterien
- [ ] AK-RD-01: Alle klickbaren Elemente im Social-Tab verwenden `k-btn` oder `k-tool` Klassen
- [ ] AK-RD-02: Kein `#e1306c` (Instagram-Pink) mehr in Inline-Styles des Social-Tabs
- [ ] AK-RD-03: Formular-Inputs verwenden `k-field` Klassen
- [ ] AK-RD-04: Sub-Tabs visuell identisch mit Shop-Filter-Bar
- [ ] AK-RD-05: Katalog-Kategorien verwenden Kiosk-Farbschema (Grüntöne)
- [ ] AK-RD-06: Touch-Targets ≥ 56px (var(--touch-min))
- [ ] AK-RD-07: Alle bestehenden Social-Funktionen (Katalog CRUD, Post-Builder, Sharing) funktionieren unverändert
- [ ] AK-RD-08: Bild-Doppelklick-Popup (`dlImagePopup`) funktioniert weiterhin
- [ ] AK-RD-09: Neuer-Post-Schritte sind als aufklappbare Accordion-Schritte gestaltet
- [x] AK-RD-10: CMS hat "Nur als Tagesinfo veröffentlichen"-Button (Feature-Parität mit Kiosk)
- [x] AK-RD-11: Heutige Posts in Kiosk und CMS sichtbar
- [x] AK-RD-12: Verlauf-Tab im CMS entfernt

## Status
- [x] Spec erstellt
- [ ] Spec bestätigt
- [ ] Implementierung
- [ ] Tests

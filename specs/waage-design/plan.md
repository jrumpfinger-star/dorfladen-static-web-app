# Waagen-Design unter „Design" — Implementation Plan

> Abgeleitet aus [spec.md](./spec.md). Der Plan beschreibt das *Wie*, führt
> aber kein Verhalten ein, das nicht in der Spec steht.

**Spec:** [spec.md](./spec.md)

**Status:** Approved — Mockup abgenommen

## Constitution Check

- [x] Spec existiert; kein offener `[NEEDS CLARIFICATION]`-Punkt (Mockup am
  2026-11-27 abgenommen).
- [x] Keine Cloud-only-Schnittstellen; keine neuen Endpunkte.
- [x] Keine Geheimnisse.
- [x] Bestehende Ordnerkonvention: Quellen `cms-klassisch.html` →
  `tools/build-cms-neu.js` → `cms.html` / `cms-neu.html`.

## Technical Approach

Es gibt zwei vorhandene Speicherorte für Design:

| Bereich | Speicher | Heutiger Nutzer |
| --- | --- | --- |
| Angebote-Standards (Wochen, Getränke) | `/api/angebote-verwaltung?view=design` → `design/defaults.json` (`weekly`, `drinks`, `homepage`, `presets`) | Reiter „Getränkeflyer", Neuanlage in `cms-angebote.js` / `angebote-editor.js` |
| Plakat/Einzelflyer, Wochenplan | `/api/cms-config` → `design_config`, `hp_design_config` (`wpTplColors`) | alte CMS-Konfiguration, Wochenplan |

Entscheidung: **Genau eine Quelle je Gegenstand.**

1. **Waagen-Standards der Angebote** liegen im Designdokument der
   Angebotsverwaltung als zwei weitere, optionale Layouts `scale_large` und
   `scale_small` (wie `homepage` optional). Fehlen sie, gilt das heutige
   Verhalten.
2. **Der Designer** ist der bestehende Getränkeflyer-Designer
   (`angebote-design.js` → `mount`). Er bietet bereits Vorlage, Farben, Schrift,
   Preisschild, Marker, Live-Vorschau, Vorlagen, „Standard speichern", „Standard
   laden". Er wird von der festen Art `drinks` auf eine **Art-Konfiguration**
   verallgemeinert (`drinks`, `scale_large`, `scale_small`). Damit verhalten
   sich die Waagen-Reiter wie Plakat/Einzelflyer/Getränkeflyer, ohne dass ein
   zweiter Designer entsteht.
3. **Das Profil „klein" (800 × 280)** wird ein eigenes Gestaltungsziel
   `scale_small`. Heute wird das Waagenmotiv nur auf 800 × 280 eingepasst
   (`angebote-design.js` ~2190, `scaleImages` mit 1600 × 560); eine eigene
   Gestaltung braucht eine eigene Zielgröße im Modell
   (`targetSizes.scale_small = 800 × 280`, eigener Zweig in `targetTemplate`).
4. **Neue Aktionen** übernehmen den Standard über `blank(kind, defaults)`:
   `target_styles.scale` bzw. `target_styles.scale_small` werden mit den
   gespeicherten Standards vorbelegt. Bestehende Aktionen bleiben unberührt;
   „Designstandards übernehmen" wirkt wie bisher je Ausgabeziel.
5. **Alte CMS-Aktionen („Aktion im Querformat")** lesen die Waagen-Standards
   **lesend** aus demselben Designdokument und bilden sie auf ihre
   Zeichenparameter ab (`theme`/`cfg` in `waageAktionBilder`:
   Hintergrund, Titel-, Preis-, Statt-Preisfarbe, Preisschildform, Marker). Fehlt
   ein Standard: bisheriges Verhalten.
6. **Wochenplan-Waage** bekommt einen eigenen Konfigurationsschlüssel
   `wp_waage_design = { large: {…}, small: {…} }` in `/api/cms-config` (Farben,
   Schriftgröße, Schriftart). `waageWochenplan` liest ihn; ohne Schlüssel bleibt
   das Bild pixelgleich (byteweise gegen den Stand vor der Änderung geprüft).
   Die Oberfläche ist ein weiterer Abschnitt der Wochenplan-Design-Leiste
   (`wp-sec-waage-large/-small`) mit Live-Vorschau im echten Format.

## Key Decisions

| Decision | Options considered | Choice & rationale |
| --- | --- | --- |
| Speicherort Waagen-Standard | (A) `design_config` des alten CMS, (B) Designdokument der Angebote | **B.** Dort liegen schon die Standards für neue Aktionen; die alte CMS-Ansicht liest lesend mit → eine Quelle. |
| Designer | (A) neuer Designer, (B) Getränkeflyer-Designer verallgemeinern | **B.** Gleiche Bedienung wie Plakat/Einzelflyer ohne doppelten Code. |
| Profil „klein" | (A) weiter einpassen, (B) eigenes Ziel `scale_small` | **B.** Spec F3/F4 verlangt je Profil eigenen Standard; Einpassen kann keine eigene Gestaltung tragen. |
| Wochenplan-Waage | (A) in `wpTplColors`, (B) Schlüssel in `hp_design_config`, (C) eigener Schlüssel `wp_waage_design` | **C.** `hp_design_config` wird an mehreren Stellen vollständig kopiert und neu gelesen; ein eigener Schlüssel vermeidet Seiteneffekte auf Homepage/Flyer (F5, Pixelgleichheit). |
| Alte Aktionen | (A) eigene Waagen-Einstellung im alten CMS, (B) Standard lesen | **B.** Verhindert zwei Wahrheiten. |

## Architecture

```mermaid
flowchart LR
  D[Design → Waage groß / klein] -->|PUT view=design| S[(design/defaults.json: scale_large, scale_small)]
  S -->|GET| N[Neue Aktion: blank(kind, standards)]
  S -->|GET lesend| L[Aktion im Querformat: waageAktionBilder]
  W[Design → Wochenplan → Waage] -->|cms-config wp_waage_design| P[waageWochenplan]
```

## Vorher/Nachher-Zuordnung (Funktionserhalt)

| Bisher | Nachher |
| --- | --- |
| Plakat, Einzelflyer, Getränkeflyer, Gemeinsame Einstellungen (alle Felder) | unverändert; nur zwei Reiter kommen hinzu |
| Waagenmotiv einer Aktion im Aktions-Editor (Ausgabeziel „Waage") | unverändert; zusätzlich Startwerte aus dem Standard bei neuen Aktionen |
| Vorschaumodi „Waage · 800 × 462 / 280" im Getränkeflyer-Designer | unverändert |
| „Aktion im Querformat" nutzt die Plakat-Farben | unverändert, solange kein Waagen-Standard existiert |
| Wochenplan auf die Waage (Dialog, Profile, Upload) | unverändert; Farben/Schrift ab jetzt optional einstellbar |
| `wpTplColors`, Homepage-/Flyer-Wochenplan | unverändert |

Keine Konsolidierung, Vereinfachung oder Entfernung. Falls sich bei der
Umsetzung eine Zusammenlegung anbietet, braucht sie vorher eine ausdrückliche
Freigabe.

## File-Level Change Map

| Path | Change | Purpose |
| --- | --- | --- |
| `mockups/waage-design-mockup.html` | new | Mockup zur Abnahme (kein Produktivcode) |
| `tests/cms-waage-design-mockup.spec.js` | new | Mockup auf vier Zielgrößen prüfen |
| `static-site/cms-klassisch.html` | edit | Reiter „Waage groß/klein" in `cfg-section-nav`; zwei `an-design-root`-Container; `wp-sec-waage` im Wochenplan-Design |
| `static-site/cms.html`, `cms-neu.html` | generated | per `tools/build-cms-neu.js`, danach `node tools\pruef-cms-abgleich.js` |
| `static-site/cms.js` | edit | `cfgSwitchSection` für neue Abschnitte; `wpDaten` / `waageWochenplan` lesen `wp_waage_design`; `waageAktionBilder` lesen Standard; Wochenplan-Waage-Abschnitt |
| `static-site/js/angebote-design.js` | edit | `mount` für Art-Konfiguration verallgemeinern (`drinks`, `scale_large`, `scale_small`); Waage-Vorschau je Profil |
| `static-site/js/angebote-modell.js` | edit | `targetSizes.scale_small`, `targetTemplate`-Zweig, `targetNames`, `blank()` übernimmt Waagen-Standards |
| `static-site/js/angebote-editor.js` | edit | Ausgabeziel „Waage" kennt Profil klein als eigenes Ziel; „Designstandards übernehmen" je Ziel |
| `static-site/js/cms-angebote.js` | edit | Neuanlage reicht die Waagen-Standards weiter |
| `api/shared/angebote.py` | edit | `design()` / `save_design()` akzeptieren optionale `scale_large`, `scale_small`; `_layout` / Provenienz kennen `scale_small` |
| `tests/cms-waage-design.spec.js` | new | TC-F1…TC-F6 mit gemockter API |
| `specs/waage-design/tasks.md` | new | Stufe 3 nach Mockup-Abnahme |

## Test Strategy

- **Mockup (jetzt):** Playwright auf 375×667, 768×1024, 1280×800, 686×1095:
  Reiter erreichbar, Vorschau nicht abgeschnitten, kein Seitenscrollen bei
  Erfassung, Bedienmaße. Nur lokale Beispieldaten.
- **E2E (Umsetzung):** TC-F1…F6 mit vollständig gemockter API (kein echter
  Schreibzugriff, keine Waagen-Übertragung), vier Zielgrößen.
- **Unit-nah:** Renderer-Prüfung `scale_small` (Größe 800×280, Text passt oder
  Hinweis), Pixelvergleich `waageWochenplan` ohne `wp_waage_design` (TC-F5-01).
- **Backend:** `design` ohne `scale_*` unverändert lesbar; mit `scale_*`
  validiert und gespeichert (`api/tests`).
- **Mapping:** jeder Testfall `TC-Fn-xx` wird mindestens einmal ausgeführt.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Neues Ziel `scale_small` berührt mehrere `Object.keys(targetSizes)`-Schleifen (Validierung, Anpassungen, Vorlagen) | hoch | Aufgabe T0: alle Stellen prüfen, bevor Code entsteht; bestehende Tests als Regression; neue Ziele nur additiv |
| Abbildung Standard → alte Zeichenparameter deckt nicht alle Einstellungen ab | mittel | Spec F2: nicht anwendbare Einstellungen werden ausgeblendet; Abbildungstabelle im Code und Test |
| Gespeicherte Designdokumente ohne `scale_*` | mittel | Felder optional; Test mit altem Dokument |
| Wochenplan-Waage verändert sich ungewollt | hoch | Schlüssel optional; Pixelgleichheitstest TC-F5-01 |
| Auf 280 px Höhe passt der Inhalt nicht | mittel | bestehende Hinweislogik („Profil wählen/kürzen") beibehalten |
| Generierte `cms.html` weichen von der Quelle ab | niedrig | `tools/build-cms-neu.js` + `pruef-cms-abgleich.js` |

## Rollout

1. Mockup abnehmen (Nutzer).
2. Spec schließen, `tasks.md` schreiben.
3. Umsetzung auf `feature/getraenke-angebotsflyer`; Preview PR 15; Live-Suite
   gegen die Preview. Commit/Push nur nach ausdrücklicher Freigabe.

# Preisliste & Sortiment – Spec

> **Feature-ID**: PREISLISTE
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Live-Preisliste des gesamten Sortiments. Die Seite `sortiment.html` zeigt alle
Artikel nach Warengruppe gruppiert, mit Suche und Barcode-Scan. Datenquelle ist
Dataverse-Tabelle `cr5d4_tables` (Artikelstamm), ergänzt um aktive Sonderangebote
aus `dl_angebot`. Preise werden anhand von Mengentyp und Grundpreisfaktor
korrigiert; günstige Artikel werden als „Roter Punkt" markiert (siehe separate
Spec `roter-punkt.md`).

**Betroffene Dateien:**
- API: `api/preisliste/`
- Frontend: `static-site/sortiment.html`, `static-site/js/preisliste-live.js`, `static-site/cms.js`

## 2. Non-Goals

- Kein Warenkorb/Bestellung hier (das ist Sache von `shop.html`).
- Keine Roter-Punkt-Detailseite (eigene Spec).

## 3. Datenmodell (`cr5d4_tables`, Auszug)

| Feld | Bedeutung |
| --- | --- |
| `cr5d4_artikelnummeredeka` | Artikelnummer/EAN |
| `cr5d4_artikelbezeichnung` | Bezeichnung |
| `cr5d4_vk_dorf` | Verkaufspreis |
| `cr5d4_warengruppebez` | Warengruppe |
| `cr5d4_uvp_total` | UVP |
| `cr5d4_strichcode` | Barcode |
| `cr5d4_mengentyp`, `cr5d4_mengeneinheit`, `cr5d4_gpfaktor`, `cr5d4_mengenerfassung` | Mengen-/Preislogik |
| `cr5d4_artikelletzterverkauf` | Datum letzter Verkauf |

## 4. Requirements

### F1: Preisliste abrufen (`GET /api/preisliste`)

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `all` | Nein | `true/1/yes` ⇒ komplettes Sortiment (für CMS); sonst Artikel ohne Verkauf in letzten 6 Monaten ausgeblendet (außer Fleisch/Wurst) |
| `barcode` | Nein | EAN ⇒ Einzelartikel-Suche |

#### F1 Behaviour / Acceptance

- Standard: gruppiert nach Warengruppe, korrigierter Preis `vk`, `menge`-String; `rp:true` bei Roter-Punkt-Kriterium; aktive Angebote (`angebot:true`, `angebot_preis`, `angebot_statt`) eingemischt.
- `barcode` → `{success:true, barcode, results:[...]}`.
- Antwort enthält Metadaten `generated, total, skipped_old, warengruppen, rp_count, ang_count`.

#### F1 Test Cases

**TC-PREISLISTE-F1-01: Standardliste**
- **Action:** `GET /api/preisliste`.
- **Expected:** `groups` nach Warengruppe; alte Artikel (außer Fleisch/Wurst) ausgeblendet; `skipped_old` > 0 möglich.

**TC-PREISLISTE-F1-02: Vollständige Liste**
- **Action:** `GET /api/preisliste?all=1`.
- **Expected:** Auch länger nicht verkaufte Artikel enthalten.

**TC-PREISLISTE-F1-03: Barcode-Suche**
- **Action:** `GET /api/preisliste?barcode=4001417047234`.
- **Expected:** `success:true`, passender Artikel in `results`.

**TC-PREISLISTE-F1-04: Preiskorrektur & Angebot**
- **Setup:** Artikel mit `gpfaktor != 1` und aktives Angebot.
- **Expected:** `vk` korrigiert; `angebot:true` mit `angebot_preis`.

### F2: Sortiment-Seite (`sortiment.html` + `preisliste-live.js`)

#### F2 Behaviour / Acceptance

- Lädt `/api/preisliste`, rendert Akkordeon je Warengruppe, hebt Roter-Punkt-Artikel und Angebote hervor.
- Textsuche filtert Artikel client-seitig; Barcode-Scan sucht per `?barcode=`.
- Deutsche Preisformatierung (`2,99 €`).

#### F2 Test Cases

**TC-PREISLISTE-F2-01: Anzeige & Suche**
- **Expected:** Warengruppen-Akkordeon; Suchfeld filtert Treffer.

**TC-PREISLISTE-F2-02: Roter-Punkt-Hervorhebung**
- **Setup:** Artikel mit `rp:true`.
- **Expected:** Visuelle Roter-Punkt-Markierung.

## 5. Open Questions

- _(keine offenen Punkte)_ – Rabattgrenzen für Roter Punkt sind **5–60 %**, identisch zur `roterpunkt`-API und zum Frontend (`DISC_MAX=60`).

## 6. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-PREISLISTE-F1-01..04 | — | — |
| F2 | TC-PREISLISTE-F2-01..02 | — | — |

# Roter Punkt (Preisvergleich) – Spec

> **Feature-ID**: ROTERPUNKT
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

„Roter Punkt" ist ein Preisvergleichs-Feature: Es zeigt Artikel, deren
Verkaufspreis (VK) dauerhaft unter der unverbindlichen Preisempfehlung (UVP)
liegt. Die Seite `roter-punkt.html` lädt die Daten über `/api/roterpunkt` und
zeigt sie gruppiert nach Warengruppe mit Ersparnis in % und €.

Datenquelle ist Dataverse `cr5d4_tables`. Die Auswahllogik entspricht der
`preisliste`-API, ist hier aber auf günstige Artikel fokussiert.

**Betroffene Dateien:**
- API: `api/roterpunkt/`
- Frontend: `static-site/roter-punkt.html`, `static-site/js/roterpunkt-live.js`

## 2. Non-Goals

- Keine Bearbeitung von Preisen (nur Anzeige).
- Keine Sonderangebote (`dl_angebot`) – die laufen über `preisliste`.

## 3. Auswahlkriterien

Ein Artikel gilt als „Roter Punkt", wenn:
- `VK < UVP` (strikt), und
- Rabatt `(UVP - VK) / UVP * 100` zwischen **5 % und 70 %** liegt, und
- innerhalb der letzten ~6 Wochen verkauft (`cr5d4_artikelletzterverkauf`).
- **Ausnahme:** Warengruppe Fleisch & Wurst wird immer berücksichtigt.
- Artikel ohne Verkaufshistorie werden übersprungen (außer Fleisch/Wurst).

Warengruppen mit 0 % Durchschnittsrabatt werden ausgeblendet.

## 4. Requirements

### F1: Roter-Punkt-Liste (`GET /api/roterpunkt`)

#### F1 Behaviour / Acceptance

- Antwort JSON: `generated, total, skipped_old, warengruppen, groups{Warengruppe:[artikel]}`.
- Je Artikel: `artikelnummer, bezeichnung, vk, vk_base, uvp, discount, menge`.
- Preiskorrektur (`calc_menge_vk`): Sonderfälle für kg/g, Obst & Gemüse behalten `1 kg`.
- Kategorien werden normalisiert (MwSt-/Datums-Suffixe entfernt, `Mopro` → `Molkereiprodukte`, überlappende Gruppen zusammengeführt).

#### F1 Test Cases

**TC-ROTERPUNKT-F1-01: Liste laden**
- **Action:** `GET /api/roterpunkt`.
- **Expected:** `200`; `groups` nur mit qualifizierten Artikeln; jeder `discount` zwischen 5 und 70.

**TC-ROTERPUNKT-F1-02: Kategorie-Normalisierung**
- **Setup:** Artikel in Gruppe „Mopro (7%)".
- **Expected:** Erscheint unter „Molkereiprodukte".

**TC-ROTERPUNKT-F1-03: Leere Gruppen ausgeblendet**
- **Expected:** Keine Gruppe mit 0 % Durchschnittsrabatt in `groups`.

### F2: Roter-Punkt-Seite (`roter-punkt.html` + `roterpunkt-live.js`)

#### F2 Behaviour / Acceptance

- Lädt `/api/roterpunkt`, zeigt Banner mit Gesamtzahl, Suchfeld, Akkordeon je Warengruppe.
- Tabelle: „Artikel", „UVP", „Unser Preis", „Ersparnis" (rotes Badge `–X%`, € bei Ersparnis > 0,01).
- Client-Filter über `data-art` (lowercase Bezeichnung).
- Anzeigebereich `DISC_MIN=5`, `DISC_MAX=60` im Frontend.

#### F2 Test Cases

**TC-ROTERPUNKT-F2-01: Rendern & Banner**
- **Expected:** Banner „X Artikel dauerhaft günstiger als UVP"; Gruppen als Akkordeon.

**TC-ROTERPUNKT-F2-02: Suche filtert**
- **Action:** Suchbegriff eingeben.
- **Expected:** Nur passende Zeilen sichtbar.

## 5. Open Questions

- _(keine offenen Punkte)_ – Rabatt-Obergrenze ist **60 % überall**: Backend (`roterpunkt`- und `preisliste`-API) und Frontend (`DISC_MAX=60`) sind angeglichen.

## 6. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-ROTERPUNKT-F1-01..03 | — | — |
| F2 | TC-ROTERPUNKT-F2-01..02 | — | — |

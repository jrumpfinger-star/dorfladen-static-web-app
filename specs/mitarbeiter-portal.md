# Mitarbeiter-Portal – Spec

> **Feature-ID**: PORTAL
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

`portal.html` ist das interne Dashboard für Mitarbeitende. Es bündelt den Zugang
zu Bestellverwaltung, Packen/Kasse, Shop-Vorschau, Artikel-/Angebotsverwaltung,
CMS und Einstellungen. Live-Zähler zeigen Bestellstatus (Neu/In Bearbeitung/
Abholbereit/Heute).

**Betroffene Dateien:**
- Frontend: `static-site/portal.html`
- API (Zähler): `/api/bestellungen` (Bestellsystem, eigene Spec)

## 2. Non-Goals

- Keine eigene Bestelllogik (nur Verlinkung/Anzeige).

## 3. Requirements

### F1: Portal-Dashboard (`portal.html`)

#### F1 Behaviour / Acceptance

- Zeigt Kacheln für alle Verwaltungsbereiche mit Status-Badges.
- Lädt Bestellzähler (Neu/In Bearbeitung/Abholbereit/Heute) und zeigt sie live.
- „Live"-Badge mit Animation; farbcodierte Bereiche.

#### F1 Test Cases

**TC-PORTAL-F1-01: Kacheln & Navigation**
- **Expected:** Alle Bereichs-Kacheln sichtbar und verlinkt.

**TC-PORTAL-F1-02: Live-Zähler**
- **Setup:** Offene Bestellungen vorhanden.
- **Expected:** Zähler entsprechen den Bestelldaten.

## 4. Open Questions

- [NEEDS CLARIFICATION: Zugriffsschutz für `portal.html` – wie wird verhindert, dass Kunden die Seite aufrufen?]

## 5. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-PORTAL-F1-01..02 | — | — |

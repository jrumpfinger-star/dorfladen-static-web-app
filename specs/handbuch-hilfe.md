# Handbuch & Hilfe – Spec

> **Feature-ID**: HANDBUCH
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Dokumentation und Hilfe für Betreiber/Mitarbeitende: statische Anwenderhandbücher
(HTML + PDF, mit Screenshots), eine durchsuchbare Online-Hilfe sowie
Workflow-Diagramme des Bestellsystems.

**Betroffene Dateien:**
- `static-site/handbuch/anwenderhandbuch.html`, `homepage-anwenderhandbuch.html`, `hilfe.html`
- PDFs: `anwenderhandbuch.pdf`, `Dorfladen-CMS-Anwenderhandbuch.pdf`, `homepage-anwenderhandbuch.pdf`
- `static-site/handbuch/Screenshots/` (Bilder)
- `static-site/help-workflows.html` (Mermaid-Diagramme)

## 2. Non-Goals

- Keine dynamische Inhaltsverwaltung – Handbücher sind statisch/versioniert.

## 3. Requirements

### F1: Anwenderhandbücher (statisch)

#### F1 Behaviour / Acceptance

- CMS- und Homepage-Handbuch als HTML mit Screenshots und druckfreundlichem CSS; PDF-Versionen vorhanden.

#### F1 Test Cases

**TC-HANDBUCH-F1-01: Handbuch erreichbar**
- **Expected:** HTML lädt; Screenshots sichtbar; Druck-Layout vorhanden.

### F2: Online-Hilfe (`hilfe.html`)

#### F2 Behaviour / Acceptance

- Durchsuchbare Hilfeartikel mit Suchfeld und gefilterter Ergebnisanzeige.

#### F2 Test Cases

**TC-HANDBUCH-F2-01: Suche**
- **Action:** Begriff eingeben.
- **Expected:** Nur passende Artikel/Karten sichtbar.

### F3: Workflow-Diagramme (`help-workflows.html`)

#### F3 Behaviour / Acceptance

- Rein statische Seite mit 8 Tabs (Status-Lebenszyklus, Bestell-/Pack-/Kassen-Flow, E-Mail-Trigger, Kiosk-Filter, Systemarchitektur, API-Übersicht), gerendert per Mermaid.js (CDN).

#### F3 Test Cases

**TC-HANDBUCH-F3-01: Tabs & Diagramme**
- **Expected:** Tab-Navigation funktioniert; Mermaid-Diagramme werden gerendert.

## 4. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-HANDBUCH-F1-01 | — | — |
| F2 | TC-HANDBUCH-F2-01 | — | — |
| F3 | TC-HANDBUCH-F3-01 | — | — |

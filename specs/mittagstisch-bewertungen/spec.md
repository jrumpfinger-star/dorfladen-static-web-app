# Mittagstisch-Bewertungen – Spec

> **Feature-ID**: FN-BEWERTUNG
> **Status**: Entwurf (offene Klärungen)
> **Erstellt**: 2026-07-08
> **Bezug**: Checkliste FN-8, Backlog M-xx

---

## 1. Überblick

Kund:innen können ein Mittagsgericht **bewerten** (1–5 Sterne, optional kurzer
Kommentar). Die Bewertung erscheint aggregiert auf der Homepage-Mittagstisch-
Kachel und der Bestellseite und liefert der Küche Steuerungsdaten.

**Plattform:** SWA + Azure Functions (Python), Dataverse, statisches Frontend.

## 2. Goals

- Nutzer geben pro Gericht 1–5 Sterne (+ optional Kommentar) ab.
- Durchschnitt + Anzahl werden pro Gericht angezeigt.
- Missbrauch begrenzen (kein Mehrfach-Spam pro Gerät/Bestellung).

## 3. Non-Goals

- Keine öffentliche Kommentar-Moderationsoberfläche in v1 (nur Anzeige/Verbergen im CMS).
- Keine Bewertungen für Shop-Artikel oder Fleisch-Vorbestellung (nur Mittagstisch).
- Keine Nutzer-Accounts nötig (Bewertung ist niederschwellig).

## 4. Requirements

### F1: Bewertung abgeben

#### F1 Description
Auf der Mittagstisch-Bestellseite kann pro Gericht eine Sternebewertung
(1–5) und optional ein Kommentar (max. 280 Zeichen) abgegeben werden.

#### F1 Inputs
| Input | Required | Beschreibung |
| --- | --- | --- |
| `gericht_id` | Ja | Referenz auf das Gericht/den Wochenplan-Eintrag |
| `sterne` | Ja | 1–5 |
| `kommentar` | Nein | max. 280 Zeichen |

#### F1 Behaviour / Acceptance
- Nur 1–5 Sterne werden akzeptiert; sonst `400`.
- Mehrfachbewertung desselben Geräts für dasselbe Gericht wird verhindert/überschrieben.
- Kommentar wird server-seitig auf Länge geprüft und escaped.

#### F1 Test Cases
**TC-F1-01: Gültige Bewertung** — 4 Sterne → gespeichert, erscheint im Schnitt.
**TC-F1-02: Ungültige Sterne** — 0 oder 6 → `400`.
**TC-F1-03: Doppelbewertung** — zweite Abgabe überschreibt die erste (kein Doppelzählen).

### F2: Aggregierte Anzeige

#### F2 Description
Durchschnitt (1 Nachkommastelle) und Anzahl der Bewertungen werden pro Gericht
auf Homepage-Kachel + Bestellseite angezeigt.

#### F2 Test Cases
**TC-F2-01: Schnitt korrekt** — Bewertungen 4 & 5 → Anzeige „4,5 (2)".
**TC-F2-02: Keine Bewertungen** — Anzeige „noch keine Bewertung".

### F3: CMS-Sicht (optional Kommentar verbergen)

#### F3 Description
Im CMS sieht die Redaktion Bewertungen je Gericht und kann einzelne Kommentare
verbergen. **Schreibzugriff nutzt die SEC-2-Auth** (`X-CMS-Auth`).

#### F3 Test Cases
**TC-F3-01: Kommentar verbergen** — verborgener Kommentar erscheint nicht öffentlich.

## 5. Data & Contracts (Vorschlag)

Neue Dataverse-Tabelle `dl_bewertung` (EntitySet `dl_bewertungs`):

| Feld | Typ | Bedeutung |
| --- | --- | --- |
| `dl_gericht_id` | string | Referenz auf Gericht/Wochenplan |
| `dl_sterne` | int | 1–5 |
| `dl_kommentar` | string(280) | optional |
| `dl_geraet_hash` | string | anonymer Geräte-/Bestell-Hash (Anti-Spam) |
| `dl_verborgen` | bool | im CMS verborgen |
| `dl_erstellt` | datetime | Zeitstempel |

Neue Endpunkte:
- `POST /api/bewertung` (öffentlich, mit Anti-Spam) → Bewertung anlegen/überschreiben
- `GET /api/bewertung?gericht=<id>` → Aggregat + (sichtbare) Kommentare
- CMS: `PATCH /api/bewertung` (SEC-2-geschützt) → `dl_verborgen` toggeln

## 6. Open Questions

- [NEEDS CLARIFICATION: Was ist die stabile `gericht_id`? Wochenplan-Eintrag pro
  Tag, oder ein wiederkehrendes Gericht (Name)? Bestimmt, ob Bewertungen pro Tag
  oder pro Gericht aggregiert werden.]
- [NEEDS CLARIFICATION: Anti-Spam-Schlüssel — localStorage-Geräte-ID, Telefonnr.
  aus Stammkunden, oder Bestell-Referenz?]
- [NEEDS CLARIFICATION: Dürfen nur Besteller bewerten (Kopplung an lunch-order)
  oder jeder Besucher?]
- [NEEDS CLARIFICATION: Kommentare vor Anzeige moderieren (opt-in) oder sofort
  öffentlich mit nachträglichem Verbergen?]

## 7. Traceability

| Requirement | Test Cases | Plan | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01…03 | — | — |
| F2 | TC-F2-01/02 | — | — |
| F3 | TC-F3-01 | — | — |

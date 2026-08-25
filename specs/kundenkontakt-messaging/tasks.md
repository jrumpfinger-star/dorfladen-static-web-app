# Kundenkontakt-Messaging — Tasks

> Abgeleitet aus [plan.md](./plan.md). Geordnete, prüfbare Arbeitseinheiten.
> `[P]` = parallelisierbar.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Setup

- [x] T001 `feature/bestellsystem`-Branch (Deploy → TEST-SWA)
- [x] T002 Dataverse-Tabelle `dl_kontaktnachricht` + Felder via Metadata-API
  (dl_name, dl_email, dl_device_id, dl_betreff, dl_chatverlauf(Memo),
  dl_status(Option), dl_kommentar_gelesen(Bool), dl_notify_email(Bool))

## Core Implementation — Backend

- [x] T010 `api/contact-message`: POST (Kunde: Thread anlegen/anhängen, device_id,
  Honeypot, Rate-Limit) — serves `F1`,`F5` / `TC-F1-01`,`TC-F5-01`
- [x] T011 `api/contact-message`: GET `mode=my&device_id` (Verlauf) — `F1`/`TC-F1-02`
- [x] T012 `api/contact-message`: GET `mode=list` + `mode=unread` (Kiosk) — `F2`/`TC-F2-01`
- [x] T013 `api/contact-message`: PATCH (Antwort/Status/gelesen) + Push + No-Reply-Mail
  — serves `F2`,`F4` / `TC-F2-02`,`TC-F4-01`
- [x] T014 [P] `api/contact-upload` (Bild → SharePoint, Validierung) — `F7`
- [x] T015 [P] ~~`api/kontaktbild`~~ → bestehender Proxy `api/tagesbild?datei=` wiederverwendet — `F7`/`TC-F7-01`
- [x] T016 `api/push-subscribe`: Kategorie `kontakt` in `ALL_CATEGORIES` — `F4`

## Core Implementation — Frontend Homepage

- [x] T020 Chat-Overlay/Panel + Client (`js/kontakt.js`): senden, laden, Polling,
  Gelesen-Status, neueste unten — serves `F1` / `TC-F1-01..03`
- [x] T021 Bild senden (Kompression) + Thumbnail + Lightbox — `F7`/`TC-F7-01`
- [x] T022 Einstiege ersetzen: Float-Button, Footer-Icon, „Frage"-Button → Chat;
  Gruppe bleibt — serves `F6` / `TC-F6-01`,`TC-F6-02`
- [x] T023 Homepage-Einstieg nur bei aktivem `kiosk_kontakt`-Flag — `F3`

## Core Implementation — Kiosk

- [x] T030 Tab „Kontakt" (Flag `kiosk_kontakt`, `applyKioskFeatures`) — `F3`/`TC-F3-01`
- [x] T031 Konversationsliste + Ungelesen-Badge + Neu-Ton — `F2`/`TC-F2-01`
- [x] T032 Chat-Verlauf + Antwort-Eingabe + Bild senden + „gelesen"/„erledigt"
  — serves `F2`,`F7` / `TC-F2-02`,`TC-F7-02`
- [x] T033 CMS: Feature-Flag-Checkbox `feat-k-kontakt` (cms.html + cms.js) — `F3`

## Tests

- [ ] T040 Python-Unit: Verlauf-Anhängen, Rate-Limit, Bild-Validierung
- [x] T041 [P] Playwright E2E gegen TEST-SWA: F1/F2/F3/F6/F7-Flows (`tests/kontakt.spec.js`)

## Validation & Rollout

- [x] T050 E2E auf TEST grün; Feature-Flag-Verhalten geprüft (Round-Trip Kunde↔Kiosk verifiziert)
- [ ] T051 Merge `feature/bestellsystem` → `main` (Flag aus) — **wartet auf Freigabe**

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F1, F5 | TC-F1-01, TC-F5-01 |
| T011 | F1 | TC-F1-02 |
| T012 | F2 | TC-F2-01 |
| T013 | F2, F4 | TC-F2-02, TC-F4-01 |
| T014/T015 | F7 | TC-F7-01 |
| T016 | F4 | TC-F4-01 |
| T020 | F1 | TC-F1-01..03 |
| T021 | F7 | TC-F7-01 |
| T022 | F6 | TC-F6-01, TC-F6-02 |
| T030/T033 | F3 | TC-F3-01 |
| T031 | F2 | TC-F2-01 |
| T032 | F2, F7 | TC-F2-02, TC-F7-02 |

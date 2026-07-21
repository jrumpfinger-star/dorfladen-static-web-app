# Kiosk-Kalender — Implementation Plan

> Abgeleitet aus [spec.md](./spec.md). Der Plan übersetzt *was* (Spec) in *wie*.
> Kein neues Verhalten hier — fehlt etwas, zuerst die Spec anpassen.

**Spec:** [spec.md](./spec.md)

**Status:** Draft

## Constitution Check

- [x] Spec existiert und hat keine offenen `[NEEDS CLARIFICATION]`-Marker
- [x] Kein Cloud-/Plattform-Bruch: nutzt bestehende Azure-Functions + Dataverse
      (wie `wochenplan`, `stammkunden`) — keine neuen Fremd-Dienste
- [x] Keine Secrets im Repo: Dataverse-Zugang über App-Settings
      (`DV_CLIENT_SECRET`, `DV_DEFAULT_URL`), Auth über `CMS_AUTH_TOKEN`
- [x] Folgt den Ordner-Konventionen (`api/<name>/{__init__.py,function.json}`,
      Frontend in `static-site/`, Tests in `tests/`)

## Technical Approach

Ein neuer Azure-Functions-Endpunkt **`api/kalender/`** (Python v1) kapselt CRUD
für Kalendereinträge in Dataverse — strukturell eine Kopie des
`stammkunden`-Musters (MSAL-Token, `requests` gegen `…/api/data/v9.2/…`,
`_serialize()`-Helfer, CORS-Header). Wiederkehrende Tätigkeiten werden **einmal**
gespeichert und beim `GET` für den angefragten Datumsbereich **serverseitig
expandiert**; datumsbezogene Ausnahmen (Erledigt/Löschen einzelner Vorkommen)
liegen in einer zweiten Entität `dl_kalender_override`.

Im Frontend kommt ein neuer **Kiosk-Tab „Kalender"** in
[static-site/kiosk.html](../../static-site/kiosk.html) hinzu (Tab-Bar +
`k-panel`), plus ein Modul [static-site/js/kiosk-kalender.js](../../static-site/js/kiosk-kalender.js)
für Rendering, Schnellerfassung, Filter, Tages-/Wochennavigation und
Auto-Refresh. Der visuelle Aufbau folgt dem bereits abgenommenen Mockup
([mockups/kiosk-kalender-mockup.html](../../mockups/kiosk-kalender-mockup.html)),
umgesetzt mit den vorhandenen `--c-*`/`--dl-*`-Theme-Tokens und Lucide-Icons.

Auth: Mutierende Requests sind bereits durch `admin_auth_guard`
([api/shared/auth.py](../../api/shared/auth.py)) + Client-Wrapper
([static-site/js/admin-auth.js](../../static-site/js/admin-auth.js), hängt
`X-CMS-Auth` an) abgedeckt. Da die Spec **auch Lesen** absichert (kein
öffentlicher GET), ergänzen wir eine kleine, additive Lese-Prüfung, die
`token_valid()` wiederverwendet und nur diesen Endpunkt betrifft.

## Key Decisions

| Decision | Options considered | Choice & rationale |
| --- | --- | --- |
| Serien-Speicherung | (A) je Vorkommen materialisieren (B) einmal + berechnet expandieren | **B** — kein Datenwuchs, einfache Serienpflege; Expansion im GET |
| Serien-Ausnahmen | (A) Flags am Serien-Satz (B) separate Override-Entität | **B** `dl_kalender_override` — sauberer pro-Datum-Zustand für Erledigt/Löschen |
| Lese-Schutz | (A) GET offen lassen (wie andere Endpunkte) (B) GET ebenfalls per Token | **B**, aber **staged** wie `CMS_AUTH_ENFORCE`: additive Prüfung nur für `api/kalender`, bricht bestehende Endpunkte nicht |
| „Gemeinsamer Stand" | (A) WebSocket/Push (B) Polling | **B** Auto-Refresh-Polling (30–60 s) — genügt fachlich, minimaler Aufwand |
| Uhrzeit-Feld | (A) echtes Time-Feld (B) Text `HH:MM` | **B** Text `HH:MM` — analog Frontend-Sortierung, keine TZ-Fallen |
| Entität | (A) an `dl_wochenplan` andocken (B) neue Entität | **B** `dl_kalendereintrag` — eigene Semantik (ganztags, Serien, Kundenlookup) |

## Architecture

```mermaid
flowchart LR
  subgraph Frontend [static-site/]
    KH[kiosk.html<br/>Tab „Kalender"]
    KJS[js/kiosk-kalender.js<br/>Render · QuickAdd · Poll]
    AJS[js/admin-auth.js<br/>X-CMS-Auth]
    KH --> KJS --> AJS
  end
  subgraph API [api/kalender/]
    F[__init__.py main]
    G[GET expandiert Serien]
    H[shared/auth.py guard]
    D[shared/dataverse token]
  end
  AJS -->|fetch /api/kalender| F
  F --> H
  F --> D
  F --> G
  D --> DV[(Dataverse<br/>dl_kalendereintrag<br/>dl_kalender_override)]
```

Datenfluss `GET`: `von`/`bis` → Basiseinträge (Datum im Bereich) **+** aktive
Serien laden → Serien für den Bereich zu Vorkommen expandieren → Overrides
anwenden (Erledigt/ausblenden bei `geloescht`) → sortiert (ganztags zuerst, dann
`uhrzeit`) zurückgeben.

## File-Level Change Map

| Path | Change | Purpose |
| --- | --- | --- |
| `api/kalender/__init__.py` | new | `main()` mit GET/POST/PATCH/DELETE + Serien-Expansion + Override-Handling |
| `api/kalender/function.json` | new | Route `kalender/{id?}`, `authLevel: anonymous`, Methoden GET/POST/PATCH/DELETE/OPTIONS |
| `api/shared/auth.py` | edit | additive `read_auth_guard(req)` (nutzt `token_valid`, staged über `CMS_AUTH_ENFORCE`) — bricht bestehende Endpunkte nicht |
| `static-site/kiosk.html` | edit | neuer Tab „Kalender" (Tab-Bar) + `k-panel#panel-kalender` + `<script src="/js/kiosk-kalender.js">` |
| `static-site/js/kiosk-kalender.js` | new | Rendering, Schnellerfassung, Ganztags/Uhrzeit-Toggle, Kategorie-Filter, Erledigt-Toggle, Kunden-Autocomplete (gegen `/api/stammkunden`), Serien-Badges, Tages-/Wochennavigation, Auto-Refresh |
| `tests/kiosk-kalender.spec.js` | new | Playwright-E2E über alle drei Viewports; deckt TC-F1…TC-F8 ab (API gemockt via `page.route`) |
| `api/kalender/README` (optional) | new | Kurz-Doku der Felder/Contracts (nur wenn nötig) |

> Read-Guard-Detail: Für `api/kalender` wird im `main()` zusätzlich zu
> `admin_auth_guard(req)` (mutierend) ein `read_auth_guard(req)` aufgerufen, der
> **nur** bei aktivem `CMS_AUTH_ENFORCE` auch `GET` ohne gültiges Token mit `401`
> ablehnt. Der Client sendet den Token bereits — für `GET` wird der
> `admin-auth.js`-Wrapper minimal erweitert, sodass er `X-CMS-Auth` auch an
> `GET /api/kalender` anhängt (enger, pfad-spezifischer Zusatz, kein globales
> Verhalten für andere GETs).

## Data & Contracts (Umsetzung)

- **Entity-Set** `dl_kalendereintrag` (analog `dl_stammkundes`), Override-Set
  `dl_kalender_override`. Choice-Werte für `kategorie`/`wiederholung`/`status`
  werden — wie bei `wochenplan` (`DAY_LABELS`) — im Code auf Klartext gemappt.
- **Serialisierung**: `_serialize()` liefert sowohl `id`/Klartext-Felder als auch
  Roh-`dl_*`-Felder (Muster wie `wochenplan._serialize_item`), plus berechnete
  Felder `_ist_vorkommen`, `_vorkommen_datum`, `_serien_id`.
- **Routen** (via `function.json` `route: "kalender/{id?}"`):
  - `GET /api/kalender?von=…&bis=…`
  - `POST /api/kalender`
  - `PATCH /api/kalender/{id}` (inkl. `status`)
  - `POST /api/kalender/{id}?override=<datum>` (Override anlegen: erledigt/geloescht)
  - `DELETE /api/kalender/{id}`

## Test Strategy

- **Integration / E2E (Playwright, `tests/kiosk-kalender.spec.js`):** primäre
  Abdeckung. API-Antworten werden per `page.route('**/api/kalender*', …)` und
  `**/api/stammkunden*` gemockt, damit Tests deterministisch und ohne Dataverse
  laufen (Muster wie bestehende Kiosk-Specs). Läuft über die drei Projekte
  `mobile` / `ipad-mini` / `desktop` aus [playwright.config.js](../../playwright.config.js).
- **Serien-Expansion:** in erster Linie über E2E gegen gemockte GET-Antworten
  geprüft; falls die Expansions-Logik im Python-Endpunkt liegt, ergänzend ein
  kleiner Python-Unit-Test (`tests/`/`_test_*`-Muster) für `daily/weekly/biweekly/monthly`.
- **Mapping:** jeder Testfall der Spec wird abgedeckt:

| Requirement | Test Cases | Abdeckung |
| --- | --- | --- |
| F1 Erfassen | TC-F1-01..04 | E2E QuickAdd (ganztags/uhrzeit/leer/ohne Uhrzeit) |
| F2 Ganztags/Uhrzeit | TC-F2-01..02 | E2E Gruppierung + Leerzustand |
| F3 Erledigt | TC-F3-01..03 | E2E Abhaken/Rückgängig/Ein-Ausblenden |
| F4 Kunde | TC-F4-01..03 | E2E Autocomplete/Freitext/ohne |
| F5 Wiederkehrend | TC-F5-01..04 | E2E gegen gemockte Expansion + optional Python-Unit |
| F6 Tagesansicht | TC-F6-01..03 | E2E heute/Woche/Heute-Button |
| F7 Auth/Refresh | TC-F7-01..02 | E2E 401 ohne Token + Poll zeigt neue Daten |
| F8 Responsive | TC-F8-01..02 | alle drei Viewport-Projekte + keine nativen Dialoge |

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Dataverse-Choice-/Feldnamen weichen vom Entwurf ab | med | Namen im Task-Schritt aus vorhandener Entität/`wochenplan` verifizieren, bevor Code fixiert wird |
| GET-Auth blockiert versehentlich bestehende Clients | high | Staged über `CMS_AUTH_ENFORCE`; Read-Guard nur für `api/kalender`; Client sendet Token bereits |
| Serien-Expansion + Overrides fehleranfällig (Ränder KW/Monat) | med | Reine Funktion, Python-Unit-Test für die vier Intervalle + Monatsend-Fall |
| Polling erhöht Last | low | Intervall 30–60 s, GET schlank; nur aktiver Tab pollt |
| Zeitzonen bei `datum`/`uhrzeit` | med | `datum` als Date, `uhrzeit` als Text `HH:MM`, lokale Anzeige; keine UTC-Konvertierung |

## Rollout

- Lokal: Functions-Host (`func: host start`) + Azurite; Endpunkt gegen
  Dataverse-Dev testen, Frontend über SWA-Emulation/Live-URL.
- Auth-Rollout **staged**: erst deployen (Client sendet Token, `CMS_AUTH_ENFORCE`
  unverändert), dann Enforcement scharf schalten — konsistent mit SEC-2.
- Playwright-Specs müssen über alle drei Viewports grün sein (Quality Gate),
  bevor „done". Danach Deploy auf die Static Web App gemäß bestehendem Workflow.

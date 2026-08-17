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

---

## Inkrement 2 — Kiosk-Kalender v2 (F9–F14)

> Der Basis-Kalender (F1–F8) ist **bereits implementiert und deployt**
> (`api/kalender/`, `static-site/js/kiosk-kalender.js`, `tests/kiosk-kalender.spec.js`).
> Dieses Inkrement setzt die abgenommene v2-UI auf — Referenz:
> [mockups/kiosk-kalender-v2-mockup.html](../../mockups/kiosk-kalender-v2-mockup.html).
> Es ist **rein additiv** und ändert Datenmodell/Contracts nur um die Kategorie
> `info` (eine zusätzliche erlaubte Choice), sonst nichts.

### Constitution Check (Inkrement 2)

- [x] Spec ohne offene `[NEEDS CLARIFICATION]`-Marker (F9–F14, Decisions 8–12)
- [x] Kein Cloud-/Plattform-Bruch: nur bestehende Function `api/kalender/` +
      Frontend-Modul; keine neuen Dienste
- [x] Keine Secrets im Repo
- [x] Folgt Ordner-Konventionen (Änderungen in bestehenden Dateien)

### Technical Approach (Inkrement 2)

Alle sechs Anforderungen sind **UI-/Darstellungs-Erweiterungen** im bestehenden
Modul `static-site/js/kiosk-kalender.js` (Rendering + injizierte Styles via
`injectStyle()`), plus **eine** Backend-Zeile (`info` in `KATEGORIEN`). Es gibt
keine neuen Endpunkte, keine neue Entität, keine Contract-Änderung außer der
zusätzlich erlaubten Kategorie.

Wichtiger Ist-Stand (verifiziert im Code):

- **F14 (mehrzeiliger Titel) ist bereits weitgehend umgesetzt**: `.kal-entry .title`
  nutzt `white-space:pre-wrap;overflow-wrap:anywhere` (kein Ellipsis, `injectStyle`),
  `.kal-entry .top` ist `align-items:flex-start`, das Dialog-Titelfeld ist eine
  `<textarea rows="1">` mit `autoGrow` und „Enter = neue Zeile / Strg+Enter =
  speichern". → **Nur Verifikation + Testabdeckung** nötig, kein neuer Code.
- **F9 (Split-View), F11 (Titel-Autocomplete), F12 (Info), F13 (Dialog-Breite)
  fehlen noch** im realen Code (Basis-UI ist einspaltig gestapelt; Autocomplete
  existiert nur fürs **Kunden**-Feld; Kategorien enthalten kein `info`;
  `.kal-modal-card` hat `max-width:420px`).
- **F10 (Touch)** ist überwiegend erfüllt (Check-Target 52px, Pills großzügig);
  offen ist ein Audit der kleineren Elemente (z. B. Lösch-Icon `.ic` = 32px →
  auf ≥44px anheben) an allen drei Viewports.

Die Schnellerfassung im Mockup entspricht im realen UI dem **Dialog-Titelfeld
`#kal-title`** (der Kiosk nutzt einen Modal-Dialog „+ Neuer Eintrag", keine
separate Inline-Zeile). F11/F14 beziehen sich daher auf `#kal-title`.

### Key Decisions (Inkrement 2)

| Decision | Optionen | Wahl & Begründung |
| --- | --- | --- |
| Split-View-Umsetzung | (A) Zwei getrennte Renderpfade (B) Ein Grid-Container mit zwei Spalten, per CSS ab ≥768px zweispaltig | **B** — HTML rendert immer beide Spalten (`Ganztägig`/`Mit Uhrzeit`); Media-Query steuert 1- vs. 2-spaltig; Mobile bleibt via `order` gestapelt (Ganztägig oben) |
| Leere Spalte | (A) Spalte ausblenden (B) dezenter Leerzustand | **B** — Leerzustand je Spalte (Spec F9), kein Kollabieren |
| Titel-Autocomplete-Quelle | (A) eigener Endpunkt (B) distinct-Titel aus `state.entries` | **B** — keine Backend-Änderung, nutzt bereits geladene Daten (Spec F11) |
| Autocomplete-Wiederverwendung | (A) generische Komponente (B) analog zum bestehenden Kunden-Dropdown | **B** — spiegelt vorhandenes `kal-kunde-dd`-Muster (Konsistenz, wenig Risiko) |
| Info-Persistenz | (A) nur Frontend (B) auch `KATEGORIEN` im Backend | **B** — sonst Fallback auf `aufgabe` (Spec F12, TC-F12-02); genau eine Zeile in `api/kalender/__init__.py` |
| Dialog-Breite | (A) feste größere Breite (B) responsive `max-width` per Media-Query | **B** — 420px (Mobile) → ~560px (≥768px) → ~640px (≥1280px), zentriert, kein Overflow (Spec F13) |

### File-Level Change Map (Inkrement 2)

| Path | Change | Purpose |
| --- | --- | --- |
| `static-site/js/kiosk-kalender.js` | edit | **F9:** `renderList()` (~Z.389–408) rendert einen `.kal-splits`-Container mit zwei Spalten (links `Mit Uhrzeit`, rechts `Ganztägig`), je mit Leerzustand; `injectStyle()` (~Z.700ff.) ergänzt Grid-CSS (`@media(min-width:768px){grid-template-columns:1fr 1fr}`) + `order` für Mobile-Stapelung. **F11:** neues Titel-Vorschlags-Dropdown an `#kal-title` (distinct aus `state.entries`, ≥2 Zeichen, ≤6 Substring-Treffer, case-insensitiv), analog `searchKunden`/`kal-kunde-dd`. **F12:** `CATS` (Z.12–15) um `info:'Info'`; Filter-Chip (Z.110–117), Dialog-Kategorie-Pill (Z.135–141), Border-/Badge-/Dot-CSS (Z.703/713/728) um `cat-info` teal `#0891b2`; „Info" ohne Erledigt-Check-Semantik gemäß Mockup. **F13:** `.kal-modal-card` (Z.672) `max-width` responsive via Media-Queries. **F10:** kleine Tap-Targets (`.kal-entry .ic` u. a.) auf ≥44px. **F14:** nur Verifikation (bereits umgesetzt). |
| `api/kalender/__init__.py` | edit | **F12:** `KATEGORIEN` (Z.49) um `"info"` erweitern, damit `POST kategorie:"info"` nicht auf `aufgabe` zurückfällt (TC-F12-02). |
| `tests/kiosk-kalender.spec.js` | edit | Neue E2E-Fälle für F9–F14 über die drei Viewport-Projekte (API weiterhin per `page.route` gemockt). |
| `specs/kiosk-kalender/spec.md` | edit | Traceability-Tabelle um F9–F14 (Plan-Sektion + Tasks) ergänzen. |

> Kein neues `function.json`, keine neue Entität, keine neuen Felder. Die Kategorie
> `info` ist eine zusätzlich **erlaubte** Choice im bestehenden `dl_kategorie`-Feld.

### Test Strategy (Inkrement 2)

E2E-Playwright bleibt die primäre Abdeckung (`tests/kiosk-kalender.spec.js`,
gemockte API, drei Viewport-Projekte, **headed** gemäß Projektpräferenz). Mapping:

| Requirement | Test Cases | Abdeckung |
| --- | --- | --- |
| F9 Split-View | TC-F9-01..04 | ipad-mini/desktop: zwei Spalten (links Uhrzeit, rechts Ganztägig), kein H-Scroll; mobile: gestapelt; leere Spalte zeigt Leerzustand |
| F10 Touch | TC-F10-01..02 | Bounding-Box der primären Elemente ≥44×44px je Viewport; Aktionen ohne Hover per Tap auslösbar |
| F11 Autocomplete | TC-F11-01..03 | Vorschläge bei „Blum" (Substring, case-insensitiv), Übernahme per Tap, kein Treffer/leer → keine Liste |
| F12 Info | TC-F12-01..03 | Info im Dialog wählbar + Filter-Chip; POST-Body `kategorie:"info"`; teal-Codierung; Filter zeigt nur Info, „Alle" schließt ein |
| F13 Dialog-Breite | TC-F13-01..03 | Kartenbreite >420px (~560px) @768, breiter (~640px) @1280, ≤Viewport @375, kein Overflow |
| F14 Mehrzeilig | TC-F14-01..02 | langer Titel bricht um (kein `…`, kein H-Scroll, Badges/Check korrekt), kurzer Titel einzeilig |

Backend: `KATEGORIEN`-Erweiterung wird über den E2E-POST-Mock geprüft (TC-F12-01/02);
optional ein schlanker Python-Check, dass `info` nicht mehr auf `aufgabe` fällt.

### Risks & Mitigations (Inkrement 2)

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Split-View bricht bestehendes Timeline-Layout (`.kal-timeline`) | med | Zwei-Spalten-Grid nur als Container; Timeline-Markup je Spalte unverändert; visuelle Prüfung an allen drei Viewports |
| Info-Kategorie in weiteren Stellen übersehen (Dot/Badge/Filter/Dialog/Backend) | med | Checkliste im Task-Schritt; grep nach `cat-` und `kategorie` sichert Vollständigkeit |
| Titel-Autocomplete kollidiert mit „Enter=neue Zeile" im Textarea | med | Vorschlagsliste per Tap/Klick übernehmen; Enter bleibt Zeilenumbruch, Strg+Enter speichert (bestehendes Verhalten) |
| Tap-Target-Anhebung verändert Optik | low | Padding statt fixer Größen erhöhen; visuelle Abnahme im Mockup bereits erfolgt |

### Rollout (Inkrement 2)

Rein Frontend + eine Backend-Zeile; kein Infra-/Contract-Bruch. Nach grünen
Playwright-Specs (drei Viewports) automatisch committen + pushen (Projektpräferenz),
Deploy über den bestehenden SWA-Workflow.

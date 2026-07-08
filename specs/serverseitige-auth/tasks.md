# Serverseitige Auth — Tasks

> Abgeleitet aus [plan.md](./plan.md). Reihenfolge = Ausführungsreihenfolge.
> Eine Aufgabe ist „done", wenn die gemappten Test Cases (`TC-Fn-xx`) erfüllt sind.

## Rollout-Sicherheit
Durchsetzung ist **flag-gesteuert** über App-Setting `CMS_AUTH_ENFORCE`
(unset/`0` = nicht erzwungen). Code kann daher gefahrlos deployen; Aktivierung
erfolgt zuletzt.

## Aufgaben

- [x] **T01** App-Settings `CMS_PW_HASH` + `CMS_AUTH_TOKEN` auf `dorfladen-website`
  und `dorfladen-bestellsystem` setzen. *(erledigt via az)*
- [x] **T02** `api/shared/auth.py`: `admin_auth_guard`, `token_valid`,
  `unauthorized_response`, `enforcement_enabled`. → TC-F1-01…05
- [x] **T03** `api/cms-auth/` (function.json + __init__.py): Passwort→Token. → TC-F2-01/02
- [x] **T04** `static-site/js/admin-auth.js`: fetch-Wrapper (`X-CMS-Auth`),
  `dlAdminLogin`, 401-Retry mit Passwort-Prompt. → TC-F4-01/02
- [x] **T05** Guard (`admin_auth_guard`) am Anfang von `main()` in den 18
  Admin-Endpunkten. → TC-F1-01…04, TC-F3-01/02
- [x] **T06** Client-Login umstellen: `cms.js` + `index.html` nutzen
  `/api/cms-auth`; `cms.html`/`shop-admin`/`kiosk`/`shop-freigabe` binden
  `admin-auth.js` ein. → TC-F4-01/02
- [x] **T07** pytest `tests/test_auth.py` für `shared/auth.py`. → TC-F1-01…05
- [x] **T08** Validierung: compileall, Auth-Tests (7), read-only Smoke (5) grün.
- [x] **T09** Aktivierung `dorfladen-bestellsystem`: `CMS_AUTH_ENFORCE=1` gesetzt
  und **end-to-end verifiziert** (HTTP: ohne Token 401 / mit Token akzeptiert;
  Browser: CMS-Login holt Token, Schreib-Request trägt `X-CMS-Auth`).
- [ ] **T10** Prod (`dorfladen-website`) aktivieren: `CMS_AUTH_ENFORCE=1` — bewusst
  **offen**, erst nach kurzem CMS-Check im Prod-Browser (Kiosk ist operativ kritisch).

## Traceability
| Requirement | Test Cases | Tasks |
| --- | --- | --- |
| F1 | TC-F1-01…05 | T02, T05, T07 |
| F2 | TC-F2-01/02 | T03 |
| F3 | TC-F3-01/02 | T05 |
| F4 | TC-F4-01/02 | T04, T06 |

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

  > **Zusatz (27.09.2026):** An T10 hing bis dahin auch der Schutz der
  > Mittagstisch-Liste (Spec
  > [bestellliste-schuetzen](../bestellliste-schuetzen/spec.md)). **Das
  > ist erledigt und hängt nicht mehr hier:** Die Liste trägt seit dem
  > 27.09.2026 einen **eigenen** Schalter `LUNCH_LIST_ENFORCE=1`, der
  > gesetzt und live verifiziert ist — ohne Token 401, mit Kiosk-Token
  > 200, Kundenwege unberührt.
  >
  > T10 betrifft damit wieder nur das, wofür es gedacht war: die 25
  > Endpunkte mit `admin_auth_guard` (Schreibzugriffe von CMS und
  > Kiosk).
  >
  > **Entwarnung zum Risiko:** `admin-auth.js` fängt eine 401-Antwort ab
  > und zeigt den gewohnten Passwort-Dialog, statt still zu scheitern —
  > danach wird der Aufruf wiederholt. Ein fehlendes Token bedeutet also
  > einen zusätzlichen Handgriff, keinen Ausfall. Offen bleibt allein,
  > ob der Dialog unter Fully Kiosk sichtbar ist; das lässt sich nur am
  > Gerät prüfen.
  >
  > **Reihenfolge zum Einschalten:**
  > 1. Am Tablett prüfen, ob `cms_auth_token` vorhanden ist
  > 2. `CMS_AUTH_ENFORCE=1` setzen
  > 3. Im CMS etwas speichern — muss durchgehen
  > 4. Im Kiosk eine Bestellung bestätigen — muss durchgehen
  >
  > Zurückstellen: `CMS_AUTH_ENFORCE=` (leer).

## Traceability
| Requirement | Test Cases | Tasks |
| --- | --- | --- |
| F1 | TC-F1-01…05 | T02, T05, T07 |
| F2 | TC-F2-01/02 | T03 |
| F3 | TC-F3-01/02 | T05 |
| F4 | TC-F4-01/02 | T04, T06 |

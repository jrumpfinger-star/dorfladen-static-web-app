# Dark-Mode-Freigabe (CMS-Einstellung) — Specification

**Status:** Ready for Plan

**Owner:** {offen — Projektverantwortliche/r}

**Last updated:** 2026-07-08

## Overview

Die Website (Azure Static Web App, statisches Frontend unter `static-site/`,
Theme-Steuerung in [static-site/js/theme.js](../../static-site/js/theme.js))
unterstützt einen Dark Mode, der sich nach der System-Einstellung des Besuchers
(`prefers-color-scheme`) richtet.

Diese Funktion ergänzt in den **CMS-Feature-Einstellungen**
([static-site/cms.html](../../static-site/cms.html), Abschnitt
„Feature-Einstellungen", gespeichert im cms-config-Key `feature_flags`) einen
**globalen Schalter „Dark Mode erlauben"**. Ist er **aus** (Standard), wird die
gesamte Website — öffentliche **und** Admin-/CMS-/Kiosk-Seiten — für alle
Besucher **immer hell** dargestellt. Ist er **an**, folgt das Theme **strikt der
System-Einstellung** (`prefers-color-scheme`); einen manuellen Umschalter gibt
es nicht.

Zielplattform: statisches HTML/CSS/JS, Vanilla-JS (`theme.js`), CMS-Konfiguration
über die Azure-Functions-API `GET/POST /api/cms-config`.

## Goals

- Betreiber:in kann Dark Mode für die **gesamte** Website an-/ausschalten.
- Bei „aus" rendern alle Seiten hell, **flackerfrei** und ohne Dark-Mode-Reste.
- Bei „an" folgt das Theme strikt der System-Einstellung.
- Zentral über den bestehenden `feature_flags`-Mechanismus, ohne Redeploy.

## Non-Goals

- Keine neuen Farbschemata jenseits von Hell/Dunkel.
- Kein manueller Hell/Dunkel-Umschalter mehr (Entscheidung: strikt System).
- Keine pro-Seite- oder pro-Benutzer-Einstellung (nur globaler Schalter).
- Keine Änderung der bestehenden Dark-Mode-CSS-Regeln selbst.
- Kein serverseitiges Rendering; Steuerung bleibt clientseitig in `theme.js`.

## Decisions (aufgelöste Klärungen)

1. **Default (Wert fehlt):** Dark Mode **nicht erlaubt** → hell.
2. **Scope:** **Alle** Seiten inkl. Admin/CMS/Kiosk.
3. **Bei erlaubt:** **Strikt nur System** — kein manueller Umschalter/Button.
4. **Fallback (API nicht erreichbar):** **Erlaubt** (heutiges Verhalten: System).
5. **Erster Paint:** **Flackerfrei** (letzter bekannter Wert wird gecacht und
   vor dem Paint angewandt).
6. **Bei „nicht erlaubt":** gespeicherte Nutzerwahl (`dl-theme`) wird **nur
   ignoriert**, nicht gelöscht.

## Requirements

### F1: CMS-Schalter „Dark Mode erlauben"

#### F1 Description

Im CMS-Tab „Feature-Einstellungen" erscheint ein zusätzlicher Toggle-Schalter
„🌙 Dark Mode erlauben" mit erläuterndem Untertitel. Er wird — wie die übrigen
Feature-Schalter — beim Laden aus `feature_flags` befüllt und beim Speichern in
`feature_flags` zurückgeschrieben.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `feature_flags.dark_mode` | Nein | Boolean. `true` = erlaubt. Fehlend oder `false` = **nicht erlaubt** (Default). |

#### F1 Behaviour / Acceptance

- Given der Tab „Feature-Einstellungen" ist geladen,
  Then zeigt der Schalter `feature_flags.dark_mode === true` (angehakt = erlaubt).
- Given der/die Nutzer:in ändert den Schalter und speichert,
  When der POST auf `/api/cms-config` mit
  `{name:'feature_flags', wert:{…, dark_mode:<bool>}}` erfolgreich ist,
  Then erscheint eine benutzerfreundliche Bestätigung (Toast) und die übrigen
  Flags bleiben unverändert.
- Fehlermeldungen sind benutzerfreundlich (Konstitution §6).

#### F1 Test Cases

**TC-F1-01: Schalter spiegelt gespeicherten Wert**

- **Setup:** `feature_flags.dark_mode = true`.
- **Action:** CMS öffnen, Tab „Feature-Einstellungen" laden.
- **Expected:** Schalter „Dark Mode erlauben" ist angehakt.

**TC-F1-02: Speichern schreibt nur dieses Flag um**

- **Setup:** `feature_flags = {push:true, scanner:true}`.
- **Action:** „Dark Mode erlauben" einschalten, speichern.
- **Expected:** POST-Body enthält `dark_mode:true`, `push:true`, `scanner:true`
  unverändert; Erfolgs-Toast.

**TC-F1-03: Fehlender Wert = nicht angehakt (Default)**

- **Setup:** `feature_flags` ohne Schlüssel `dark_mode`.
- **Action:** Tab laden.
- **Expected:** Schalter ist **nicht** angehakt (Dark Mode nicht erlaubt).

### F2: Alle Seiten respektieren die Freigabe

#### F2 Description

`theme.js` (auf allen Seiten eingebunden — öffentlich und Admin) berücksichtigt
die CMS-Freigabe. Ist Dark Mode **nicht** erlaubt, wird auf `<html>` **immer**
`data-theme="light"` gesetzt — unabhängig von `prefers-color-scheme` und vom
gespeicherten `localStorage`-Wert `dl-theme` (der ignoriert, nicht gelöscht wird).
Ist Dark Mode **erlaubt**, folgt `data-theme` strikt `prefers-color-scheme`.

#### F2 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `feature_flags.dark_mode` | Nein | wie F1 |
| System `prefers-color-scheme` | Nein | entscheidet nur bei „erlaubt" |
| `localStorage['dl-theme']` | Nein | wird ignoriert (nicht gelöscht) |

#### F2 Behaviour / Acceptance

- Given `dark_mode` ≠ `true` (nicht erlaubt),
  When eine beliebige Seite (öffentlich oder Admin) geladen wird — auch bei
  System = dunkel oder zuvor gewählt „Dunkel",
  Then `data-theme === 'light'`; keine dunklen Flächen.
- Given `dark_mode = true`, System = dunkel,
  Then `data-theme === 'dark'`.
- Given `dark_mode = true`, System = hell,
  Then `data-theme === 'light'`.

#### F2 Test Cases

**TC-F2-01: Nicht erlaubt erzwingt Hell trotz System=dunkel**

- **Setup:** `dark_mode=false`; Browser `colorScheme:'dark'`.
- **Action:** Startseite (`/`) laden.
- **Expected:** `data-theme=light`.

**TC-F2-02: Nicht erlaubt ignoriert gespeicherte Nutzerwahl (nicht gelöscht)**

- **Setup:** `dark_mode=false`; `localStorage['dl-theme']='dark'` vorbelegt.
- **Action:** `/konzept` laden.
- **Expected:** `data-theme=light`; `localStorage['dl-theme']` ist weiterhin
  `'dark'` (unverändert).

**TC-F2-03: Erlaubt folgt System (dunkel → dunkel)**

- **Setup:** `dark_mode=true`; Browser `colorScheme:'dark'`.
- **Action:** Startseite laden.
- **Expected:** `data-theme=dark`.

**TC-F2-04: Gilt auch für Admin-Seiten**

- **Setup:** `dark_mode=false`; Browser `colorScheme:'dark'`.
- **Action:** `/cms`, `/kiosk`, `/shop-admin` laden.
- **Expected:** Auf allen `data-theme=light`.

**TC-F2-05: Drei Viewports bleiben hell (Konstitution §7)**

- **Setup:** `dark_mode=false`.
- **Action:** `/`, `/sortiment`, `/oeffnungszeiten` bei 375×667, 768×1024,
  1280×800 laden.
- **Expected:** Überall `data-theme=light`, keine dunklen Flächen, kein Overflow.

### F3: Kein manueller Umschalter (strikt System)

#### F3 Description

Da bei „erlaubt" strikt die System-Einstellung gilt, wird der bisherige
Floating-Umschalt-Button `#dl-theme-toggle` **nicht mehr angezeigt** — weder bei
„erlaubt" noch bei „nicht erlaubt". `theme.js` reagiert bei „erlaubt" live auf
System-Wechsel (`prefers-color-scheme`-Change).

#### F3 Behaviour / Acceptance

- Given eine beliebige Konfiguration,
  Then existiert kein sichtbarer `#dl-theme-toggle`.
- Given `dark_mode=true`,
  When die System-Einstellung von hell auf dunkel wechselt,
  Then wechselt `data-theme` live auf `dark` (ohne Reload).
- Given `dark_mode=false`,
  When die System-Einstellung wechselt,
  Then bleibt `data-theme=light`.

#### F3 Test Cases

**TC-F3-01: Kein Umschalt-Button**

- **Setup:** beliebig (`dark_mode` true/false).
- **Action:** Startseite laden.
- **Expected:** `document.getElementById('dl-theme-toggle')` ist `null`.

**TC-F3-02: Live-Reaktion auf System-Wechsel bei erlaubt**

- **Setup:** `dark_mode=true`, Start hell.
- **Action:** `prefers-color-scheme` auf dunkel emulieren.
- **Expected:** `data-theme` wechselt zu `dark` ohne Reload.

**TC-F3-03: Keine Reaktion bei nicht erlaubt**

- **Setup:** `dark_mode=false`.
- **Action:** System auf dunkel wechseln.
- **Expected:** `data-theme` bleibt `light`.

### F4: Flackerfrei & robustes Fallback

#### F4 Description

`theme.js` wendet das Theme **vor dem ersten Paint** an, indem es den zuletzt
bekannten Freigabewert aus `localStorage` (Key `dl-dark-allowed`) synchron liest.
Anschließend lädt es die aktuelle Freigabe aus `/api/cms-config`, aktualisiert
den Cache und korrigiert das Theme bei Bedarf (höchstens ein einmaliger Übergang).
Ist die API nicht erreichbar, gilt **erlaubt** (heutiges Verhalten: System).

#### F4 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `localStorage['dl-dark-allowed']` | Nein | gecachter letzter Freigabewert (`'1'`/`'0'`). Fehlend ⇒ Default „nicht erlaubt" für den ersten Paint. |
| API-Antwort | Nein | erreichbar / Fehler |

#### F4 Behaviour / Acceptance

- Given kein gecachter Wert vorhanden,
  When eine Seite geladen wird,
  Then wird vor dem Paint der Default „nicht erlaubt" (hell) angewandt; nach dem
  Config-Load erfolgt höchstens ein einmaliger Übergang.
- Given gecachter Wert `erlaubt` und System=dunkel,
  Then ist der erste Paint bereits dunkel (kein Wechsel), sofern die Config das
  bestätigt.
- Given `/api/cms-config` liefert Fehler/Timeout,
  Then gilt „erlaubt" (System entscheidet); keine Endlosschleife, kein
  Dauerflackern.

#### F4 Test Cases

**TC-F4-01: Flackerfrei für wiederkehrende Nutzer (erlaubt, System=dunkel)**

- **Setup:** `dl-dark-allowed='1'`, `dark_mode=true`, System=dunkel.
- **Action:** Seite laden, ab erstem Frame beobachten.
- **Expected:** `data-theme=dark` vom ersten Frame an; kein sichtbarer Wechsel.

**TC-F4-02: API-Fehler → Fallback erlaubt (System)**

- **Setup:** `/api/cms-config` liefert Fehler; System=dunkel; kein/`'1'`-Cache.
- **Action:** Seite laden.
- **Expected:** `data-theme=dark` (System); stabil, kein Dauerflackern.

**TC-F4-03: Kein Dauerflackern bei nicht erlaubt**

- **Setup:** `dark_mode=false`, System=dunkel, Cache leer.
- **Action:** Seite laden, 2 s beobachten.
- **Expected:** Nach dem Settle stabil `data-theme=light` (kein wiederholtes
  Wechseln).

## Data & Contracts

- **Config-Key:** `feature_flags` (bestehend), Objekt. Neuer Schlüssel:
  `dark_mode` (Boolean). **`dark_mode === true` ⇒ erlaubt**, sonst nicht erlaubt
  (Default „aus").
- **Lesen:** `GET /api/cms-config` → `res.data.feature_flags` (ggf. JSON-String,
  wird geparst).
- **Schreiben:** `POST /api/cms-config`
  `{ "name": "feature_flags", "wert": { …bestehende Flags…, "dark_mode": <bool> } }`.
- **Theme-Attribut:** `document.documentElement[data-theme] ∈ {"light","dark"}`.
- **Cache-Key (neu):** `localStorage['dl-dark-allowed'] ∈ {'1','0'}` für den
  flackerfreien ersten Paint.
- **Bestehender Key:** `localStorage['dl-theme']` wird nicht mehr gesetzt (kein
  manueller Umschalter) und bei „nicht erlaubt" ignoriert.
- **Betroffene Seiten:** alle, die `theme.js` einbinden (öffentliche Info-/Shop-
  Seiten **und** Admin-Seiten: cms, kiosk, shop-admin, bestellungen, pack,
  portal, lunch-admin, shop-freigabe).

## Open Questions

- keine (alle Klärungen aufgelöst, siehe „Decisions").

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02, TC-F1-03 | — | — |
| F2 | TC-F2-01, TC-F2-02, TC-F2-03, TC-F2-04, TC-F2-05 | — | — |
| F3 | TC-F3-01, TC-F3-02, TC-F3-03 | — | — |
| F4 | TC-F4-01, TC-F4-02, TC-F4-03 | — | — |

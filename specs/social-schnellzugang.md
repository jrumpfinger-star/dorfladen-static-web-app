# Social „Schnell posten“ – Schnellzugang für Verkaufspersonal – Spec

> **Feature-ID**: SOCIAL-QUICK
> **Status**: Umgesetzt & live auf Staging verifiziert (F1–F4). Route `/posten`,
> Login-Gate, Gerät-merken, PWA-Manifest und versteckte Logo-Geste aktiv.
> **Owner**: —
> **Erstellt**: 2026-07-26
> **Bezug**: [kiosk-social.md](kiosk-social.md), [mitarbeiter-portal.md](mitarbeiter-portal.md),
> [serverseitige-auth/spec.md](serverseitige-auth/spec.md), [conventions.md](conventions.md) §1

---

## 1. Überblick

Das Verkaufspersonal soll die **vollständige Social-Media-Funktion** so schnell
wie möglich erreichen – von unterwegs und am Ladentresen, ohne lange Links,
Menüs oder den vollen Kiosk-Modus zu durchsuchen. „Schnell“ bezieht sich auf den
**Zugang/Einstieg**, nicht auf einen reduzierten Funktionsumfang: Am Ziel steht
der **komplette** Social-Arbeitsbereich (Neuer Post, Katalog verwalten, Verlauf).

Heute ist Social nur im **CMS** und im **Kiosk** erreichbar. Beides ist ein
umfangreiches Verwaltungs-UI und für den mobilen Alltag zu schwerfällig. Ein
Wechsel in den Kiosk-Modus ist ausdrücklich **nicht** die Lösung, weil die
Funktion auch **mobil** blitzschnell erreichbar sein soll.

Dieses Feature schafft eine **eigene, mobile-first Seite** (`posten.html`, Route
`/posten`), die den **vollen** Social-Funktionsumfang bündelt (Wiederverwendung
von `static-site/js/social.js` + `social-poster.js`). Zur Beschleunigung öffnet
sie standardmäßig direkt im „Neuer Post“-Assistenten, bietet aber die Bereiche
**Neuer Post**, **Katalog** und **Verlauf** vollständig an. Der Zugang ist:

1. **Als Mini-App installierbar** (Home-Bildschirm-Icon „Posten“) → ein Tipp vom
   Handy-Startbildschirm, ohne die Homepage zu öffnen (schnellster Alltagsweg).
2. Über einen **diskreten Personal-Einstieg auf der Homepage** per **versteckter
   Geste** (Logo lange drücken) – für Kund:innen unsichtbar. Ist das Gerät bereits
   als Personal gemerkt, führt die Geste direkt zu `/posten`.

**Plattform:** Azure Static Web Apps + Azure Functions (Python v1), statisches
Frontend (`static-site/`). Auth über den bestehenden CMS-/Admin-Login
(`/api/cms-auth`, `X-CMS-Auth`-Token, siehe SEC-AUTH).

**Betroffene Dateien (geplant):**
- Frontend: `static-site/posten.html` (neu), `static-site/index.html`
  (diskreter Einstieg), `static-site/posten-manifest.json` (neu)
- Wiederverwendet: `static-site/js/social.js`, `static-site/js/social-poster.js`
- Auth: bestehende Endpunkte `/api/cms-auth`, `/api/social-post`,
  `/api/social-katalog`, `/api/tagespost` (GET Katalog, POST Post)

## 2. Goals

- Personal erreicht die **vollständige** Social-Funktion in **≤ 3 Tipps** ab
  Home-Bildschirm (Icon → ggf. Bereich → los).
- **Voller Funktionsumfang** verfügbar: Neuer Post erstellen & teilen,
  Katalog verwalten (anlegen/bearbeiten/löschen), Verlauf einsehen.
- Die Seite ist **mobil-optimiert** und braucht **keinen** Kiosk-Modus.
- Kund:innen können die Seite und den Einstieg **nicht** versehentlich erreichen
  oder sehen.
- Wiederverwendung der bestehenden Social-Logik (kein Duplizieren der
  Poster-/Sharing-/Katalog-Funktionen).

## 3. Non-Goals

- Kein neues Rollen-/Rechtesystem – es gilt der bestehende gemeinsame
  Admin-/CMS-Login (SEC-AUTH).
- Keine funktionale Änderung an der bestehenden CMS-/Kiosk-Social-Logik
  (nur Wiederverwendung; Verhalten bleibt identisch).
- Keine neue Sharing-Integration über die heute vorhandenen hinaus
  (WhatsApp, Instagram, „als Tagesinfo veröffentlichen“).

## 4. Requirements

### F1: Vollständiger Social-Arbeitsbereich auf `/posten`

#### F1 Description

Eine eigene Seite `posten.html`, die den **kompletten** Social-Funktionsumfang
mobil-optimiert bündelt – organisiert in den Bereichen **Neuer Post**,
**Katalog** und **Verlauf**. Sie nutzt `social.js`/`social-poster.js`. Zur
Beschleunigung öffnet sie standardmäßig direkt im „Neuer Post“-Assistenten
(kein Tab-Wechsel, kein Kiosk-Rahmen), die anderen Bereiche sind per
Bereichs-Umschalter erreichbar.

- **Neuer Post:** Titel-Auswahl (vorgefertigt + eigen), optionaler Freitext,
  Produkt-/heutiges-Mittagessen-Auswahl, freie Produkteingabe, Poster-Vorschau,
  Teilen (WhatsApp, Instagram, „Als Tagesinfo veröffentlichen“).
- **Katalog:** Produkte anlegen/bearbeiten/löschen inkl. Bild (Upload/Drag&Drop/
  Strg+V), Kategorie-Verwaltung mit Lucide-Icons – 1:1 wie im Kiosk-Katalog.
- **Verlauf:** Liste veröffentlichter Posts einsehen (wie im CMS-Verlauf).

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| Gültige Personal-Session (F2) | Ja | Sonst Login-Gate statt Arbeitsbereich |
| Katalog-/Wochenplan-/Verlaufs-Daten | Ja | via bestehende APIs geladen |

#### F1 Behaviour / Acceptance

- Beim Laden mit gültiger Session erscheint **sofort** der „Neuer Post“-
  Assistent; **Katalog** und **Verlauf** sind über den Bereichs-Umschalter
  erreichbar.
- **Neuer Post** verhält sich funktional identisch zur Kiosk-/CMS-Variante
  (Titel, Text, Produkte, heutiges Mittagessen, Vorschau, Teilen).
- **Katalog** erlaubt Anlegen/Bearbeiten/Löschen von Produkten und Kategorien
  inkl. Bild-Handling (Upload/Drag&Drop/Strg+V) – wie in [kiosk-social.md](kiosk-social.md).
- **Verlauf** zeigt veröffentlichte Posts.
- Mobile-first: erfüllt [conventions.md](conventions.md) §4/§10 (Touch-Größen,
  Lesbarkeit 60+, Kontrast, kein horizontaler Overflow) auf Mobile/iPad/Desktop.

#### F1 Test Cases

**TC-SOCIAL-QUICK-F1-01: Direkter Einstieg + Bereichswechsel**
- **Setup:** Gültige Personal-Session vorhanden.
- **Action:** `/posten` öffnen; zwischen Neuer Post / Katalog / Verlauf wechseln.
- **Expected:** „Neuer Post“ sofort sichtbar; Umschalten auf Katalog und Verlauf
  lädt/zeigt die jeweiligen Inhalte.

**TC-SOCIAL-QUICK-F1-02: Post „Als Tagesinfo veröffentlichen“**
- **Setup:** Titel + (optional) Produkt gewählt.
- **Action:** „Als Tagesinfo“ tippen.
- **Expected:** Post wird gespeichert (POST `/api/social-post`/`tagespost`);
  Bestätigung erscheint; Beitrag ist auf der Homepage sichtbar.

**TC-SOCIAL-QUICK-F1-03: WhatsApp-Teilen**
- **Action:** „Per WhatsApp teilen“ tippen.
- **Expected:** WhatsApp-Share mit Poster/Text/Bestelllinks wird ausgelöst
  (Verhalten wie Kiosk).

**TC-SOCIAL-QUICK-F1-04: Katalog verwalten**
- **Action:** Im Bereich Katalog ein Produkt anlegen, bearbeiten, löschen; Bild
  per Strg+V setzen; Kategorie anlegen.
- **Expected:** Änderungen werden über `/api/social-katalog` gespeichert und
  erscheinen anschließend auch in der Produktauswahl von „Neuer Post“.

**TC-SOCIAL-QUICK-F1-05: Verlauf**
- **Setup:** Mindestens ein veröffentlichter Post existiert.
- **Action:** Bereich Verlauf öffnen.
- **Expected:** Der veröffentlichte Post erscheint in der Liste.

### F2: Zugriffsschutz – nicht für Kund:innen

#### F2 Description

`/posten` ist nur für angemeldetes Personal nutzbar. Ohne gültige Session zeigt
die Seite den bestehenden Login-Gate (CMS-Passwort → `/api/cms-auth` → Token).
Die Seite wird nicht öffentlich verlinkt und ist für Suchmaschinen gesperrt.

#### F2 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| CMS-Passwort (einmalig) | Ja | Über bestehenden Gate → Token |
| `X-CMS-Auth`-Token | Ja | Für schreibende Post-Requests (SEC-AUTH) |

#### F2 Behaviour / Acceptance

- Kein gültiges Personal-Kennzeichen/Token → Login-Gate statt Assistent.
- Schutz über den **bestehenden gemeinsamen CMS-/Personal-Login**
  (`/api/cms-auth`, ein Passwort für alle) – kein separater Code.
- **Gerät dauerhaft merken:** Nach erfolgreichem Login wird das Gerät langlebig
  als Personal markiert (persistentes `localStorage`-Kennzeichen + gespeichertes
  `X-CMS-Auth`-Token), damit der Zugang im Alltag schnell bleibt und selten neu
  angemeldet werden muss. Ein „Abmelden“ entfernt das Kennzeichen wieder.
- Schreibende Requests (`POST /api/social-post` etc.) tragen `X-CMS-Auth`;
  ohne gültiges Token → `401` (SEC-AUTH), keine Veröffentlichung.
- Kein Link auf `/posten` in öffentlicher Navigation/Footer/Sitemap.
- `posten.html` enthält `<meta name="robots" content="noindex,nofollow">`.

#### F2 Test Cases

**TC-SOCIAL-QUICK-F2-01: Ohne Anmeldung kein Assistent**
- **Setup:** Kein Personal-Kennzeichen/Token auf dem Gerät.
- **Action:** `/posten` öffnen.
- **Expected:** Login-Gate erscheint; Post-Funktionen nicht bedienbar.

**TC-SOCIAL-QUICK-F2-02: Veröffentlichen ohne Token → 401**
- **Action:** `POST /api/social-post` ohne `X-CMS-Auth`.
- **Expected:** `401`, kein Post gespeichert.

**TC-SOCIAL-QUICK-F2-03: Nicht indexierbar / nicht verlinkt**
- **Expected:** `posten.html` hat `robots noindex`; keine öffentlichen Links
  in `index.html`-Navigation/Footer.

**TC-SOCIAL-QUICK-F2-04: Gerät bleibt angemeldet**
- **Setup:** Auf dem Gerät einmalig angemeldet.
- **Action:** Browser/Mini-App schließen und `/posten` erneut öffnen.
- **Expected:** Kein erneuter Login nötig; Arbeitsbereich direkt nutzbar
  (bis „Abmelden“).

### F3: Diskreter Personal-Einstieg (versteckte Geste)

#### F3 Description

Auf `index.html` gibt es **keinen** sichtbaren Personal-Button. Der Zugang zu
`/posten` wird über eine **versteckte Geste** ausgelöst: langes Drücken (bzw.
mehrfaches Tippen) auf das **Logo** im Header. Für Kund:innen ist nichts
erkennbar. Ist das Gerät bereits als Personal gemerkt (F2), führt die Geste
direkt zu `/posten`; sonst erscheint zuerst der Login-Gate.

#### F3 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| Geste auf Logo | Ja | Long-Press (~600 ms) bzw. definierte Tap-Folge |
| Personal-Kennzeichen im Browser | Nein | Wenn vorhanden → direkt zu `/posten`, sonst Login |

#### F3 Behaviour / Acceptance

- **Kein** sichtbares Personal-Element im DOM/Layout der Homepage (kein Button,
  kein Platzhalter, keine Andeutung) – Kundenlayout unverändert.
- Logo bleibt für Kund:innen ein normales Logo (kurzer Tap tut nichts
  Auffälliges bzw. bestehendes Verhalten).
- Long-Press/Tap-Folge auf dem Logo:
  - Gerät als Personal gemerkt → Navigation direkt zu `/posten`.
  - sonst → Login-Gate; nach Erfolg Navigation zu `/posten`.
- Die Geste ist auf Touch (Mobile/iPad) und Desktop auslösbar.

#### F3 Test Cases

**TC-SOCIAL-QUICK-F3-01: Kundensicht – nichts sichtbar/auslösbar**
- **Setup:** Frischer Browser, kein Personal-Kennzeichen.
- **Action:** Homepage normal bedienen (kurze Taps).
- **Expected:** Kein Personal-Element sichtbar; kurzer Logo-Tap öffnet **nicht**
  `/posten`.

**TC-SOCIAL-QUICK-F3-02: Geste ohne Anmeldung → Login → /posten**
- **Setup:** Kein Personal-Kennzeichen.
- **Action:** Logo lange drücken.
- **Expected:** Login-Gate; nach korrektem Passwort Navigation zu `/posten`.

**TC-SOCIAL-QUICK-F3-03: Geste mit gemerktem Gerät → direkt /posten**
- **Setup:** Gerät als Personal gemerkt.
- **Action:** Logo lange drücken.
- **Expected:** Direkte Navigation zu `/posten` ohne erneuten Login.

### F4: Installierbarkeit (Home-Bildschirm / PWA)

#### F4 Description

`/posten` ist als eigene Mini-App installierbar („Zum Startbildschirm
hinzufügen“) mit eigenem Manifest (`start_url=/posten`, Icon „Posten“), sodass
Personal die Funktion mit **einem Tipp** vom Handy-Startbildschirm öffnet.

#### F4 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `posten-manifest.json` | Ja | `name`, `start_url=/posten`, `display=standalone`, Icons |

#### F4 Behaviour / Acceptance

- `posten.html` verweist auf `posten-manifest.json`; Icons/Theme gesetzt.
- Nach Installation öffnet das Icon `/posten` randlos (standalone).
- Personal-Anmeldung bleibt dank „Gerät merken“ (F2) über Sessions erhalten,
  sodass die Mini-App i. d. R. ohne erneuten Login startet.

#### F4 Test Cases

**TC-SOCIAL-QUICK-F4-01: Manifest & Start-URL**
- **Expected:** Manifest valide; `start_url` = `/posten`; installierbar.

**TC-SOCIAL-QUICK-F4-02: Standalone-Start**
- **Action:** Von installiertem Icon starten.
- **Expected:** `/posten` öffnet im Standalone-Modus direkt im Assistenten
  (bei gültiger Session).

## 5. Data & Contracts

- **Auth:** `POST /api/cms-auth` (Body `{password}`) → `{token}`;
  Schreib-Requests tragen Header `X-CMS-Auth: <token>` (siehe
  [serverseitige-auth/spec.md](serverseitige-auth/spec.md)).
- **Posten:** bestehende Endpunkte `POST /api/social-post` und
  `POST /api/tagespost` (Tagesinfo), `GET /api/social-katalog` (Produkte),
  Wochenplan-API (heutiges Mittagessen) – unverändert.
- **Manifest:** `posten-manifest.json` analog `kiosk-manifest.json`.

## 6. Open Questions

_Keine offenen Punkte – alle Entscheidungen getroffen (siehe „Geklärt“)._

> **Geklärt (2026-07-26):**
> - **Funktionsumfang** = **voller** Social-Bereich (Neuer Post, Katalog,
>   Verlauf). Kein reduziertes „Schnell-Posten“; „schnell“ bezieht sich nur auf
>   den Einstieg/Zugang.
> - **Session-Dauer** = **Gerät dauerhaft merken** (langlebiges
>   `localStorage`-Kennzeichen + gespeichertes Token; „Abmelden“ entfernt es).
> - **Homepage-Einstieg** = **versteckte Geste** (Logo lange drücken). Kein
>   sichtbarer Personal-Button.
> - **Seite** = **eigene schlanke Seite `/posten`** (nicht ins Portal
>   integriert); optional später als Kachel im Portal verlinkbar.
> - **Sicherheitsniveau** = **bestehender gemeinsamer CMS-/Personal-Login**
>   (ein Passwort für alle), kein separater Code.

## 7. Traceability

| Requirement | Test Cases | Umsetzung | Status |
| --- | --- | --- | --- |
| F1 | TC-SOCIAL-QUICK-F1-01..05 | `static-site/posten.html` (Social-Panel + Wizard aus cms.html, `social.js`/`social-poster.js`) | umgesetzt |
| F2 | TC-SOCIAL-QUICK-F2-01..04 | `posten.html` Login-Gate + `dlAdminLogin`; `localStorage['dl_posten_token']` → `sessionStorage['cms_auth_token']`; `noindex` | umgesetzt |
| F3 | TC-SOCIAL-QUICK-F3-01..03 | `static-site/index.html` Logo-Long-Press (`.mob-header-logo`, `#nv-logo`) → `/posten` | umgesetzt |
| F4 | TC-SOCIAL-QUICK-F4-01..02 | `static-site/posten-manifest.json` (`start_url=/posten`); Route in `staticwebapp.config.json` | umgesetzt |

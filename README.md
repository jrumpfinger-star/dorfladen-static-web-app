# Dorfladen Static Web App – Projekt-README

> Dieses Dokument enthält alle wichtigen Infos, die Cascade beim Start jeder Session lesen soll.

---

## Projekt-Übersicht

- **Repo lokal:** `c:\Users\josef.rumpfinger\OneDrive - CGM\Dorfladen Test\dorfladen-static-web-app`
- **GitHub:** `jrumpfinger-star/dorfladen-static-web-app`
- **Produktion:** https://kind-pebble-072605b03.7.azurestaticapps.net
- **Preview (PR):** `https://kind-pebble-072605b03-{PR-Nummer}.7.azurestaticapps.net`
- **CMS:** `/static-site/cms.html` → Passwort: `DorfladenCMS!`
- **Azure Static Web App Name:** `dorfladen-website`

---

## Projektstruktur

```
dorfladen-static-web-app/
├── api/                        # Azure Functions (Python)
│   ├── preisliste/             # GET /api/preisliste
│   ├── roterpunkt/             # GET /api/roterpunkt
│   ├── angebote/               # GET/POST /api/angebote
│   ├── wochenplan/             # GET/POST /api/wochenplan
│   ├── hours/                  # GET/POST /api/hours
│   ├── news/                   # GET/POST /api/news
│   ├── logo/                   # GET/POST/DELETE /api/logo
│   ├── cms-config/             # GET/POST /api/cms-config
│   ├── push-vapid-key/         # GET /api/push-vapid-key
│   ├── push-subscribe/         # POST/DELETE /api/push-subscribe
│   └── push-send/              # POST /api/push-send
├── static-site/
│   ├── index.html              # Homepage
│   ├── cms.html                # CMS (passwortgeschützt)
│   ├── preisliste.html         # Preisliste (öffentlich)
│   ├── version.json            # Auto-Versionierung (Build-Nr)
│   ├── js/
│   │   ├── preisliste-live.js  # Preisliste Frontend-Logik
│   │   ├── roterpunkt-live.js  # Roter Punkt Frontend-Logik
│   │   └── cms.js              # CMS Haupt-JS (~8600 Zeilen)
│   └── handbuch/
│       ├── hilfe.html          # CMS-Hilfe
│       ├── anwenderhandbuch.html
│       └── homepage-anwenderhandbuch.html
└── .github/
    └── workflows/              # GitHub Actions (Build + Preview)
```

---

## Dataverse / Azure

| Einstellung | Wert |
|---|---|
| Tenant ID | `acfaedd4-c403-43b7-9544-fdb2b150124e` |
| Client ID | `137b2df6-be83-459a-ac89-9efd0bdf51c4` |
| Client Secret | In Azure App Settings: `DV_CLIENT_SECRET` (auslesen: `az staticwebapp appsettings list --name dorfladen-website -o json`) |
| Prod Dataverse URL | `https://orgab4e2f00.crm16.dynamics.com` |
| Dev Dataverse URL | `https://org392a4789.crm16.dynamics.com` |
| Haupt-Entity (Artikel) | `cr5d4_table` |
| Config/Content Entity | `dl_seiteninhalt` (EntitySet: `dl_seiteninhalts`) |

### Wichtige Dataverse-Felder (cr5d4_table)

| Feld | Typ | Bedeutung |
|---|---|---|
| `cr5d4_artikelnummeredeka` | string | Artikelnummer |
| `cr5d4_artikelbezeichnung` | string | Bezeichnung |
| `cr5d4_vk_dorf` | decimal | VK-Preis im Dorfladen |
| `cr5d4_uvp_total` | decimal | UVP (Streichpreis) |
| `cr5d4_warengruppebez` | string | Warengruppe |
| `cr5d4_strichcode` | string | EAN/Strichcode |
| `cr5d4_mengentyp` | string | `"g"`, `"kg"` oder leer |
| `cr5d4_mengeneinheit` | decimal | Menge in der Einheit (z.B. 40 für 40g) |
| `cr5d4_gpfaktor` | decimal | Gewinn-Faktor (nur bei kg relevant) |
| `cr5d4_mengenerfassung` | string | `"3"` = Waage-Artikel (Preis gilt für 1kg) |
| `cr5d4_artikelletzterverkauf` | datetime | Letzter Verkauf |

---

## Preisliste / Roter Punkt – VK-Preis & Mengen-Logik

Hilfsfunktion `calc_menge_vk(preis, mengentyp, mengeneinheit, gpfaktor, mengenerfassung)` in beiden APIs:

| Bedingung | VK-Preis | Menge-Anzeige |
|---|---|---|
| `mengentyp=kg` + `mengenerfassung=3` | VK ÷ 10 | `"100 g"` |
| `mengentyp=kg` + `gpfaktor ≠ 1` | VK × gpfaktor | z.B. `"1 kg"` |
| `mengentyp=kg` (sonst) | unverändert | z.B. `"1 kg"` |
| `mengentyp=g` | **unverändert** (Preis aus Dataverse) | z.B. `"40 g"` |
| alles andere | unverändert | leer |

---

## Push Notifications

- **VAPID Keys** in Azure App Settings: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CONTACT`
- Subscriptions gespeichert als `dl_seiteninhalt`-Einträge mit Key-Prefix `push_sub_` + SHA256-Hash
- iOS: PWA-Installation via Safari erforderlich (Zum Home-Bildschirm)
- Android: Chrome zuverlässig; Firefox mit Fallback-Logik

---

## Auto-Versionierung

- `static-site/version.json` – Build-Nummer wird bei jedem Deploy durch GitHub Actions hochgezählt
- Anzeige im Footer (Hauptseite) und CMS-Header

---

## Git-Workflow (WICHTIG)

```bash
# Immer in dieser Reihenfolge:
git add <dateien>
git commit -m "beschreibung"
git pull --rebase origin main   # PFLICHT – verhindert rejected push
git push origin main
```

**Regeln:**
- Direkt auf `main` pushen (kein PR nötig für normale Änderungen)
- Sofort nach Änderung pushen – NICHT erst fragen
- Für Staging/Tests: Branch erstellen → PR öffnen → Preview-URL nutzen

---

## Python

- **Python 3.12** verwenden: `py -3.12` (Python 3.15 default hat Build-Fehler mit msal/cffi)
- Dataverse-Scripts immer mit `py -3.12` ausführen

---

## Bekannte Eigenheiten & Fixes

### cms.js – Artikel-Dropdown schließt Modal
- **Problem:** `position:fixed` Dropdown liegt visuell über Modal-Backdrop → Klick auf Item wurde als Backdrop-Klick interpretiert → Dialog schloss sich.
- **Fix (Zeile ~2681):** Backdrop-Click-Handler prüft jetzt `document.querySelector('.cms-art-dd.open')` und bricht ab wenn Dropdown offen.

### Wochenplan-Warengruppen-Merge
- `"Obst und Gemüse Stück"` und `"Waage Gemüse Obst"` → werden zu `"Obst und Gemüse"` zusammengeführt
- `"Mopro"` → `"Molkereiprodukte"`

### Roter Punkt – Fleisch & Wurst Sonderregel
- Fleisch & Wurst-Artikel erscheinen auch wenn letzter Verkauf älter als 6 Wochen

---

## CMS-Architektur (cms.js – wichtige Bereiche)

`cms.js` ist ~8600 Zeilen groß und enthält alle CMS-Logik. Wichtige Funktionen:

| Funktion | Bedeutung |
|---|---|
| `showAktionModal(aktion)` | Modal für Neue/Bearbeiten Aktion öffnen |
| `addAngRow(item)` | Artikel-Zeile im Aktions-Modal hinzufügen |
| `artSearchFilter(inp)` | Artikel-Autocomplete-Dropdown |
| `cmsCloseModal()` | Modal schließen (`window.cmsCloseModal`) |
| `cmsConfirm(msg, cb)` | Gestylte Confirm-Dialoge (kein nativer `confirm()`) |
| `renumberAngRows()` | Nummerierung der Artikel-Zeilen aktualisieren |
| `loadArtikelData()` | Artikeldaten von `/api/preisliste` laden → `_artikelCache` |
| `cmsSwitchHelpTopic(id)` | Hilfe-Tabs umschalten |
| `cmsHelpSearch(q)` | Hilfe-Volltext-Suche |

### Artikel-Cache (`_artikelCache`)
Jeder Eintrag enthält: `{b: bezeichnung, nr: artikelnummer, sc: strichcode, preis: vk, statt_preis: uvp, menge: mengeString, details: ...}`

---

## Kachel-Editor / Flyer-Editor

- **Kachel-Editor:** Canvas-basiert, `position:fixed` über dem Modal, Touch+Mouse
- **Einzelflyer-Editor:** Eigener Canvas, Drag/Drop, D-Pad, Rotation-Slider
- **MAG-Templates:** Eigene Canvas-Dimensionen – NICHT hardcoded 794×1123!
- **Ghost-Feature:** Halbtransparenter Bildschatten (📦 Ghost AN/AUS)
- **Overlay-Bild:** Siegel/Logo schräg auf Produktbild via Rechtsklick → "Overlay-Bild hochladen"
- **Freistellen:** Weißen Hintergrund entfernen → Design → Gemeinsame Einstellungen → "Bilder freistellen"
- **Unsaved-Watermark:** Roter Banner am unteren Bildrand wenn nicht gespeichert
- **Verwerfen-Button:** Stellt letzten gespeicherten Stand wieder her (warnt bei ungespeicherten Änderungen)
- **Resize-Handle:** Skaliert das selektierte Element (customImg etc.)
- **Rotation/Controls:** Behalten Element-Selektion bei (Ghost, Dup etc.)
- **D-Pad:** Verschiebt selektiertes Element (Kachel + Einzelflyer)
- **Auto-Save wurde ENTFERNT** → Speichern + Download sind zwei getrennte Buttons
- **flyerAutoSave komplett entfernt** (war fehleranfällig)

### Shared Helper-Funktionen (Refactoring Mai 2026)
`_resolveElKeys`, `_getElDxDy/_setElDxDy`, `_getElScale/_setElScale`, `_getElRot/_setElRot`, `_freistellCanvas`, `_zoneToElKey/_selZoneToElKey` – eliminieren if-else-Ketten

---

## Design-System (CMS → Design-Tab)

- **Pro-Section-Einstellungen:** Plakat und Flyer haben getrennte Farben/Settings (nicht geteilt!)
- **Preisschild-Form:** Pro Section wählbar (explosion, rund, eckig, …)
- **Tag-Scale:** Preisschild-Größe 50–150% pro Section
- **Bildgröße (imgScale):** 50–200% für Plakat und Flyer
- **Farbverläufe:** Für `bgColor` und `imgBg` bei Plakat/Flyer
- **Wochenplan-Farben:** Pro Section (Home/Flyer) getrennt gespeichert
- **Live-Vorschau:** Auto-Update bei allen Design-Änderungen, Sticky Sidebar
- **Werkseinstellungen:** Reset-Button → danach "💾 Alles speichern" nötig!
- **`cmsConfirm()`** statt `confirm()` für alle Bestätigungs-Dialoge

---

## Öffnungszeiten-Besonderheiten

- Bayerische Feiertage werden beim Mobile-Öffnungsstatus berücksichtigt
- Format: `HH:MM–HH:MM` mit Semikolon für mehrere Zeiträume: `08:00–12:00;14:00–18:00`
- Ruhetage und Sondertage möglich

---

## UI / Modal-System

- Alle Modals haben X-Button + Backdrop-Click zum Schließen
- **Ausnahme:** Kachel-Editor (hat eigene Speichern/Verwerfen-Semantik → kein Backdrop-Close)
- **History-Guard:** Mobile Back-Button schließt offene Modals (pushState)
- **Bottom-Sheets:** Mobile-optimierte Darstellung für bestimmte Panels
- **`#cms-modal-wrap`:** Einziger Modal-Container für alle CMS-Modals
- Backdrop-Click-Handler prüft ob Dropdown offen (`'.cms-art-dd.open'`) bevor Modal geschlossen wird

---

## WhatsApp / Teilen

- Teilen-Button bei Aktionen erzeugt Text automatisch aus Titel + Gültigkeitszeitraum
- WhatsApp-API: `https://wa.me/?text=...` (URL-encodiert)
- Wochenplan kann ebenfalls per WhatsApp geteilt werden

---

## Handbücher / Dokumentation (static-site/handbuch/)

| Datei | Inhalt |
|---|---|
| `anwenderhandbuch.html` | CMS-Handbuch für Betreiber |
| `homepage-anwenderhandbuch.html` | Besucher-Handbuch (öffentlich) |
| `hilfe.html` | Online-Hilfe mit Suche, Themen-Tabs, 22 Problemlöser, 8 FAQ |

- PDFs werden mit Playwright generiert (`emulateMedia: print`)
- Keine leeren Seiten nach h2 (CSS `page-break` Fix)
- CMS-Handbuch-Links aus `hilfe.html` entfernt (nicht für Endanwender)
- Hilfe-Link in Navigation + Footer aller Seiten vorhanden

---

## CMS-Hilfe (cms.html)

- **Problemlöser-Abschnitt:** 22 Einträge (Stand Mai 2026)
- **FAQ-Abschnitt:** 8 Einträge
- Suchindex in `HELP_IDX`-Array (ca. Zeile 2880)
- Themen-Tabs: `wp-help`, `hours-help`, `ang-help`, `news-help`, `hp-help`, `editor-help`, `design-help`, `push-help`, `sort-help`, `gallery-help`, `howto-help`, `faq-help`

---

## Staging Setup

- Branch erstellen → PR öffnen → GitHub Actions setzt `DV_DEFAULT_URL` auf Dev-Dataverse automatisch
- Service Principal: `dorfladen-github-actions` (clientId: `ae7331c0-4d6f-4bfa-911c-ce96d129b813`)
- Doku: `.github/STAGING-SETUP.md`

---

## Microsoft 365 / Login

| | |
|---|---|
| M365 Login | `info@dorfladen.oberornau.onmicrosoft.com` |
| M365 Passwort | `Unser Dorfladen ist schoen.` |
| CMS Passwort | `DorfladenCMS!` |

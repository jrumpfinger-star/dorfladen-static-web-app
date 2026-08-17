# News & Aktuelles – Spec

> **Feature-ID**: NEWS
> **Status**: Bestand (retrospektiv dokumentiert)
> **Erstellt**: 2026-07-07

---

## 1. Überblick

Redaktionelle Neuigkeiten des Dorfladens. Im CMS werden Artikel angelegt,
bearbeitet und gelöscht; die öffentliche Seite `aktuelles.html` zeigt die
veröffentlichten Artikel als Karten-Grid. Optional erscheint ein Artikel als
Laufband auf der Startseite. Beim Anlegen eines neuen Artikels wird eine
Push-Benachrichtigung ausgelöst (Kategorie `news`).

Speicherung in Dataverse-Tabelle `dl_news`. Alle drei APIs sind Azure-Functions
(Python, `anonymous`).

**Betroffene Dateien:**
- API: `api/news/` (lesen), `api/news-save/` (anlegen/ändern), `api/news-delete/` (löschen)
- Frontend: `static-site/aktuelles.html`, `static-site/cms.js`

## 2. Non-Goals

- Keine Kommentar-/Interaktionsfunktion.
- Kein WYSIWYG-Versionsverlauf.

## 3. Datenmodell (`dl_news`)

| Feld | Bedeutung |
| --- | --- |
| `dl_newsid` | Primärschlüssel |
| `dl_titel` | Überschrift |
| `dl_kurztext` | Teaser |
| `dl_inhalt` | Volltext (HTML) |
| `dl_datum` | Veröffentlichungsdatum |
| `dl_status` | `101001` = veröffentlicht, sonst Entwurf |
| `dl_laufband` | Bool – als Laufband auf Startseite zeigen |
| `dl_laufband_bis`, `dl_aktiv_bis` | Ablaufdaten (optional) |

## 4. Requirements

### F1: News lesen (`GET /api/news`)

#### F1 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `all` | Nein | `true/1/yes` ⇒ inkl. Entwürfe (für CMS) |

#### F1 Behaviour / Acceptance

- Ohne `all` nur veröffentlichte Artikel (`dl_status eq 101001` oder `null`), sortiert nach `dl_datum` absteigend.
- Mit `all` alle Artikel.

#### F1 Test Cases

**TC-NEWS-F1-01: Öffentliche Liste**
- **Action:** `GET /api/news`.
- **Expected:** Nur veröffentlichte Artikel, neueste zuerst.

**TC-NEWS-F1-02: CMS-Liste**
- **Action:** `GET /api/news?all=true`.
- **Expected:** Enthält auch Entwürfe.

### F2: News anlegen/ändern (`POST /api/news-save`)

#### F2 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `titel` | Ja | Überschrift |
| `kurztext`, `inhalt` | Nein | Teaser / Volltext |
| `status` | Nein | Default `101001` |
| `dl_laufband`, `dl_laufband_bis`, `dl_aktiv_bis` | Nein | Laufband-Optionen |
| `id` | Nein | Vorhanden ⇒ Update, sonst Neuanlage |

#### F2 Behaviour / Acceptance

- Ohne `id` → Neuanlage, Antwort `{success:true, action:"created", id}`; löst Push (`/api/push-send`, Kategorie `news`) mit Ziel `/aktuelles` aus (fire-and-forget).
- Mit `id` → Update, `action:"updated"`, **kein** Push.
- Fehlender `titel` → `400`.

#### F2 Test Cases

**TC-NEWS-F2-01: Neuanlage mit Push**
- **Expected:** `created`; neuer Datensatz; Push ausgelöst.

**TC-NEWS-F2-02: Update ohne Push**
- **Setup:** `id` vorhanden.
- **Expected:** `updated`; kein Push.

**TC-NEWS-F2-03: Titel fehlt**
- **Expected:** `400`, kein Datensatz.

### F3: News löschen (`DELETE /api/news-delete`)

#### F3 Inputs

| Input | Required | Beschreibung |
| --- | --- | --- |
| `id` | Ja | Datensatz-GUID (Query) |

#### F3 Behaviour / Acceptance

- Gültige `id` → Datensatz gelöscht, `{success:true, action:"deleted", id}`.
- Fehlende `id` → `400`.

#### F3 Test Cases

**TC-NEWS-F3-01: Löschen**
- **Expected:** `200 deleted`; Artikel nicht mehr in `/api/news`.

### F4: Öffentliche Anzeige (`aktuelles.html`)

#### F4 Behaviour / Acceptance

- Lädt `/api/news`, rendert Karten mit Datum-Badge, Teaser, „Weiterlesen"-Umschalter, Teilen-Button und Lightbox.
- Leerer Zustand, wenn keine Artikel vorhanden.

#### F4 Test Cases

**TC-NEWS-F4-01: Grid rendert**
- **Setup:** Mind. 1 veröffentlichter Artikel.
- **Expected:** Karte mit Titel und Datum sichtbar.

## 5. Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-NEWS-F1-01..02 | — | — |
| F2 | TC-NEWS-F2-01..03 | — | — |
| F3 | TC-NEWS-F3-01 | — | — |
| F4 | TC-NEWS-F4-01 | — | — |

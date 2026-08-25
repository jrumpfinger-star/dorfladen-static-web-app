# Kundenkontakt-Messaging (WhatsApp-artig) — Specification

> Spec-driven development. Entwurf zum gemeinsamen Verfeinern. Offene Punkte sind
> mit `[NEEDS CLARIFICATION: …]` markiert — solange diese offen sind, geht die
> Spec NICHT in `/sdd-plan`.

**Status:** Draft (zur Abstimmung)

**Owner:** Josef Rumpfinger / Dorfladen Oberornau

**Last updated:** 2026-08-25

## Overview

Neues, eigenständiges Feature: Kundinnen und Kunden können **von der Homepage aus
direkt mit dem Dorfladen chatten** (WhatsApp-artig), ohne Bestellung und ohne
Login. Die Nachrichten laufen im **Kiosk** in einem **eigenen Tab „Kontakt"** auf,
der **über die CMS-Einstellungen freigeschaltet** wird. Antworten der Verkäuferin
werden dem Kunden per **Push** und optional per **No-Reply-E-Mail** zugestellt.

Technisch baut das Feature auf vorhandenen, bewährten Mustern auf:
- Chatverlauf als JSON (`dl_chatverlauf`) wie bei den Mittagessen-Bestellungen.
- Identität ohne Login über **`device_id`** (localStorage) + optionale **E-Mail**.
- **Push-Kategorien** (`tagesinfo`, `news`, `bestellung` → neu `kontakt`).
- **No-Reply-E-Mail** über den bestehenden `send_email(reply_to=…)`-Pfad.
- **Feature-Flag** `kiosk_kontakt` in `feature_flags` (CMS → `/api/cms-config`),
  Kiosk blendet den Tab nur bei aktivem Flag ein (`applyKioskFeatures`).

**Zielplattform:** Azure Static Web App (statisches Frontend `static-site/`) +
Azure Functions (Python, `api/`) + Dataverse. Entwicklung zuerst auf der
**Testumgebung** (Branch `dev` → `azure-static-web-apps-test.yml`).

## Goals

- Besucher der Homepage können ohne Login eine Nachricht an den Dorfladen senden
  und Antworten empfangen (Chat-Verlauf sichtbar, neueste unten wie WhatsApp).
- Verkäuferin sieht neue Anfragen im Kiosk in einem eigenen Tab „Kontakt" mit
  Ungelesen-Badge, kann pro Konversation antworten, als gelesen/erledigt markieren.
- Der Tab ist über die CMS-Einstellungen ein-/ausschaltbar (`kiosk_kontakt`).
- Antworten erreichen den Kunden per Push (Kategorie `kontakt`) und optional per
  No-Reply-E-Mail.
- Vollständige Entwicklung/Erprobung auf der Testumgebung vor Produktiv-Rollout.

## Entschiedene Punkte (aus Abstimmung)

- **Thread-Modell:** EIN fortlaufender Thread pro Gerät (WhatsApp-Stil). Alle
  Nachrichten (Kunde + Dorfladen) liegen in einem Verlauf.
- **Bildaustausch:** In Scope (v1). Kunde und Dorfladen können Fotos senden.
- **Homepage-Einstiege ersetzen:** Die bestehenden 1:1-„Frage"-WhatsApp-Einstiege
  werden durch diesen Kanal ersetzt (siehe F6).

## Non-Goals

- Kein Login/Accounts, keine Echtzeit-WebSockets (Polling wie im übrigen Kiosk).
- Kein mehrsprachiger Support, keine Telefon-/SMS-Anbindung.
- Ersetzt NICHT die bestellbezogene Kommunikation (bleibt am Bestellstatus).
- Ersetzt NICHT die WhatsApp-**Gruppe** (Community-Broadcast) — das ist ein
  anderer Zweck. [NEEDS CLARIFICATION: WhatsApp-Gruppe bleibt bestehen?]
- Keine Videos/Sprachnachrichten/Dokumente in v1 (nur Text + Bilder).

## Requirements

### F1: Homepage-Kontakt (Kunde startet/führt Chat)

#### F1 Description

Auf der Startseite gibt es einen Einstieg „💬 Nachricht an den Dorfladen". Ein Klick
öffnet ein Chat-Fenster (Overlay/Popup, Muster wie Bestellstatus-Chat). Der Kunde
kann eine Nachricht schreiben; optional Name und E-Mail angeben. Der Verlauf bleibt
pro Gerät erhalten (über `device_id`), sodass frühere Nachrichten und Antworten
sichtbar sind. Neueste Nachricht unten, scrollbar.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `text` | Ja* | Nachrichtentext (max. 1000 Zeichen). *Pflicht außer wenn Bild gesendet |
| `bild` | Nein | Optionales Foto (JPEG/PNG/WebP), clientseitig komprimiert |
| `name` | Nein | Anzeigename für den Kiosk |
| `email` | Nein | Nur nötig für E-Mail-Antwort; sonst Push/Statusabruf |
| `device_id` | Ja (autom.) | Stabile Geräte-ID aus localStorage |
| `notify_email` | Nein | E-Mail-Antworten gewünscht (Default aus) |
| `notify_push` | Nein | Push-Antworten gewünscht (Opt-in) |

#### F1 Behaviour / Acceptance

- Given ein Besucher ohne vorherige Nachricht, When er „Nachricht senden" klickt,
  Then wird eine neue Konversation angelegt (Status „neu") und im Kiosk sichtbar.
- Given ein Besucher mit bestehender Konversation (gleiches Gerät), When er den
  Chat öffnet, Then sieht er den vollständigen bisherigen Verlauf inkl. Antworten.
- Given der Kunde hat `notify_push` aktiviert, When die Verkäuferin antwortet, Then
  erhält er eine Push-Benachrichtigung (Kategorie `kontakt`).
- Der Chat verankert die neueste Nachricht unten und scrollt automatisch ans Ende.

#### F1 Test Cases

**TC-F1-01: Neue Anfrage anlegen**
- **Setup:** Homepage frisch geladen, kein bestehender Thread.
- **Action:** „Nachricht an den Dorfladen" öffnen, Text „Habt ihr morgen Brot?"
  senden.
- **Expected:** Erfolgsmeldung, Nachricht erscheint im Chat rechts; im Kiosk-Tab
  „Kontakt" taucht die Konversation als „neu/ungelesen" auf.

**TC-F1-02: Verlauf bleibt pro Gerät erhalten**
- **Setup:** Kunde hat zuvor eine Nachricht gesendet und Antwort erhalten.
- **Action:** Chat erneut öffnen (gleiches Gerät/Browser).
- **Expected:** Voller Verlauf (Kunde + Dorfladen) wird chronologisch angezeigt,
  neueste unten.

**TC-F1-03: E-Mail nur Pflicht bei E-Mail-Wunsch**
- **Setup:** Kein E-Mail-Feld ausgefüllt, `notify_email` aus.
- **Expected:** Senden funktioniert; keine E-Mail-Pflichtmeldung.

### F2: Kiosk-Tab „Kontakt" (Verkäuferin)

#### F2 Description

Neuer Kiosk-Tab „Kontakt" (Icon z. B. `message-square`). Zeigt eine Liste der
Konversationen (neueste/ungelesene oben) mit Name, letzter Nachricht, Zeit und
Ungelesen-Markierung. Auswahl öffnet den Chat-Verlauf mit Antwort-Eingabe (wie in
der Kiosk-Bestellkarte). Aktionen: **Antworten**, **Als gelesen markieren**,
**Erledigt** (Status). Tab-Badge zeigt Anzahl ungelesener Konversationen; neuer
Eingang löst den bestehenden Kiosk-Ton/Hinweis aus.

#### F2 Behaviour / Acceptance

- Given eine neue Kundennachricht, When der Kiosk pollt, Then erhöht sich der
  Badge am „Kontakt"-Tab und (optional) ertönt der Neu-Hinweis.
- Given die Verkäuferin öffnet eine Konversation, Then gilt sie als gelesen
  (`kommentar_gelesen=true`), Badge sinkt entsprechend.
- Given die Verkäuferin sendet eine Antwort, Then wird sie an den Verlauf
  angehängt und dem Kunden per Push/E-Mail (je nach Opt-in) zugestellt.
- Filter: „Neu", „Alle", „Erledigt". [NEEDS CLARIFICATION: genaue Filter/Status?]

#### F2 Test Cases

**TC-F2-01: Ungelesen-Badge**
- **Setup:** Eine ungelesene Kundennachricht existiert.
- **Expected:** „Kontakt"-Tab zeigt Badge „1"; nach Öffnen der Konversation Badge
  verschwindet.

**TC-F2-02: Antwort zustellen**
- **Setup:** Konversation mit `notify_push` aktiv.
- **Action:** Verkäuferin antwortet „Ja, ab 7 Uhr".
- **Expected:** Antwort im Verlauf; Kunde erhält Push (Kategorie `kontakt`); bei
  `notify_email` zusätzlich No-Reply-E-Mail mit Link zum Chat.

### F3: Freischaltung über CMS-Einstellungen

#### F3 Description

Der Tab ist standardmäßig **aus**. In den CMS-Einstellungen (Feature-Flags) gibt es
einen Schalter „Kiosk-Tab: Kontakt" (`feat-k-kontakt` → `feature_flags.kiosk_kontakt`).
Der Kiosk blendet den Tab nur bei `kiosk_kontakt===true` ein (analog `applyKioskFeatures`).
Der Homepage-Einstieg wird [NEEDS CLARIFICATION: nur bei aktivem Flag angezeigt,
oder unabhängig immer sichtbar?].

#### F3 Test Cases

**TC-F3-01: Tab aus/ein**
- **Setup:** `kiosk_kontakt=false`.
- **Expected:** Kein „Kontakt"-Tab im Kiosk. Nach Aktivierung im CMS und Reload
  erscheint der Tab.

### F4: Benachrichtigungen & Ungelesen-Logik

#### F4 Description

- Store→Kunde: Push (Kategorie `kontakt`) + optional No-Reply-E-Mail (Link zum
  Chat), analog `_send_reply_email` bei Bestellungen.
- Kunde→Store: Kiosk-Badge + bestehender Neu-Ton. [NEEDS CLARIFICATION: zusätzlich
  Push an Personal-Geräte? Wenn ja, eigene Personal-Subscription/Kategorie `staff`.]
- Ungelesen serverseitig (`kommentar_gelesen`) für den Kiosk; kundenseitig via
  localStorage-Marker (letzte gesehene Antwort), wie bei Bestellungen.

#### F4 Test Cases

**TC-F4-01: No-Reply-E-Mail**
- **Setup:** Kunde mit E-Mail + `notify_email`.
- **Action:** Verkäuferin antwortet.
- **Expected:** E-Mail von Absender Dorfladen, `Reply-To: no-reply@…`, Hinweis
  „bitte nicht direkt antworten" + Button „Zum Chat".

### F5: Missbrauchs-/Spam-Schutz (ohne Login)

#### F5 Description

Da ohne Login: einfache Schutzmaßnahmen — Zeichenlimit, Rate-Limit pro
`device_id`/IP, Honeypot-Feld, ggf. simple Wortfilter. [NEEDS CLARIFICATION:
gewünschtes Maß? Captcha unerwünscht?]

#### F5 Test Cases

**TC-F5-01: Rate-Limit**
- **Setup:** Mehr als N Nachrichten in kurzer Zeit vom selben Gerät.
- **Expected:** Weitere Sends werden freundlich gebremst (HTTP 429 / Hinweis).

### F6: Homepage-Einstiege ersetzen

#### F6 Description

Die bestehenden 1:1-„Frage"-WhatsApp-Einstiege auf der Startseite werden durch den
neuen Kanal ersetzt:
- **Schwebender Button** unten rechts (`hp-wa-float`) → öffnet den Dorfladen-Chat
  statt `wa.me`.
- **Footer-WhatsApp-Icon** (aria-label „WhatsApp") → Chat-Öffner.
- **Kontakt-/„Frage"-Button** (grüner WhatsApp-Button in der Kontaktbox) → Chat.

Die WhatsApp-**Gruppe** (Community-Beitritt per QR/Link) bleibt unberührt (anderer
Zweck). Optik: eigenes Chat-Icon/Branding „Dorfladen-Chat" statt WhatsApp-Grün.

#### F6 Test Cases

**TC-F6-01: Float-Button öffnet Chat**
- **Action:** Auf den schwebenden Button klicken.
- **Expected:** Der Dorfladen-Chat öffnet sich (kein Sprung zu wa.me).

**TC-F6-02: Gruppe bleibt**
- **Expected:** Der WhatsApp-Gruppen-Beitritt (QR/Link) ist weiterhin vorhanden.

### F7: Bildaustausch (WhatsApp-artig)

#### F7 Description

Kunde und Verkäuferin können **Fotos** senden (z. B. „welches Brot meint ihr?",
Verkäuferin schickt Foto vom Regal). Bilder werden clientseitig verkleinert
(max. ~1600px, JPEG) vor dem Upload, serverseitig im SharePoint-Ordner gespeichert
und über einen Bild-Proxy (verkleinert, wie `/api/tagesbild`) ausgeliefert. Im
Chat erscheinen Thumbnails; Klick öffnet die Vollansicht (bestehende
`dlImagePopup`-Lightbox).

#### F7 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `bild` | Ja | Bilddatei; Upload liefert Dateiname/Referenz |

#### F7 Behaviour / Acceptance

- Bild-Nachricht wird als Verlaufseintrag `{who, typ:'bild', datei, text?}` gespeichert.
- Thumbnails laden schnell; Vollbild per Klick (Lightbox), auch aus dem Kiosk.
- Max. Dateigröße/Formate werden geprüft; unsichere Typen abgelehnt.

#### F7 Test Cases

**TC-F7-01: Kunde sendet Foto**
- **Action:** Kunde hängt ein Foto an und sendet.
- **Expected:** Thumbnail im Chat; im Kiosk sichtbar; Klick öffnet Vollbild.

**TC-F7-02: Verkäuferin sendet Foto**
- **Expected:** Kunde erhält Push „📷 Foto vom Dorfladen"; Bild im Verlauf.

### F8: Schnellantworten für die Verkäuferin (eigene Idee)

#### F8 Description

Im Kiosk gibt es **Vorlagen/Schnellantworten** (z. B. „Ja, vorrätig ✅", „Wir melden
uns gleich", „Leider ausverkauft") als Ein-Klick-Buttons über dem Antwortfeld.
Vorlagen sind im CMS pflegbar. [NEEDS CLARIFICATION: feste Startvorlagen ok?]

#### F8 Test Cases

**TC-F8-01: Vorlage einfügen**
- **Action:** Verkäuferin tippt auf „Ja, vorrätig ✅".
- **Expected:** Text landet im Eingabefeld (editierbar) oder wird direkt gesendet.

### F9: Öffnungszeiten-Hinweis / Auto-Antwort (eigene Idee)

#### F9 Description

Außerhalb der Öffnungszeiten zeigt der Chat einen Hinweis „Wir sind gerade
geschlossen und antworten während der Öffnungszeiten." Optional automatische
erste Antwort im Verlauf. Öffnungszeiten kommen aus der bestehenden CMS-Config.

#### F9 Test Cases

**TC-F9-01: Hinweis außerhalb der Zeiten**
- **Setup:** Aktuelle Zeit außerhalb Öffnungszeiten.
- **Expected:** Hinweis sichtbar; Senden bleibt möglich.

## Data & Contracts

### Neue Dataverse-Tabelle `dl_kontaktnachricht` (eine Zeile = eine Konversation)

| Feld | Typ | Zweck |
| --- | --- | --- |
| `dl_name` | Text | Anzeigename (optional) |
| `dl_email` | Text | Optional, für E-Mail-Antwort/Statusabruf |
| `dl_device_id` | Text | Geräte-ID (Schlüssel ohne Login) |
| `dl_betreff` | Text | Optionaler Betreff/Topic |
| `dl_chatverlauf` | Memo | JSON-Array `[{t,who,typ,text?,datei?}]` — `who`: `kunde`/`dorfladen`; `typ`: `text`/`bild` |
| `dl_status` | Option | 0=neu, 1=beantwortet, 2=erledigt |
| `dl_kommentar_gelesen` | Boolean | Kiosk-Ungelesen-Flag |
| `dl_notify_email` | Boolean | Kunde wünscht E-Mail-Antworten |
| `createdon`/`modifiedon` | System | Sortierung/Anzeige |

[NEEDS CLARIFICATION: Eine Konversation pro Gerät (fortlaufender Thread) ODER pro
Anfrage/Betreff eine neue? → ENTSCHIEDEN: fortlaufender Thread pro Gerät.]

### Bild-Speicherung & Upload

- **Upload-Endpoint** `api/contact-upload` (POST, multipart oder base64):
  speichert das (bereits clientseitig verkleinerte) Bild in einem SharePoint-Ordner
  (z. B. `KontaktBilder`), liefert einen Dateinamen zurück.
- Verlaufseintrag referenziert nur den Dateinamen (`typ:'bild', datei:'…'`), kein
  base64 im Verlauf (Payload klein).
- **Anzeige** über Bild-Proxy `api/kontaktbild?datei=…` (verkleinert wie
  `api/tagesbild`, Fallback/Cache), Vollbild via `dlImagePopup`.
- Validierung: nur Bildformate, Größenlimit, Dateiname-Sanitizing (kein Traversal).

### API `api/contact-message` (neu)

- `POST` (Kunde): `{device_id, email?, name?, text?, bild_datei?, notify_email?}` →
  Thread anlegen/anhängen; Status „neu".
- `GET ?mode=my&device_id=…` (Kunde): eigenen Thread + Verlauf lesen.
- `GET ?mode=list` (Kiosk): Konversationen (Filter neu/alle/erledigt), Ungelesen-Zahl.
- `GET ?mode=unread` (Kiosk): nur Ungelesen-Zähler (Badge).
- `PATCH /{id}` (Kiosk): `{personal_antwort?, bild_datei?, kommentar_gelesen?, status?}`
  → Antwort/Bild anhängen, Push/E-Mail auslösen.

### Push

- Neue Kategorie `kontakt` in `ALL_CATEGORIES`; Opt-in im Chat; Zustellung per
  E-Mail **oder** `device_id` (wie bei Bestellungen).

### Feature-Flag

- `feature_flags.kiosk_kontakt` (Bool). CMS-Checkbox `feat-k-kontakt`; Kiosk-Map
  `applyKioskFeatures`: `{kontakt:'kiosk_kontakt'}`.

## Umgebung / Rollout

- **Entwicklung auf Testumgebung:** Branch `dev` → Workflow
  `azure-static-web-apps-test.yml` (Secret `AZURE_STATIC_WEB_APPS_API_TOKEN_TEST`).
- Dataverse-Felder/Tabelle werden per Metadata-API angelegt (wie zuvor
  `dl_chatverlauf`, `dl_device_id`). [NEEDS CLARIFICATION: nutzt die TEST-SWA eine
  **eigene** Dataverse-Umgebung/Tabellen oder dieselbe wie Prod? Falls dieselbe:
  neue Tabelle ist unkritisch, da additiv.]
- Nach Freigabe: Merge `dev` → `main` (Produktiv), Feature-Flag zunächst aus.

## WhatsApp-Feature-Parität & eigene Ideen

**An WhatsApp orientiert (v1):**
- Text- und **Bildnachrichten**, Thumbnails im Chat, Tap = Vollbild.
- Neueste Nachricht unten, Auto-Scroll, Ungelesen-Trenner, Zeitstempel/Tagestrenner.
- **Gelesen-Status:** Kunde sieht „gelesen", sobald die Verkäuferin die Konversation
  geöffnet hat; Verkäuferin sieht Ungelesen-Badge.
- Push-Benachrichtigung mit Nachrichtvorschau; Emoji (nativ).
- „Business-Header" mit Ladenname, Logo/Avatar, Hinweis „antwortet meist während
  der Öffnungszeiten".

**Eigene Ideen (Mehrwert):**
- **Schnellantworten/Vorlagen** für die Verkäuferin (F8), im CMS pflegbar.
- **Öffnungszeiten-Autohinweis/Auto-Antwort** außerhalb der Zeiten (F9).
- **Kontext-Start:** Chat vorbefüllt aus TagesInfo/Angebot („Frage zu diesem
  Gericht/Artikel") — ein Klick startet mit passendem Betreff.
- **Interne Notiz** an einer Konversation (nur Kiosk sichtbar, nicht an Kunde).
- **Name merken** (Gerät → Name) für Wiedererkennung im Kiosk.
- **Suche/Filter** über Konversationen im Kiosk.
- **Blockieren/Spam** einer Konversation (gegen Missbrauch ohne Login).
- **Clientseitige Bildkompression** vor Upload (schnell + datensparsam).
- [NEEDS CLARIFICATION: welche dieser Ideen in v1, welche später?]

## Open Questions

- [NEEDS CLARIFICATION: Homepage-Einstieg immer sichtbar oder nur bei aktivem
  `kiosk_kontakt`-Flag?]
- [NEEDS CLARIFICATION: WhatsApp-**Gruppe** (Community) bleibt bestehen?]
- [NEEDS CLARIFICATION: Sollen Personal-Geräte bei neuer Anfrage aktiv gepusht
  werden (Kategorie `staff`), oder reicht Kiosk-Badge/Ton?]
- [NEEDS CLARIFICATION: Spam-Schutz-Umfang (Rate-Limit-Grenzen, Honeypot, Captcha
  ja/nein)?]
- [NEEDS CLARIFICATION: Nutzt die Testumgebung eine separate Dataverse-Instanz?]
- [NEEDS CLARIFICATION: Datenaufbewahrung/Archivierung erledigter Threads?]
- [NEEDS CLARIFICATION: Welche „eigenen Ideen" in v1, welche später?]

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 Homepage-Kontakt | TC-F1-01..03 | — | — |
| F2 Kiosk-Tab | TC-F2-01..02 | — | — |
| F3 CMS-Freischaltung | TC-F3-01 | — | — |
| F4 Benachrichtigungen | TC-F4-01 | — | — |
| F5 Spam-Schutz | TC-F5-01 | — | — |
| F6 Homepage-Einstiege ersetzen | TC-F6-01..02 | — | — |
| F7 Bildaustausch | TC-F7-01..02 | — | — |
| F8 Schnellantworten | TC-F8-01 | — | — |
| F9 Öffnungszeiten-Hinweis | TC-F9-01 | — | — |

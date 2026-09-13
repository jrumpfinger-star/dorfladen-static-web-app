# App-Anleitung unter /app — Specification

**Status:** Angenommen

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-09-13

## Overview

Kunden schaffen es nicht, die Homepage als App auf ihr Handy zu legen. Es gibt
zwar ein Installationsbanner (`static-site/js/pwa.js`), doch wenn der Browser
keinen Installationsdialog anbietet — auf dem iPhone **immer** —, erscheint
nur ein nackter `alert()` mit einem einzigen Satz. Wer nicht weiß, wie das
Teilen-Symbol aussieht, kommt nicht weiter.

Dazu kommt: Benachrichtigungen werden angeboten, aber nirgends erklärt.
Niemand weiß, was er bekommt, wie oft, und ob die ganze Welt mitliest.

Diese Spec beschreibt eine eigene Seite unter **`/app`**, die das Gerät
erkennt, den passenden Weg zeigt, den Ist-Zustand meldet, wo möglich selbst
handelt und die vier Benachrichtigungsarten in Alltagssprache erklärt.

Technik: statisches HTML im Stil der übrigen Inhaltsseiten, eigenes
JavaScript ohne Fremdbibliotheken, nachgezeichnete Abbildungen als SVG.

## Goals

- Ein Kunde kann die App ohne fremde Hilfe auf seinem Gerät einrichten.
- Die Seite zeigt von sich aus den Weg, der zu seinem Gerät passt.
- Wer die App schon hat, erkennt das sofort und sucht nichts.
- Jeder versteht vor dem Einschalten, welche Benachrichtigungen er bekommt,
  wie oft und wer sie sonst noch sieht.
- Die Adresse ist kurz genug, um sie am Telefon zu nennen, und lässt sich als
  Aushang im Laden verwenden.

## Non-Goals

- Keine Änderung an der Push-Infrastruktur (VAPID, Versand, Dataverse).
- Keine neue Benachrichtigungsart.
- Keine Übersetzung in andere Sprachen.
- Keine Anleitung für Browser außerhalb der in F2 genannten Wege.

## Requirements

### F1: Die Seite ist unter /app erreichbar

#### F1 Description

Eine eigene Inhaltsseite, erreichbar unter der kurzen Adresse `/app`, im
Erscheinungsbild der übrigen Inhaltsseiten (Kopfzeile, Menü, Kontaktleiste).

#### F1 Behaviour / Acceptance

- `GET /app` liefert die Seite (Rewrite auf `/app.html`).
- Die Seite trägt Kopfzeile, Mobil-Menü und Kontaktleiste wie
  `oeffnungszeiten.html`.
- Der Service Worker liefert sie aus, ohne eine veraltete Fassung zu
  bevorzugen.

#### F1 Test Cases

**TC-F1-01: Adresse erreichbar**

- **Action:** `/app` aufrufen.
- **Expected:** Statuscode 200, Titel enthält „App"; die Seite trägt das
  gemeinsame Seitengerüst.

### F2: Acht Wege, vollständig im HTML

#### F2 Description

Die Anleitung deckt acht Gerät-Browser-Kombinationen ab. Alle stehen
vollständig im ausgelieferten HTML, damit die Seite auch ohne JavaScript
lesbar bleibt und Suchmaschinen sie erfassen.

#### F2 Inputs

| Weg | Gerät | Browser | Installation | Benachrichtigungen |
| --- | --- | --- | --- | --- |
| `ios-safari` | iPhone/iPad | Safari | Teilen → „Zum Home-Bildschirm" | erst nach Installation, ab iOS 16.4 |
| `ios-andere` | iPhone/iPad | Chrome, Edge, Firefox | unzuverlässig → Weg über Safari | nur über den Safari-Weg |
| `android-chrome` | Android | Chrome, Edge | Dialog oder Menü → „App installieren" | jederzeit |
| `android-samsung` | Android | Samsung Internet | „+" in der Adresszeile bzw. Menü | jederzeit |
| `android-firefox` | Android | Firefox | nur Verknüpfung, keine echte App | im Browser möglich |
| `win-chrome` | Windows/Linux | Chrome, Edge | Symbol rechts in der Adresszeile | jederzeit |
| `mac-safari` | Mac | Safari | Ablage → „Zum Dock hinzufügen" | ab macOS Ventura |
| `mac-chrome` | Mac | Chrome, Edge | Symbol rechts in der Adresszeile | jederzeit |

#### F2 Behaviour / Acceptance

- Jeder Weg trägt eine eigene Kennung (`data-weg`) und ist einzeln
  adressierbar (`/app#android-chrome`).
- Jeder Weg enthält nummerierte Schritte mit je einer Abbildung.
- **`ios-andere` und `android-firefox` zeigen keine Installationsschritte**,
  sondern einen Hinweis auf den funktionierenden Weg. Es wäre unredlich,
  Schritte zu zeigen, die ins Leere laufen.

#### F2 Test Cases

**TC-F2-01: Alle acht Wege vorhanden**

- **Expected:** Genau acht Abschnitte mit `data-weg`; die Kennungen stimmen
  mit der Tabelle überein.

**TC-F2-02: Ohne JavaScript bleibt alles lesbar**

- **Setup:** Seite mit abgeschaltetem JavaScript laden.
- **Expected:** Alle acht Wege sind sichtbar, kein Abschnitt ist verborgen.

**TC-F2-03: Die beiden Sackgassen führen weiter**

- **Expected:** `ios-andere` und `android-firefox` tragen einen Hinweiskasten
  und **keine** nummerierte Schrittliste zur Installation.

### F3: Das Gerät wird erkannt und vorgewählt

#### F3 Description

Beim Laden erkennt die Seite Gerät und Browser und zeigt nur den passenden
Weg. Die übrigen bleiben über die Geräte- und Browserwahl erreichbar.

#### F3 Behaviour / Acceptance

- Erkennung aus `navigator.userAgent` und `navigator.userAgentData`.
- iPadOS meldet sich als Mac: Ein Mac **mit** Tastfeldunterstützung
  (`navigator.maxTouchPoints > 1`) gilt als iPad.
- Ist die Erkennung nicht eindeutig, wird `android-chrome` gezeigt — der
  häufigste Fall — und die Wahl bleibt offen sichtbar.
- Ein Weg in der Adresse (`#weg`) hat Vorrang vor der Erkennung.
- Die Wahl des Nutzers wird in die Adresse geschrieben, damit ein Weg
  weitergegeben werden kann.

#### F3 Test Cases

**TC-F3-01: iPhone wählt Safari vor**

- **Setup:** Browserkennung eines iPhone mit Safari.
- **Expected:** Sichtbar ist genau `ios-safari`.

**TC-F3-02: iPad wird nicht für einen Mac gehalten**

- **Setup:** Mac-Kennung mit `maxTouchPoints = 5`.
- **Expected:** Sichtbar ist `ios-safari`, nicht `mac-safari`.

**TC-F3-03: Chrome auf dem iPhone landet im Hinweis**

- **Setup:** iPhone-Kennung mit `CriOS`.
- **Expected:** Sichtbar ist `ios-andere`.

**TC-F3-04: Adresse schlägt Erkennung**

- **Setup:** iPhone-Kennung, Aufruf von `/app#mac-safari`.
- **Expected:** Sichtbar ist `mac-safari`.

**TC-F3-05: Umschalten zeigt genau einen Weg**

- **Action:** Auf „Android" und dort „Samsung Internet" tippen.
- **Expected:** Sichtbar ist genau ein Weg, nämlich `android-samsung`.

### F4: Das Statusband meldet den Ist-Zustand

#### F4 Description

Ein Band am Kopf der Seite sagt, was bereits eingerichtet ist — damit niemand
nach etwas sucht, das er längst hat.

#### F4 Behaviour / Acceptance

- Läuft die Seite in der installierten App (`display-mode: standalone` oder
  `navigator.standalone`), meldet das Band: App ist eingerichtet. Die
  Installationsschritte treten in den Hintergrund (eingeklappt, nicht
  entfernt).
- Stehen Benachrichtigungen auf `granted` **und** besteht ein Abo, meldet das
  Band: Benachrichtigungen sind an.
- Bei `denied` erscheint der Weg, die Sperre in den Browsereinstellungen
  wieder zu lösen — ein Knopf hilft dort nicht mehr weiter.
- Ohne Unterstützung für Benachrichtigungen erscheint kein leeres Versprechen.

#### F4 Test Cases

**TC-F4-01: In der App gilt die Installation als erledigt**

- **Setup:** `display-mode: standalone` vorgetäuscht.
- **Expected:** Das Band meldet die eingerichtete App; der
  Installationsabschnitt ist eingeklappt.

**TC-F4-02: Abgelehnte Erlaubnis erklärt den Rückweg**

- **Setup:** `Notification.permission = 'denied'`.
- **Expected:** Hinweis auf die Browsereinstellungen, kein Einschaltknopf.

### F5: Knöpfe handeln, wo der Browser es zulässt

#### F5 Description

Wo der Browser eine Installation oder die Erlaubnisabfrage anbietet, führt ein
Knopf sie unmittelbar aus — statt den Nutzer Schritte nachvollziehen zu
lassen.

#### F5 Behaviour / Acceptance

- Meldet der Browser `beforeinstallprompt`, erscheint „Jetzt installieren" und
  löst den Dialog aus.
- Ohne dieses Ereignis erscheint der Knopf **nicht** — ein Knopf, der nichts
  tut, ist schlimmer als keiner.
- „Benachrichtigungen einschalten" nutzt die vorhandene Kette aus `pwa.js`.
- Auf dem iPhone ohne Installation erklärt der Knopf, dass zuerst die App auf
  den Startbildschirm muss.

#### F5 Test Cases

**TC-F5-01: Ohne Angebot kein Knopf**

- **Setup:** Kein `beforeinstallprompt`.
- **Expected:** Der Knopf „Jetzt installieren" ist nicht sichtbar.

**TC-F5-02: Mit Angebot erscheint der Knopf und löst aus**

- **Setup:** `beforeinstallprompt` ausgelöst.
- **Expected:** Knopf sichtbar; ein Tipp ruft `prompt()` auf.

### F6: Die vier Benachrichtigungsarten sind erklärt

#### F6 Description

Ein eigener Abschnitt beschreibt jede Art: was kommt, wie oft, wer es
bekommt, welchen Nutzen sie hat — mit dem Beispieltext einer echten
Benachrichtigung. Alltagssprache, keine Fachwörter.

#### F6 Inputs

| Kennung | Name | Auslöser | Häufigkeit | Empfänger |
| --- | --- | --- | --- | --- |
| `tagesinfo` | TagesInfo | `api/social-post` → `/tagesinfo` | werktäglich | alle Abonnenten |
| `news` | News / Aktuelles | `api/news-save` → `/aktuelles` | selten | alle Abonnenten |
| `bestellung` | Meine Bestellungen | `api/lunch-order` | nur bei eigener Bestellung | nur der Besteller |
| `kontakt` | Antwort auf meine Nachricht | `api/contact-message` → `/?chat=1` | nur nach eigener Anfrage | nur der Absender |

#### F6 Behaviour / Acceptance

- Je Art: Name, ein Satz Nutzen, Häufigkeit, Empfängerkreis, Beispieltext.
- Bei `bestellung` und `kontakt` steht ausdrücklich, dass **nur der
  Betroffene** sie erhält — das ist die häufigste Sorge.
- Es steht dabei, dass sich jede Art einzeln abschalten lässt und wie.

#### F6 Test Cases

**TC-F6-01: Alle vier Arten beschrieben**

- **Expected:** Vier Einträge mit `data-art`; die Kennungen entsprechen der
  Tabelle.

**TC-F6-02: Der persönliche Charakter ist benannt**

- **Expected:** Die Einträge `bestellung` und `kontakt` enthalten den Hinweis,
  dass nur der Betroffene sie bekommt.

### F7: Die Kategorie „Antwort auf meine Nachricht" ist abwählbar

#### F7 Description

Die Kategorie `kontakt` steht in `ALL_CATEGORIES`
(`api/push-subscribe/__init__.py`) und wird beim Schreiben einer
Kontaktnachricht still mitabonniert (`js/kontakt.js`, `merge:true`), fehlt
aber in der Auswahl der Einstellungen (`js/pwa.js`, `CAT_LABELS`). Sie lässt
sich weder sehen noch abschalten.

Wenn die Anleitung sie erklärt, muss sie auch abwählbar sein.

#### F7 Behaviour / Acceptance

- `CAT_LABELS`, `CAT_ICONS`, `CAT_DESC` und die Kategorienliste der
  Einstellungen führen `kontakt`.
- Bestehende Abos verlieren dabei keine Kategorie.

#### F7 Test Cases

**TC-F7-01: Vier Schalter in den Einstellungen**

- **Action:** Benachrichtigungs-Einstellungen öffnen.
- **Expected:** Vier Kategorien, darunter `kontakt`.

### F8: QR-Code und Druckfassung

#### F8 Description

Ein QR-Code führt vom Bildschirm aufs eigene Handy. Eine Druckfassung taugt
als Aushang im Laden.

#### F8 Behaviour / Acceptance

- Der QR-Code liegt als **festes SVG** vor (die Adresse ändert sich nicht) —
  keine Bibliothek zur Laufzeit.
- Er verweist auf `https://dorfladen-oberornau.de/app`.
- Im Druck entfallen Navigation, Kontaktleiste, Fußzeile, Brotkrumenpfad,
  Cookie-Hinweis, WhatsApp-Knopf, Geräteauswahl und alle Aktionsknöpfe.
- Die häufigen Fragen sind im Druck **aufgeklappt**. Ein zugeklapptes
  `<details>` lässt sich mit CSS allein nicht öffnen — das übernimmt ein
  Zuhörer auf `beforeprint` beziehungsweise die Medienabfrage `print`.
- Der QR-Code steht groß, die Adresse in Klarschrift daneben.
- Gedruckt wird der **gewählte** Weg, nicht alle acht.

#### F8 Test Cases

**TC-F8-01: QR-Bild vorhanden und richtig**

- **Expected:** `images/anleitung/qr-app.svg` ist eingebunden und wird
  geladen; ein Decoder liest daraus `https://dorfladen-oberornau.de/app`.

**TC-F8-02: Im Druck verschwindet alles zum Bedienen**

- **Setup:** Druckdarstellung (`media: print`).
- **Expected:** Navigation, Kontaktleiste, Fußzeile, Brotkrumen und
  Cookie-Hinweis sind nicht sichtbar; der QR-Bereich schon. Es steht genau
  ein Weg auf dem Papier, und die Fragen sind aufgeklappt.

### F9: Einstiege zur Anleitung

#### F9 Description

Die Anleitung nützt nur, wer sie findet. Der bisherige `alert()` beim
Installationsversuch wird durch den Verweis auf die Seite ersetzt.

#### F9 Behaviour / Acceptance

- `pwaInstall()` ohne Installationsangebot führt auf `/app` statt zu einem
  `alert()`.
- Der iOS-Push-Hinweis verweist auf die Seite.
- Die Startseite trägt einen sichtbaren Verweis.

#### F9 Test Cases

**TC-F9-01: Kein alert mehr**

- **Expected:** In `js/pwa.js` steht in `pwaInstall()` kein `alert(` mehr; es
  wird auf `/app` geführt.

**TC-F9-02: Verweis auf der Startseite**

- **Expected:** `index.html` enthält einen Verweis auf `/app`.

## Data & Contracts

**Push-Kategorien** (`api/push-subscribe/__init__.py`):
`ALL_CATEGORIES = ["tagesinfo", "news", "bestellung", "kontakt"]`,
`LEGACY_MAP = {"mittagstisch": "tagesinfo", "angebote": "tagesinfo"}`.
Vorgabe beim ersten Abonnieren: `["tagesinfo", "news"]`.

**Abo** liegt in Dataverse `dl_seiteninhalt`, Schlüssel
`push_sub_<hash(endpoint)[:16]>`.

**Vorhandene Bausteine in `js/pwa.js`**, die wiederverwendet werden:
`pwaInstall()`, `pushToggle()`, `dlPushDeviceId()`, das Ereignis
`beforeinstallprompt`, `CAT_LABELS`/`CAT_ICONS`/`CAT_DESC`.

**Route** in `staticwebapp.config.json`: `/app` → `/app.html`.

## Open Questions

Keine offenen Punkte. Die Entscheidungen zu Abbildungen (nachgezeichnete
SVG), Umfang (acht Wege inklusive Rechner), Erkennung mit Aktionsknöpfen,
Adresse (`/app`) sowie QR-Code und Druckfassung sind getroffen.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01 | Seite und Route | T1, T8 |
| F2 | TC-F2-01 … TC-F2-03 | Aufbau der Seite | T3, T4 |
| F3 | TC-F3-01 … TC-F3-05 | Erkennung | T5 |
| F4 | TC-F4-01, TC-F4-02 | Erkennung | T5 |
| F5 | TC-F5-01, TC-F5-02 | Erkennung | T5 |
| F6 | TC-F6-01, TC-F6-02 | Aufbau der Seite | T6 |
| F7 | TC-F7-01 | Einstellungen | T9 |
| F8 | TC-F8-01, TC-F8-02 | Gestaltung, QR | T7, T2 |
| F9 | TC-F9-01, TC-F9-02 | Einstiege | T8 |

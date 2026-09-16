# Kiosk-Start ohne falschen Bereich — Specification

**Status:** Angenommen

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-09-16

## Overview

Beim Öffnen des Kiosks erschien jedes Mal kurz ein falscher Bereich: der
Online-Shop mit „Zu erledigen / Heute abholen / Überfällig / Historie" und
darunter „Laden…". Erst nach gut einer Sekunde sprang die Anzeige auf den
richtigen Bereich.

Besonders verwirrend: Der Online-Shop ist im CMS **abgeschaltet**
(`kiosk_shop: false`). Sein Reiter erscheint gar nicht — man sah also den
Inhalt eines Bereichs, zu dem es keinen Reiter gibt.

**Gemessener Ablauf vorher** (CMS-Antwort künstlich um 1,5 s verzögert):

| Zeit | Aktiver Reiter | Sichtbares Panel | Reiter sichtbar? |
| --- | --- | --- | --- |
| 307 ms | `abhol` | `abhol` | **nein** |
| 1418 ms | `baecker` | `baecker` | ja |

**Ursache.** Im HTML war `abhol` fest als aktiv markiert — sowohl der Reiter
als auch sein Panel. Welche Bereiche freigeschaltet sind, stand aber erst
nach dem Aufruf von `/api/cms-config` fest. Erst dessen Antwort löste den
Wechsel aus.

## Goals

- Beim Öffnen ist sofort der Bereich zu sehen, der auch bleibt.
- Kein Inhalt eines Bereichs, dessen Reiter fehlt.
- Der zuletzt genutzte Bereich kommt wieder.
- Kein Flackern der Reiterleiste.

## Non-Goals

- Keine Änderung daran, welche Bereiche im CMS freigeschaltet werden.
- Keine neue Bedienung — nur der Start wird ruhiger.

## Requirements

### F1: Der Startbereich steht vor dem ersten Zeichnen fest

#### F1 Description

Ein Skript im HTML — unmittelbar hinter den Bereichen, also
parser-blockierend — wählt den Bereich, bevor der Browser zeichnet.

#### F1 Behaviour / Acceptance

- Es stützt sich auf zwei gemerkte Werte:
  - `k-active-tab` (sessionStorage): der zuletzt genutzte Bereich
  - `k-tab-flags` (localStorage): die zuletzt gesehenen Freigaben
- Sind Freigaben gemerkt, steht die Reiterleiste sofort vollständig richtig.
- Ohne gemerkte Freigaben werden nur Bereiche gezeigt, die ohne Rückfrage
  sicher sind: Mittagstisch, Bäcker, Mair, Getränke, Kalender.
- `applyKioskFeatures()` fragt weiter beim Server nach und korrigiert.

#### F1 Test Cases

**TC-S1: Kein Bereich ohne zugehörigen Reiter**

- **Setup:** CMS-Antwort um 1,5 s verzögert.
- **Expected:** Zu keinem Zeitpunkt ist ein Panel aktiv, dessen Reiter
  ausgeblendet ist.

**TC-S2: Der abgeschaltete Shop blitzt nicht auf**

- **Expected:** `panel-abhol` ist beim Start zu keinem Zeitpunkt aktiv.

**TC-S3: Mit gemerkten Freigaben steht der Bereich sofort fest**

- **Setup:** Freigaben und `getraenke` als letzter Bereich gemerkt.
- **Expected:** Während des gesamten Starts ist genau ein Bereich aktiv —
  kein Wechsel.

### F2: Reiter und Inhalt gehören zusammen

#### F2 Description

Wird ein Reiter ausgeblendet, darf sein Inhalt nicht stehen bleiben.

#### F2 Behaviour / Acceptance

- `setTabs()` prüft nach jedem Anwenden der Freigaben, ob der aktive Reiter
  noch sichtbar ist; sonst wird auf den ersten sichtbaren gewechselt.

#### F2 Test Cases

**TC-S4: Ein abgeschalteter Merkwert führt nicht in die Irre**

- **Setup:** Zuletzt `abhol` genutzt, inzwischen abgeschaltet.
- **Expected:** Der Shop wird nicht geöffnet; ein anderer Bereich ist aktiv.

### F3: Der gewählte Bereich wird geladen

#### F3 Description

Das Skript im HTML setzt nur Klassen. Die Fachmodule (Bäcker, Mair,
Getränke, Kalender) fahren über `switchTab()` hoch — dieser Aufruf muss
beim Start stattfinden, auch wenn der Bereich bereits aktiv ist.

#### F3 Behaviour / Acceptance

- `applyKioskFeatures()` ruft `switchTab(ziel)` unabhängig davon auf, ob
  der Bereich schon aktiv ist.

#### F3 Test Cases

**TC-S5: Der zuletzt genutzte Bereich kommt wieder**

**TC-S6: Der gewählte Bereich wird auch wirklich geladen**

- **Expected:** Für `getraenke`, `baecker` und `kalender` hat der aktive
  Bereich beim Start Inhalt (> 20 Zeichen).

**TC-S7: Ohne Antwort des Servers bleibt der Kiosk bedienbar**

- **Setup:** `/api/cms-config` schlägt fehl.
- **Expected:** Ein Bereich ist aktiv, und sein Reiter ist sichtbar.

### F4: Quelle und erzeugte Dateien bleiben deckungsgleich

#### F4 Description

`kiosk.html`, `kiosk-neu.html` und `css/kiosk-base.css` werden aus
`kiosk-klassisch.html` erzeugt (`tools/build-kiosk-neu.js`). Bei der Arbeit
an F1 stellte sich heraus, dass der Bau-Weg **nicht mehr durchgängig** war.
Ein Lauf hätte drei Dinge zerstört:

1. **Den Getränke-Reiter.** Die Liste `REITER` im Werkzeug kannte ihn
   nicht — er wurde später ergänzt, die Liste nicht nachgezogen.
2. **Die Gestaltung des Getränke-Bereichs.** 195 Zeilen mit 44 Klassen
   standen nur in der erzeugten `css/kiosk-base.css`.
3. **Die Klappfunktion der Kopfzeile** (`kopfMenue()` samt Knopf-Klasse
   `k-head-extra`). Das Werkzeug erzeugte den Knopf, die Funktion stand
   aber nur in der erzeugten `kiosk.html` — der Knopf hätte ins Leere
   gegriffen.

Alles ist in die Quelle übertragen. Ein Lauf des Werkzeugs erzeugt jetzt
Zeichen für Zeichen dieselben Dateien, die im Betrieb laufen.

#### F4 Behaviour / Acceptance

- `REITER` führt alle neun Reiter, `mittag` ist der aktive.
- Der `<style>`-Block der Quelle und `css/kiosk-base.css` enthalten
  dieselben Klassen (geprüft: 432 = 432).
- Ein Lauf des Werkzeugs ändert **keine** der drei erzeugten Dateien.
- Zusätzliche Sicherungen im Werkzeug, falls doch wieder direkt in einer
  erzeugten Datei gepflegt wird:
  - **R3** bricht ab, wenn die Quelle einen Reiter führt, den `REITER`
    nicht kennt.
  - **R1** bricht ab, wenn der Lauf mehr als drei Gestaltungsregeln aus
    `css/kiosk-base.css` entfernen würde.

#### F4 Test Cases

**TC-S8a: Die Reiterliste ist vollständig**

- **Expected:** Jeder Reiter der Quelle steht auch in `REITER`.

**TC-S8b: Der Mittagstisch ist der Startbereich**

- **Expected:** In Werkzeug und allen drei Seiten ist `mittag` der aktive
  Reiter und Bereich.

**TC-S8c: Quelle und erzeugte Dateien sind deckungsgleich**

- **Action:** `node tools/build-kiosk-neu.js`.
- **Expected:** Das Werkzeug läuft durch, und keine der drei erzeugten
  Dateien ändert sich. Andernfalls wurde direkt in einer erzeugten Datei
  gepflegt — der Test nennt sie.

## Data & Contracts

**Gemerkte Werte im Browser:**

| Schlüssel | Ort | Inhalt |
| --- | --- | --- |
| `k-active-tab` | sessionStorage | zuletzt genutzter Bereich |
| `k-tab-flags` | localStorage | zuletzt gesehene Freigaben |

**Freigaben** (`/api/cms-config`, `feature_flags`): `kiosk_mittag`,
`kiosk_shop`, `kiosk_metzger`, `kiosk_baecker`, `kiosk_metzgerbest`,
`kiosk_getraenke`, `kiosk_kontakt`, `kiosk_social`.

Ohne Angabe gelten Bäcker, Mair und Getränke als frei; alle übrigen
brauchen ein ausdrückliches `true`.

**Dateien:**

| Pfad | Rolle |
| --- | --- |
| `static-site/kiosk-klassisch.html` | Quelle, hier wird gepflegt |
| `static-site/kiosk.html` | erzeugt — die Seite für den Betrieb |
| `static-site/kiosk-neu.html` | erzeugt — Vorschau |
| `static-site/css/kiosk-base.css` | erzeugt aus dem `<style>`-Block der Quelle |
| `tools/build-kiosk-neu.js` | Werkzeug |

**Änderungen gehören ausschließlich in die Quelle.** Danach
`node tools/build-kiosk-neu.js` ausführen. TC-S8c wacht darüber.

## Open Questions

Keine.

## Traceability

| Requirement | Test Cases |
| --- | --- |
| F1 | TC-S1, TC-S2, TC-S3 |
| F2 | TC-S4 |
| F3 | TC-S5, TC-S6, TC-S7 |
| F4 | TC-S8 |

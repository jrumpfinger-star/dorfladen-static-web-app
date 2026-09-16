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

### F4: Das Bau-Werkzeug darf nichts stillschweigend löschen

#### F4 Description

`kiosk.html` wird aus `kiosk-klassisch.html` erzeugt
(`tools/build-kiosk-neu.js`). Bei der Arbeit an F1 stellte sich heraus,
dass dieses Werkzeug **veraltet** war und bei einem Lauf zwei Dinge
zerstört hätte:

1. **Den Getränke-Reiter.** Die Liste `REITER` im Werkzeug kannte ihn
   nicht — er wurde später ergänzt, die Liste nicht nachgezogen. Ein Lauf
   löschte ihn aus `kiosk.html`.
2. **Die Gestaltung des Getränke-Bereichs.** `css/kiosk-base.css` wird aus
   dem `<style>`-Block der Quelle erzeugt. Die rund 200 Zeilen für `gk-`
   stehen aber nur in der erzeugten Datei. Ein Lauf löschte 47 Regeln.

Beides geschah beim Probelauf tatsächlich und wurde rückgängig gemacht.

#### F4 Behaviour / Acceptance

- `REITER` führt alle neun Reiter, `mittag` ist der aktive.
- **R3** bricht ab, wenn die Quelle einen Reiter führt, den `REITER` nicht
  kennt.
- **R1** bricht ab, wenn der Lauf mehr als drei Gestaltungsregeln aus
  `css/kiosk-base.css` entfernen würde.

#### F4 Test Cases

**TC-S8: Das Werkzeug bricht ab, statt Gestaltung zu löschen**

- **Action:** `node tools/build-kiosk-neu.js` im heutigen Stand.
- **Expected:** Abbruch mit Nennung der fehlenden Regeln;
  `css/kiosk-base.css` bleibt unverändert.

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
| `static-site/css/kiosk-base.css` | erzeugt — **enthält zusätzlich handgepflegte `gk-`-Regeln** |
| `tools/build-kiosk-neu.js` | Werkzeug |

## Open Questions

Der Bau-Weg ist nicht mehr durchgängig: Getränke-Reiter und
Getränke-Gestaltung wurden nur in den erzeugten Dateien gepflegt. Das
Werkzeug bricht jetzt sicher ab, statt Schaden anzurichten — die
Zusammenführung steht aber noch aus. Bis dahin müssen Änderungen an der
Reiterleiste in `kiosk-klassisch.html` **und** `kiosk.html` erfolgen.

## Traceability

| Requirement | Test Cases |
| --- | --- |
| F1 | TC-S1, TC-S2, TC-S3 |
| F2 | TC-S4 |
| F3 | TC-S5, TC-S6, TC-S7 |
| F4 | TC-S8 |

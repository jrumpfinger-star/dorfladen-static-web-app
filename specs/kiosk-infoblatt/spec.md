# Das Blatt hinter dem „i" — Specification

**Status:** Angenommen

**Owner:** Dorfladen Oberornau

**Last updated:** 2026-09-16

## Overview

Zwei Rückmeldungen aus dem Laden, eine Ursache:

> „Info Button reagiert nicht bei Getränke"

> „Ich finde die Darstellung des Info Buttons dämlich. Das schaut nach
> nichts aus. Warum kommt da kein schickes Popup, das die Felder sauber
> ausgerichtet hat? Ist auch bei Bäcker und Metzger so."

**Der Knopf reagierte tatsächlich** — das Blatt öffnete sich. Gemessen wurde
`hidden=false`, Höhe 333 px, sichtbar. Nur fiel es niemandem auf:

| Befund | Wirkung |
| --- | --- |
| **Keine Abdunkelung** des Hintergrunds | Nichts hebt sich ab; das Öffnen wirkt wie „nichts passiert" |
| **Volle Breite** (1460 px am Rechner) | Sieht aus wie eine angehängte Fußleiste, nicht wie ein Dialog |
| **`max-height:80 %`** | Fußzeile und Reiterleiste blieben hell stehen (bei 844 px genau 169 px) |
| **`z-index:60`** | Die übrigen Dialoge liegen auf 9000 — Leisten lagen darüber |
| Hinweise als **lose Textzeilen** | Testbetrieb, Vorbelegung und Bestellschluss gleichrangig mit allem |
| Aktionen als **Knöpfe über die volle Breite** | Eine Wand aus Knöpfen ohne Ordnung |
| **Kein Schließkreuz** | Man sieht nicht, wie man wieder herauskommt |

Die Änderung ist rein gestalterisch. Der Aufbau der Fachmodule bleibt
unangetastet — die Umgruppierung übernimmt die Hilfeschicht
(`js/kiosk-neu-shell.js`) für alle drei Reiter gemeinsam.

Ein Mockup mit Live-Daten liegt unter
[mockups/info-blatt-mockup.html](../../mockups/info-blatt-mockup.html).

## Goals

- Man sieht sofort, dass sich etwas geöffnet hat.
- Am Rechner ein Dialog, auf dem Telefon ein Blatt von unten.
- Felder und Hinweise sauber ausgerichtet und unterschieden.
- Kein Bedienelement geht verloren.

## Non-Goals

- Keine Änderung an den Inhalten der drei Blätter.
- Keine Änderung an den Fachmodulen (Bäcker, Mair, Getränke).
- Keine neuen Bedienwege.

## Requirements

### F1: Das Öffnen ist zu sehen

#### F1 Behaviour / Acceptance

- Der Hintergrund wird abgedunkelt (`rgba(15,23,42,.55)`).
- Die Abdunkelung deckt den **ganzen** Schirm ab — auch Fußzeile und
  Reiterleiste.
- Das Blatt liegt auf `z-index: 9000`, der Ebene der übrigen Dialoge.

#### F1 Test Cases

**TC-B1: Der Hintergrund wird abgedunkelt** (je Reiter)

- **Expected:** Deckkraft > 0,2; die Schicht füllt Fenster­breite und
  ‑höhe aus.

### F2: Dialog am Rechner, Blatt auf dem Telefon

#### F2 Description

Über die volle Breite eines 1460-px-Schirms sah das Blatt aus wie eine
angehängte Fußleiste. Ein Dialog sagt dagegen: Hier ist etwas zu
entscheiden. Auf dem Telefon bleibt das Blatt unten — dort ist es mit dem
Daumen erreichbar.

#### F2 Behaviour / Acceptance

- Ab 700 px Breite: Karte mittig, höchstens 460 px breit.
- Darunter: volle Breite, am unteren Rand.

#### F2 Test Cases

**TC-B2: Am Rechner ein Dialog in der Mitte** (je Reiter)

- **Expected:** Karte < 700 px breit; Abstand links und rechts gleich
  (± 20 px).

**TC-B3: Auf dem Telefon ein Blatt von unten** (je Reiter)

- **Expected:** Karte > 360 px breit, bündig am unteren Rand.

### F3: Aufbau aus Kopf, Körper und Fuß

#### F3 Description

Das HTML der Fachmodule kennt diese Gliederung nicht. Die Hilfeschicht
zieht sie beim Öffnen ein — rein umgruppierend: Kein Element wird entfernt,
keine Kennung geändert, kein `onclick` angetastet.

#### F3 Behaviour / Acceptance

- `.k-blatt-karte` umschließt alles.
- **Kopf**: Titel, Untertitel, Schließkreuz (`.k-blatt-zu`).
- **Körper** (`.k-blatt-koerper`): rollt, wenn es eng wird.
- **Fuß** (`.k-blatt-fuss`): trägt den Schließen-Knopf.
- Aufeinanderfolgende Knöpfe werden zu `.k-blatt-akt` zusammengefasst.

#### F3 Test Cases

**TC-B4: Kopf mit Schließkreuz, Körper, Fuß** (je Reiter)

### F4: Schließen auf allen erwarteten Wegen

#### F4 Test Cases

**TC-B5: Das Schließkreuz schließt**

**TC-B6: Ein Tipp neben die Karte schließt**

**TC-B7: Escape schließt**

### F5: Inhalte bleiben vollständig und bedienbar

#### F5 Behaviour / Acceptance

- Jeder Knopf und jedes Feld bleibt sichtbar und anklickbar.
- Der Testbetriebs-Hinweis wird als **Warnung** gekennzeichnet (bernstein),
  alle übrigen Hinweise als Auskunft (blau). Die Fachmodule kennzeichnen ihn
  unterschiedlich — beim Getränkereiter als `klein`, sonst gar nicht —,
  deshalb wird er am Text erkannt.

#### F5 Test Cases

**TC-B8: Kein Bedienelement geht verloren** (je Reiter)

**TC-B9: Der Testbetrieb-Hinweis ist als Warnung gekennzeichnet**

**TC-B10: Die Terminwahl bleibt bedienbar**

- **Expected:** Das Feld `#gk-datum` ist sichtbar und breiter als 200 px.

## Data & Contracts

**Gestaltung:** `static-site/css/kiosk-neu.css`, Abschnitt 17.

**Umgruppierung:** `static-site/js/kiosk-neu-shell.js` —
`blattFormen()`, `blattKreuz()`, `blattAktionen()`, `blattWarnungen()`.

**Betroffene Blätter:** `.bk-blatt` (Bäcker), `.mb-blatt` (Mair),
`.gk-blatt` (Getränke). Geöffnet über `#gk-mehr`, `.mb-mehr`, `.bk-mehr`.

**Erzeugte Klassen:** `.k-blatt-karte`, `.k-blatt-koerper`,
`.k-blatt-fuss`, `.k-blatt-zu`, `.k-blatt-akt`.

> `kiosk.html` wird aus `kiosk-klassisch.html` erzeugt. `kiosk-neu.css` und
> `kiosk-neu-shell.js` werden **nicht** erzeugt und dürfen direkt gepflegt
> werden (siehe specs/kiosk-start, F4).

## Open Questions

Keine.

## Traceability

| Requirement | Test Cases |
| --- | --- |
| F1 | TC-B1 |
| F2 | TC-B2, TC-B3 |
| F3 | TC-B4 |
| F4 | TC-B5, TC-B6, TC-B7 |
| F5 | TC-B8, TC-B9, TC-B10 |

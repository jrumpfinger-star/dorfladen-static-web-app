# Mein Konto als modales Fenster — Specification

**Status:** umgesetzt
**Gemeldet:** „Warum muss ein eigenes Fenster aufgehen anstatt eines
modalen Dialoges mit einem Schließen-X-Button?"
Dazu, kurz danach: „Wenn man sich bei Mittagessen anmeldet, muss auch auf
der Homepage dies aktualisiert werden."

## Overview

„Mein Konto" navigierte bisher die **ganze Seite** weg
(`<a href="/mein-konto">`). Die berechtigte Rückfrage: Ein modales
Fenster mit Schließen-Kreuz gab es doch längst — Bestellstatus,
Mittagstisch und CMS öffnen alle im selben `mt-popup-overlay`
(Schließen-Kreuz, Klick daneben, Android-Zurück-Taste). Nur „Mein Konto"
tat das nicht.

## Requirements

### F1: „Mein Konto" nutzt das vorhandene modale Fenster

#### F1 Behaviour / Acceptance

- Die drei Einstiege auf der Startseite (Kopfleiste `#tb-konto`,
  Handy-Menü `#mob-konto`, Fußzeile) öffnen `/mein-konto` im
  bestehenden `mt-popup-overlay` statt die Seite zu verlassen.
- **Strg/Cmd/Umschalt-Klick oder Mittelklick** öffnen weiterhin einen
  echten neuen Tab — das `href`-Ziel bleibt deshalb erhalten, nur der
  normale Linksklick wird abgefangen (`event.preventDefault()`).
- Innerhalb des Fensters führt „Zur Startseite" **nicht** dazu, dass die
  komplette Homepage winzig im Bestell-Rahmen lädt — es schließt
  stattdessen das Fenster (`postMessage('closeMittagPopup')`), genau wie
  der bestehende „Zurück zum Dorfladen"-Link in
  `mittagstisch-bestellen.html`.
- Nach erfolgreichem Anmelden/Abmelden **innerhalb** des Fensters schließt
  sich das Fenster ebenso, statt die Startseite im Rahmen zu laden.

#### F1 Test Cases

Siehe `tests/konto-modal.spec.js`, TC-KM-01 bis TC-KM-04.

### F2: Das Konto-Symbol der Startseite bleibt aktuell

#### F2 Description

Zwei unabhängige Stellen können den Anmeldezustand ändern, ohne dass die
Startseite selbst neu lädt: das jetzt modale „Mein Konto" **und** das
Anmeldefenster im Mittagessen-Bestellformular (Spec
konto-waehrend-bestellung). Beide müssen dem Konto-Symbol Bescheid
geben.

#### F2 Behaviour / Acceptance

- `closeMittagPopup()` ruft nach dem Schließen `dlKontoStand()` auf —
  billig und schadlos, auch wenn der Dialog etwas anderes war als „Mein
  Konto".
- Das Anmeldefenster in `mittagstisch-bestellen.html` schickt nach
  erfolgreichem Anmelden `postMessage('dlKontoGeaendert')` an das
  übergeordnete Fenster, **falls eingebettet**. Die Startseite hört
  darauf und ruft ebenfalls `dlKontoStand()` auf.

#### F2 Test Cases

**TC-KM-05:** Anmelden im modalen „Mein Konto" — das Fenster schließt
sich, das Konto-Symbol zeigt sofort den Namen.

**TC-KM-06:** Anmelden im **Mittagessen-Bestellformular** (ein anderes
eingebettetes Fenster) — das Konto-Symbol der Startseite aktualisiert
sich ebenfalls, ohne dass dieses Fenster selbst schließt.

## Umsetzung

- `static-site/index.html`: `dlOeffneKontoModal(e, el)` fängt den Klick
  ab; `closeMittagPopup()` ruft `dlKontoStand()`; der `message`-Listener
  kennt jetzt `dlKontoGeaendert`.
- `static-site/mein-konto.html`: `zurueckZurStartseite()` ersetzt drei
  Stellen, die zuvor `location.href='/'` setzten (Anmelden, Abmelden,
  „Zur Startseite"-Link im Kopf).
- `static-site/mittagstisch-bestellen.html`: `loginAbsenden()` schickt
  bei Erfolg `dlKontoGeaendert`, falls eingebettet.

## Gegenprobe

Ohne die Änderungen an den drei Dateien (`git stash`) fallen fünf der
sechs Wächter. **TC-KM-04 (Strg-Klick) bleibt absichtlich grün** — dieser
Test prüft natives Browser-Verhalten, das durch die Änderung nicht
zerstört werden darf, nicht etwas, das die Änderung neu erzeugt.

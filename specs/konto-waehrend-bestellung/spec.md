# Anmelden während der Bestellung — Specification

**Status:** umgesetzt
**Gemeldet:** „Bei der Bestellung selbst gibt es aber nicht die
Möglichkeit sich anzumelden und es gibt auch keinen Hinweis darauf und
was es für Möglichkeiten bietet."

## Overview

Im Bestellformular für den Mittagstisch (`mittagstisch-bestellen.html`)
gab es keinen einzigen Weg, sich anzumelden, und keinen Hinweis, was ein
Konto überhaupt bringt. Der einzige Weg zum Konto war ein unbeschrifteter
Link „Mein Konto" ganz unten in der Fußzeile.

## Ursache

Das Formular läuft eingebettet in einem `<iframe>` (`mt-popup-iframe`).
Der Fußzeilen-Link hätte diesen Rahmen **selbst** umgeleitet — die halb
ausgefüllte Bestellung wäre stillschweigend verworfen worden, und die
Kontoseite hätte winzig im Bestellfenster gehangen.

## Zweiter, unabhängiger Fund

Beim Bau des Anmelde-Fensters fiel auf: Der bestehende Fehlerkasten
(`#error-box`) dieser Seite zeigte **nie** eine Meldung. Vier Stellen
setzten `style.display=''`, aber die CSS-Klasse selbst trägt
`display:none` — eine leere Zeichenkette hebt eine per Klasse gesetzte
Eigenschaft nicht auf. Fehlender Name, überschrittener Bestellschluss,
vom Server abgelehnte Bestellung, fehlgeschlagene Verbindung: keine
dieser vier Meldungen war je sichtbar.

## Requirements

### F1: Ein Weg zum Anmelden, ohne die Bestellung zu verlassen

#### F1 Behaviour / Acceptance

- In den Kundendaten steht ein Hinweis mit Link „Anmelden", der erklärt,
  was ein Konto bringt.
- Der Klick öffnet ein Fenster **innerhalb** der Seite (kein Sprung).
  Menge, Anmerkung und alle anderen Eingaben bleiben erhalten.
- Nach erfolgreichem Anmelden füllen sich Name und E-Mail automatisch,
  und der Status wechselt zu „✓ Angemeldet als …".
- Falsches Passwort und leeres Formular werden verständlich gemeldet,
  das Fenster bleibt für einen zweiten Versuch offen.
- Der Fußzeilen-Link „Mein Konto" öffnet einen **neuen Tab**
  (`target="_blank"`) statt den eingebetteten Rahmen umzuleiten.

#### F1 Test Cases

Siehe `tests/konto-waehrend-bestellung.spec.js`, TC-KB-01 … TC-KB-09
(inklusive des gleichen Musters in der Fleisch-/Wurstliste, TC-KB-09).

### F2: Fehlermeldungen sind tatsächlich sichtbar

#### F2 Behaviour / Acceptance

- `errEl.style.display` wird beim Anzeigen explizit auf `'block'`
  gesetzt, nicht auf `''`.
- Betrifft: fehlender Name/kein Gericht (`submitOrder`), überschrittener
  Bestellschluss (`selectDish`), vom Server abgelehnte Bestellung,
  fehlgeschlagene Verbindung — sowie das neue Anmeldefenster
  (`#login-fehler`) von Anfang an richtig.

#### F2 Test Cases

TC-KB-04 bis TC-KB-07 lösen jeweils einen der vier vorbestehenden Fälle
aus und prüfen, dass der Kasten **sichtbar** wird
(`getComputedStyle(...).display`), nicht nur, dass der Text gesetzt
wurde.

## Gegenprobe

Ohne die Änderungen an `mittagstisch-bestellen.html` fallen alle neun
Wächter (`git stash` bestätigt).

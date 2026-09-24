# Gericht außerhalb des Wochenplans

## Overview

Aus dem Laden: *„Bei telefonischer Bestellung soll es auch möglich sein, ein
Gericht außerhalb des Mittagsplans einzugeben, z. B. Currywurst mit Pommes.
Dieses sollte dann auch bei der Übersicht Mittagstisch angezeigt werden
können. Ist dies machbar?"*

**Ja — und es löst zugleich eine Sackgasse.** Im mitgeschickten Bild steht
„Für Freitag, 25.09.2026 ist noch kein Gericht im Wochenplan." Bis dahin ließ
sich in dieser Lage **gar nichts** erfassen: kein Gericht, keine Bestellung.

## F1: Ein Feld für das freie Gericht

Unter der Gerichteauswahl steht **„+ Anderes Gericht eingeben"**. Ein Klick
öffnet zwei Felder: Bezeichnung und — optional — Preis.

- **Der Preis darf fehlen.** Am Telefon ist er oft nicht zur Hand; dann steht
  0 € da und lässt sich später ergänzen. Ein Pflichtfeld hätte die Aufnahme
  aufgehalten.
- **Ein leeres Feld gilt nicht als Auswahl.** Wer den Text wieder löscht, hat
  kein Gericht gewählt — sonst ginge eine Bestellung ohne Gerichtsnamen raus.
- Eine im Plan gewählte Kachel **löst sich ab**, sobald man frei tippt. Zwei
  gleichzeitig gewählte Gerichte wären nicht auflösbar.
- Beim Öffnen des Dialogs ist das Feld **wieder leer** — sonst stünde die
  Eingabe der letzten Bestellung noch da.

## F2: In der Übersicht erscheint es von selbst

Hier war nichts zu bauen. Die Tagesübersicht gruppiert nach dem **Text** des
Gerichts, nicht nach seiner Kennung:

```js
var key = o.gericht || 'Unbekannt';
```

Ein freies Gericht bildet damit eine eigene Gruppe wie jede andere, samt
Portionszählung und Kundenliste. Auch die Küchenliste zieht daraus.

## Warum keine Serveränderung nötig war

`gericht` ist ein Textfeld, `gericht_id` darf leer bleiben. Der Server nimmt
die Bestellung entgegen wie jede andere; nur die Verknüpfung zum Wochenplan
fehlt — und die gibt es für ein Gericht außerhalb des Plans ja auch nicht.

## Test Cases

**TC-FG-01: Es gibt einen Weg zum freien Gericht.**

**TC-FG-02: Auch ohne Gericht im Plan** — der gemeldete Zustand aus dem Bild.

**TC-FG-03: Das freie Gericht wird gesendet** — mit Text, Preis, leerer
Kennung und dem gewählten Tag.

**TC-FG-04: Ohne Preis geht es auch.**

**TC-FG-05: Ein leeres Feld gilt nicht als Auswahl.**

**TC-FG-06: Beim Öffnen ist das Feld wieder leer.**

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-klassisch.html](../../static-site/kiosk-klassisch.html) | Felder, `freiesGerichtAuf`, `freiesGerichtTipp` |
| [kiosk-mittag-tagwahl.spec.js](../../tests/kiosk-mittag-tagwahl.spec.js) | 6 Fälle |
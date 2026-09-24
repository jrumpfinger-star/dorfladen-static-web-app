# Artikel pflegen im Getränke-Reiter

## Overview

Aus dem Laden: *„Getränke können nicht bearbeitet werden und neue
hinzugefügt werden. Auch sehe ich die Kratzer Bestellnummer nicht."*

## Die Lage

**Der Server konnte längst beides.** `api/getraenke-artikel` beherrscht
`POST` (anlegen) und `PATCH` für Name, Nummer, Preis, Bestelltext, Gebinde
und Warengruppe. Es fehlte allein die Bedienung: Der Artikelreiter zeigte
nur **„Ausblenden"**.

Die Artikelnummer **stand da** — aber als `KA40015`. Das Kürzel `KA` vergeben
wir selbst, damit die Quelle erkennbar bleibt (Kratzer). Auf dem Formular des
Lieferanten steht die blanke Zahl; wer danach sucht, findet `KA40015` nicht.

## F1: Die Nummer ohne unser Kürzel

In der Liste und in der Maske steht **`40015`**, nicht `KA40015`.

Eine **Hausnummer** ohne echte Entsprechung bleibt unverändert stehen — sie
sähe sonst wie eine Lieferantennummer aus.

## F2: Bearbeiten

Jede Zeile trägt einen Knopf **„Bearbeiten"**. Die Maske ist vorbefüllt und
ändert: Bezeichnung, Bestelltext, Gebinde, Preis, Artikelnummer, Warengruppe.

- Eingetippt wird die **blanke Zahl**; das Kürzel setzt der Kiosk davor.
  Sonst fände der Server den Artikel später nicht wieder.
- Der **alte Schlüssel** (`alt_nummer`) geht mit — sonst wäre nach einer
  Nummernänderung nicht klar, welcher Artikel gemeint war.
- Ohne Bezeichnung wird **nicht gesendet**; die Maske sagt, warum.

## F3: Neu anlegen

Ein Knopf **„+ Neuer Artikel"** im Kopf des Artikelstamms.

Nicht zu verwechseln mit dem vorhandenen Dialog im *Bestell*reiter: Der legt
einen **Zusatzartikel für eine einzelne Bestellung** an. Hier geht es um den
**Stamm** — der Artikel bleibt und steht künftig in der Liste.

- Eine **leere Nummer bleibt leer**. Ein Kürzel auf nichts (`KA`) wäre keine
  Nummer, sähe aber wie eine aus.
- Gibt es den Namen schon, fragt der Server mit **409** zurück. Das ist kein
  Fehler: Zwei Sorten können gleich heißen und sich im Gebinde unterscheiden.
  Die Maske bietet dann **„Trotzdem anlegen"**.

## Test Cases

**TC-F20-01: Die Nummer steht ohne unser Kürzel da** — der gemeldete Fall.

**TC-F20-02: Jede Zeile hat einen Bearbeiten-Knopf.**

**TC-F20-03: Es gibt „+ Neuer Artikel".**

**TC-F20-04: Die Maske ist vorbefüllt** — auch hier die blanke Nummer.

**TC-F20-05: Speichern sendet ein PATCH mit Kürzel** — und mit dem alten
Schlüssel.

**TC-F20-06: Ohne Bezeichnung wird nicht gespeichert.**

**TC-F20-07: Anlegen sendet ein POST.**

**TC-F20-08: Eine leere Nummer bleibt leer.**

**Gegenprobe gemacht:** Ohne Kürzel-Umsetzung und ohne Bearbeiten-Knopf
fallen **5 von 8**.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-getraenke.js](../../static-site/js/kiosk-getraenke.js) | `nrKurz`, `artikelBearbeiten`, `artikelNeu`, Knopfbindung |
| [kiosk-klassisch.html](../../static-site/kiosk-klassisch.html) | `.gk-akopf`, `.gk-neu` |
| [kiosk-getraenke.spec.js](../../tests/kiosk-getraenke.spec.js) | 8 Fälle |
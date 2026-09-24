# Getränkebestellung als Excel-Mappe

## Overview

Beschwerde des Lieferanten (Yvette Abromeit, Getränke Helmut Kratzer):

> *„Hallo Zusammen, diese Übersicht ist für uns sehr ungünstig. Bitte nehmen
> Sie zukünftig unsere Bestellliste inkl. Bestell-Nr."*

Mitgeschickt: das eigene **Kunden-Bestellformular** (`.xlsx`) und das
**BESTELLFORMULAR.pdf** mit dem gewohnten Briefkopf.

## Was bisher ging

Reiner Text, ohne eine einzige Artikelnummer:

```
Guten Tag,

bitte liefern Sie uns zum Dienstag, den 29.09.2026:

25 Kisten Augustiner hell 0,5l
2 Kisten Tegernseer hell 0,5l
…
```

Für den Laden gewachsen und eingeübt — für den Lieferanten aber Handarbeit:
Er muss jede Zeile im Kopf auf seine Artikelnummer übersetzen, bevor er sie
eintippen kann. Genau das meinte „sehr ungünstig".

## F1: Die Artikelnummern

Der Katalog trug die Nummern größtenteils schon, mit dem Kürzel der Quelle
davor (`KA` für Kratzer). **Sieben Artikel hatten jedoch erfundene
Platzhalter** wie `AHO-LIMETTE` oder `WOLFRA-APFEL-KIRSCH` — angelegt, als
die echte Nummer unbekannt war.

Aus der Liste des Lieferanten ließen sich **fünf** eindeutig belegen:

| Platzhalter | Echte Nr. | Beleg aus der Liste |
|---|---|---|
| `AHO-LIMETTE` | 50071 | „Aho Limette PET 12x0,50" |
| `WOLFRA-APFEL-KIRSCH` | 50922 | „Wolfra Apfel Kirsch 6x1,00" |
| `WOLFRA-APFEL-KLAR` | 50926 | „Wolfra Apfel klar 6x1,00" |
| `WOLFRA-APFEL-TRUEB` | 50928 | „Wolfra Apfel trüb 6x1,00" |
| `WOLFRA-JOHANNISBEER` | 50951 | „Wolfra Johannisb. schwarz 6x1,00" |

**Offen bleibt einer:** `AHO-ORANGE-SPORT` („Aho Orange Sport Isotonisch PET
12x0,50"). Der Lieferant führt Kirsch (56040), Lemon (56041) und Pink
Grapefruit (50099) — **keine Orange**. Eine davon zu nehmen wäre geraten.

Ein Platzhalter erscheint in der Mappe **als leeres Feld**, nicht als Text.
`AHO-ORANGE-SPORT` sähe wie eine Nummer aus und würde den Lieferanten in die
Irre führen; leer ist ehrlich.

## F2: Die Mappe im Aufbau des Lieferanten

Spalten wie auf seinem Formular:

| | | |
|---|---|---|
| **A** Art.-Nr. | **B** Bezeichnung | **C** Menge |

- Die **Bezeichnung** ist die **seine**: Name + Gebinde, also
  „Augustiner Hell 20x0,50" — wörtlich wie auf seiner Liste. Unser
  `bestelltext` („Augustiner hell 0,5l") trägt die Größe schon im Text und
  ergäbe zusammen mit dem Gebinde das doppelte „0,5l 20x0,50".
- **Nur Bestelltes** steht drin, nicht der ganze Katalog mit fünfzig leeren
  Zeilen. Er muss eintippen, was kommt — nicht suchen, was fehlt.
- Eine **Summenzeile** schließt ab, ein **Hinweis des Ladens** kommt mit.
- Kopfzeilen sind **eingefroren** und wiederholen sich im Druck.

## F3: Der Briefkopf

Gemeldet: *„bau auch einen sinnvollen Header in Excel, so dass der Kunde
weiß, von wem die Bestellung stammt."*

Nach dem Vorbild des `BESTELLFORMULAR.pdf`:

```
Bestellung

An         Getränke Kratzer
Fax        08122 944150

Von        Dorfladen Oberornau UG
           Dorfplatz 1
           84419 Obertaufkirchen
Telefon    01578-5234667
Kd.-Nr.    15554
Tour       1

Liefertag  Dienstag, 29.09.2026
Erstellt   24.09.2026 14:30
```

Adresse, Telefon und Fax stehen in der **Konfiguration**, nicht fest im Code —
eine neue Nummer lässt sich so ändern, ohne dass jemand Code anfasst.

## F4: Text bleibt, Anhang kommt dazu

Die Mail behält ihren gewohnten Text. Zwei Gründe:

1. Im Laden ist er eingeübt, und die **Kopie an den Laden** bleibt lesbar.
2. Er ist das **Sicherheitsnetz**, falls der Anhang einmal hängen bleibt.

Scheitert die Erzeugung der Mappe, geht die Bestellung **trotzdem** raus —
nur ohne Anhang. Eine Bestellung darf nicht an einer Formatierung scheitern.

## Ohne neue Abhängigkeit

Eine `.xlsx` ist ein ZIP mit ein paar XML-Teilen; beides bringt Python mit.
`openpyxl` wäre bequemer, aber die Function läuft auf dem
Linux-Consumption-Plan — dieselbe Überlegung, die in `requirements.txt` schon
bei `fpdf2`/`pypdf` steht („reines Python, keine Systembibliotheken").

Geschrieben wird mit **inline strings** statt der gemeinsamen
Zeichenkettentabelle: ein XML-Teil weniger und keine Buchhaltung darüber.

**Gerade weil das Format selbst gebaut ist, macht der Wächter jede Mappe
wieder auf** — ein Formatfehler fiele sonst erst auf, wenn der Lieferant sie
nicht öffnen kann.

## Test Cases

`tools/getraenke_xlsx_test.py`, elf Abschnitte:

**TC-GX-01: Die Mappe ist eine gültige Datei** — ZIP ohne Fehler, alle sechs
Pflichtteile vorhanden, jeder Teil lesbares XML.

**TC-GX-02: Die Bestell-Nr. steht drin** — darum ging die Beschwerde.

**TC-GX-03: Das Präfix `KA` gehört uns** — es darf nicht mitgehen, ein
Platzhalter erst recht nicht.

**TC-GX-04: Die Bezeichnung ist die des Lieferanten** — und das Gebinde steht
nicht doppelt.

**TC-GX-05: Nur Bestelltes steht auf der Liste** — Menge 0 fällt weg.

**TC-GX-06: Der Kopf sagt, von wem die Bestellung kommt.**

**TC-GX-07: Die Summe stimmt.**

**TC-GX-08: Korrektur ist als solche erkennbar.**

**TC-GX-09: Ein Hinweis des Ladens kommt mit.**

**TC-GX-10: Randfälle stürzen nicht ab** — leere Bestellung, sowie `&`, `"`
und spitze Klammern im Namen (die brächen rohes XML).

**TC-GX-11: Der Dateiname nennt Tag und Art.**

**TC-GX-12: Zelltypen** — die Menge ist eine **Zahl** (sonst ließe sich in
Excel nichts summieren), die Artikelnummer bleibt **Text** (sonst fielen
führende Nullen weg, und der Lieferant suchte eine Nummer, die es so nicht
gibt).

Dazu in `tests/test_getraenke_order.py`: Beim Senden **hängt die Mappe
wirklich an**, heißt `.xlsx`, ist gültig und enthält die Nummer.

### Gegengeprüft mit dem echten Excel

Ein selbst gebautes Format darf man nicht nur mit dem eigenen Leser prüfen —
der macht dieselben Annahmen. Die Musterdatei wurde deshalb **in Excel
geöffnet** (über COM):

| | |
|---|---|
| Öffnen | ohne Warnung, ohne Reparaturhinweis |
| Blattname | `Bestellung` |
| Bereich | `A1:C30` |
| Menge C17 | `Double` = 25 — rechenbar |
| Artikelnummer A17 | `String` — führende Nullen blieben erhalten |
| Spaltenbreiten | 11,3 / 48,1 / 7,3 |
| Fixierung | ab Zeile 16 (Spaltenkopf bleibt stehen) |

Alle Umlaute kamen richtig an („Getränke Kratzer", „Flötzinger").

## Musterdatei

`tools/getraenke_mockup_xlsx.py` erzeugt
`Getränke/Muster-Bestellformular-Kratzer.xlsx` aus dem echten Katalog — zum
Ansehen, bevor die erste Bestellung rausgeht.

## Die Nummern müssen im Laden nachgezogen werden

**Der Code allein genügt nicht.** `vorlage/katalog.json` ist nur der
*Startbestand*: Sobald in Dataverse ein Katalog liegt, wird die Vorlage nicht
mehr gelesen (`load_artikel`: „ohne gespeicherten Bestand greift die
Vorlage"). Die im Repo geänderten Nummern kämen also nie an.

Gegen die Produktion gemessen (24.09.2026, nach dem Ausrollen):

| | |
|---|---|
| Code ausgerollt | **ja** — `getraenke_xlsx.py` und der Anhang sind live |
| Live-Katalog | 50 Artikel, **6 Platzhalter noch vorhanden** |

Dafür gibt es `tools/getraenke_nummern_nachziehen.py`. Es liest den
**Live**-Katalog, ersetzt die fünf belegten Platzhalter, prüft auf doppelte
Nummern und schreibt zurück:

```
python tools/getraenke_nummern_nachziehen.py              nur anzeigen
python tools/getraenke_nummern_nachziehen.py --schreiben
```

Es braucht dieselben App-Settings wie die API (`DV_*`) und läuft deshalb
dort, wo die hinterlegt sind — nicht auf einem Rechner ohne Zugangsdaten.

Bis dahin bleibt in der Mappe bei diesen sechs Artikeln die Nummernspalte
leer. Das ist der gewollte Rückfall aus F1: lieber leer als eine Nummer, die
es beim Lieferanten nicht gibt.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [getraenke_xlsx.py](../../api/getraenke-order/getraenke_xlsx.py) | neu: der Mappenschreiber |
| [getraenke-order/\_\_init\_\_.py](../../api/getraenke-order/__init__.py) | Mappe erzeugen und anhängen |
| [getraenke_store.py](../../api/getraenke-order/getraenke_store.py) | Kopfangaben in der Konfiguration |
| [vorlage/katalog.json](../../api/getraenke-order/vorlage/katalog.json) | fünf echte Artikelnummern |
| [getraenke_mockup_xlsx.py](../../tools/getraenke_mockup_xlsx.py) | neu: Musterdatei |
| [getraenke_nummern_nachziehen.py](../../tools/getraenke_nummern_nachziehen.py) | neu: Nummern im Live-Katalog |
| [getraenke_xlsx_test.py](../../tools/getraenke_xlsx_test.py) | neu, zwölf Abschnitte |

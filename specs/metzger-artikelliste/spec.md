# Metzger Mair – Artikelliste aufräumen

## Ausgangslage

Zwei Rückmeldungen zum Artikelstamm (102 Artikel):

1. **„Scrollt hinter den Buttons."** Beim Rollen schieben sich
   Artikelnamen sichtbar durch einen Spalt über der festen Kopfzeile.
2. **„Der Dialog kann viel schöner gemacht werden. So viel Leerraum."**

## Befund

### Der Spalt über dem Kopf

Nachgemessen an der laufenden Seite:

| Größe | Wert |
|---|---|
| Oberkante `#panel-metzgerbest` | 60 px |
| Innenabstand oben des Panels | 14 px |
| Oberkante `.mb-kopffest` beim Rollen | **74 px** |
| Lücke dazwischen | **14 px** |
| Was in der Lücke liegt | `SPAN.mb-aname` |

Der klebende Block trägt `margin-top: calc(var(--pad) * -1)`, damit er im
Ruhezustand optisch an seinem Platz sitzt. `position: sticky` rechnet den
Außenabstand jedoch mit: Bei `top: 0` klebt die **Margin-Box** an der
Oberkante, die sichtbare Border-Box also 14 px darunter. Genau durch
diesen Spalt rollen die Artikelnamen.

### Der Leerraum

Die Zeile war ein Flexbau mit `.mb-aname{flex:1}`. Der Name dehnte sich
über den freien Platz, alles Übrige wurde an den rechten Rand gedrückt —
zwischen Name und Warengruppe klaffte je nach Namenslänge eine
unterschiedlich große Lücke. Die Spalten standen dadurch in **keiner
Flucht**: Warengruppe und Preis sprangen von Zeile zu Zeile.

Dazu 102 einzelne weiße Kärtchen mit Schatten und 5 px Abstand — viel
Unruhe und viel verschenkte Höhe.

## Anforderungen

- **F1** Beim Rollen ist über der festen Kopfzeile **nichts** vom Inhalt
  zu sehen. Der klebende Block deckt bis zur Oberkante des Rollbereichs.
- **F2** Die Liste steht in fester Flucht: Nummer, Bezeichnung, Vorgabe,
  Warengruppe, Preis und die Schaltflächen haben feste Spalten.
- **F3** Der Preis ist rechtsbündig und mit gleichen Ziffernbreiten
  gesetzt, damit die Beträge untereinander stehen.
- **F4** Die Liste ist **eine** zusammenhängende Fläche mit feinen
  Trennlinien statt 102 einzelner Kärtchen.
- **F5** Eine Zeile wird deutlich flacher, ohne dass die Schaltflächen
  unter die bequeme Antippgröße fallen (mindestens 34 px hoch).
- **F6** „Bearbeiten" ist die Hauptaktion und hebt sich ab;
  „Ausblenden"/„Einblenden" steht ruhiger daneben.
- **F7** Ausgeblendete Artikel bleiben erkennbar gedämpft, aber lesbar.
- **F8** Auf schmalen Schirmen bricht die Zeile um; die Schaltflächen
  rutschen in eine eigene Reihe und bleiben erreichbar.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-A01 | Nach dem Rollen die Lücke über dem Kopf messen | **0 px**, kein Inhalt sichtbar |
| TC-A02 | `elementFromPoint` knapp über der Kopf-Oberkante | trifft **nicht** die Liste |
| TC-A03 | Warengruppen-Spalte in mehreren Zeilen | alle beginnen bei **derselben** x-Position |
| TC-A04 | Preis-Spalte in mehreren Zeilen | alle enden bei **derselben** x-Position |
| TC-A05 | Zeilenhöhe | flacher als vorher, aber Schaltflächen ≥ 34 px |
| TC-A06 | Schmaler Schirm (390 px) | Schaltflächen bleiben sichtbar und anklickbar |

# Getränke-Excel: kompakter Kopf, keine Fixierung

## Die Meldung aus dem Laden

> „Der Header der Excelliste verbraucht zu viele Spalten (16). Bitte Daten
> horizontal verteilen. Außerdem sollte der Header der Liste nicht fixiert
> sein."

## Befund

Gemeint waren die **Zeilen**, nicht die Spalten: Der Kopf lief streng
untereinander — Beschriftung in A, Wert in B, jede Angabe eine eigene
Zeile, dazwischen Leerzeilen zur Gliederung. Die Artikelliste begann
dadurch erst in **Zeile 16**.

Erschwerend: Genau diese sechzehn Zeilen waren **eingefroren**
(`pane ySplit="16"`). Beim Rollen blieb also der halbe Bildschirm mit
Absenderangaben stehen, während für die Artikel kaum Platz blieb. Das
Einfrieren war gut gemeint — bei über fünfzig Artikeln will man wissen,
welche Spalte welche ist — traf aber den falschen Bereich.

## Änderung

**Kopf horizontal:** zwei Blöcke nebeneinander statt einer langen Spalte.

```
        A          B                        C       D          E
1   Bestellung                                      Liefertag  Mittwoch, 30.09.2026
2
3   An         Getränke Kratzer                     Fax        08122 944150
4   Von        Dorfladen Oberornau UG               Telefon    01578-5234667
5              Dorfplatz 1                          Kd.-Nr.    15554
6              84419 Obertaufkirchen                Tour       1
7                                                   Erstellt   24.09.2026 18:30
8   Art.-Nr.   Bezeichnung              Menge
```

Links steht, **wer** schreibt und **an wen**; rechts die Nummern, über die
der Lieferant uns zuordnet. Der Liefertag steht oben neben dem Titel — er
ist die wichtigste Angabe des Blattes.

Die Spalten D und E tragen **nur** den Kopf; die Artikelliste bleibt bei
A/B/C, also genau so, wie der Lieferant sie kennt.

**Keine Fixierung mehr** — ersatzlos, wie gewünscht.

## Messwerte

| | vorher | nachher |
|---|---|---|
| Artikelliste beginnt in | **Zeile 16** | **Zeile 8** |
| Angaben rechts der Bezeichnungsspalte | 0 | 10 |
| eingefrorener Bereich | 16 Zeilen | keiner |

## Anforderungen

- **F1** Die Artikelliste beginnt spätestens in Zeile 10.
- **F2** Der Kopf nutzt auch die Spalten rechts der Bezeichnung.
- **F3** Der Liefertag steht in der ersten Zeile.
- **F4** Das Blatt enthält **keine** Fensterteilung.
- **F5** Keine Kopfangabe geht verloren: Fax, Kd.-Nr., Telefon, Straße,
  Ort, Tour, Erstellzeitpunkt bleiben vorhanden.
- **F6** Die Artikelliste behält Aufbau und Spalten (A/B/C).

## Testfälle (`tools/getraenke_xlsx_test.py`, Abschnitt 13)

| Fall | Erwartung |
|---|---|
| Beginn der Liste | Zeile ≤ 10 |
| Rechte Spalten | mindestens 4 gefüllte Angaben |
| Liefertag | in Zeile 1 |
| Fixierung | weder `state="frozen"` noch `<pane` |
| Kopfangaben | Fax, Kd.-Nr., Telefon, Straße erhalten |

## Gegenprobe

- **A — Fixierung wieder eingebaut**: genau die beiden Fixierungs-Fälle
  fallen („kein eingefrorener Bereich", „und gar keine Fensterteilung").
- **B — Kopf wieder untereinander**: „die Artikelliste beginnt in Zeile
  12" und „der Kopf nutzt auch die rechten Spalten (2 Angaben)" fallen.
  Die übrigen Prüfungen bleiben grün — die Kopfangaben gehen in beiden
  Varianten nicht verloren, geprüft wird wirklich nur die Anordnung.

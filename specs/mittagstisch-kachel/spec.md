# Mittagstisch-Kachel auf der Startseite

## Anlass

Rückmeldung aus dem Laden: „Die Anzeige des bestellten Mittagstisches auf
dem Handy ist zu klobig und die Texte werden abgeschnitten. Überarbeite
die Darstellung, so dass alles lesbar, aber auch das einzelne Gericht
kompakter dargestellt wird."

## Was gemessen wurde

Nachgestellt mit einer echten Bestellung (Gericht „Fischfilet mit
Dillsauce und Petersilienkartoffeln", Datum „Freitag, 18. September
2026") auf vier gängigen Handybreiten:

| Breite | Kachel | Abgeschnitten |
|---|---|---|
| 320 px | 198 × **219** px | Datum **und** Gericht |
| 360 px | 238 × **219** px | Datum **und** Gericht |
| 390 px | 268 × 164 px | Datum **und** Gericht |
| 414 px | 292 × 164 px | Gericht |

## Ursache

Zwei Dinge zusammen:

1. **Doppelter Zierrat.** Die Bestellkarte sitzt **innerhalb** der
   Mittagstisch-Kachel, die links bereits ein Symbol trägt. Die
   Bestellkarte brachte trotzdem ein eigenes Symbol (40 px) und einen
   Augen-Knopf (32 px) mit — zusammen rund **92 px** in einer Karte, die
   auf dem schmalsten Gerät nur **198 px** breit ist. Für den Text blieb
   kaum etwas übrig.
2. **`white-space: nowrap` mit Auslassungspunkten** auf Datum und
   Gericht. Damit *mussten* beide abschneiden, sobald es eng wurde.

Der Augen-Knopf war zudem funktional entbehrlich: Die ganze Karte ist
seit jeher anklickbar (`role="button"` mit `onclick` und Tastaturbedienung).

## Anforderungen

- **F1** Die Bestellkarte trägt **kein eigenes Symbol** und **keinen
  Augen-Knopf**. Die umgebende Kachel hat bereits ein Symbol, und die
  ganze Karte bleibt anklickbar.
- **F2** Das Datum steht in **Kurzform mit Wochentag** („Fr., 18. Sep."),
  nicht als „Freitag, 18. September 2026". Der Wochentag hilft im Alltag,
  das Jahr ist bei einer laufenden Bestellung entbehrlich.
- **F3** Der **Gerichtsname darf umbrechen** und wird nie abgeschnitten.
  Ein abgeschnittenes „Fischfilet mit Di…" sagt niemandem etwas.
- **F4** Auch die Liste bei **mehreren Bestellungen** schneidet nichts ab:
  Datum und Zustand oben, das Gericht darunter mit Umbruch.
- **F5** Datum, Menge und „Mitnehmen" stehen in **einer** Zeile
  zusammengefasst statt in dreien.
- **F6** Die Kachel bleibt **kompakt**: höchstens 140 px hoch (vorher bis
  219 px).
- **F7** Zustand („Abgeholt") und der Hinweis auf eine **ungelesene
  Antwort** bleiben sichtbar — sie waren nie das Problem.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-K01 | Breiten 320 / 360 / 390 / 414 px | **kein** Textknoten läuft aus seiner Box |
| TC-K02 | Kachelhöhe auf allen vier Breiten | höchstens **140 px** |
| TC-K03 | Langer Gerichtsname | steht **vollständig** da |
| TC-K04 | Datumszeile | Kurzform mit Wochentag, dazu Menge, „Mitnehmen", Zustand |
| TC-K05 | Zwei Bestellungen, Auswahlblatt | nichts abgeschnitten, voller Gerichtsname |
| TC-K06 | Antippen der Karte | öffnet `/bestellstatus` mit der Bestellnummer |

Wächter: `tests/mittagstisch-kachel.spec.js`.

Nachweis der Wirksamkeit: Dieselbe Messgröße (`scrollWidth > clientWidth`)
meldete **vor** der Änderung an allen vier Breiten Abschnitte und **danach**
an keiner.

## Ergebnis

| Breite | Vorher | Nachher |
|---|---|---|
| 320 px | 219 px, Datum + Gericht abgeschnitten | **117 px**, nichts abgeschnitten |
| 360 px | 219 px, Datum + Gericht abgeschnitten | **117 px**, nichts abgeschnitten |
| 390 px | 164 px, Datum + Gericht abgeschnitten | **117 px**, nichts abgeschnitten |
| 414 px | 164 px, Gericht abgeschnitten | **117 px**, nichts abgeschnitten |

Die Kachel ist damit auf schmalen Geräten **47 % flacher** — und zeigt
trotzdem mehr, weil nichts mehr fehlt.

## Berührte Dateien

- `static-site/index.html` — `renderWidget()` im Mittagstisch-Block:
  Einzelkarte neu aufgebaut, Listenzeilen zweizeilig, `fmtDateLong()`
  durch `fmtDateKurz()` ersetzt (die Langform war nur hier im Einsatz).

## Abgrenzung

Nicht verändert wurde die Kachel der **Fleisch-Bestellungen** direkt
darunter. Sie hat einen eigenen Aufbau; die Rückmeldung betraf den
Mittagstisch. Falls dort dasselbe auffällt, gehört es in eine eigene
Runde — mit eigener Messung.

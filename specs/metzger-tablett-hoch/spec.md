# Ladentablett im Hochformat, gleich hohe Kacheln

## Anlass

Aus dem Laden, zwei Anliegen in einer Nachricht:

> „Wir haben ein Tablet mit 1200 × 2000 Auflösung und wollen dies in
> Porträt bedienen. Nimm bitte diese Auflösung auch mit auf zum Testen und
> teste dies bei Änderungen mit, ob alle Elemente auch sauber platziert und
> dargestellt werden."

> „Außerdem kannst du bei 2-spaltiger Darstellung bei Metzger Mair die
> Kacheln links und rechts gleich hoch machen, so dass das Bild nicht so
> zerklüftet aussieht."

## Das Gerät

Ein Lenovo TAB P12 mit 1200 × 2000 Bildpunkten. Am Gerät gemessen wurde ein
Pixelverhältnis von **1,75**. Daraus ergeben sich die CSS-Pixel, auf die es
beim Gestalten ankommt:

| | Bildpunkte | CSS-Pixel |
|---|---|---|
| Hochformat | 1200 × 2000 | **686 × 1095** |
| Querformat | 2000 × 1200 | 1143 × 638 |

Die 1095 sind 1143 abzüglich 48 für die Systemleisten — auch das ist
gemessen: Im Querformat standen 686 CSS-Pixel Gerätehöhe 638 nutzbaren
gegenüber.

## Was gemessen wurde

Die Zerklüftung ist reproduziert und beziffert — je Rasterzeile der größte
Höhenunterschied zwischen den Kacheln:

| Ansicht | Spalten | Vorher | Nachher |
|---|---|---|---|
| Hochformat 686 | 1 | 0 px (bauartbedingt) | 0 px |
| Querformat 1143 | 2 | **44 px** | **0 px** |
| Vollbild 1280 | 2 | **44 px** | **0 px** |

## Ursache

`.mb-liste` ist ein Raster mit `align-items:start`. Die Höhe einer
Rasterzeile richtet sich nach der **größten** Kachel; mit `start` füllt die
kleinere ihre Zeile aber nicht aus. Unter einer Kachel mit einer Portion
blieb neben einer Kachel mit dreien also weißer Raum, und die Kartenkanten
standen nicht auf einer Linie.

## Zwei Befunde aus der neuen Auflösung

**1. Das Hochformat stand einspaltig — und verschenkte damit die Hälfte.**
Dem Listenbereich bleiben bei 686 CSS-Pixeln rund 574 px. Die
Zweispalten-Schwelle lag bei 600 px Behälterbreite; das Tablett verfehlte
sie um 26 px und stand deshalb einspaltig da, obwohl es mit 1095 px
**höher** ist als das iPad mini. Gemessen im selben Reiter:

| | Listenbreite | Spalten | sichtbare Artikel |
|---|---|---|---|
| iPad mini 768×1024 | 656 px | 2 × 315 px | 10 von 12 |
| Tablett 686×1095 **vorher** | 574 px | 1 × 559 px | **8 von 12** |
| Tablett 686×1095 **nachher** | 574 px | 2 × 274 px | **12 von 12** |

Die Kacheln sind dann 274 statt 315 px breit. Längere Namen brechen auf
zwei Zeilen um — die Antippflächen bleiben unverändert, und unter dem
Strich stehen mehr Artikel gleichzeitig da.

**2. Die Zähler in der Fußzeile verschwanden.**
Die Regel `@media (max-width:699px)` blendet „Positionen · kg · Stück ·
vakuumiert" aus — gedacht für Telefone, wo jeder Millimeter zählt. Das
Tablett ist mit 686 px schmal genug, um darunter zu fallen, hat aber
**1095 px Höhe**. Eng ist ein Gerät erst, wenn es schmal **und** niedrig
ist.

**Nebenbefund:** In der schmaleren Spalte brach „Sonnenblumenkernbrot"
ohne Trennstrich mitten im Wort um und ließ ein einzelnes „t" in der
zweiten Zeile stehen. Mit `hyphens:auto` und `lang="de"` am Dokument wird
jetzt an einer erlaubten Stelle getrennt: „Sonnenblumenkern-brot".

## Anforderungen

- **F1** Das Ladentablett im Hochformat (686 × 1095 CSS-Pixel) ist ein
  eigenes Testprofil (`tablet-hoch`) und läuft bei Änderungen mit.
- **F2** Im Hochformat steht die Bestellliste **zweispaltig**. Die
  Zweispalten-Schwelle liegt bei 560 px Behälterbreite. Die bestehende
  600er-Stufe bleibt erhalten, damit breitere Behälter weiterhin ihre
  300 px bekommen — sonst kippten sie bei 880 px auf drei Spalten.
- **F3** In der Zweispalten-Ansicht sind die Kacheln einer Rasterzeile
  **gleich hoch**. Der Inhalt bleibt dabei oben — zentriert würde der Name
  je nach Zahl der Portionen auf- und abwandern.
- **F4** Die Zähler der Fußzeile entfallen nur auf Geräten, die schmal
  **und** niedrig sind (bis 699 × 950). Auf dem Tablett bleiben sie.
- **F5** Auf dem Tablett ragt nichts über den rechten Rand hinaus.
  Waagerechtes Rollen ist auf einem Kiosk immer ein Fehler — was rechts
  hinausragt, wird nie gefunden.
- **F6** Der feste Kopf verdeckt die erste Kachel nicht.
- **F7** Die Bedienknöpfe behalten ihre Antippgröße. Gleich hohe Kacheln
  dürfen nicht damit erkauft werden, dass die Knöpfe gestaucht werden.
- **F8** Lange zusammengesetzte Wörter werden **getrennt**, nicht mitten
  im Wort gebrochen.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-T01 | beide Lagen, Kacheln je Rasterzeile | Höhenunterschied ≤ 1 px |
| TC-T02 | Hochformat 686 | **zwei** Spalten |
| TC-T03 | beide Lagen | keine Kachel ragt aus der Liste |
| TC-T04 | Hochformat, `elementFromPoint` auf der ersten Kachel | trifft die Kachel, nicht den Kopf |
| TC-T05 | Hochformat, Fußzeile | Zähler sind sichtbar |
| TC-T06 | Hochformat, Bedienknöpfe | mindestens 32 px hoch |
| TC-T07 | Hochformat, alle Elemente des Reiters | nichts über dem rechten Rand |
| TC-T08 | Hochformat, Artikelname | Silbentrennung eingeschaltet |

Wächter: `tests/kiosk-metzger-vorblendung.spec.js`, Block „Bestellliste auf
dem Ladentablett".

**Nachweis der Wirksamkeit:** Mit zurückgenommener Änderung scheitern
genau TC-T01, TC-T02, TC-T05 und TC-T08 — also die vier, die neues
Verhalten sichern. Die übrigen vier bestehen; sie beschreiben Verhalten,
das schon vorher stimmte.

## Eine Falle beim Messen der Spaltenzahl

Die Spaltenzahl darf **nicht** an der ersten Rasterzeile abgelesen werden.
Steht dort eine Warengruppe mit nur einem Artikel — im Laden etwa
„Geflügel" mit einer einzigen Position —, sieht jede Liste einspaltig aus.
Verlässlich ist die Zahl der verschiedenen linken Kanten über alle Kacheln.

## Ein Fehler in den Testdaten, der vorher unbemerkt blieb

`VIELE` gab jedem Füllartikel eine **andere** Warengruppe (`i % 2`).
Dadurch bekam jeder Artikel eine eigene Zwischenüberschrift und stand
allein in seiner Rasterzeile — in der Zweispalten-Ansicht stand nie eine
Kachel neben einer anderen. Ein Wächter auf gleiche Höhen wäre dort blind
gewesen: Er hätte bestanden, ohne je etwas geprüft zu haben.

Jetzt kommen die Gruppen in Blöcken (30 und 30), und jeder dritte Artikel
trägt eine mehrteilige Vorgabe. Erst dadurch entstehen überhaupt
unterschiedlich hohe Nachbarkacheln — der Fall, um den es geht.

## Berührte Dateien

- `playwright.config.js` — Profil `tablet-hoch`, Herleitung der Maße
- `.specify/memory/constitution.md` — Prinzip 7 und 8 sowie die Quality
  Gates nennen jetzt **vier** Viewports statt drei
- `static-site/kiosk-klassisch.html` — **Quelle** der Kiosk-Grundgestaltung;
  `.mb-liste` auf `align-items:stretch`, `.mb-row` auf `align-content:start`.
  `css/kiosk-base.css`, `kiosk.html` und `kiosk-neu.html` werden daraus von
  `tools/build-kiosk-neu.js` erzeugt und **nicht von Hand** geändert.
- `static-site/css/kiosk-neu.css` — Zweispalten-Stufe ab 560 px,
  Höhenbedingung an der Fußzeilen-Regel, Silbentrennung am Artikelnamen
- `tests/kiosk-metzger-vorblendung.spec.js` — Wächter und richtige Testdaten

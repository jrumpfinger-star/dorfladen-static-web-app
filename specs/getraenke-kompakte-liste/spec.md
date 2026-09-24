# Getränke-Bestellliste: flache Artikelkarte auf Tablet und Rechner

## Die Meldung aus dem Laden

> „Könnte die Darstellung nicht übersichtlicher und kompakter sein?"

## Gemessen (vier Artikel, gleiche Daten, alle vier Ansichten)

| Ansicht | Kartenhöhe | Spalten |
|---|---|---|
| iPad mini (768) | 54 px | 1 |
| Ladentablett (686) | 82 px | 1 |
| Handy (375) | 55–90 px | 1 |
| **Rechner (1280)** | **103–152 px** | 2 |

Der Rechner ist der Ausreißer — bis zum Dreifachen.

## Die Ursache

Nicht die Karte war zu groß, sondern das Zusammenspiel mit der
**Mehrspaltigkeit**. `.gk-zeile` war als `minmax(120px, var(--gk-namensp))
| minmax(0,1fr)` definiert: Die Namensspalte durfte bis **250 px**
beanspruchen, für Vorschlagsknöpfe und Zähler blieb der Rest. In einer
zweiten Spalte reichte das nicht — die Bedienzeile brach um, Zähler oben,
Vorschläge darunter.

Damit halbierte die zweite Spalte zwar die Zeilenzahl, **verdoppelte aber
die Zeilenhöhe**. Der Gewinn verpuffte fast vollständig.

## Änderung

Für Breiten ab 560 px:

```css
#panel-getraenke .gk-chips{ display:contents }
#panel-getraenke .gk-zeile{ grid-template-columns:minmax(0,1fr) auto auto }
#panel-getraenke .gk-sugg{ order:2; flex-wrap:nowrap }
#panel-getraenke .gk-step{ order:3 }
```

Der Name darf schrumpfen, Vorschläge und Zähler bekommen ihre natürliche
Breite. Damit ist die Zeile immer einzeilig.

**Ergebnis: 103–152 px → 54 px.** Hochgerechnet auf fünfzig Artikel in
zwei Spalten sinkt die Rollstrecke von rund 3100 px auf rund 1400 px.

## Was bewusst NICHT geändert wurde

Die Vorschlagsknöpfe bleiben auch dort stehen, wo schon eine Menge
erfasst ist. Auf dem Telefon werden sie dann ausgeblendet, weil der Platz
fehlt — hier wäre es ein Verlust ohne Gegenwert: Mit „letzte 10" springt
man von einer geänderten Menge zurück, und genau diese Rückkehr ist im
Laden der häufige Fall. Der gesamte Gewinn stammt aus der Anordnung, nicht
aus dem Weglassen. **TC-GK-04** hält das fest.

## Anforderungen

- **F1** Die Artikelkarte misst auf Tablet und Rechner höchstens 70 px.
- **F2** Das gilt auch, wenn bereits eine Menge erfasst ist.
- **F3** Zähler und Vorschläge liegen auf einer Linie (kein Umbruch).
- **F4** Die Vorschlagsknöpfe bleiben bei erfasster Menge erreichbar.
- **F5** Das Telefon behält seinen eigenen, bereits erarbeiteten Aufbau.

## Testfälle (`tests/kiosk-getraenke.spec.js`, Abschnitt GK)

| Fall | Erwartung |
|---|---|
| TC-GK-01 | Karte ≤ 70 px |
| TC-GK-02 | auch mit erfasster Menge ≤ 70 px |
| TC-GK-03 | Zähler und Vorschläge auf einer Mittellinie |
| TC-GK-04 | Vorschlagsknopf bei erfasster Menge sichtbar |

## Gegenprobe — und eine Korrektur meiner ersten Erklärung

Zuerst hatte ich `display:contents` als Ursache benannt. **Die Gegenprobe
hat das widerlegt:**

- `display:contents` → `display:flex` zurückgedreht: **kein Fall fällt.**
  Die Regel macht die Absicht nur lesbar, sie bewirkt die Ersparnis nicht.
- Rasterdefinition zurückgedreht: **TC-GK-01, -02 und -03 fallen**, mit
  `Kartenhöhen 98, 98, 98, 98`.

Die Rasterdefinition ist die Ursache. Der Kommentar im CSS wurde
entsprechend richtiggestellt.

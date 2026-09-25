# Mittagstisch: Preis in schmalen Karten

## Die Meldung aus dem Laden

> „Der Preis wird nicht komplett in einigen Kacheln angezeigt."

Aus „8,80 €" wurde „80 €".

## Gemessen — dieselben Bestellungen, alle Breiten

| Fenster | Karte | Kennzeichen hat / braucht | gequetscht |
|---|---|---|---|
| 1280 px | 496 px | 172 / 172 | nein |
| 768 px | 639 px | 315 / 315 | nein |
| 686 px | 557 px | 233 / 233 | nein |
| **375 px** | **334 px** | **47 / 73** | **ja** |

## Die Ursache — nicht der Preis

Nicht der Preis war zu schmal, sondern der **Kennzeichenblock**. Er steht
in Spalte 1 des Kartenkopfs:

```css
grid-template-columns: minmax(0,1fr) auto auto auto;
.k-oc-badges{ min-width:0 }
```

`minmax(0,1fr)` erlaubt ihm, **unter seine Inhaltsbreite** zu schrumpfen.
Ab etwa 410 px Kartenbreite bleibt weniger als die 73 px, die „BESTÄTIGT"
braucht — die Kennzeichen laufen über ihren Kasten hinaus und zeichnen
über den Preis.

Rechnung zur Schwelle: 73 (Kennzeichen) + 203 (Knöpfe) + 44 (Preis) +
40 (Menge) + Abstände ≈ **412 px**.

## Warum es auf dem Rechner auffiel

Betroffen ist jede Karte unter ~410 px. Das sind:

- das **Telefon** (Karte 334 px), und
- jeder breite Schirm, auf dem das Raster `repeat(auto-fill,
  minmax(330px,1fr))` **vier Spalten** legt — dort misst die Karte rund
  340 px. Genau diese Lage zeigt das eingereichte Bild.

Bei 1280 px legt dasselbe Raster nur zwei Spalten (Karte 496 px), und
alles passt. Deshalb hängt der Fehler an der **Kartenbreite**, nicht an
der Fensterbreite.

## Änderung

Eine **Behälterabfrage** statt einer Fensterabfrage — entscheidend ist die
Breite der Karte:

```css
#panel-mittag .k-order{ container-type:inline-size }

@container (max-width:430px){
  #panel-mittag .k-order-hdr{ grid-template-columns:auto auto minmax(0,1fr) auto }
  .k-oc-price{ grid-column:1; grid-row:2 }
  .k-oc-qty{   grid-column:2; grid-row:2 }
  .k-oc-badges{ grid-column:1 / 4; grid-row:3 }   /* eigene Zeile */
  .k-oc-actions{ grid-row:1 / 4 }
}
```

In der schmalen Karte bekommen die Kennzeichen eine **eigene Zeile**, in
der sie umbrechen dürfen. In der breiten bleibt die kompakte Anordnung —
die Korrektur kostet nicht überall eine Zeile.

## Ergebnis

Handy-Karte 334 px: Kennzeichen **150 / 150** statt 47 / 73.

## Anforderungen

- **F1** Der Kennzeichenblock wird nie unter seine Inhaltsbreite gequetscht.
- **F2** Kein Kennzeichen überschneidet den Preis.
- **F3** Das gilt auch bei 340 px Kartenbreite (der gemeldete Fall).
- **F4** Und bei 330 px — der kleinsten Breite, die das Raster zulässt.
- **F5** Auf Karten über 430 px bleibt die kompakte Anordnung erhalten.
- **F6** Der Preis steht vollständig da, auch „137,20 €".

## Testfälle (`tests/mittagstisch-preis-kachel.spec.js`)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-MP-01 | natürliche Anordnung | nichts gequetscht |
| TC-MP-02 | natürliche Anordnung | keine Überschneidung |
| TC-MP-03 | Karte auf 340 px | alles lesbar |
| TC-MP-04 | Karte auf 330 px | Anordnung hält |
| TC-MP-05 | Karte auf 600 px | Kennzeichen und Preis auf einer Linie |
| TC-MP-06 | Karte auf 340 px | „137,20 €" vollständig |

**22/24 grün**, 2 übersprungen (TC-MP-05 braucht ein Fenster ≥ 700 px —
schmaler passt keine Karte über 430 px).

## Zwei Testfehler, die mich aufhielten

1. Die Überschneidungsprüfung war zunächst rein **waagerecht**. Stehen die
   Kennzeichen eine Zeile tiefer (`preisZeile 435`, `badgeZeile 459`),
   überdecken sie nichts — der Fall meldete trotzdem Alarm. Jetzt wird die
   echte Rechteck-Überschneidung geprüft, waagerecht **und** senkrecht.
2. TC-MP-05 verglich **Oberkanten**. Bei mehrzeiligen Kennzeichen zentriert
   das Raster beide Kästen unterschiedlich; der Fall fiel zu Unrecht. Jetzt
   werden die **Mittellinien** verglichen.

## Gegenprobe

Die Behälterabfrage abgeschaltet, bei 340 px Kartenbreite:

```
Elo        Karte 338   Kennzeichen hat 14, braucht 73   überdeckt: ja
Pfarrer    Karte 338   hat 14, braucht 73               überdeckt: ja
Bublak     Karte 338   hat  7, braucht 73               überdeckt: ja
Gasthaus   Karte 338   hat  0, braucht 73               überdeckt: ja
```

**TC-MP-03** fällt — genau der gemeldete Zustand: Der Kennzeichenblock
schrumpft auf 0–14 px, obwohl er 73 braucht, und zeichnet über den Preis.
Bemerkenswert: `preisSichtbar` bleibt dabei **true**. Der Preis ist also
technisch vollständig da und wird nur **verdeckt** — deshalb ließ sich der
Fehler mit einer reinen Breitenprüfung am Preis nicht finden.

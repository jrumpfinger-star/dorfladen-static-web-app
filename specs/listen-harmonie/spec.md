# Ein Listenbaustein für Bäcker, Metzger, Getränke und Drax

## Die Meldung aus dem Laden

> „Die Anzeige ist lieblos, die Schriftarten entsprechen nicht dem Standard
> und die Texte sind daher schwer lesbar. Es ist sehr viel Luft in der
> Zeile, weil die Breite nicht dynamisch ausgenutzt wird. Warum erfindest
> du das Rad immer wieder neu, wenn es gute Beispiele wie beim Bäcker gibt?
> Harmonisiere die Listen bei Bäcker, Metzger und Getränke, so dass sie
> alle ähnlich bedienbar sind und aussehen."

Und: „Gleiches gilt bei Verlauf. Alles schaut anders aus."

Dazu: „Setz den Mockup so um."

## Befund — dreimal dieselbe Liste, dreimal anders gebaut

| Artikelliste | Aufbau | Schrift Nr./Meta | Knöpfe |
|---|---|---|---|
| Bäcker | Raster 54 · 1fr · auto · 34 · 46 | 13,5 px | Stift + Schiebeschalter |
| Metzger | Raster 44 · 1fr · 116 · 74 · 104 · 104 | 12 px | 2 Textknöpfe |
| **Getränke** | Flex mit Umbruch | **11 px Monospace** | 2 Textknöpfe |

Die drei Punkte der Kritik, benannt:

- **„schwer lesbar"** — die Monospace-Schrift ist für Zahlenkolonnen
  gedacht. Bei Getränken stand sie auch an **Gebinde** und **Preis**, in
  11 px.
- **„viel Luft in der Zeile"** — der Name trug `flex:1` und schob alles
  Übrige an den rechten Rand.
- **„Breite nicht dynamisch ausgenutzt"** — die Getränkeliste war
  einspaltig; auf dem Rechner blieben zwei Drittel der Breite leer.

## Der gemeinsame Baustein

```
.dl-liste   Raster, repeat(auto-fill, minmax(min(340px,100%), 1fr))
.dl-zeile   52px | minmax(0,1fr) | auto | auto | auto
.dl-nr      Nummernplättchen, Tabellenziffern, KEINE Monospace
.dl-nm      Name (b) + Unterzeile (.dl-sub)
.dl-meta    rechtsbündig, Tabellenziffern
.dl-ik      Symbolknopf 44 × 44
```

Vorbild ist der Bäcker, wie gewünscht — ergänzt um die **Meta-Spalte**
mit Tabellenziffern, damit Preise untereinander stehen.

**Lieferantenspezifisch bleibt nur die Unterzeile:**

| | Unterzeile | Meta |
|---|---|---|
| Getränke | Gebinde | Preis je Kiste |
| Metzger | hinterlegte Vorgabe | Preis je kg |
| Bäcker | Anlagedatum | wie oft bestellt |

## Zwei Entscheidungen gegen das Mockup

1. **44 px statt 38 px** für die Symbolknöpfe. Das Mockup hatte 38; der
   bestehende Wächter **TC-A05** hat das zu Recht gerissen: Die
   projektweite Antippgröße `--tap-min` ist eine Grundsatzentscheidung.
   Der Platzgewinn kommt aus dem Wegfall der Beschriftung, nicht aus
   kleineren Zielen.
2. **340 px Spaltenschwelle**, gemessen statt geschätzt. Bei 320 px passten
   zwar zwei Spalten aufs Ladentablett, aber elf Texte wurden gekürzt —
   schon „20 × 0,50 l · Mehrweg" ging nicht mehr hinein, und die Zeile
   wuchs auf 87 px.

   **Nachgemessen am 06.10.2026: jetzt 384 px** — siehe „Der dritte Knopf
   kostet eine Antippgröße" weiter unten.

## Was entfällt

Die **Warengruppe** stand beim Metzger in jeder Zeile — obwohl die Zeile
bereits unter dem Gruppenkopf einsortiert ist. Das war Doppelung und
kostete 116 px je Zeile.

Der **Schiebeschalter** des Bäckers (46 × 26 px) wird zum Symbolknopf: Er
lag unter der Antippgröße und war das einzige Bedienelement dieser Art im
Kiosk.

## Messwerte (Getränke, echte Kioskansicht)

| Ansicht | Spalten | Zeilenhöhe | Antippgröße | Überlauf |
|---|---|---|---|---|
| Rechner 1280 | 2 | 60 px | 44 px | 0 |
| iPad mini 768 | 1 | 60 px | 44 px | 0 |
| Ladentablett 686 | 1 | 60 px | 44 px | 0 |
| Handy 375 | 1 | 67–85 px | 44 px | 0 |

Kein Querrollen, nichts ragt aus der Zeile.

## Anforderungen

- **F1** Alle vier Artikellisten benutzen `.dl-liste` / `.dl-zeile` —
  Bäcker, Metzger, Getränke und Drax.
- **F2** Nirgends steht Monospace-Schrift in einer Listenzeile.
- **F3** Zwei Symbolknöpfe je Zeile, mindestens 44 px.
- **F4** Die Breite wird genutzt: ab 1200 px mehr als eine Spalte.
- **F5** Die Seite rollt nicht waagerecht; nichts ragt aus der Zeile.
- **F6** Ein ausgeblendeter Artikel ist erkennbar (Klasse, Marke,
  zugeklapptes Auge).
- **F7** Die Beschriftungen bleiben im `aria-label` erhalten — sie werden
  vorgelesen und die bestehenden Wächter finden sie weiterhin.
- **F8** Über jeder Artikelliste steht derselbe Kopf: Anzahl links, Suche
  in der Mitte, grüner Knopf „+ Neuer Artikel" rechts.

## Testfälle (`tests/kiosk-listen-harmonie.spec.js`)

| Fall | Erwartung |
|---|---|
| TC-LH-01 | die Liste benutzt den gemeinsamen Baustein |
| TC-LH-02 | keine Monospace-Schrift |
| TC-LH-03 | zwei Symbolknöpfe je Zeile, ≥ 44 px |
| TC-LH-04 | mehrspaltig ab 1200 px, kein Querrollen |
| TC-LH-05 | nichts ragt aus der Zeile |
| TC-LH-06 | ausgeblendeter Artikel erkennbar |

**24/24 grün** über alle vier Auflösungen des Projekts.

## Gegenprobe

Die Monospace-Regel wieder eingesetzt → **TC-LH-02** fällt mit
`Monospace an: dl-nr gk-anr, dl-meta gk-anr` — genau die Stellen, die im
Laden als „schwer lesbar" auffielen.

## Angepasste Altfälle

`tests/kiosk-metzger-vorblendung.spec.js` prüfte die **alte** Anordnung:

- **TC-A03/A04** hieß „Warengruppe und Preis stehen in einer Flucht". Die
  Warengruppe steht nicht mehr in der Zeile. Der Fall prüft jetzt die
  Preisflucht — und zwar innerhalb **derselben Rasterspalte**, denn bei
  mehreren Spalten haben Nachbarzeilen naturgemäß andere rechte Kanten.
- **TC-A05** maß `.mb-btn`; es sind jetzt `.dl-ik`. Die Aussage bleibt:
  Antippgröße ≥ 44 px, beide Knöpfe auf einer Reihe.
- **TC-A08** verlangte **genau** eine Spalte bei 1280 und **genau** zwei
  bei 1600. Der gemeinsame Baustein rechnet mit der verfügbaren Breite;
  die Zahl ist kein fester Wert mehr. Geprüft wird jetzt das Wachsen.

## Der Verlauf — ebenfalls ein Baustein

Vorher:

| Verlauf | Aufbau | Positionen aufklappbar | Status |
|---|---|---|---|
| Bäcker | Raster 150 · 1fr · auto×3 | ja | eigene Spalte |
| **Metzger** | Flex | **nein** | Textmarke in der Zeile |
| Getränke | Flex mit Umbruch | ja | eigene Spalte |

Der Metzger war der Einzige, dessen Verlauf sich **nicht aufklappen**
ließ: Man sah nur Zahlen — „14 Positionen · 23,4 kg" — und musste das
Formular öffnen, um zu erfahren, *was* bestellt wurde.

Jetzt für alle drei: `.dl-vliste` / `.dl-vzeile` mit Farbstreifen links
(gesendet grün, korrigiert bernstein), aufklappbarem Kopf, Status mit
Uhrzeit und Urheber, Schaltflächen rechts.

**Serverseitig ergänzt:** `api/metzger-order` schickt die Positionen jetzt
im Verlauf mit. Die Menge kommt aus `position_text()` — **derselben**
Funktion, die Formular und Mail benutzen. Eine eigene Darstellung zu
erfinden hieße, dass der Verlauf etwas anderes zeigen könnte als das, was
der Metzger bekommen hat.

**Lieferantenspezifisch bleibt:**

| | Unterzeile | erster Knopf |
|---|---|---|
| Getränke | Kisten · Positionen | — |
| Metzger | Positionen · kg · vakuumiert | Formular |
| Bäcker | Positionen · Stück | Erneut drucken |

### Testfälle Verlauf

`tests/kiosk-listen-harmonie.spec.js` (Abschnitt LV):

| Fall | Erwartung |
|---|---|
| TC-LV-01 | der Verlauf benutzt den gemeinsamen Baustein |
| TC-LV-02 | Status, Uhrzeit und Urheber als eigenes Feld |
| TC-LV-03 | korrigiert ist farblich abgesetzt, jüngster Eintrag |
| TC-LV-04 | die Positionen lassen sich aufklappen |
| TC-LV-05 | nichts ragt heraus, kein Querrollen |

`tests/test_metzger_verlauf.py` (Abschnitt MV) prüft die Serverseite:
nur Gesendetes, Positionen dabei, Nullpositionen draußen, Menge als
lesbarer Text, Summen und Protokoll unverändert. **13 Prüfungen.**

### Gegenproben Verlauf

- Aufklappen abgeschaltet → **TC-LV-04** fällt, die vier übrigen bleiben grün.
- Positionen serverseitig wieder entfernt → **TC-MV-02** fällt.

### Angepasster Altfall

`TC-F10-01` (Bäcker) erwartete klein geschriebenes „korrigiert". Der
Status steht jetzt bei allen drei als eigenes Feld mit „Gesendet" bzw.
„Korrigiert". Geprüft wird das Wort, nicht die Schreibweise.

## Nachtrag — Drax und die Dialogart

Aus dem Laden, nachdem Drax dazukam:

> „Ich dachte du hast es konsistent gemacht. Der Button Artikel anlegen
> entspricht nicht den anderen und der Dialog ist auch nicht modal."

Zwei Befunde:

1. **Drax hatte eine Tabelle** statt des gemeinsamen Bausteins, mit drei
   Textknöpfen je Zeile und einem schlichten Knopf „Artikel anlegen". Es
   war die vierte Artikelliste und die einzige, die wieder anders aussah.
   Behoben: `.dl-liste` / `.dl-zeile` / `.dl-ik` und derselbe Kopf wie bei
   den anderen (F1, F8).

2. **Die Dialoge liefen auseinander**, und zwar schon vorher:

   | Modul | ab 1180 px | Abdunklung |
   |---|---|---|
   | Getränke | mittige Karte | 0,55 |
   | Bäcker | rechts angedockte Spalte | 0,28 |
   | Metzger | rechts angedockte Spalte | 0,28 |

   Die angedockte Spalte mit kaum abgedunkeltem Grund liest sich nicht als
   Dialog, sondern als Seitenleiste — daher „nicht modal".

### Entscheidung

Alle Dialoge des Kiosks stehen als **mittige Karte über abgedunkeltem
Grund** (0,55). Die Andockung rechts ab 1180 px entfällt.

Das Blatt am unteren Rand auf dem Telefon **bleibt**: Unter 640 px ist
eine mittige Karte kein Gewinn, und der Grundsatz F6 — ein Dialog liegt
vollständig im Blickfeld — gilt dort gerade durch das Blatt.

- **F9** Oberhalb von 640 px steht jeder Dialog mittig als Karte, nicht
  angedockt.
- **F10** Der Grund hinter einem offenen Dialog ist deutlich abgedunkelt
  (mindestens 0,5).

### Folgeänderung

`.mb-aform` war zweispaltig **nur** zwischen 600 und 1179 px, weil das
Blatt darüber schmal andockte. Da es jetzt auf jeder Breite eine
640-px-Karte ist, gilt die Zweispaltigkeit durchgehend ab 600 px.

## Der dritte Knopf kostet eine Antippgröße

Aus dem Laden, kurz nach dem Löschen-Knopf:

> „Was ist hier passiert? Die Texte sind ja nicht mehr lesbar so."

Der Artikelstamm bei Metzger und Getränken brach Wörter Buchstabe für
Buchstabe um: „Obe rsch alen schn itzel", „Aho Individu al Classic Glas".

### Ursache

Der feste Anteil einer `.dl-zeile` beträgt **297 px** — Nummernplättchen,
Meta-Spalte, drei Symbolknöpfe und fünf Abstände. Der Name bekommt, was
übrig bleibt. Die gemessenen **340 px** Spaltenschwelle stammten aus der
Zeit mit **zwei** Knöpfen; der Löschen-Knopf hat den festen Anteil um eine
volle Antippgröße (44 px) vergrößert, ohne dass die Schwelle mitwuchs.

Gemessen bei 340 px Schwelle, schmalster Namensbereich je Fensterbreite:

| Fenster | Spalten | Name | Zeilenhöhe |
|---|---|---|---|
| 1920 | 5 | **17 px** | 234 px |
| 1600 | 4 | 33 px | 134 px |
| 1180 | 3 | 23 px | 184 px |
| 800 | 2 | 26 px | 169 px |

### Entscheidung

**340 + 44 = 384 px.** Die Schwelle wächst genau um den hinzugekommenen
Knopf. Nachgemessen über 1920 bis 390 px: einzeilige Namen bei
höchstmöglicher Spaltenzahl, kein Überlauf, kein Querrollen.

| Fenster | Spalten | Name | Zeilenhöhe |
|---|---|---|---|
| 1920 | 4 | 146 px | 69 px |
| 1600 | 3 | 198 px | 69 px |
| 1280 | 3 | 92 px | 84 px |
| 1180 | 2 | 249 px | 60 px |
| 800 | 1 | 446 px | 60 px |

Der Preis dafür ist je eine Spalte weniger bei 1920, 1600 und 1180 px.
Das ist der ehrliche Gegenwert des dritten Knopfes — und lesbare Namen
waren der Grund, aus dem diese Spec überhaupt entstand.

### Zweiter Befund: die Warengruppe war zurück

Beim Metzger stand in der Meta-Spalte bei fehlendem Preis die
**Warengruppe** (`a.preis ? 'je kg' : esc(a.gruppe)`) — ein langer Text in
einer Spalte, die nicht umbricht. Genau diese Doppelung hatte die Spec
unter „Was entfällt" bereits gestrichen. Sie steht jetzt wieder nur im
Gruppenkopf; die Zeile zeigt „ohne Preis".

- **F11** Der feste Anteil einer Listenzeile und die Spaltenschwelle
  gehören zusammen: Kommt eine Aktion hinzu, wächst die Schwelle um eine
  Antippgröße.
- **F12** In der Zeile steht keine Warengruppe — auch nicht ersatzweise.

## Offen

Die Dialoge des **CMS** (`cms-neu.css`) docken weiterhin ab 1180 px an.
Das ist eine andere Oberfläche und war nicht Teil der Meldung.

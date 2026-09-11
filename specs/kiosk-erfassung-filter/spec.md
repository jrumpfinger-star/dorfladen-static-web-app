# Erfassung und Filter im Kiosk — Specification

**Status:** Abgenommen (Mockup freigegeben am 11.09.2026)

**Owner:** Ladenleitung Dorfladen Oberornau

**Last updated:** 2026-09-11

**Mockup:** `mockups/erfassung-filter-mockup.html` (Live-Daten, bedienbar)

## Overview

Nach dem Umbau der Bestellreiter für Telefone
(`specs/kiosk-bestellreiter-mobil`) sind zwei Dinge unbrauchbar geblieben:

**1. Die Portions-Erfassung bei Mair.** Sie öffnet sich unter dem Artikel,
ist aber höher als der verbliebene Platz. Gemeldet wurde:

> „Man erkennt überhaupt nicht mehr, für was man die Erfassung macht, die
> Erfassung selbst ist nicht komplett sichtbar. Die Liste scrollt undefiniert
> irgendwo hin nach Erfassung."

Ursachen im Bestand:

- `edit()` und `pad()` rufen `render()`, das `#metzgerbest-body` komplett neu
  schreibt. Dabei entsteht `.k-liste` neu und ihr `scrollTop` fällt auf 0 —
  danach verschiebt `inSicht()` um einen Betrag, der aus den neuen Maßen
  stammt. Ergebnis: Die Liste springt nach jeder Portion.
- `inSicht()` legt die **Oberkante des Editors** an, nicht die der Zeile. Der
  Artikelname wandert dadurch aus dem Bild — man erfasst blind.
- Der Editor trägt vier Gruppen (Vorschläge, Kurzeingabe, Portionsfeld,
  Hinweis) plus eine Aktionszeile. Auf 360 × 640 ist das ein Vielfaches des
  verfügbaren Platzes.
- „+ Hinzufügen" ist irreführend: Eine Kachel legt bereits an
  (`kachel()` ruft `pad()`), der Knopf verleitet zum doppelten Anlegen.
- „Fertig" kostet eine eigene Zeile, obwohl das `+` an der Zeile genügt.

**2. Die Filter stecken im Info-Blatt.** In allen drei Bestellreitern sind
„Übliche / Alle / Nur bestellte" hinter dem `i` gelandet. Gemeldet wurde:

> „Desweiteren ist es unglücklich, in Info auch die Filter zu integrieren …
> Zu verwirrend. … Die Änderung mit Info betrifft auch alle anderen Tabs."

Das `i` verspricht **Auskunft**, nicht Bedienung. Beim Bäcker und bei Mair
stehen die Umfänge zusätzlich am Listenende — zwei Orte für dieselbe Sache.

## Goals

- Artikel und Erfassung sind auf jedem Zielgerät **gleichzeitig** sichtbar.
- Die Liste bleibt beim Erfassen stehen.
- Die Erfassung folgt der Reihenfolge **Anzahl → vak → Einheit → Menge**.
- Kein Knopf, der nur bestätigt, was ohnehin schon geschehen ist.
- Filter sind dort, wo man sie sucht — sichtbar, wenn Platz ist; sonst über
  ein Filtersymbol erreichbar. In **allen drei** Reitern gleich.

## Non-Goals

- Keine Änderung an der Portions-Logik (Blöcke, Einheiten, Vorschläge,
  Kurzeingabe-Syntax bleiben wie sie sind).
- Keine Änderung am Versand, an der Mail oder am PDF.
- Kein neues Filterkriterium über die drei Umfänge hinaus.

## Requirements

### F1: Artikel und Erfassung immer zusammen sichtbar

#### F1 Description

Öffnet sich die Erfassung, steht sie **unter dem Artikel** — wie auf dem
breiten Bildschirm. Die Zeile wird so ins Bild gerückt, dass die
**Artikelzeile oben anliegt**; die Erfassung schließt darunter an.

#### F1 Behaviour / Acceptance

- Nach dem Öffnen sind Artikelname und die Erfassungszeile (Anzahl, vak,
  Einheit) vollständig im sichtbaren Bereich der Liste.
- Passt die Zeile samt Erfassung nicht ganz, wird die **Oberkante der Zeile**
  angelegt — nie die Oberkante der Erfassung.

#### F1 Test Cases

**TC-F1-01: Artikelname bleibt sichtbar (360 × 640)**

- **Setup:** Mair-Reiter, Telefonmaß.
- **Action:** Bei einem Artikel weit unten in der Liste auf `+` tippen.
- **Expected:** Der Artikelname liegt vollständig im sichtbaren Bereich der
  Liste; die Erfassungszeile ebenfalls.

**TC-F1-02: Erfassung liegt unter dem Artikel**

- **Expected:** Im Markup ist `.mb-ed` ein Nachfahre derselben `.mb-row`, und
  seine Oberkante liegt unterhalb der Unterkante des Artikelnamens.

### F2: Die Liste springt nicht

#### F2 Description

Weder das Öffnen noch das Anlegen einer Portion verschiebt die Liste
sprunghaft. Der Rollstand bleibt erhalten; nur das gezielte Heranrücken aus
F1 ist erlaubt.

#### F2 Behaviour / Acceptance

- `render()` stellt den `scrollTop` der `.k-liste` wieder her.
- Nach dem Anlegen einer Portion über eine Kachel bleibt die geöffnete Zeile
  an derselben Stelle im Bild (Toleranz 4 px).
- Die Erfassung steht **im Fluss der Liste** (`position:static`). Sie ist
  kein klebendes Blatt und überdeckt darum keine andere Artikelzeile.
- Beim **Öffnen** wird die Oberkante der Zeile angelegt (F1). Damit ist der
  Platz darunter am größten, und eine hinzukommende Portion braucht kein
  weiteres Nachrollen. Nach einer Eingabe wird nur noch nachgefasst, wenn
  der Artikelname über den oberen Rand gerutscht ist.

#### F2 Test Cases

**TC-F2-01: Kachel ändert die Lage der Zeile nicht**

- **Setup:** Erfassung bei einem Artikel geöffnet, Lage der Zeile gemerkt.
- **Action:** Kachel „½" tippen.
- **Expected:** Die Portion steht am Artikel; die Zeile liegt innerhalb von
  4 px an derselben Stelle.

**TC-F2-02: Rollstand überlebt das Öffnen**

- **Setup:** Liste weit nach unten gerollt.
- **Action:** `+` bei einem sichtbaren Artikel tippen.
- **Expected:** Der Rollstand ist nicht auf 0 gefallen.

**TC-F2-03: Die Erfassung überdeckt keine andere Zeile**

- **Setup:** Mair-Reiter bei 360 × 640, 390 × 900 und 820 × 1180.
- **Action:** Erfassung bei einem Artikel öffnen.
- **Expected:** `.mb-ed` hat `position:static`, und keine andere `.mb-row`
  überschneidet sich mit ihrem Rechteck.

**TC-F2-04: Der Öffnen-Knopf steht rechts oben in eigener Spalte**

- **Setup:** Mair-Reiter bei 360, 820 und 1440 px Breite, Artikel mit
  bereits erfassten Portionen.
- **Action:** Lage von `.mb-akt > .mb-add` messen.
- **Expected:** Der Knopf liegt rechts neben dem Artikelnamen, oben
  ausgerichtet (≤ 22 px Versatz zur Oberkante des Namens) und **nie**
  unterhalb der Portions-Badges — auf jeder Breite dieselbe Stelle.

### F3: Reihenfolge Anzahl → vak → Einheit → Menge

#### F3 Description

Die Erfassung besteht aus zwei Reihen:

1. **Anzahl** (Schrittzähler), **vak** (Kästchen, abgekürzt), **Einheit**
   (wischbare Knopfreihe)
2. **Menge**: Kacheln der gewählten Einheit und das Feld für ein freies Maß

#### F3 Test Cases

**TC-F3-01: Reihenfolge im Bild**

- **Expected:** In der ersten Reihe liegt der Schrittzähler links vom
  vak-Kästchen, dieses links von der Einheitenreihe (Vergleich der
  x-Koordinaten). Die Mengenreihe liegt darunter.

**TC-F3-02: vak ist ein Kästchen mit Kurzform**

- **Expected:** Das Element trägt die Beschriftung `vak` (nicht
  „vakuumieren") und schaltet bei Antippen um.

### F4: Kein Bestätigungsknopf für Mengen

#### F4 Description

Eine Kachel legt die Portion sofort an. Ein freies Maß wird übernommen, sobald
im Feld eine gültige Zahl steht und der **Haken im Feld** oder die
**Eingabetaste** betätigt wird. Der Knopf „+ Hinzufügen" / „Ändern" entfällt.

Das Übernehmen beim **Verlassen** des Feldes entfällt ausdrücklich: Es legte
Portionen an, die niemand wollte.

#### F4 Behaviour / Acceptance

- Solange keine gültige Zahl im Feld steht, ist der Haken unsichtbar und
  kostet keinen Platz.
- Eine ungültige oder leere Eingabe legt nichts an.

#### F4 Test Cases

**TC-F4-01: „+ Hinzufügen" gibt es nicht mehr**

- **Expected:** In der geöffneten Erfassung findet sich kein sichtbarer Knopf
  mit dem Text „Hinzufügen" oder „Ändern".

**TC-F4-02: Haken erscheint erst mit gültiger Zahl**

- **Setup:** Erfassung geöffnet, Freifeld leer.
- **Expected:** Der Haken ist unsichtbar.
- **Action:** „233" eintippen.
- **Expected:** Der Haken ist sichtbar; ein Tipp darauf legt „1 × 233 …" an.

**TC-F4-03: Eingabetaste legt ebenfalls an**

- **Action:** Zahl eintippen, Eingabetaste.
- **Expected:** Portion angelegt, Feld wieder leer.

**TC-F4-04: Feld verlassen legt nichts an**

- **Action:** Zahl eintippen, dann auf die Artikelzeile tippen.
- **Expected:** Keine Portion angelegt.

### F5: `+` öffnet, `−` schließt — kein „Fertig"

#### F5 Description

Der Knopf an der Artikelzeile trägt `+`, solange die Erfassung zu ist, und
`−`, solange sie offen ist. Der Knopf „Fertig" entfällt.

#### F5 Test Cases

**TC-F5-01: Umschalten**

- **Action:** `+` tippen → Erfassung offen, Knopf zeigt `−`.
- **Action:** `−` tippen → Erfassung zu, Knopf zeigt `+`.

**TC-F5-02: „Fertig" gibt es nicht mehr**

- **Expected:** Kein sichtbarer Knopf mit dem Text „Fertig".

### F6: Höhenabhängiger Umfang der Erfassung

#### F6 Description

Kurzeingabe und Hinweisfeld entfallen nur dort, wo es wirklich eng ist: auf
Schirmen, die **zugleich schmal (≤ 619 px) und niedrig (≤ 819 px)** sind —
also auf Telefonen. Auf Tablet und Rechner bleiben sie sichtbar, auch bei
800 px Fensterhöhe, denn dort ist die Liste mehrspaltig und der Platz reicht.

Entfallen sie, bleibt der Positions-Hinweis über einen kleinen Knopf
„Hinweis …" erreichbar, der das gewohnte Eingabeblatt öffnet.

#### F6 Test Cases

**TC-F6-01: Niedriger Schirm ohne Kurzeingabe und Hinweisfeld**

- **Setup:** 360 × 640.
- **Expected:** Weder Kurzeingabefeld noch Hinweisfeld sind sichtbar; ein
  Knopf „Hinweis …" ist vorhanden.

**TC-F6-02: Hoher Schirm mit beiden Feldern**

- **Setup:** Höhe ≥ 820 px.
- **Expected:** Kurzeingabe und Hinweisfeld sind sichtbar; der Knopf
  „Hinweis …" entfällt.

### F7: Filter raus aus dem Info-Blatt — in allen drei Reitern

#### F7 Description

Bäcker, Mair und Getränke tragen denselben Umschalter mit drei Umfängen:
**Übliche · Alle · Nur erfasste**, jeweils mit Trefferzahl. Er steht **nicht**
mehr im Blatt hinter dem `i` und **nicht** mehr am Listenende.

Im `i` bleibt nur Auskunft (Liefertag, Herkunft der Mengen, Bestellschluss,
Testbetrieb) und die seltenen Handlungen.

#### F7 Behaviour / Acceptance

- „Nur erfasste" zeigt genau die Artikel mit einer erfassten Menge.
- Die Trefferzahlen stimmen mit der Zahl der angezeigten Zeilen überein.

#### F7 Test Cases

**TC-F7-01: Keine Filter mehr im Blatt (alle drei Reiter)**

- **Action:** Blatt über das `i` öffnen.
- **Expected:** Es enthält keinen Knopf „Übliche", „Alle" oder
  „Nur erfasste".

**TC-F7-02: Drei Umfänge in jedem Reiter**

- **Expected:** In jedem der drei Reiter sind die drei Umfänge erreichbar —
  entweder als Filterzeile oder über das Filtersymbol.

**TC-F7-03: „Nur erfasste" zeigt genau das Erfasste**

- **Setup:** Zwei Artikel mit Menge erfasst.
- **Action:** Auf „Nur erfasste" schalten.
- **Expected:** Genau zwei Artikelzeilen sind sichtbar.

**TC-F7-04: Kein zweiter Ort am Listenende**

- **Expected:** Am Listenende steht kein Umfang-Umschalter mehr.

### F8: Filterzeile oder Filtersymbol — je nach Höhe

#### F8 Description

Ab **700 px** Bildschirmhöhe steht der Umschalter als eigene Zeile unter dem
Suchfeld. Darunter steht neben dem Suchfeld ein **Filtersymbol** (Trichter,
Lucide `list-filter`), das ein kleines Auswahlblatt öffnet. Ist etwas anderes
als „Übliche" gewählt, trägt das Symbol einen Punkt.

#### F8 Behaviour / Acceptance

- Das Auswahlblatt schließt nach der Wahl und beim Tippen daneben.
- Das Filtersymbol ist mindestens 44 × 44 px groß.

#### F8 Test Cases

**TC-F8-01: Niedriger Schirm zeigt das Symbol, keine Zeile**

- **Setup:** 360 × 640.
- **Expected:** Filtersymbol sichtbar, Filterzeile nicht.

**TC-F8-02: Hoher Schirm zeigt die Zeile, kein Symbol**

- **Setup:** Höhe ≥ 700 px.
- **Expected:** Filterzeile sichtbar, Filtersymbol nicht.

**TC-F8-03: Auswahlblatt wählt und schließt**

- **Action:** Symbol tippen, „Alle" wählen.
- **Expected:** Blatt zu, Umfang „Alle" aktiv, Symbol trägt einen Punkt.

### F9: Symbole aus der Lucide-Familie

#### F9 Description

Alle neuen Bedienelemente verwenden Lucide-Symbole wie der übrige Kiosk —
keine Emoji und kein Zahnrad für den Filter.

#### F9 Test Cases

**TC-F9-01: Filtersymbol ist ein Trichter**

- **Expected:** Das Filtersymbol enthält ein `svg`, das aus `list-filter`
  erzeugt wurde.

## Data & Contracts

- Kein Eingriff in die API. Der Filterzustand bleibt im Kiosk: Bäcker und
  Metzger führen statt `_alleArtikel` einen Umfang `_umfang` mit den Werten
  `ueblich` | `alle` | `best`; Getränke hat `_filter` bereits so.
- Der Positions-Hinweis wird weiterhin über `hinweis()` / `editHinweis()`
  gesetzt.
- Schwellen: 820 px (Kurzeingabe + Hinweisfeld), 700 px (Filterzeile) —
  umgesetzt als `@media (min-height: …)`.

## Traceability

| Requirement | Test Cases | Tasks |
| --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | T2, T3 |
| F2 | TC-F2-01 … TC-F2-04 | T3 |
| F3 | TC-F3-01, TC-F3-02 | T2 |
| F4 | TC-F4-01 … TC-F4-04 | T2 |
| F5 | TC-F5-01, TC-F5-02 | T2 |
| F6 | TC-F6-01, TC-F6-02 | T2 |
| F7 | TC-F7-01 … TC-F7-04 | T4 |
| F8 | TC-F8-01 … TC-F8-03 | T4 |
| F9 | TC-F9-01 | T2, T4 |

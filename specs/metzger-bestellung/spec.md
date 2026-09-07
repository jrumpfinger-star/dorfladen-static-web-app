# Metzger-Bestellung (Metzger Mair) — Specification

> Spec-driven development. Every requirement carries explicit test cases.
> Ein Spec mit offenen `[NEEDS CLARIFICATION]`-Markern darf NICHT nach `/sdd-plan`.

**Status:** Umgesetzt — Kiosk-Tab, API und Tests stehen (07.09.2026)

**Owner:** Dorfladen Oberornau — Verkäuferinnen

**Last updated:** 2026-09-07

## Overview

Die **Ladenbestellung** bei **Metzger Mair** läuft heute auf einem
handschriftlichen Formular. Ein Blatt trägt in Spalte 1 rund **84 feste
Artikelzeilen** und daneben **zwei Bestelltage** als Datumsspalten. Der
vorliegende Scan (`Metzger Mair/Document_2026-09-07_114528.pdf`, 8 Seiten =
4 Blätter = 8 Bestelltage) zeigt die Schwachstellen:

- Die Handschrift steht **zwischen** den gedruckten Zeilen. Welcher Wert zu
  welchem Artikel gehört, ist auf mehreren Zeilen nur zu erraten.
- Eine Zelle ist **keine Zahl**, sondern eine gewachsene Kurzschrift:
  `2x 4 St V`, `2x500g | 6x250g`, `8St + 4x 6St`, `1/2 Kräuter`, `10 cm`,
  `2x klein + 1`. Nichts davon ist auswertbar, nichts wiederverwendbar.
- **Nichts erinnert**, wenn die Bestellung vergessen wird.
- Es gibt **keine Vorbelegung**: Obwohl sich die Portionierung je Artikel über
  vier Blätter praktisch nicht ändert, wird jede Woche alles neu geschrieben.
- Der **Bestellwert** ist vor der Lieferung unbekannt.
- **Vakuumbeutel** werden vom Metzger stückweise berechnet (Rechnungspositionen
  980/981/982), tauchen auf dem Zettel aber nur als Häkchen auf. In den elf
  vorliegenden Rechnungen sind es **216 Beutel**.

Dieses Feature ergänzt den Kiosk
([static-site/kiosk.html](../../static-site/kiosk.html)) um einen Tab
**„Metzger Mair"** mit vier Unterreitern (Bestellung · Verlauf · Artikel ·
Einstellungen) sowie zwei neue Azure-Functions-Endpunkte `api/metzger-artikel/`
und `api/metzger-order/` (Python, Dataverse-Persistenz analog zu
`api/baecker-order/`).

Aufbau, Bedienlogik und Zustandsmodell folgen bewusst der bereits umgesetzten
**Bäcker-Bestellung** ([specs/baecker-bestellung/spec.md](../baecker-bestellung/spec.md)).
Der eine große Unterschied ist die Mengenerfassung — sie ist hier keine Zahl,
sondern eine Liste von **Portionsblöcken** (F2).

### Abgrenzung zur Fleisch-Vorbestellung

Der bestehende Kiosk-Tab **„Metzger"** ([specs/fleisch-vorbestellung.md](../fleisch-vorbestellung.md))
behandelt **Kundenvorbestellungen** (Kunde → Dorfladen) und bleibt vollständig
unberührt. Dieses Feature behandelt die **Ladenbestellung** (Dorfladen →
Metzger Mair). Beide laufen getrennt; es gibt keinen Datenaustausch zwischen
ihnen.

## Datenlage

### Aus den 11 Rechnungen (maschinenlesbar, ausgewertet)

Werkzeug: [tools/metzger_rechnung_extract.py](../../tools/metzger_rechnung_extract.py)

| Merkmal | Befund |
| --- | --- |
| Rechnungen | 11 (April – August 2026) |
| Positionen | 849 |
| Artikel | 78 verschiedene Artikelnummern |
| Liefertage | 26 |
| Wochentage | **Mo 11× · Do 10×** · Mi 2× · Fr 2× · Sa 1× |
| Kd.-Nr. | 1041 (konstant) |
| Spalten der Rechnung | Artikelnummer · Artikelbezeichnung · Stück · Gewicht · Preis · Summe |
| Einheiten | 75 Artikel Gewichtsware (kg), 3 Artikel Stückware |
| Stückware | 980 Vakuumverpackung klein (124 St) · 981 mittel (20 St) · 982 groß (72 St) |
| Rechnungsbetrag | Größenordnung 1.300 € je Rechnung |

Die Lieferwochentage **Mo und Do** decken sich mit der Vorgabe der
Verkäuferinnen. Mi/Fr/Sa sind seltene Nachlieferungen mit 1–5 Positionen.

### Aus dem handschriftlichen Formular

Werkzeug: [tools/metzger_formular_katalog.py](../../tools/metzger_formular_katalog.py)

| Merkmal | Befund |
| --- | --- |
| Formularzeilen | 84, feste Reihenfolge |
| Davon einer Rechnungsnummer zugeordnet | 57 |
| Ohne Zuordnung | 27 (in den 11 Rechnungen nie geliefert) |
| Rechnungsartikel ohne Formularzeile | 18 |
| Gefüllte Zellen je Bestelltag | ~20 von 84 |

### Beobachtete Schreibweisen (aus allen 8 Scanseiten)

| Handschrift | Bedeutung |
| --- | --- |
| `1/2`, `1 1/2`, `2 Kg` | Gewicht in kg |
| `20`, `25`, `30 St`, `4 St` | Stückzahl |
| `1x 500g V`, `2x 500g`, `3x 1Kg` | Anzahl × Portionsgewicht |
| `2x 4 St V`, `1x 6 St`, `2x 3 St` | Anzahl × Stück je Paket |
| `10 cm`, `4x 65cm` | Länge (Stangenware) |
| `8St + 4x 6St`, `2x500g \| 6x250g`, `2x klein + 1` | mehrere Portionsblöcke |
| `V`, `vak`, `✓` | vakuumverpackt |
| `2x klein`, `8 kleine`, `1 + 5 klein` | Größenstufe statt Zahl |
| `1/2 Kräuter`, `1x Gyrospaste` | Variante bzw. freier Zusatz |
| `—`, Schrägstrich, leer | nichts bestellt |

## Goals

- Bestellung im Kiosk erfassen und **auf einen Knopfdruck** als E-Mail an
  Metzger Mair senden — Positionsliste im Mailtext, komplettes Formular als
  PDF-Anhang.
- **Alle** heute gebräuchlichen Schreibweisen ohne Verlust abbilden (F2).
- **Vorbelegung** aus dem letzten gleichen Wochentag, plus **Häufig-Vorschläge**
  je Artikel aus der Bestell- und Lieferhistorie.
- **Vakuumieren** je Portion als Ja/Nein erfassen und laufend zählen.
- **Geschätzter Bestellwert** aus den Preisen der letzten Rechnung.
- Reihenfolge und Bezeichnungen **wie auf dem Papier**, damit die gewohnte
  Reihenfolge erhalten bleibt.
- Nach dem Versand sind die Werte **gesperrt**; Änderungen nur über eine
  ausdrückliche **Korrektur**.
- **Erinnerung**: ab Bestellschluss blinkt der Reiter, bis die Mail raus ist.
- Konform zur Konstitution: responsive (Mobile/iPad/Desktop), benutzerfreundliche
  Meldungen, automatisierte Playwright-Tests.

## Non-Goals

- Keine Anbindung an ein Warenwirtschafts- oder Kassensystem.
- Keine automatische Mengenprognose über den letzten gleichen Wochentag hinaus
  (kein Mittelwert, kein Trend, keine Wetter-/Feiertagslogik).
- **Keine OCR der Handschrift.** Die Rechnungen liefern bessere Daten.
- Kein Abgleich mit tatsächlichen Lieferungen oder Rechnungen nach dem Versand.
- Keine Übernahme von Kundenvorbestellungen (siehe Abgrenzung oben).
- Keine Bestellung bei anderen Metzgereien (Mair ist fest verdrahtet; Adresse
  und Kd.-Nr. sind Einstellungen).
- Kein Löschen von Artikeln (nur Ausblenden) und kein Löschen gesendeter
  Bestellungen.
- Kein automatischer Versand ohne Bestätigung durch eine Verkäuferin.
- Keine Preispflege im Kiosk — Preise stammen aus den Rechnungen und sind
  ausschließlich eine **Schätzhilfe**.

## Decisions (aufgelöste Klärungen)

1. **Erfassungsmodell:** Eine Position besteht aus einer Liste von
   **Portionsblöcken** `anzahl × menge einheit [+ vakuum]` und einem freien
   Hinweis (F2). Damit gibt es keine Sonderfälle.
2. **Übertragungsweg:** **E-Mail**. Der Mailtext enthält die bestellten
   Positionen ausgeschrieben, der **PDF-Anhang** bildet das komplette Formular
   mit allen 84 Zeilen ab (F11).
3. **Bestelltage:** **Montag und Donnerstag**, in den Einstellungen änderbar.
   Deckt sich mit 21 von 26 Liefertagen der Rechnungen.
4. **Bestellschluss:** einstellbar, Startwert **12:00 Uhr**. Er steuert nur die
   Erinnerung und **blockiert den Versand nicht**.
5. **Vorbelegung:** Exakt die Portionen des **letzten gleichen Wochentags** mit
   gesendeter Bestellung. Kein Mittelwert — nachvollziehbar und erklärbar.
6. **Vorschläge:** Je Artikel **höchstens fünf** Portionsangaben, als
   **Mehrfachauswahl** kombinierbar und **selbstlernend** (F4). Startbestand aus
   den Rechnungen, danach zählt jede gesendete Bestellung mit — Bestellungen
   ranken immer vor abgeleiteten Lieferwerten, und Älteres verliert über eine
   Halbwertszeit von acht Wochen an Gewicht.
7. **Reihenfolge und Nummernspalte:** Die **Formularreihenfolge** des Papiers,
   unverändert. Die **Artikelnummer steht an erster Stelle in einer eigenen
   Spalte** (F3), damit sie senkrecht scanbar ist. Warengruppen sind
   Zwischenüberschriften und reine Lesehilfe; sie erscheinen **nicht** im
   Dokument.
8. **Anzeigeumfang:** Standard ist „Übliche Artikel" (aktive), umschaltbar auf
   „Alle Artikel". Der Umschalter ändert **nur die Anzeige, nie die Reihenfolge**.
9. **Vakuum:** Ein **Ja/Nein-Schalter** je Portionsblock. Es gibt **keine
   Beutelgröße** — welcher Beutel genommen wird, entscheidet der Metzger beim
   Verpacken; das hängt nicht an der Portionsgröße.
10. **Portionsgrößen:** `klein` · `mittel` · `groß` sind **Einheiten** wie kg
    oder Stück (z. B. „2 × klein"). Sie sind **unabhängig** vom Vakuumieren und
    im Editor genauso schnell erreichbar wie kg.
11. **Kurzeingabe:** Jede Zeile nimmt zusätzlich die gewohnte Papier-Schreibweise
    entgegen und zeigt das Ergebnis **sofort als Badge** (F5). Nicht erkannter
    Text wird **nie verworfen**, sondern wird zum **Hinweis-Badge** derselben
    Zeile — sichtbar und mit einem Tipp wieder entfernbar.
12. **Preise:** aus der letzten Rechnung, als **geschätzter** Wert gekennzeichnet.
    Artikel ohne Rechnungszuordnung tragen keinen Preis; die Schätzung weist die
    Zahl der unbewerteten Positionen aus.
13. **Artikelstamm:** Startbestand sind die **84 Formularzeilen** (aktiv) plus
    **18 Rechnungsartikel ohne Formularzeile** (inaktiv, über „Alle Artikel"
    erreichbar). Die drei Vakuumbeutel-Artikel sind **keine** Bestellzeile; sie
    entstehen automatisch aus den Portionsblöcken.
14. **Sperre:** Nach dem Versand sind alle Felder gesperrt. „Korrektur senden"
    öffnet sie wieder.
15. **Korrektur:** Versendet eine **komplette neue Mail** mit dem Betreff
    „Korrektur Bestellung TT.MM.JJJJ". Mehrere Korrekturen sind möglich, jede
    wird protokolliert.
16. **Empfänger:** Einstellung. Bis zur Freigabe die Testadresse; Absender ist
    immer `info@dorfladen-oberornau.de`.
17. **Testkennzeichnung:** Solange der Empfänger nicht der Metzger ist, zeigt der
    Versanddialog deutlich sichtbar „Testbetrieb".
18. **Keine Historie aus der Handschrift.** Für Vorbelegung und Vorschläge am
    ersten Tag dient die **Lieferhistorie der Rechnungen** (26 Liefertage).
    Sie nennt je Artikel und Liefertag die Zeilenzahl und das Gewicht; daraus
    entsteht je Artikel eine Vorschlagsliste (F4). Eine Portionierung in Stück
    oder eine Vakuum-Zuordnung lässt sich daraus **nicht** ableiten.
19. **Auth:** Der Tab liegt hinter dem bestehenden Kiosk-/CMS-Login; schreibende
    Endpunkte sind serverseitig geschützt (`admin_auth_guard`).

## Requirements

<!-- markdownlint-disable MD024 -->

### F1: Bestelltag wählen

#### F1 Description

Der Tab zeigt eine Tagesleiste über 14 Tage ab heute. Nur konfigurierte
Bestelltage sind wählbar; beim Öffnen ist der **nächste offene Bestelltag** aktiv.

Bestellt wird **mit Vorlauf**: Die Bestellung für einen Liefertag muss
spätestens am Vortag draußen sein. Der heutige Tag ist deshalb nie mehr
bestellbar, auch wenn er ein Bestelltag ist — die Ware ist längst gepackt. Eine
Bestellung darf beliebig früher aufgegeben werden (zwei oder drei Tage vorher);
sie gilt dann für genau den gewählten Tag.

#### F1 Behaviour / Acceptance

- Nur Montag und Donnerstag (Einstellung) sind wählbar; andere Tage sind sichtbar,
  aber nicht anwählbar.
- Ein Bestelltag ist nur bestellbar, wenn er **nach dem heutigen Tag** liegt.
  Heute und alles davor ist gesperrt.
- Beim Öffnen ist der nächste bestellbare Bestelltag ohne gesendete Bestellung aktiv.
- Jeder Tag zeigt seinen Zustand: offen · Entwurf · gesendet · korrigiert.
- Ein Tageswechsel mit ungespeicherten Änderungen fragt vorher nach.
- Speichern und Senden für einen nicht mehr bestellbaren Tag weist die API mit
  409 ab — die Sperre gilt also auch dann, wenn die Oberfläche umgangen wird.

#### F1 Test Cases

**TC-F1-01: Nur Bestelltage wählbar**

- **Setup:** Bestelltage Mo und Do.
- **Action:** Tab öffnen.
- **Expected:** Mo und Do anwählbar, Di/Mi/Fr/Sa/So nicht.

**TC-F1-02: Nächster offener Tag ist aktiv**

- **Setup:** Heute Dienstag, für Donnerstag existiert noch keine Bestellung.
- **Action:** Tab öffnen.
- **Expected:** Donnerstag ist aktiv.

**TC-F1-03: Gesendeter Tag wird übersprungen**

- **Setup:** Heute Montag, für Montag ist bereits gesendet.
- **Action:** Tab öffnen.
- **Expected:** Donnerstag ist aktiv; Montag ist als „gesendet" markiert.

**TC-F1-04: Ungespeicherte Änderungen halten den Wechsel auf**

- **Setup:** Menge geändert, nicht gespeichert.
- **Action:** Anderen Tag wählen.
- **Expected:** Rückfrage im Dialog, kein stiller Verlust.

**TC-F1-05: Heute ist nicht mehr bestellbar**

- **Setup:** Heute ist ein Bestelltag (Montag).
- **Action:** Tab öffnen.
- **Expected:** Der heutige Montag ist nicht anwählbar; die Vorauswahl liegt auf
  einem Tag in der Zukunft.

**TC-F1-06: Bestellung mehrere Tage im Voraus**

- **Setup:** Heute Freitag, Bestelltage Mo und Do.
- **Action:** Den übernächsten Donnerstag wählen und speichern.
- **Expected:** Wird angenommen und gilt für genau diesen Donnerstag.

**TC-F1-07: API weist den Vortag ab**

- **Setup:** Heutiges Datum als Bestelltag.
- **Action:** `PUT` auf diesen Tag.
- **Expected:** HTTP 409 mit erklärender Meldung, nichts wird gespeichert.

### F2: Portionsblöcke — das Erfassungsmodell

#### F2 Description

Die Menge einer Position ist eine **geordnete Liste von Portionsblöcken** plus
ein freier Hinweis. Ein Block beschreibt, **wie oft** eine **Portion welcher
Größe** bestellt wird und ob sie **vakuumiert** wird.

#### F2 Inputs

| Feld | Pflicht | Beschreibung |
| --- | --- | --- |
| `anzahl` | Ja | Ganze Zahl ≥ 1. Wie viele Portionen. Vorgabe 1. |
| `menge` | Nein | Zahl > 0. Größe einer Portion. Leer bei Größenwörtern. |
| `einheit` | Ja | `kg` · `g` · `St` · `cm` · `Schale` · `Beutel` · `klein` · `mittel` · `groß` |
| `vakuum` | Nein | **Ja/Nein.** Vorgabe Nein. |
| `hinweis` | Nein | Freier Text je **Position**, z. B. „Kräuter". |

`klein` · `mittel` · `groß` sind **Portionsgrößen** (z. B. „2 × klein" beim
Schweinebauch), keine Verpackungsangabe. Sie stehen gleichrangig neben `kg` und
`St` und haben mit dem Vakuumieren **nichts** zu tun.

#### F2 Behaviour / Acceptance

- Jede der in der Datenlage aufgeführten Schreibweisen ist als Blockliste
  darstellbar:

  | Handschrift | Blöcke |
  | --- | --- |
  | `1/2` | `1 × 0,5 kg` |
  | `30 St` | `1 × 30 St` |
  | `2x 4 St V` | `2 × 4 St, vakuum` |
  | `2x500g \| 6x250g V` | `2 × 500 g` + `6 × 250 g, vakuum` |
  | `4x 65cm` | `4 × 65 cm` |
  | `2x klein + 1` | `2 × klein` + `1 × 1 St` |
  | `1/2 Kräuter` | `1 × 0,5 kg`, Hinweis „Kräuter" |

- Eine Position **ohne** Blöcke und **ohne** Hinweis gilt als „nicht bestellt".
- Ein Block mit `anzahl` 0 ist unzulässig und wird auf 1 normalisiert.
- Die Reihenfolge der Blöcke bleibt so, wie sie erfasst wurde.
- Das **Gesamtgewicht** einer Position ist die Summe aus `anzahl × menge` aller
  Blöcke mit Einheit `kg` oder `g`. Blöcke in `St`, `cm` oder Größenwörtern
  zählen **nicht** ins Gewicht, sondern in ihre eigene Summe.

#### F2 Test Cases

**TC-F2-01: Alle Papier-Schreibweisen abbildbar**

- **Setup:** Die sieben Beispiele der Tabelle oben.
- **Action:** Jeweils als Blockliste erfassen und wieder als Text ausgeben.
- **Expected:** Ausgabe entspricht dem Original bedeutungsgleich; kein Fall
  bleibt undarstellbar.

**TC-F2-02: Position ohne Blöcke gilt als nicht bestellt**

- **Setup:** Artikel ohne Blöcke, ohne Hinweis.
- **Expected:** Zeile zählt nicht in den Positionszähler und erscheint nicht im
  Mailtext.

**TC-F2-03: Anzahl 0 wird normalisiert**

- **Action:** Block mit `anzahl` 0 speichern.
- **Expected:** `anzahl` ist 1; kein technischer Fehler.

**TC-F2-04: Gewicht summiert nur Gewichtsblöcke**

- **Setup:** `2 × 500 g` + `1 × 4 St`.
- **Expected:** Gewicht 1,0 kg; Stückzahl 4; beides getrennt ausgewiesen.

**TC-F2-05: Hinweis überlebt ohne Blöcke**

- **Setup:** Position ohne Blöcke, Hinweis „nur wenn da".
- **Expected:** Position gilt als bestellt und erscheint im Mailtext mit dem
  Hinweis.

### F3: Portionen erfassen

#### F3 Description

Jede Artikelzeile zeigt ihre Portionen **und ihren Hinweis** als **Badges**.
Leere Zeilen zeigen nur einen `+`-Knopf. Ein Tipp auf ein Badge oder auf `+`
öffnet den **Portions-Editor direkt in der Zeile**.

#### F3 Behaviour / Acceptance

- **Die Artikelnummer steht an erster Stelle in einer eigenen, rechtsbündigen
  Spalte** mit fester Breite, optisch von der Bezeichnung abgesetzt. Dadurch
  fluchten alle Nummern und alle Bezeichnungen senkrecht — die Nummer bestimmt
  beim Metzger die Warengruppe und muss scanbar sein.
- Artikel ohne Nummer zeigen an dieser Stelle einen dezenten Strich, damit die
  Spalte nicht ausfranst.
- Ein Portions-Badge zeigt `anzahl × menge einheit` und bei Vakuum die
  das Vakuum-Kennzeichen.
- **Der Hinweis ist ebenfalls ein Badge**, farblich abgesetzt — kein separater
  Textabsatz. Ein Hinweis ohne Portion ist eine gültige Bestellung (F2).
- **Jedes Badge trägt ein eigenes ✕ und lässt sich damit direkt in der Zeile
  entfernen**, ohne den Editor zu öffnen. Beschriftung und ✕ sind getrennte
  Knöpfe: die Beschriftung öffnet den Editor, das ✕ löscht sofort.
- Ein langer Hinweis wird im Badge gekürzt dargestellt und steht vollständig im
  Editor sowie im Tooltip; die Zeile bricht dadurch nicht um.
- Der Editor öffnet **inline** in der Zeile, nicht als Vollbild-Dialog.
- **Kein Element ist eine Auswahlliste.** Auf dem Tablet muss jeder Wert mit
  einem Tipp gesetzt sein, ohne dass sich erst ein Menü öffnet — Einheiten und
  Mengen sind deshalb durchgehend **Knöpfe**.
- Das **Portionspad** besteht aus: Anzahl mit −/+, Einheitenknöpfen
  (kg · g · Stück · cm · Größe · Schale · Beutel), dem Vakuum-Schalter (F6) und
  einer Reihe **Schnellwahl-Kacheln**, die zur gewählten Einheit passen:
  - `kg` → ¼ ½ ¾ 1 1½ 2 3 5
  - `g` → 100 125 200 250 500 750
  - `Stück` → 2 3 4 6 8 10 12 30
  - `Größe` → klein mittel groß
  - dazu ein Feld „frei" für alles andere.
- **Eine Kachel zu tippen legt sofort eine Portion an.** Mehrere verschiedene
  Größen entstehen dadurch mit je einem Tipp — Anzahl und Vakuum bleiben
  zwischen den Tipps stehen.
- Wird der Editor über ein bestehendes Badge geöffnet, arbeitet das Pad im
  **Ändern-Modus**: Die Beschriftung nennt die Portion, Kacheln setzen den Wert,
  und „Ändern" übernimmt ihn.
- **Gruppen statt Stapel:** Vorschläge, Kurzeingabe, Portionspad und Hinweis
  sitzen in abgegrenzten Feldern, die sich **nebeneinander legen, sobald Platz
  ist**. Auf schmalen Schirmen stapeln sie.
- Es ist immer höchstens **ein** Editor offen.
- Gegenüber der Vorbelegung geänderte Zeilen sind sichtbar markiert.
- Der Umschalter „Übliche Artikel" / „Alle Artikel" ändert nur die Anzeige.
- Alle Bedienelemente haben mindestens 34 px Höhe, die häufig genutzten 38–44 px.

#### F3 Test Cases

**TC-F3-01: Nummer als eigene, fluchtende Spalte**

- **Setup:** Katalog mit Nummern 2, 15, 360 und einem Artikel ohne Nummer.
- **Expected:** Die Nummern stehen an erster Stelle, rechtsbündig auf derselben
  Kante; alle Bezeichnungen beginnen auf derselben Kante; der Artikel ohne
  Nummer zeigt einen Strich.

**TC-F3-02: Leere Zeile zeigt nur Plus**

- **Setup:** Artikel ohne Portionen und ohne Hinweis.
- **Expected:** Kein Eingabefeld, nur ein `+`-Knopf.

**TC-F3-03: Badge zeigt die Portion lesbar**

- **Setup:** Block `2 × 500 g` mit Vakuum.
- **Expected:** Badge nennt Anzahl, Menge, Einheit und das Vakuum-Kennzeichen.

**TC-F3-04: Hinweis erscheint als eigenes Badge**

- **Setup:** Position mit Hinweis „Kräuter".
- **Expected:** Ein farblich abgesetztes Badge „Kräuter" in derselben
  Badge-Zeile; **kein** separater Textabsatz über oder unter der Zeile.

**TC-F3-05: Portion direkt in der Zeile entfernen**

- **Setup:** Zwei Portions-Badges, Editor geschlossen.
- **Action:** ✕ am ersten Badge tippen.
- **Expected:** Nur noch ein Badge; der Editor öffnet sich **nicht**; die Summen
  aktualisieren sich.

**TC-F3-06: Hinweis direkt in der Zeile entfernen**

- **Setup:** Position mit Portion und Hinweis.
- **Action:** ✕ am Hinweis-Badge tippen.
- **Expected:** Hinweis-Badge verschwindet, die Portion bleibt.

**TC-F3-07: Beschriftung öffnet, ✕ löscht**

- **Action:** Auf die Beschriftung eines Badges tippen.
- **Expected:** Der Editor öffnet sich mit genau diesem Block; nichts wird
  gelöscht.

**TC-F3-08: Editor öffnet inline**

- **Action:** Auf `+` tippen.
- **Expected:** Editor erscheint innerhalb der Zeile; die Artikelbezeichnung
  bleibt sichtbar.

**TC-F3-09: Nur ein Editor gleichzeitig**

- **Setup:** Editor bei Artikel A offen.
- **Action:** `+` bei Artikel B.
- **Expected:** Editor bei A schließt, Editor bei B öffnet.

**TC-F3-10: Kachel legt sofort eine Portion an**

- **Setup:** Editor über `+` geöffnet, Einheit `kg`.
- **Action:** Nacheinander `½`, `1`, `2` tippen.
- **Expected:** Drei Badges `1 × ½ kg`, `1 × 1 kg`, `1 × 2 kg` — drei Tipps,
  drei Größen.

**TC-F3-11: Einheit ist ein Knopf, keine Liste**

- **Expected:** Im Editor existiert **kein** `select`; Einheiten stehen als
  Knöpfe, der aktive ist hervorgehoben.

**TC-F3-12: Größe als Portionsgröße**

- **Action:** Einheit „Größe" wählen, `klein` und `groß` tippen.
- **Expected:** Badges `1 × klein` und `1 × groß`; der Vakuum-Schalter bleibt
  davon unberührt.

**TC-F3-13: Anzahl und Vakuum gelten für die nächste Kachel**

- **Action:** Anzahl auf 3 stellen, „vakuumieren" einschalten, Einheit „Stück",
  Kachel `4` tippen.
- **Expected:** Ein Badge `3 × 4 St` mit Vakuum-Kennzeichen.

**TC-F3-14: Langer Hinweis sprengt die Zeile nicht**

- **Setup:** Hinweis mit über 60 Zeichen.
- **Expected:** Badge gekürzt dargestellt, kein horizontaler Scroll auf
  375×667; der volle Text steht im Editor.

**TC-F3-15: Änderung ist markiert**

- **Setup:** Vorbelegung `2 × 4 St`.
- **Action:** Auf `3 × 4 St` ändern.
- **Expected:** Zeile ist als geändert markiert.

**TC-F3-16: Ungültige Eingabe wird abgefangen**

- **Action:** Menge `-5` bzw. `abc` eingeben.
- **Expected:** Wert wird verworfen, Feld bleibt bedienbar, kein technischer
  Fehler.

### F4: Häufig-Vorschläge je Artikel

#### F4 Description

Der Portions-Editor zeigt oben **bis zu fünf** antippbare Vorschläge für genau
diesen Artikel. Die Liste ist **selbstlernend**: Sie startet aus den Rechnungen
und passt sich mit jeder gesendeten Bestellung an.

#### F4 Inputs

| Quelle | Gewicht | Herkunft |
| --- | --- | --- |
| Gesendete Bestellung | 1,0 | Die erfasste Blockliste, inklusive Vakuum |
| Lieferung laut Rechnung | 0,4 | Zeilenzahl → `anzahl`, Gewicht je Zeile → `menge`, auf **¼ kg gerundet** |

#### F4 Behaviour / Acceptance

- Es werden **höchstens fünf** Vorschläge gezeigt.
- **Mehrfachauswahl:** Ein Tipp schaltet den Vorschlag zur Position **hinzu**,
  ein erneuter Tipp wählt ihn wieder **ab**. Ein Vorschlag ersetzt also nicht
  die bisherigen Portionen — mehrere lassen sich kombinieren.
- Enthaltene Vorschläge sind **sichtbar markiert** (Häkchen und Farbe), damit
  auf einen Blick klar ist, was schon in der Zeile steht.
- Der Editor **bleibt offen**, damit mehrere Vorschläge nacheinander getippt
  werden können.
- **Bestellungen ranken immer vor Lieferungen.** Die Rechnungen sind nur der
  Startbestand und füllen die restlichen Plätze auf. Was die Verkäuferin
  tatsächlich bestellt hat, steht damit immer oben.
- Innerhalb einer Gruppe wird nach **Punkten** sortiert:
  `Punkte = Σ Gewicht × 0,5^(Alter in Tagen / 56)`. Durch die Halbwertszeit von
  acht Wochen verliert Altes an Bedeutung — die Liste altert von selbst mit.
- **Jede gesendete Bestellung fließt ein.** Eine bereits bekannte Portionsangabe
  gewinnt Punkte, eine neue kommt hinzu und verdrängt bei Bedarf den
  schwächsten Eintrag.
- Vorschläge aus Lieferungen sind **optisch schwächer** dargestellt als solche
  aus Bestellungen; ein Tooltip nennt die Herkunft („aus 7 Lieferungen" bzw.
  „3× so bestellt").
- Aus Lieferungen abgeleitete Vorschläge tragen **kein Vakuum-Kennzeichen** —
  die Rechnung weist Beutel nur als Tagessumme aus, nicht je Artikel.
- Ein Tipp auf einen Vorschlag übernimmt dessen Portionen **samt**
  Vakuum-Kennzeichen.
- Gibt es weder Bestellungen noch Lieferungen, erscheint der Vorschlagsbereich
  **nicht** (kein leerer Kasten).
- Auf schmalen Schirmen steht die Vorschlagszeile **waagrecht wischbar** in einer
  Zeile, damit der Editor nicht zu hoch wird (F17).

#### F4 Test Cases

**TC-F4-01: Höchstens fünf Vorschläge**

- **Setup:** Artikel mit acht verschiedenen Portionsangaben in der Historie.
- **Expected:** Genau fünf Knöpfe.

**TC-F4-02: Bestellungen stehen vor Lieferungen**

- **Setup:** Ein Vorschlag aus einer Bestellung, dazu Liefervorschläge mit
  deutlich mehr Belegen.
- **Expected:** Der Bestell-Vorschlag steht an erster Stelle.

**TC-F4-03: Vorschlag übernimmt Portionen und Vakuum**

- **Action:** Vorschlag `2 × 4 St` mit Vakuum-Kennzeichen tippen.
- **Expected:** Badge mit Vakuum entsteht; der Editor bleibt offen.

**TC-F4-04: Mehrere Vorschläge kombinieren**

- **Setup:** Leere Position mit fünf Vorschlägen.
- **Action:** Ersten, dritten und fünften Vorschlag tippen.
- **Expected:** Drei Portionen in der Zeile; genau diese drei Vorschläge sind
  markiert, die anderen nicht.

**TC-F4-05: Nochmal tippen wählt ab**

- **Setup:** Drei Vorschläge ausgewählt.
- **Action:** Den dritten erneut tippen.
- **Expected:** Nur noch zwei Portionen; dessen Markierung ist weg, die anderen
  bleiben unverändert.

**TC-F4-06: Kein Vorschlag ersetzt die anderen**

- **Setup:** Position mit einer über die Kacheln erfassten Portion.
- **Action:** Einen Vorschlag tippen.
- **Expected:** Die vorhandene Portion bleibt erhalten, die neue kommt hinzu.

**TC-F4-07: Ohne Historie kein Vorschlagsbereich**

- **Setup:** Artikel ohne Bestellungen und ohne Lieferungen (z. B. „Tafelspitz").
- **Expected:** Der Editor zeigt keinen Vorschlagsbereich.

**TC-F4-08: Rechnungshistorie überbrückt den Start**

- **Setup:** Keine gesendete Bestellung, aber Lieferungen vorhanden.
- **Expected:** Vorschläge sind da und als aus Lieferungen abgeleitet erkennbar.

**TC-F4-09: Senden lernt eine neue Angabe**

- **Setup:** Putenschnitzel `5 × 4 St` erfassen, so noch nie bestellt.
- **Action:** Bestellung senden, danach den Editor erneut öffnen.
- **Expected:** `5 × 4 St` steht als Bestell-Vorschlag in der Liste.

**TC-F4-10: Senden verstärkt eine bekannte Angabe**

- **Setup:** Eine Angabe wurde bereits einmal bestellt.
- **Action:** Dieselbe Angabe erneut senden.
- **Expected:** Kein doppelter Eintrag; der Beleg-Zähler steigt und der Eintrag
  rückt nach oben.

**TC-F4-11: Neuer Vorschlag verdrängt den schwächsten**

- **Setup:** Bereits fünf Vorschläge, davon der letzte mit den wenigsten Punkten.
- **Action:** Eine sechste, neue Angabe senden.
- **Expected:** Weiterhin fünf Knöpfe; der schwächste ist verschwunden.

**TC-F4-12: Alter zählt weniger**

- **Setup:** Angabe A: 3 Belege, alle über ein halbes Jahr alt. Angabe B:
  2 Belege aus den letzten zwei Wochen. Beide aus derselben Quelle.
- **Expected:** B steht vor A.

**TC-F4-13: Liefervorschläge ohne Vakuum**

- **Setup:** Artikel nur mit Lieferhistorie.
- **Expected:** Kein Vorschlag trägt ein Vakuum-Kennzeichen.

### F5: Kurzeingabe in Papier-Schreibweise

#### F5 Description

Jede Zeile nimmt die gewohnte Kurzschrift als Text entgegen und wandelt sie
sofort in Badges um.

#### F5 Inputs

Grammatik:

```text
Eingabe    := Block ( Trenner Block )* [ Rest ]
Trenner    := "+" | "|" | "*" | "&" | ";" | "," | "und" | " / "
Block      := [ Notizzeichen ] [ Anzahl ("x"|"×") ] Menge [ Einheit ] [ Vakuum ]
Notizzeichen := "*" | "-" | "." | ":" | "•"   (wird verworfen)
Anzahl     := ganze Zahl
Menge      := Dezimalzahl | Bruch ("1/2") | gemischter Bruch ("1 1/2") | Größenwort
Einheit    := kg | g | gr | gramm | St | Stk | Stck | Stück | cm | Schale(n) | Beutel
Größenwort := klein | mittel | groß | kleine | große
Vakuum     := V | vak | vakuum | ✓
Rest       := nicht erkannter Text
```

`/` trennt **nur mit Leerzeichen** ringsum, sonst würde `1/2` zerrissen.

#### F5 Behaviour / Acceptance

- Fehlt die Einheit, gilt: **Bruch oder Dezimalzahl → `kg`**, **ganze Zahl →
  `St`**. `1/2` wird also 0,5 kg, `20` wird 20 Stück.
- Fehlt die Menge (`2x`), gilt `1 St` je Portion.
- Das Ergebnis erscheint **sofort als Badge**, bevor gespeichert wird.
- **Nicht erkannter Text wird nie verworfen**, sondern in den Hinweis übernommen
  und dort sichtbar gemacht.
- Lässt sich gar nichts erkennen, bleibt die Eingabe vollständig als Hinweis
  stehen und die Zeile wird als „bitte prüfen" markiert.
- Groß-/Kleinschreibung und Leerzeichen sind egal.

#### F5 Test Cases

**TC-F5-01: Mehrere Blöcke mit Trenner**

- **Action:** `2x500g V | 6x250g` eingeben.
- **Expected:** Zwei Badges; nur der erste trägt das Vakuum-Zeichen.

**TC-F5-02: Bruch wird zu Kilogramm**

- **Action:** `1/2` eingeben.
- **Expected:** Ein Badge `1 × ½ kg`.

**TC-F5-03: Ganze Zahl wird zu Stück**

- **Action:** `20` eingeben.
- **Expected:** Ein Badge `1 × 20 St`.

**TC-F5-04: Gemischter Bruch**

- **Action:** `1 1/2` eingeben.
- **Expected:** Ein Badge `1 × 1,5 kg`.

**TC-F5-05: Summe aus Stück und Paketen**

- **Action:** `8St + 4x6St` eingeben.
- **Expected:** Zwei Badges: `1 × 8 St` und `4 × 6 St`.

**TC-F5-06: Größenwort**

- **Action:** `2x klein + 1` eingeben.
- **Expected:** Zwei Badges: `2 × klein` und `1 × 1 St`.

**TC-F5-07: Rest landet im Hinweis**

- **Action:** `1/2 Kräuter` eingeben.
- **Expected:** Badge `1 × ½ kg` und Hinweis „Kräuter"; nichts geht verloren.

**TC-F5-08: Unlesbare Eingabe bleibt erhalten**

- **Action:** `wie letzte Woche` eingeben.
- **Expected:** KEin Badge, Hinweis trägt den vollen Text, Zeile ist als „bitte
  prüfen" markiert.

**TC-F5-09: Längenangabe**

- **Action:** `4x 65cm` eingeben.
- **Expected:** Ein Badge `4 × 65 cm`.

**TC-F5-10: Schreibvarianten des Vakuums**

- **Action:** Nacheinander `1x 500g V`, `1x 500g vak`, `1x 500g ✓`.
- **Expected:** Jedes Mal dasselbe Badge mit Vakuum-Zeichen.

**TC-F5-11: Sternchen trennt und wird nicht zur Notiz**

- **Action:** `*100gr *456kg` eingeben.
- **Expected:** Zwei Badges `1 × 100 g` und `1 × 456 kg`; **kein** Hinweis-Badge
  mit dem Rohtext.

**TC-F5-12: Schrägstrich zerreißt keinen Bruch**

- **Action:** `1/2 kg / 2 kg` eingeben.
- **Expected:** Zwei Badges `1 × ½ kg` und `1 × 2 kg`.

### F6: Vakuum

#### F6 Description

Vakuum ist ein **Ja/Nein-Schalter** je Portionsblock. Eine Beutelgröße wird
**nicht** erfasst.

#### F6 Behaviour / Acceptance

- Der Schalter „vakuumieren" ist ein **An/Aus-Knopf**, kein Auswahlfeld. Aus ist
  der Normalfall und wird neutral dargestellt.
- Es gibt **keine Beutelgröße.** Welcher Beutel genommen wird, entscheidet der
  Metzger beim Verpacken; das hängt weder an der Portionsgröße noch an der
  Einheit. Eine Auswahl hier wäre eine Scheingenauigkeit.
- Der Schalter gilt für die **nächste** Portion, die über Kachel oder
  „Hinzufügen" entsteht, und bleibt gesetzt, bis er wieder ausgeschaltet wird.
- Ein vakuumiertes Badge trägt ein sichtbares Kennzeichen.
- Die Fußzeile nennt laufend, **wie viele Portionen** vakuumiert werden.
- Die Zahl erscheint auch im Mailtext, damit der Metzger sie einplanen kann.
- Die Verpackung wird **nicht** in den geschätzten Wert eingerechnet (F16) —
  ohne bekannte Beutelgröße wäre der Betrag geraten.

#### F6 Test Cases

**TC-F6-01: Nur An/Aus, keine Größe**

- **Setup:** Editor geöffnet.
- **Expected:** Ein Schalter „vakuumieren"; **keine** Auswahl klein/mittel/groß
  für die Verpackung.

**TC-F6-02: Schalter wirkt auf die nächste Portion**

- **Action:** „vakuumieren" einschalten, dann Kachel `½` tippen.
- **Expected:** Badge `1 × ½ kg` mit Vakuum-Kennzeichen.

**TC-F6-03: Ausschalten wirkt ebenso**

- **Action:** Schalter aus, Kachel `1` tippen.
- **Expected:** Badge `1 × 1 kg` ohne Kennzeichen.

**TC-F6-04: Zählung in der Fußzeile**

- **Setup:** `2 × 4 St` vakuumiert und `3 × ½ kg` vakuumiert.
- **Expected:** Fußzeile nennt 5 vakuumierte Portionen.

**TC-F6-05: Vakuum steht im Mailtext**

- **Action:** Vorschau öffnen.
- **Expected:** Die Zahl der vakuumierten Portionen ist genannt.

**TC-F6-06: Unabhängig von der Portionsgröße**

- **Setup:** Portionsgröße `klein` gewählt.
- **Expected:** Der Vakuum-Schalter bleibt davon unberührt und umgekehrt.

### F7: Vorbelegung aus dem letzten gleichen Wochentag

#### F7 Description

Beim Öffnen eines Bestelltags sind die Portionen des letzten gleichen Wochentags
mit gesendeter Bestellung bereits eingetragen.

#### F7 Behaviour / Acceptance

- Quelle ist **genau** der letzte gleiche Wochentag, kein Mittelwert.
- Vorbelegte Zeilen sind als „vorbelegt" gekennzeichnet und nennen ihre Quelle
  mit Datum.
- Zusatzpositionen (F8) fließen **nicht** in die Vorbelegung ein.
- Gibt es keinen gleichen Wochentag, bleibt die Bestellung leer und ein Hinweis
  erklärt das.
- „Vorbelegung zurücksetzen" stellt den Ausgangszustand wieder her.

Unabhängig von der Vorbelegung zeigt jede Zeile die **Werte der zuletzt
gesendeten Bestellung** als grauen Anhalt an (`früher: 2 × 4 St 🅥`), zusammen
mit deren Datum. Das hilft besonders beim Neuerfassen eines Tages ohne
Vorbelegung: Die Verkäuferin sieht, was üblich ist, ohne den Verlauf zu öffnen.

- Der Anhalt ist reine Anzeige — ein Tipp darauf ändert nichts.
- Er erscheint nur, wenn die Zeile noch keine eigene Portion hat; sonst wäre die
  Zeile doppelt belegt.
- Die Quelle wird mit Datum und Wochentag benannt.

#### F7 Test Cases

**TC-F7-01: Vorbelegung greift**

- **Setup:** Letzter Montag mit `2 × 4 St` bei Putenschnitzel gesendet.
- **Action:** Nächsten Montag öffnen.
- **Expected:** `2 × 4 St` steht da, gekennzeichnet als vorbelegt.

**TC-F7-02: Kein Mittelwert**

- **Setup:** Vorletzter Mo `4 × 4 St`, letzter Mo `2 × 4 St`.
- **Expected:** `2 × 4 St`, nicht `3 × 4 St`.

**TC-F7-03: Wochentag wird beachtet**

- **Setup:** Montag und Donnerstag mit verschiedenen Mengen.
- **Action:** Donnerstag öffnen.
- **Expected:** Werte des letzten Donnerstags.

**TC-F7-04: Ohne Historie leer mit Hinweis**

- **Setup:** Kein gleicher Wochentag vorhanden.
- **Expected:** Leere Bestellung und ein erklärender Hinweis.

**TC-F7-05: Zurücksetzen**

- **Action:** Werte ändern, dann „Vorbelegung zurücksetzen".
- **Expected:** Ausgangszustand, Änderungsmarkierungen verschwinden.

**TC-F7-06: Werte der letzten Bestellung stehen als Anhalt daneben**

- **Setup:** Leerer Entwurf, letzte gesendete Bestellung mit `2 × 4 St` vakuumiert
  bei Putenschnitzel.
- **Action:** Tab öffnen.
- **Expected:** Die Zeile zeigt „früher: 2 × 4 St 🅥" in grauer Schrift, die
  Bestellung selbst bleibt leer.

**TC-F7-07: Anhalt weicht der eigenen Eingabe**

- **Setup:** Wie TC-F7-06.
- **Action:** Für Putenschnitzel eine Portion anlegen.
- **Expected:** Der graue Anhalt verschwindet in dieser Zeile.

### F8: Zusatzartikel nur für diesen Tag

#### F8 Description

Über „Weiteren Artikel für diesen Tag hinzufügen" lassen sich Positionen
ergänzen — aus dem Katalog (auch inaktive) oder frei eingetragen.

#### F8 Behaviour / Acceptance

- Die Suche findet **alle** Katalogartikel, auch inaktive.
- Frei eingetragene Positionen brauchen eine Bezeichnung; die Nummer ist optional.
- Zusatzpositionen erscheinen im Abschnitt „Nur für diesen Tag" und lassen sich
  einzeln entfernen.
- Sie fließen **nicht** in die Vorbelegung künftiger Bestellungen ein.
- Optional „dauerhaft in die Artikelliste übernehmen" — dann entsteht ein
  Katalogeintrag (Regeln aus F9 gelten).
- Im Dokument stehen sie am Ende des Formulars unter „Zusätzlich".

#### F8 Test Cases

**TC-F8-01: Inaktiven Artikel ergänzen**

- **Setup:** „Griebenschmalz" (Nr. 431) ist inaktiv.
- **Action:** Suchen, hinzufügen, `1 × 1 kg`.
- **Expected:** Erscheint unter „Nur für diesen Tag"; Positionszähler +1.

**TC-F8-02: Frei eingetragene Position**

- **Action:** „Marinade Gyros", `1 × 1 kg`, ohne Nummer.
- **Expected:** Position erscheint; kein Katalogeintrag entsteht.

**TC-F8-03: Bezeichnung ist Pflicht**

- **Action:** Ohne Bezeichnung übernehmen.
- **Expected:** Benutzerfreundlicher Hinweis; nichts wird hinzugefügt.

**TC-F8-04: Entfernen**

- **Setup:** Zwei Zusatzpositionen.
- **Action:** Eine entfernen.
- **Expected:** Nur noch eine; Zähler aktualisiert.

**TC-F8-05: Zusatz verfälscht die Vorbelegung nicht**

- **Setup:** Montag mit Zusatzposition wird gesendet.
- **Action:** Nächsten Montag öffnen.
- **Expected:** Die Zusatzposition ist nicht vorbelegt.

**TC-F8-06: Dauerhaft übernehmen**

- **Setup:** Frei eingetragener Artikel, Haken gesetzt.
- **Action:** Übernehmen.
- **Expected:** Artikel steht danach im Katalog.

### F9: Artikel verwalten

#### F9 Description

Der Unterreiter „Artikel" zeigt den Katalog und erlaubt Anlegen, Bearbeiten und
Aus-/Einblenden.

#### F9 Behaviour / Acceptance

- Die Liste zeigt Bezeichnung, Metzger-Nummer, Gruppe, Preis und Zustand.
- Neue Artikel brauchen eine Bezeichnung; Nummer und Preis sind optional.
- Eine bereits vergebene Nummer wird abgelehnt — zwei Artikel mit derselben
  Nummer würden in Vorbelegung und Verlauf verschmelzen.
- Ein ähnlicher Name wird gemeldet, lässt sich aber bestätigen.
- **Löschen gibt es nicht**, nur Ausblenden.
- **Wird die Nummer geändert, werden die früheren Bestellungen mitgezogen**,
  damit der Artikel seine Vorbelegung behält.
- Die Liste nutzt die Bildschirmbreite (zwei Spalten ab 1080 px, drei ab 1620 px).

#### F9 Test Cases

**TC-F9-01: Katalog vollständig**

- **Expected:** 84 Formularartikel aktiv, 18 Rechnungsartikel inaktiv;
  Vakuumbeutel erscheinen **nicht** als Artikel.

**TC-F9-02: Doppelte Nummer wird abgelehnt**

- **Action:** Neuen Artikel mit Nummer 360 anlegen.
- **Expected:** Freundlicher Hinweis; nichts wird gespeichert.

**TC-F9-03: Ausblenden statt Löschen**

- **Action:** Artikel ausblenden.
- **Expected:** Verschwindet aus „Übliche Artikel", bleibt unter „Alle Artikel".

**TC-F9-04: Bearbeiten-Dialog vorbelegt**

- **Action:** Stift bei „Putenschnitzel".
- **Expected:** Bezeichnung und Nummer stehen im Formular.

**TC-F9-05: Nummernwechsel zieht die Historie mit**

- **Setup:** Artikel mit Nummer 360 und Bestellhistorie.
- **Action:** Nummer auf 361 ändern.
- **Expected:** Vorbelegung und Verlauf bleiben am Artikel.

**TC-F9-06: Ohne Änderung kein Aufruf**

- **Action:** Dialog unverändert speichern.
- **Expected:** Kein API-Aufruf, Dialog schließt.

**TC-F9-07: Breite genutzt**

- **Expected:** Spaltenzahl passt zur Fensterbreite.

### F10: Suchen, Gruppen, Sprungleiste

#### F10 Description

Bei 84 Zeilen braucht es Sofortsuche, Warengruppen als Zwischenüberschriften und
eine Sprungleiste.

#### F10 Behaviour / Acceptance

- Die Suche filtert schon beim Tippen über Bezeichnung und Nummer.
- Die Suche ändert **nicht** die Reihenfolge.
- Warengruppen-Überschriften trennen die Bereiche; sie sind reine Lesehilfe.
- Die Sprungleiste springt zur jeweiligen Gruppe.
- Bestellte Positionen bleiben über einen Filter „nur bestellte" erreichbar.
- Findet die Suche nichts, erscheint ein freundlicher Hinweis statt einer leeren
  Fläche.

**Übliche Artikel sind die Vorgabe.** Das Papierformular führt 84 Zeilen, aber
nur 57 davon wurden je geliefert — der Rest steht seit Jahren tot auf dem Blatt.
Beim Öffnen zeigt die Liste deshalb nur die **üblichen Artikel**, also die, die
laut Rechnungen mindestens einmal geliefert wurden. Ein Umschalter „Übliche
Artikel / Alle Artikel" holt die restlichen bei Bedarf dazu.

- Vorgabe beim Öffnen ist **„Übliche Artikel"**; die Auswahl wird nicht gemerkt.
- „Alle Artikel" zeigt den vollständigen Formularbestand in Papierreihenfolge.
- Der Umschalter besteht aus zwei direkt tippbaren Knöpfen, nicht aus einer
  Auswahlliste (F17).
- Die Suche greift immer auf **alle** Artikel zu: Was in „Übliche" nicht sichtbar
  ist, findet man trotzdem über die Suche.
- Eine bestellte Position bleibt immer sichtbar, auch wenn sie unüblich ist —
  sonst verschwände eine bereits erfasste Zeile.

#### F10 Test Cases

**TC-F10-01: Suche filtert sofort**

- **Action:** „puten" tippen.
- **Expected:** Nur passende Zeilen, Reihenfolge unverändert.

**TC-F10-02: Suche findet die Nummer**

- **Action:** „360" tippen.
- **Expected:** Putenschnitzel erscheint.

**TC-F10-03: Sprungleiste springt**

- **Action:** Gruppe „Salami" wählen.
- **Expected:** Erste Zeile der Gruppe steht sichtbar unter dem Kopf.

**TC-F10-04: Filter „nur bestellte"**

- **Setup:** 20 von 84 Zeilen bestellt.
- **Action:** Filter einschalten.
- **Expected:** Genau 20 Zeilen.

**TC-F10-05: Leere Suche wird erklärt**

- **Action:** „xyz" tippen.
- **Expected:** Freundlicher Hinweis, keine leere Fläche.

**TC-F10-06: „Übliche Artikel" ist die Vorgabe**

- **Setup:** Katalog mit üblichen und nie gelieferten Artikeln.
- **Action:** Tab öffnen.
- **Expected:** Der Knopf „Übliche Artikel" ist aktiv; nie gelieferte Zeilen
  fehlen in der Liste.

**TC-F10-07: „Alle Artikel" holt den Rest dazu**

- **Action:** Auf „Alle Artikel" tippen.
- **Expected:** Die Liste wird länger und enthält auch die nie gelieferten
  Zeilen, Reihenfolge unverändert.

**TC-F10-08: Suche findet auch Unübliches**

- **Setup:** Ansicht steht auf „Übliche Artikel".
- **Action:** Nach einem nie gelieferten Artikel suchen.
- **Expected:** Er erscheint trotzdem.

**TC-F10-09: Bestellte Zeile bleibt sichtbar**

- **Setup:** Ein unüblicher Artikel ist bestellt, Ansicht „Übliche Artikel".
- **Expected:** Diese Zeile bleibt sichtbar.

### F11: Mail erzeugen und senden

#### F11 Description

„Bestellung senden" erzeugt Mailtext und PDF-Anhang, zeigt beides in einer
Vorschau und verschickt sie nach Bestätigung.

#### F11 Behaviour / Acceptance

- Der **Mailtext** listet nur die bestellten Positionen, je Zeile Bezeichnung und
  ausgeschriebene Portionen, z. B. „Putenschnitzel — 2 × 4 Stück, vakuumiert".
- Ein Hinweis wird an die Zeile angehängt.
- Die Schlusszeile nennt, wie viele Portionen vakuumiert werden.
- Der **PDF-Anhang** bildet das komplette Formular mit **allen 84 Zeilen** in der
  Papierreihenfolge ab; nicht bestellte Zeilen tragen einen Strich.
- Kopf des PDF: Kd.-Nr., Bestelldatum, Liefertag.
- Betreff: „Bestellung TT.MM.JJJJ".
- Die Vorschau zeigt Empfänger, Betreff, Text und Anhang **vor** dem Versand.
- Ist der Empfänger nicht der Metzger, zeigt die Vorschau deutlich „Testbetrieb".
- Ohne bestellte Position ist der Versand nicht möglich; ein Hinweis erklärt das.
- Scheitert der Versand, bleibt der Entwurf erhalten und die Meldung ist in
  Klartext, ohne technische Details.

#### F11 Test Cases

**TC-F11-01: Mailtext nennt nur Bestelltes**

- **Setup:** 20 von 84 Zeilen bestellt.
- **Expected:** Genau 20 Zeilen im Text.

**TC-F11-02: Portionen ausgeschrieben**

- **Setup:** `2 × 4 St, vakuum`.
- **Expected:** Zeile nennt Anzahl, Stückzahl und „vakuumiert" in Klartext.

**TC-F11-03: PDF enthält alle Zeilen**

- **Expected:** 84 Zeilen in Papierreihenfolge; nicht bestellte tragen einen
  Strich.

**TC-F11-04: Beutel in der Schlusszeile**

- **Expected:** Text und PDF nennen die Zahl der vakuumierten Portionen.

**TC-F11-05: Vorschau vor Versand**

- **Action:** „Bestellung senden".
- **Expected:** Vorschau mit Empfänger, Betreff, Text und Anhang; nichts ist
  bereits versendet.

**TC-F11-06: Testbetrieb sichtbar**

- **Setup:** Empfänger ist die Testadresse.
- **Expected:** Vorschau zeigt „Testbetrieb".

**TC-F11-07: Leere Bestellung wird abgefangen**

- **Setup:** Keine Position bestellt.
- **Expected:** Freundlicher Hinweis, kein Versand.

**TC-F11-08: Fehlschlag verliert nichts**

- **Setup:** Versand schlägt fehl.
- **Expected:** Entwurf bleibt, Meldung in Klartext, keine technischen Details.

### F12: Sperre und Korrektur

#### F12 Description

Nach dem Versand sind alle Felder gesperrt. „Korrektur senden" öffnet sie wieder.

#### F12 Behaviour / Acceptance

- Nach dem Versand sind Badges, Editor, Zusatzartikel und Zurücksetzen gesperrt.
- Die Statuskarte nennt Zeitpunkt, Empfänger und wer gesendet hat.
- „Korrektur senden" entsperrt und markiert den Tag als „in Korrektur".
- Eine Korrektur versendet eine **komplette neue** Mail samt Anhang, Betreff
  „Korrektur Bestellung TT.MM.JJJJ".
- Mehrere Korrekturen sind möglich; jede wird protokolliert.
- Das ursprünglich gesendete Dokument bleibt abrufbar.

#### F12 Test Cases

**TC-F12-01: Felder gesperrt**

- **Setup:** Bestellung gesendet.
- **Expected:** Keine Portion änderbar; `+` ist nicht bedienbar.

**TC-F12-02: Statuskarte informiert**

- **Expected:** Zeitpunkt, Empfänger und Person sind genannt.

**TC-F12-03: Korrektur entsperrt**

- **Action:** „Korrektur senden".
- **Expected:** Felder wieder bedienbar, Tag als „in Korrektur" markiert.

**TC-F12-04: Korrektur ist vollständig**

- **Action:** Menge ändern und Korrektur absenden.
- **Expected:** Komplette Positionsliste und Anhang, Betreff mit „Korrektur".

**TC-F12-05: Mehrere Korrekturen protokolliert**

- **Action:** Zweimal korrigieren.
- **Expected:** Protokoll listet Erstversand und beide Korrekturen.

**TC-F12-06: Ursprungsdokument bleibt**

- **Expected:** Das zuerst gesendete Dokument ist weiterhin abrufbar.

### F13: Erinnerung ab Bestellschluss

#### F13 Description

Ist an einem Bestelltag um Bestellschluss noch nichts gesendet, macht der Kiosk
darauf aufmerksam.

#### F13 Behaviour / Acceptance

- Ab Bestellschluss blinkt der Reiter „Metzger Mair" und trägt ein Abzeichen.
- Die Erinnerung endet, sobald die Mail raus ist.
- An Nicht-Bestelltagen und vor Bestellschluss erinnert nichts.
- Die Erinnerung **blockiert den Versand nicht** und lässt sich nicht wegklicken —
  sie endet nur durch Senden.
- **Im Testbetrieb blinkt nichts.** Solange die Empfängeradresse noch die
  Testadresse ist, wäre ein blinkender Reiter eine Aufforderung zu einer
  Bestellung, die niemanden erreicht. Das Abzeichen bleibt, das Blinken entfällt.
  Dieselbe Regel gilt für den Bäcker-Tab.

#### F13 Test Cases

**TC-F13-01: Erinnerung ab Bestellschluss**

- **Setup:** Montag, 12:30 Uhr, nichts gesendet.
- **Expected:** Reiter blinkt, Abzeichen sichtbar.

**TC-F13-02: Vor Bestellschluss keine Erinnerung**

- **Setup:** Montag, 10:00 Uhr.
- **Expected:** Kein Blinken.

**TC-F13-03: Versand beendet die Erinnerung**

- **Action:** Bestellung senden.
- **Expected:** Blinken und Abzeichen verschwinden.

**TC-F13-04: Kein Bestelltag, keine Erinnerung**

- **Setup:** Dienstag, 15:00 Uhr.
- **Expected:** Kein Blinken.

**TC-F13-05: Im Testbetrieb blinkt der Reiter nicht**

- **Setup:** Montag nach Bestellschluss, Empfänger ist die Testadresse.
- **Expected:** Kein Blinken; das Abzeichen ist trotzdem sichtbar.

**TC-F13-06: Nach der Freigabe blinkt es wieder**

- **Setup:** Wie TC-F13-05, aber mit echter Empfängeradresse.
- **Expected:** Der Reiter blinkt.

### F14: Verlauf

#### F14 Description

Der Unterreiter „Verlauf" listet die gesendeten Bestellungen.

#### F14 Behaviour / Acceptance

- Liste absteigend nach Liefertag, mit Status, Positionszahl, Gewicht,
  Beutelzahl und geschätztem Wert.
- Ein Eintrag lässt sich aufklappen und zeigt alle Positionen mit Portionen.
- Das gesendete Dokument ist abrufbar.
- Ohne Einträge erscheint ein freundlicher Hinweis.

#### F14 Test Cases

**TC-F14-01: Absteigend sortiert**

- **Expected:** Jüngster Liefertag oben.

**TC-F14-02: Aufklappen zeigt Positionen**

- **Action:** Eintrag öffnen.
- **Expected:** Alle Positionen mit ihren Portionen.

**TC-F14-03: Dokument abrufbar**

- **Expected:** Der Anhang der gesendeten Mail lässt sich öffnen.

**TC-F14-04: Leerer Verlauf erklärt sich**

- **Expected:** Freundlicher Hinweis statt leerer Fläche.

### F15: Einstellungen

#### F15 Description

Der Unterreiter „Einstellungen" pflegt die Rahmenwerte.

#### F15 Inputs

| Einstellung | Startwert |
| --- | --- |
| Empfänger | Testadresse bis zur Freigabe |
| Absender | `info@dorfladen-oberornau.de` |
| Kunden-Nr. | 1041 |
| Bestelltage | Montag, Donnerstag |
| Bestellschluss | 12:00 |
| Warengruppen-Grenzen | wie im Formularkatalog |

#### F15 Behaviour / Acceptance

- Änderungen wirken sofort auf Tagesleiste und Erinnerung.
- Eine unvollständige oder offensichtlich falsche E-Mail-Adresse wird
  freundlich abgewiesen.
- Mindestens ein Bestelltag muss gesetzt bleiben.
- Bereits gesendete Bestellungen ändern sich rückwirkend nicht.

#### F15 Test Cases

**TC-F15-01: Bestelltage wirken sofort**

- **Action:** Dienstag ergänzen.
- **Expected:** Tagesleiste macht Dienstag wählbar.

**TC-F15-02: Bestellschluss wirkt auf die Erinnerung**

- **Action:** Auf 10:00 stellen.
- **Expected:** Erinnerung beginnt ab 10:00.

**TC-F15-03: Ungültige Adresse abgewiesen**

- **Action:** „abc" als Empfänger speichern.
- **Expected:** Freundlicher Hinweis; alter Wert bleibt.

**TC-F15-04: Ohne Bestelltag geht nicht**

- **Action:** Alle Bestelltage abwählen.
- **Expected:** Freundlicher Hinweis; mindestens einer bleibt.

**TC-F15-05: Bereits Gesendetes bleibt unberührt**

- **Setup:** Eine gesendete Bestellung.
- **Action:** Bestelltage ändern.
- **Expected:** Die gesendete Bestellung ändert sich nicht.

### F16: Geschätzter Bestellwert

#### F16 Description

Der Kiosk zeigt einen geschätzten **Mindestwert** der Bestellung aus den Preisen
der letzten Rechnung.

#### F16 Behaviour / Acceptance

- Der Wert ist ausdrücklich als **Schätzung** und als **Mindestwert**
  gekennzeichnet („mindestens … €").
- Er umfasst ausschließlich Gewichtsblöcke (`anzahl × menge × Preis je kg`).
- **Die Verpackung wird nicht eingerechnet.** Ohne bekannte Beutelgröße (F6)
  wäre jeder Betrag geraten.
- Blöcke in `St`, `cm` oder Größenwörtern lassen sich **grundsätzlich nicht**
  bewerten: Der Metzger rechnet nach Kilo, ein Stückgewicht ist nicht bekannt.
  Das betrifft rund die Hälfte einer typischen Bestellung und ist kein Fehler.
- Ebenso wenig bewertbar sind Artikel ohne Preis (27 Formularzeilen).
- Die Zahl der nicht bewertbaren Positionen wird **immer** genannt, damit die
  Verkäuferin weiß, wie belastbar die Zahl ist.
- Lässt sich **keine** Position bewerten, erscheint kein Betrag, sondern nur ein
  erklärender Hinweis.

#### F16 Test Cases

**TC-F16-01: Wert aus Gewicht und Preis**

- **Setup:** `2 × 500 g` Putenschnitzel zu 17,50 €/kg.
- **Expected:** Mindestens 17,50 € als Schätzung.

**TC-F16-02: Verpackung bleibt außen vor**

- **Setup:** Dieselbe Bestellung, zusätzlich zwei Portionen vakuumiert.
- **Expected:** Der Betrag ändert sich nicht.

**TC-F16-03: Stückangaben sind nicht bewertbar**

- **Setup:** `2 × 500 g` Putenschnitzel und `1 × 30 St` Weißwurst.
- **Expected:** Betrag nur aus dem Gewichtsanteil; Hinweis „1 Position nicht
  bewertbar".

**TC-F16-04: Ohne jede bewertbare Position kein Betrag**

- **Setup:** Nur Stück- und Größenangaben bestellt.
- **Expected:** Kein Betrag, nur ein erklärender Hinweis.

**TC-F16-05: Schätzung ist als solche erkennbar**

- **Expected:** Die Anzeige nennt „geschätzt" und „mindestens".

### F17: Responsive und bedienbar

#### F17 Description

Das Layout richtet sich nach der **tatsächlichen Fensterbreite und -höhe**, nicht
nach einem festen Entwurf. Geprüft wird auf Mobile (375×667), iPad mini
(768×1024) und Desktop (1280×800).

#### F17 Behaviour / Acceptance

- Auf allen Größen kein horizontaler Scroll, nichts überlappt oder wird
  abgeschnitten.
- **Die Artikelliste nutzt die Breite:** eine Spalte bis 1180 px, **zwei Spalten
  darüber**, drei ab 1620 px. Bei 84 Zeilen halbiert das die Scrollstrecke. Die
  Papierreihenfolge bleibt erhalten (zeilenweise von links nach rechts).
  Gruppentitel und der geöffnete Editor spannen über alle Spalten.
- **Die Editor-Gruppen legen sich nebeneinander, sobald Platz ist**, und stapeln
  auf schmalen Schirmen — kein Block belegt unnötig die volle Breite.
- Bei **geringer Fensterhöhe** wird der Editor verdichtet: kleinere Abstände,
  Vorschläge in einer waagrecht wischbaren Zeile.
- Auf Mobile stapelt sich die Zeile: Nummernspalte und Bezeichnung oben,
  Badges darunter.
- Der Editor bleibt zwischen Kopf und Fußzeile sichtbar; passt er nicht ganz,
  wird seine Oberkante angelegt.
- Kopfbereich bleibt ab 620 px Breite beim Scrollen stehen; darunter scrollt er mit.
- Keine `alert()`/`confirm()`; alle Meldungen laufen über die In-App-Komponenten
  in Klartext.
- **Auswahl geschieht über Knöpfe, nicht über Auswahllisten.** Ein `<select>`
  verlangt auf dem Tablet zwei Tipper und verdeckt dabei den Rest — Werte müssen
  direkt selektierbar sein. Das gilt für Einheiten, Portionsgrößen und den
  Umschalter „Übliche / Alle Artikel".
- **Halbfett statt fett.** Hervorhebungen laufen über `font-weight: 600`;
  `bold`/`700` ist auf den Kioskschirmen schwer zu lesen und wird nicht
  verwendet — auch nicht über `<b>` oder `<strong>`. Die Regel gilt für den
  gesamten Kiosk, nicht nur für diesen Tab.

#### F17 Test Cases

**TC-F17-01: Drei Viewports ohne Überlauf**

- **Expected:** Auf 375×667, 768×1024 und 1280×800 kein horizontaler Scroll,
  nichts abgeschnitten.

**TC-F17-02: Spaltenzahl folgt der Breite**

- **Expected:** Bei 768 px eine Spalte, bei 1280 px zwei, bei 1620 px drei.

**TC-F17-03: Editor-Gruppen nutzen die Breite**

- **Expected:** Auf 1280 px liegen mindestens zwei Gruppen nebeneinander; auf
  375 px stapeln sie.

**TC-F17-04: Editor passt zwischen Kopf und Fuß**

- **Expected:** Auf allen drei Viewports liegt der geöffnete Editor vollständig
  im freien Bereich.

**TC-F17-05: Mobile stapelt die Zeile**

- **Expected:** Nummer und Bezeichnung in einer Zeile, Badges darunter.

**TC-F17-06: Tap-Targets groß genug**

- **Expected:** Kein Bedienelement ist kleiner als 34 px hoch oder 28 px breit.

**TC-F17-07: Keine nativen Dialoge**

- **Expected:** Kein `alert()`/`confirm()`; Meldungen in Klartext ohne
  technische Details.

**TC-F17-08: Keine Auswahllisten im Erfassungsweg**

- **Expected:** Der geöffnete Editor enthält kein `<select>`; Einheiten und
  Portionsgrößen sind Knöpfe.

**TC-F17-09: Nichts ist fett gesetzt**

- **Expected:** Im Metzger-Panel hat kein sichtbares Element eine
  `font-weight` über 600.

### F18: Tab im CMS an- und abschaltbar

#### F18 Description

Der Tab „Metzger Mair" lässt sich im CMS ein- und ausblenden, wie die übrigen
Kiosk-Tabs.

#### F18 Behaviour / Acceptance

- Im CMS gibt es einen Schalter „Kiosk-Tab Metzger Mair".
- Startwert ist **eingeschaltet**.
- Ausgeschaltet erscheint weder Reiter noch Erinnerung.
- Die Einstellung wirkt ohne neues Deployment.
- Der bestehende Tab „Metzger" (Kundenvorbestellungen) bleibt davon unberührt.

#### F18 Test Cases

**TC-F18-01: Schalter vorhanden**

- **Expected:** Im CMS existiert der Schalter, eingeschaltet.

**TC-F18-02: Ausschalten blendet aus**

- **Action:** Ausschalten, Kiosk neu laden.
- **Expected:** Kein Reiter, keine Erinnerung.

**TC-F18-03: Kundentab bleibt**

- **Expected:** Der Tab „Metzger" ist weiterhin da.

**TC-F18-04: Wieder einschalten**

- **Expected:** Reiter erscheint wieder mit unverändertem Stand.

## Data & Contracts

### Neue Endpunkte

| Endpunkt | Methode | Zweck |
| --- | --- | --- |
| `/api/metzger-artikel` | GET | Katalog in Formularreihenfolge |
| `/api/metzger-artikel` | POST | Artikel anlegen (mit Dublettenprüfung) |
| `/api/metzger-artikel/{id}` | PATCH | Ändern, aus-/einblenden |
| `/api/metzger-order?datum=…` | GET | Bestellung/Entwurf inkl. Vorbelegung und Vorschlägen |
| `/api/metzger-order` | POST | Entwurf speichern |
| `/api/metzger-order/{id}/senden` | POST | Mail und PDF erzeugen, versenden **und die Vorschläge nachführen** (F4) |
| `/api/metzger-order/{id}/korrektur` | POST | Korrektur versenden |
| `/api/metzger-order?mode=verlauf` | GET | Verlauf |
| `/api/metzger-order/{id}/dokument` | GET | Gesendetes Dokument abrufen |

### Position (JSON)

```json
{
  "nummer": 360,
  "name": "Putenschnitzel",
  "portionen": [
    { "anzahl": 2, "menge": 4,   "einheit": "St", "vakuum": "mittel" },
    { "anzahl": 1, "menge": 0.5, "einheit": "kg", "vakuum": "aus" }
  ],
  "hinweis": "",
  "zusatz": false,
  "quelle": "vorbelegt"
}
```

`einheit` ∈ `kg` · `g` · `St` · `cm` · `Schale` · `Beutel` · `klein` · `mittel` ·
`groß` (Portionsgrößen). `vakuum` ist `true`/`false`. `quelle` ∈ `vorbelegt` ·
`geaendert` · `zusatz`.

### Ablage

Wie bei der Bäcker-Bestellung liegt alles als JSON im generischen
Schlüssel-/Wert-Speicher **`dl_seiteninhalts`**. Damit ist **keine
Schema-Änderung in Dataverse nötig** — eine im Betrieb bewährte Ablage.

| Schlüssel | Inhalt |
| --- | --- |
| `metzger_artikel` | Artikelkatalog (84 Formularzeilen + 18 inaktive) |
| `metzger_config` | Einstellungen (Empfänger, Bestelltage, Bestellschluss, Kd.-Nr.) |
| `metzger_vorschlaege` | Vorschlagslisten je Artikelnummer, höchstens fünf (F4) |
| `metzger_order_JJJJ-MM-TT` | eine Bestellung je Liefertag inkl. Protokoll und gesendetem PDF |

Fehlt ein Schlüssel, liefert der Server den Startbestand aus
`api/metzger-order/vorlage/*.json`. Der Kiosk ist dadurch ab dem ersten Aufruf
brauchbar, auch ohne Seed-Lauf.

Keine Kollision mit `dl_fleischbestellungs` (Kundenvorbestellungen).

### Quelldateien

| Datei | Inhalt |
| --- | --- |
| [tools/metzger_rechnung_extract.py](../../tools/metzger_rechnung_extract.py) | Wertet die Rechnungen aus |
| [tools/metzger_formular_katalog.py](../../tools/metzger_formular_katalog.py) | Baut den Kiosk-Katalog |
| [tools/metzger_vorschlaege_build.py](../../tools/metzger_vorschlaege_build.py) | Leitet die Vorschlagslisten ab (F4) |
| `api/metzger-order/vorlage/rechnungsartikel.json` | 78 Artikel mit Preis und Einheit |
| `api/metzger-order/vorlage/lieferhistorie.json` | 26 Liefertage mit Positionen |
| `api/metzger-order/vorlage/katalog.json` | 84 Formularzeilen + 18 inaktive + Beutel |
| `api/metzger-order/vorlage/vorschlaege.json` | Startbestand der Vorschläge, 74 Artikel |

### Wiederverwendung

- Mailversand über Microsoft Graph wie in `api/baecker-order/`; der dort bereits
  um Dateianhänge erweiterte Versand wird genutzt.
- Auth über `api/shared/auth.py` (`admin_auth_guard`).
- Zustands-, Sperr- und Erinnerungslogik analog `static-site/js/kiosk-baecker.js`.

## Open Questions

Keine offenen `[NEEDS CLARIFICATION]`-Marker. Die Spec darf nach `/sdd-plan`.

Zwei Punkte sind bewusst als Startwert festgelegt und im Betrieb nachzuschärfen:

- Die **27 Formularzeilen ohne Rechnungszuordnung** tragen keine Nummer und
  keinen Preis. Sie sind bestellbar; die Zuordnung wächst, sobald sie in einer
  Rechnung auftauchen.
- Die **Warengruppen** folgen der Papierreihenfolge; ihre Grenzen sind in F15
  einstellbar.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 Bestelltag wählen | TC-F1-01 … 07 | — | — |
| F2 Portionsblöcke | TC-F2-01 … 05 | — | — |
| F3 Portionen erfassen | TC-F3-01 … 16 | — | — |
| F4 Vorschläge je Artikel | TC-F4-01 … 13 | — | — |
| F5 Kurzeingabe | TC-F5-01 … 12 | — | — |
| F6 Vakuum | TC-F6-01 … 06 | — | — |
| F7 Vorbelegung und letzte Werte | TC-F7-01 … 07 | — | — |
| F8 Zusatzartikel | TC-F8-01 … 06 | — | — |
| F9 Artikel verwalten | TC-F9-01 … 07 | — | — |
| F10 Suchen, Gruppen, übliche Artikel | TC-F10-01 … 09 | — | — |
| F11 Mail senden | TC-F11-01 … 08 | — | — |
| F12 Sperre und Korrektur | TC-F12-01 … 06 | — | — |
| F13 Erinnerung | TC-F13-01 … 06 | — | — |
| F14 Verlauf | TC-F14-01 … 04 | — | — |
| F15 Einstellungen | TC-F15-01 … 05 | — | — |
| F16 Bestellwert | TC-F16-01 … 05 | — | — |
| F17 Responsive | TC-F17-01 … 09 | — | — |
| F18 CMS-Schalter | TC-F18-01 … 04 | — | — |

## Constitution Compliance

| Prinzip | Erfüllung |
| --- | --- |
| 1 Spec first | Diese Spec vor Plan/Tasks/Code |
| 2 Test cases | F1–F18 mit TC-Fn-xx, Playwright |
| 3 Keine Secrets | Graph-Zugang über bestehende App-Einstellungen |
| 4 Keine Artefakte | Katalog und Historie sind erzeugte Quelldateien der Tools |
| 5 Deploy-aware | Auslieferung über den bestehenden SWA-Workflow |
| 6 Freundliche Meldungen | F11, F15, F17 — kein `alert()`, kein technischer Text |
| 7 Responsive | F17 auf allen drei Viewports |
| 8 Automatisierte Tests | `tests/kiosk-metzger-bestellung.spec.js` mit gemockter API |

# Getränke-Verlauf: Status, Zeitpunkt und Urheber wie bei Bäcker und Metzger

## Die Frage aus dem Laden

> „Könnte man auch bei Getränken die letzten historischen Bestellungen hier
> anzeigen lassen wie bei Metzger oder Bäcker mit Status usw.?"

## Ausgangslage — was es schon gibt

Der Reiter **Verlauf** existiert bereits. Er zeigt je Bestellung:

- Datum und Kalenderwoche
- Kisten und Positionen
- beim Aufklappen die vollständige Positionsliste
- einen Löschen-Knopf

Es fehlt also nicht „der Verlauf", sondern das, wonach ausdrücklich gefragt
wird: **der Status** — und alles, was ihn einordnet.

## Was Bäcker und Metzger mehr zeigen

| | Bäcker | Getränke (bisher) |
|---|---|---|
| Status | eigenes Feld: *gesendet* / *korrigiert* | nur Anhängsel „· zuletzt korrigiert" |
| Zeitpunkt | `18:07` aus dem Protokoll | — |
| Urheber | `· Kiosk` | — |
| Farbe der Zeile | grün bei gesendet | keine |

Die Daten liegen **bereits vor**: `_verlauf()` in
`api/getraenke-order/__init__.py` liefert `status` und `protokoll`
(`zeit`, `was`, `an`, `wer`) längst mit. Es ist reine Anzeige — kein
Serverumbau, kein zusätzlicher Abruf.

## Der Stolperstein: die Reihenfolge des Protokolls

Die drei Lieferanten speichern das Protokoll **unterschiedlich**:

| Endpunkt | Schreibweise | jüngster Eintrag |
|---|---|---|
| `baecker-order` | `[eintrag] + protokoll` | **`protokoll[0]`** |
| `metzger-order` | `protokoll.append(...)` | `protokoll[länge-1]` |
| `getraenke-order` | `protokoll.append(...)` | **`protokoll[länge-1]`** |

Der Bäcker-Code liest folgerichtig `e.protokoll[0]`. Würde man das für
Getränke übernehmen, stünde dort der **älteste** Eintrag: Bei einer
korrigierten Bestellung also „gesendet" mit der Uhrzeit des ersten Versands
— falsch, ohne dass es auffiele. `kiosk-metzger-bestellung.js` macht es
richtig vor: `prot[prot.length - 1]`.

**TC-GV-04 nagelt genau das fest.**

## Anforderungen

- **F1** Jede Zeile trägt ein eigenes Statusfeld: **Gesendet** (Status 1)
  oder **Korrigiert** (Status 2).
- **F2** Darunter stehen Uhrzeit und Urheber aus dem **jüngsten**
  Protokolleintrag, im Format `18:07 · Kiosk`.
- **F3** Fehlt das Protokoll, entfällt die Zeile — der Status bleibt
  stehen. Eine erfundene Uhrzeit wäre schlimmer als keine.
- **F4** Die Zeile ist links farbig markiert: grün bei *gesendet*,
  bernstein bei *korrigiert*.
- **F5** Das bisherige Anhängsel „· zuletzt korrigiert" entfällt — es sagt
  dasselbe, nur unauffälliger.
- **F6** Aufklappen, Positionsliste und Löschen bleiben unverändert.

## Testfälle (`tests/kiosk-getraenke-verlauf.spec.js`)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-GV-01 | Bestellung mit Status 1 | Statusfeld zeigt „Gesendet", Zeile grün |
| TC-GV-02 | Bestellung mit Status 2 | Statusfeld zeigt „Korrigiert", Zeile bernstein |
| TC-GV-03 | Protokoll vorhanden | Uhrzeit **und** Urheber stehen dabei |
| TC-GV-04 | Protokoll mit zwei Einträgen | der **jüngste** wird gezeigt, nicht der erste |
| TC-GV-05 | Protokoll fehlt | Status steht, keine erfundene Uhrzeit |
| TC-GV-06 | — | Aufklappen und Positionsliste funktionieren weiter |

## Gegenprobe

- **A — Bäcker-Reihenfolge übernommen** (`p[0]` statt `p[p.length-1]`):
  **nur TC-GV-04 fällt**, die übrigen fünf bleiben grün. Genau die Trennschärfe,
  auf die es ankommt — der Fehler wäre sonst still danebengelegen
  („09:15 · Anna" statt „16:42 · Bernd").
- **B — Statusfeld entfernt**: **alle sechs** Fälle fallen.

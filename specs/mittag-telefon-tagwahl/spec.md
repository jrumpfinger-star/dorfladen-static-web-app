# Telefonische Bestellung für die folgenden Tage

## Overview

Aus dem Laden: *„Es sollte auch möglich sein eine telefonische Bestellung für
die folgenden Tage erfassen zu können. Es wird momentan immer das Menü des
heutigen Tages angezeigt."*

Im Bild: Der Tagesreiter steht auf **„Morgen 25.09."**, im Dialog „Neue
Bestellung" stehen trotzdem die Gerichte von heute.

## Ursache

Zwei Stellen, und die zweite wog schwerer.

**1. Die Gerichteauswahl las die Uhr statt den Reiter.**

```js
var todayDay = new Date().getDay();       // immer HEUTE
var dvDay = todayDay===0?null:(100999+todayDay);
var todayDishes = dishes.filter(d => d.dl_wochentag===dvDay);
if(todayDishes.length===0) todayDishes = dishes;   // Notnagel: ALLE
```

`_mittagDatum` — der gewählte Tag — kam nicht vor.

**2. Das Datum der Bestellung stammte aus dem Gericht.**

```js
datum: selectedDish.dl_datum || today(),
```

Damit war der Fehler nicht nur eine Anzeigesache: Wer am Reiter „Morgen" eine
Bestellung aufnahm, buchte sie auf **heute**. Unter dem gewählten Tag tauchte
sie nie auf — sie schien verschwunden.

**3. Der Notnagel war gefährlich.** Gab es für den Wochentag nichts, zeigte
die Liste **alle** Gerichte der Woche. Wer nicht genau hinsah, bestellte ein
Gericht, das es an dem Tag gar nicht gibt.

## F1: Der gewählte Tag bestimmt alles

- Die Gerichteauswahl filtert auf `_mittagDatum`, zuerst über `dl_datum`,
  ersatzweise über `dl_wochentag` (der Plan wird teils ohne Datum gepflegt).
- Die Bestellung wird **auf `_mittagDatum` gebucht**, nicht auf das Datum des
  Gerichts.
- Der Notnagel „dann eben alle Gerichte" entfällt. Gibt es für den Tag nichts,
  steht das da: *„Für Donnerstag, 25.09.2026 ist noch kein Gericht im
  Wochenplan."* Lieber ehrlich leer als das falsche Menü.

## F2: Der Dialog schreibt den Liefertag an

Der Tagesreiter liegt hinter dem geöffneten Dialog und ist dort nicht zu
sehen. Eine neue Zeile im Dialogkopf nennt ihn:

> 📅 Liefertag: **Donnerstag, 25.09.2026**

Bei einer telefonischen Bestellung für den falschen Tag merkt es niemand —
weder Personal noch Kunde. Die Zeile kostet nichts und schließt das aus.

## F3: Tage der Folgewoche laden ihren Plan nach

Die Tagesleiste reicht von gestern bis **fünf Tage voraus**; der Wochenplan
wird aber nur für die **laufende** Woche geladen. Je nach Wochentag liegt
rund die Hälfte der Leiste jenseits der Wochengrenze.

Für solche Tage wird der Plan gezielt nachgeladen — mit **demselben Filter,
den der Server sonst selbst bildet** (`dl_kalenderwoche` + `dl_jahr`). Damit
ist die Bedeutung der Daten identisch; es wird nicht auf `dl_datum`
spekuliert, das nicht überall gepflegt ist.

Geladene Wochen werden gemerkt, ein zweiter Abruf entfällt. Schlägt der Abruf
fehl, bleibt es bei der ehrlichen Leermeldung aus F1.

## Test Cases

**TC-TW-01: Der Dialog zeigt das Menü des gewählten Tages** — der gemeldete
Fall.

**TC-TW-02: Für heute bleibt es beim heutigen Menü** — der Normalfall darf
nicht kaputtgehen.

**TC-TW-03: Die Bestellung wird auf den gewählten Tag gebucht** — der
eigentliche Schaden; geprüft am gesendeten Rumpf.

**TC-TW-04: Der Dialog schreibt den Liefertag an.**

**TC-TW-05: Ohne Gericht für den Tag wird nichts Falsches angeboten** — der
Notnagel darf nicht zurückkehren.

**TC-TW-06: Ein Tag der Folgewoche lädt seinen eigenen Plan** — der Mock
liefert je Abruf nur die angefragte Woche, genau wie der Server. Bildet er
das nicht nach, prüft der Test die halbe Wahrheit.

**Gegenprobe gemacht:** Mit dem alten Verhalten (`new Date()` und
`selectedDish.dl_datum`) fallen **4 von 6**. Der Wächter ist nicht blind.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-klassisch.html](../../static-site/kiosk-klassisch.html) | `renderDishPicker`, `doSubmitOrder`, `openNewOrder`, Dialogkopf, `ladePlanFuer`, `_isoWoche` |
| [kiosk-mittag-tagwahl.spec.js](../../tests/kiosk-mittag-tagwahl.spec.js) | neu, 6 Fälle |

**Wichtig:** `kiosk-klassisch.html` ist die **Quelle**. `kiosk.html` und
`kiosk-neu.html` entstehen daraus über `tools/build-kiosk-neu.js`.

# Die Erinnerung zielt auf den richtigen Tag

## Overview

Aus dem Laden: *„Warum blinkt Metzger Mair heute?"*

Donnerstag, 24.09.2026, 12:54 Uhr. Im Bild:

| Liefertag | Zustand |
|---|---|
| Mo 21.09. | ✓ korrigiert · 9 Pos. |
| **Do 24.09.** (heute) | **Entwurf · 6 Pos.** — ausgegraut |
| Mo 28.09. | ✓ gesendet · 45 Pos. |
| Do 01.10. | offen |

Nichts war überfällig. Die nächste Lieferung (Mo 28.09.) war längst gesendet.

## Ursache

Der Reiter blinkte wegen des **liegengebliebenen Entwurfs von heute**:

```js
var heute = new Date().toISOString().slice(0, 10);
(_tage || []).forEach(function (t) {
  if (t.datum === heute && t.bestelltag && !t.status) faellig = true;
});
```

`STATUS_ENTWURF = 0`, also ist `!t.status` für einen Entwurf **wahr**. Und
Donnerstag ist ein Liefertag. Nach 12:00 → blinken.

**Verlangt wurde damit etwas Unmögliches.** Die Spec sagt zum heutigen Tag:

> „Bestellt wird **mit Vorlauf**: Die Bestellung für einen Liefertag muss
> spätestens am Vortag draußen sein. **Der heutige Tag ist deshalb nie mehr
> bestellbar**, auch wenn er ein Bestelltag ist — die Ware ist längst
> gepackt."
> ([metzger-bestellung](../metzger-bestellung/spec.md), F1)

Der Tag war nicht einmal anwählbar (`bestellbar: false`). Das Blinken hätte
bis Mitternacht angehalten, ohne dass sich etwas tun ließ — eine Aufforderung
ohne Ausweg.

### Der Bäcker macht es seit jeher richtig

Derselbe Zweck, andere Umsetzung — und die stimmt:

```python
for i in range(1, 9):                       # ab MORGEN
    tag = (heute + timedelta(days=i)).isoformat()
    if store.bestellschluss_tag(tag) != heute:
        continue                            # nur was heute fällig ist
```

Der Bäcker sucht **künftige** Liefertage, deren Bestellschluss auf heute
fällt. Genau diese Regel fehlte beim Metzger.

### Ein zweiter Fehler in derselben Zeile

`new Date().toISOString().slice(0, 10)` rechnet nach **UTC** um. Zwischen
Mitternacht und 02:00 Uhr Ortszeit (MESZ) liefert das den **Vortag** — dieselbe
Klasse von Fehler wie bei den Zeitstempeln
([zeitzone-projektweit](../zeitzone-projektweit/spec.md)). Das Datum wird
jetzt aus den Ortszeit-Feldern gebaut.

## F1: Erinnert wird an den Liefertag von morgen

- Grundlage ist der Liefertag **morgen** — für ihn ist heute der letzte Tag.
- Erinnert wird ab **Bestellschluss** (Einstellung, Vorgabe 12:00).
- **Gesendet (1) und korrigiert (2) sind erledigt.** Ein Entwurf (0) ist es
  nicht: „Die Erinnerung endet, sobald die Mail raus ist" (F13). Vorher
  stand dort `!t.status`, was denselben Zweck erfüllte, aber die Absicht
  nicht erkennen ließ.
- Ein Entwurf oder ein offener Tag von **heute** löst nichts mehr aus.
- Ist morgen kein Liefertag, wird nicht erinnert.
- **Im Testbetrieb blinkt nichts** — unverändert (F13).

## Test Cases

**TC-ME-01: Ein Entwurf von HEUTE lässt den Reiter ruhig** — der gemeldete
Fall, mit fest gestellter Uhr auf Donnerstag 12:54.

**TC-ME-02: Ist morgen Liefertag und nichts raus, wird erinnert** — der
eigentliche Zweck der Erinnerung.

**TC-ME-03: Vor Bestellschluss bleibt es ruhig.**

**TC-ME-04: Ist morgen schon gesendet, wird nicht erinnert.**

**TC-ME-05: Ein Entwurf für morgen reicht nicht** — erst die Mail beendet
die Erinnerung.

**TC-ME-06: Eine Korrektur beendet die Erinnerung ebenfalls.**

**TC-ME-07: Ist morgen kein Liefertag, wird nicht erinnert.**

**TC-ME-08: Im Testbetrieb blinkt nichts.**

Alle Fälle laufen mit **fest gestellter Uhr**. Ein Wächter, der vom
Wochentag seines Laufs abhängt, kippt über Nacht — das ist in diesem Projekt
schon dreimal passiert.

**Gegenprobe gemacht:** Mit dem alten Verhalten fallen **4 von 8**, darunter
TC-ME-01. Der Wächter ist nicht blind.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-metzger-bestellung.js](../../static-site/js/kiosk-metzger-bestellung.js) | `badge()` |
| [kiosk-metzger-erinnerung.spec.js](../../tests/kiosk-metzger-erinnerung.spec.js) | neu, 8 Fälle |

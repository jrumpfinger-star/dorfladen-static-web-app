# Telefonbestellung: Das Kundenfeld kommt wieder

**Meldung aus dem Laden:** „Es kommt vor, dass nach mehreren
Telefonbestellungen auf einmal der Kunde nicht mehr eingebbar und
auswählbar ist."

## Ursache

Im Dialog „Neue Bestellung" stehen Suchfeld und der Knopf „+ Neu"
gemeinsam in einer Zeile. Versteckt wird deshalb die **Zeile**:

```js
document.getElementById('no-kunde-search').parentElement.style.display = 'none';
```

So machen es `selectOrderKunde()` (ein Kunde wurde gewählt) und
`newOrderKunde()` („+ Neu" gedrückt) — beide richtig.

`openNewOrder()` setzte beim nächsten Öffnen aber das **Feld selbst**
zurück:

```js
document.getElementById('no-kunde-search').style.display = '';   // falsch
```

Dessen `display` hatte nie jemand gesetzt; die Zeile blieb auf `none`.
Gemessen in der Gegenprobe: `Zeile: "none", Feld: ""`.

Damit war das Bild genau wie gemeldet — das Etikett „Kunde \*" stand da, ein
Eingabefeld gab es nicht mehr. Zurück kam es nur über „✕ Ändern" in der
grünen Kundenkachel, die in diesem Zustand aber ebenfalls ausgeblendet war,
oder durch Neuladen der Seite.

„Nach mehreren Bestellungen" trifft es genau: Die **erste** Aufnahme
funktionierte, denn beim ersten Öffnen war noch nichts versteckt. Ab der
zweiten war das Feld weg.

## Anforderungen

- **R1** Beim Öffnen des Dialogs ist die Kundenzeile sichtbar — unabhängig
  davon, was bei der vorigen Bestellung geschah.
- **R2** Das gilt beliebig oft hintereinander.
- **R3** Auch nach „+ Neu" (Kundenneuanlage) kommt die Zeile zurück, und die
  Neuanlage ist wieder zugeklappt.
- **R4** Der Kunde der vorigen Bestellung ist nicht vorbelegt — sonst ginge
  die nächste Bestellung stillschweigend an den falschen Namen.

## Test Cases

| ID | Prüft | Erwartung |
|----|-------|-----------|
| TC-T09-01 | R1 | eine Bestellung aufnehmen, Dialog erneut öffnen → Suchfeld sichtbar |
| TC-T09-02 | R2 | dasselbe dreimal hintereinander |
| TC-T09-03 | R3 | „+ Neu" öffnen, Dialog erneut öffnen → Zeile da, Neuanlage zu |
| TC-T09-04 | R4 | nach erneutem Öffnen ist kein Kunde gewählt, Feld leer |

Wächter: [tests/kiosk-telefon-name.spec.js](../../tests/kiosk-telefon-name.spec.js)

## Umsetzung

Eine Zeile in `openNewOrder()` in
[static-site/kiosk-klassisch.html](../../static-site/kiosk-klassisch.html):
`parentElement` statt des Feldes. `kiosk.html` und `kiosk-neu.html` werden
daraus neu gebaut.

## Gegenprobe

Mit der alten Zeile fallen **TC-T09-01, -02 und -03** mit der Meldung
`Zeile: "none", Feld: ""`. TC-T09-04 bleibt grün — die Vorbelegung ist eine
eigene Stelle und war nie kaputt.

# Kiosk – die Symbolschleife, die Klicks verschluckt hat

## Ausgangslage

Über Wochen gemeldet, in wechselnden Worten: „Die Buttons öffnen im
Kiosk nicht die Seite", „Info-Button reagiert nicht", „Klick auf
Menüicons öffnet nicht, z. B. CMS", „CMS startet nicht". Immer mit dem
gleichen auffälligen Zusatz: **„Link in neuem Tab öffnen funktioniert."**

Zuletzt der entscheidende Hinweis aus dem Laden:
**„Nach 30–60 Sekunden nach Start gehen die Buttons, vorher nicht."**

## Ursache

`lucide.createIcons()` ist **nicht idempotent**. Es sucht Elemente mit
`data-lucide`, ersetzt sie durch ein `<svg>` — und setzt `data-lucide`
**auch auf das erzeugte `<svg>`**. Beim nächsten Lauf findet es also
seine eigenen Ergebnisse wieder und baut sie erneut auf.

Auf der echten Seite nachgemessen: 120 Elemente mit `data-lucide`,
davon **120 `<svg>` und kein einziges `<i>`**. Jeder Aufruf baute somit
alle 120 Symbole neu.

Zusammen mit dem Beobachter in `inhalteBeobachten()` ergab das eine
Rückkopplung:

```
createIcons() ersetzt Symbole
        → MutationObserver auf .k-main feuert
        → symboleNachziehen()
        → requestAnimationFrame
        → createIcons() ersetzt Symbole
        → …
```

Gemessen gegen die laufende Seite: **8.253 Austausche in 70 Sekunden**,
gleichmäßig verteilt, im Abstand von rund **16 ms** — exakt der Takt von
`requestAnimationFrame`. Betroffen waren die 7 Symbole der Kopfzeile und
die 9 der Reiterleiste, also genau die Bedienelemente.

## Warum dadurch Klicks verschwinden

Ein `click` entsteht nur, wenn `mousedown` **und** `mouseup` auf
demselben Element landen. Ein Mensch hält die Taste rund 120 ms — das
Element war nach spätestens 16 ms ersetzt.

Der Beweis, gegen die laufende Seite, mit echten Mausereignissen und
120 ms Haltezeit:

| Messung | Vorher | Nachher |
|---|---|---|
| `mousedown` angekommen | 12 von 12 | 12 von 12 |
| `mouseup` angekommen | 12 von 12 | 12 von 12 |
| **`click` entstanden** | **0 von 12** | **12 von 12** |
| Austausche in 30 s | ~3.500 | 35 |

Das erklärt auch alle Nebenbeobachtungen:

- **„In neuem Tab öffnen" ging immer** — das Kontextmenü braucht kein
  Klick-Ereignis.
- **Die automatisierten Tests waren stets grün** — Playwright klickt
  binnen weniger Millisekunden und traf fast immer das gleiche Element.
- **„Mal geht es, mal nicht"** — es ist ein Wettlauf, kein fester Defekt.

## Anforderungen

- **F1** `createIcons()` läuft nur, wenn es noch **unbearbeitete**
  Elemente gibt (`:not(svg)[data-lucide]`).
- **F2** Die Rückkopplung zwischen Beobachter und Symbolaufbau ist
  unterbrochen: Im Ruhezustand finden **keine** laufenden Ersetzungen
  der Bedienelemente mehr statt.
- **F3** Die Absicherung greift **zentral**, nicht nur an einzelnen
  Aufrufstellen — im Kiosk rufen rund ein Dutzend Modulstellen
  `lucide.createIcons()` direkt auf.
- **F4** Symbole werden weiterhin zuverlässig dargestellt: Nach dem
  Laden und nach jedem Reiterwechsel bleibt kein `<i data-lucide>`
  unbearbeitet stehen.

## Testfälle

| Nr. | Fall | Erwartung |
|---|---|---|
| TC-S01 | 20 s Ruhezustand beobachten | **unter 100** Austausche in der Kopfzeile (vorher ~2.400) |
| TC-S02 | 10 Klicks mit 120 ms Haltezeit | **alle 10** kommen als `click` an |
| TC-S03 | Nach dem Laden | kein `:not(svg)[data-lucide]` übrig |
| TC-S04 | Nach einem Reiterwechsel | Symbole sind gezeichnet, nichts bleibt unbearbeitet |
| TC-S05 | `createIcons()` von Hand zweimal aufrufen | die Symbolknoten bleiben **dieselben** |

# „Schreib uns": kein stiller Rückfall auf WhatsApp

## Die Meldung aus dem Laden

> „Warum ist auf Desktop ,Schreib uns' ein WhatsApp-Aufruf? Muss genauso
> wie bei mobile sein."

## Befund

Es ist **keine Frage der Bildschirmgröße** — und das war der irreführende
Teil. Zwei Dinge trafen zusammen:

**1. Der Fehlschlag wurde still verschluckt.**

```js
fetch(API+'/cms-config').then(…).catch(function(){});   // ← alles weg
```

Die Umschaltung von WhatsApp auf den eigenen Chat hing an genau dieser
einen Abfrage. Klemmte sie auch nur einmal — eine kalt angelaufene
Azure-Funktion braucht schon mal ein paar Sekunden, ein kurzer
Netzaussetzer genügt —, blieb der Chat für den **ganzen Besuch** aus.
Ohne Hinweis, ohne Wiederholung. Der Besucher sah den alten
WhatsApp-Knopf.

Das passt genau zum eingereichten Bild: Dort ist **nur** der
WhatsApp-Knopf zu sehen und **kein** Chat-Knopf. Wäre die Umschaltung
gelaufen, gäbe es beide — einen davon versteckt.

**2. Auf dem Telefon fällt das nie auf.**

`css/mobile.css` blendet den WhatsApp-Knopf in
`@media(max-width:768px)` hart aus:

```css
.wa-float{display:none!important}
```

Unterhalb von 768 px ist er also **immer** weg, ganz gleich ob die
Umschaltung lief. Oberhalb hängt alles an der Abfrage. Daher der
Eindruck „auf Desktop anders als auf mobile" — die Grenze liegt exakt bei
768 px.

## Änderung

- **Letzten bekannten Stand merken** (`dl_kontakt_an` im localStorage) und
  beim Laden sofort anwenden. Wer schon einmal da war, bekommt den Chat
  auch dann, wenn die Abfrage klemmt.
- **Zweimal nachfassen** bei Fehlschlag (nach 1,5 s und 3 s).
- **Korrigieren**, sobald die Abfrage durchkommt: Ist das Merkmal
  abgeschaltet, werden Chat-Knopf und Fenster wieder entfernt und
  WhatsApp kommt zurück.
- Der WhatsApp-Knopf wird per **Regel** ausgeblendet (`#hp-chat-wa-aus`
  mit `!important`) statt per Inline-Stil am Element — genauso, wie es
  `mobile.css` auf dem Telefon tut.

## Anforderungen

- **F1** Im Normalfall steht der Chat, WhatsApp ist weg.
- **F2** Klemmt die Abfrage anfangs, wird nachgefasst.
- **F3** Fällt sie ganz aus, rettet der gemerkte Stand den Chat.
- **F4** Ist das Merkmal abgeschaltet, bleibt WhatsApp — auch wenn ein
  alter Merker noch „an" sagt. Die Abfrage entscheidet.

## Testfälle (`tests/kontakt-kunde-feld-badge.spec.js`, Abschnitt KW)

| Fall | Lage | Erwartung |
|---|---|---|
| TC-KW-01 | Abfrage klappt | Chat da, WhatsApp weg |
| TC-KW-02 | Abfrage scheitert 1 s lang | Chat kommt trotzdem, es wurde nachgefasst |
| TC-KW-03 | Abfrage scheitert dauerhaft, Merker gesetzt | Chat da |
| TC-KW-04 | Merkmal aus, Merker sagt „an" | WhatsApp sichtbar, Chat weg (nur > 768 px prüfbar) |

## Gegenprobe

- **Merker entfernt** → **TC-KW-03** fällt: Ohne gemerkten Stand ist der
  Chat bei dauerhaft klemmender Abfrage weg.
- **Nachfassen abgeschaltet** → **TC-KW-02** fällt.

### Ein unscharfer Wächter, der korrigiert wurde

TC-KW-02 ließ zunächst die ersten *n* Abrufe scheitern. Das prüfte
nichts: `app.js` fragt dieselbe Konfiguration ebenfalls ab, der erste
Fehlschlag traf also womöglich app.js, und `kontakt.js` bekam beim ersten
eigenen Versuch schon eine gültige Antwort. Die Gegenprobe zeigte es —
mit abgeschaltetem Nachfassen blieb der Fall grün. Jetzt scheitert die
Abfrage **zeitbasiert** (eine Sekunde lang); das überlebt nur, wer
wirklich nachfasst.

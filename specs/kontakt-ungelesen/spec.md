# Nachrichten wieder als ungelesen markieren

## Overview

Aus dem Laden: *„nachrichten sollen auch wieder als ungelesen markiert
werden können."*

## Warum das fehlte

Eine Konversation gilt als gelesen, **sobald man sie aufklappt**:

```js
function toggle(id){
  _open[id]=!_open[id];
  if(_open[id]){
    if(t && !t.kommentar_gelesen){ markRead(id); … }
  }
}
```

Das ist richtig — nur gab es keinen Weg zurück. Wer eine Nachricht nur kurz
überflog, um sich später darum zu kümmern, verlor sie aus **„Neue
Nachrichten"**, und der Zähler am Reiter fiel auf null. Damit war der
Merkposten weg.

## F1: Der Lesehaken ist der Weg zurück

Der blaue Doppelhaken (✓✓) an einer gelesenen Konversation ist jetzt ein
**Knopf**. Ein Klick setzt sie wieder auf ungelesen.

Warum dort und nicht als eigener Eintrag: Der Haken **bedeutet** bereits
„gelesen". Ihn anzutippen, um das rückgängig zu machen, ist die kürzeste
Verbindung zwischen Bedeutung und Handlung — dieselbe Geste kennt man aus
Messenger-Programmen.

An einer **ungelesenen** Konversation steht dort die grüne Zahl und kein
Knopf; dort wäre er sinnlos.

## F2: Drei Dinge müssen zusammenpassen

Sonst wirkt es nur halb:

1. **Der Server merkt es sich** — sonst ist es nach dem nächsten Laden weg.
   `PATCH {kommentar_gelesen:false}` konnte er schon; es fehlte allein die
   Bedienung.
2. **Die Konversation rutscht zurück** nach „Neue Nachrichten". Dafür muss
   `_unreadAtLoad` mitgezogen werden — das hält die Gruppierung während
   einer Sitzung bewusst fest, damit eine gerade gelesene Nachricht nicht
   unter den Fingern wegspringt.
3. **Ein offener Verlauf wird zugeklappt.** Bliebe er offen, markierte
   `toggle()` ihn beim nächsten Antippen sofort wieder als gelesen — und
   beim Zuklappen sähe man gar nicht, dass sich etwas getan hat.

## F3: Kein stilles Scheitern

Schlägt der Server fehl, kehrt die Anzeige zurück und ein Hinweis erscheint.
Sonst hielte man die Nachricht für vorgemerkt, während sie es nicht ist.

## Test Cases

**TC-KU-01: Eine gelesene Konversation trägt einen Knopf.**

**TC-KU-02: Eine ungelesene hat keinen** — dort wäre er sinnlos.

**TC-KU-03: Der Klick meldet es dem Server** — genau ein
`PATCH {kommentar_gelesen:false}`.

**TC-KU-04: Sie rutscht zurück zu den neuen Nachrichten.** Aufgesetzt mit
`allRead`, sonst wären hinterher alle drei ungelesen — dann entfallen die
Überschriften zu Recht und der Fall prüfte nichts.

**TC-KU-05: Der Klick klappt die Karte nicht auf.** Ohne
`stopPropagation` hätte `toggle()` sie im selben Atemzug wieder als gelesen
gemeldet.

**TC-KU-06: Ein offener Verlauf wird zugeklappt.**

**TC-KU-07: Es überlebt das Neuladen.**

Der Mock bildet dafür auch den **Weg zurück** im Serverzustand nach; vorher
merkte er sich nur „gelesen", und TC-KU-07 hätte nur die Anzeige geprüft.

**Gegenprobe gemacht:** Ohne den Knopf fallen **6 von 7**. Der eine, der
bleibt, ist TC-KU-02 — er prüft die Abwesenheit.

## Ein Fund nebenbei

Mein Knopf trug zuerst die Klasse `kk-unread` — die gibt es **schon** als
Klasse der Karte. Umbenannt in `kk-ticks-btn`; zwei Bedeutungen unter einem
Namen wären eine Falle für den Nächsten.

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-kontakt.js](../../static-site/js/kiosk-kontakt.js) | `markUnread`, Haken als Knopf |
| [kiosk-klassisch.html](../../static-site/kiosk-klassisch.html) | `button.kk-ticks` |
| [kiosk-kontakt-haken.spec.js](../../tests/kiosk-kontakt-haken.spec.js) | 7 Fälle, Mock erweitert |
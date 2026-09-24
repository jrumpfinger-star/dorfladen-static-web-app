# Bestellen ohne E-Mail bleibt auffindbar

## Overview

Aus dem Laden: Wer **ohne E-Mail-Adresse** bestellt, sah seine Bestellung auf
der Startseite nie wieder — obwohl der Server ausdrücklich für diesen Fall
gebaut ist.

Die Mittagstischbestellung ist bewusst ohne Anmeldung möglich. Die E-Mail ist
**freiwillig**. Damit eine Bestellung trotzdem wiedergefunden wird, gibt es
zwei Schlüssel:

| Schlüssel | Gilt für | Entsteht |
|---|---|---|
| E-Mail | alle Geräte derselben Person | wenn angegeben |
| Geräte-Kennung | einen Browser | beim ersten Bedarf |

Der Server sucht nach dem einen **oder** dem anderen. Die Startseite schickt
die E-Mail, falls vorhanden, sonst die Geräte-Kennung.

## Ursache

Nicht die Suche war kaputt, sondern die **Ablage**. Die Bestellseite legte
jede Bestellung ohne Kennung ab:

```js
device_id: (window.dlPushDeviceId ? dlPushDeviceId() : '')
```

Die Funktion lag in `js/pwa.js` — rund 40 KB mit Service-Worker-Anmeldung und
Installationslogik. Die Bestellseite lud diese Datei **nicht**. Der
Ausweichzweig griff also **immer**, und `device_id` war stets leer.

Zu sehen war davon nichts: Die Bestellung ging durch, der Laden bekam sie,
alles schien in Ordnung. Nur der zweite Schlüssel fehlte — und wer keine
E-Mail angegeben hatte, hatte danach gar keinen.

**Dieselbe Zeile stand an zwei weiteren Stellen**, bei der Anmeldung für
Push-Nachrichten. Dort soll die Kennung verhindern, dass ein Gerät doppelte
Nachrichten bekommt; ohne sie kann der Server ein neues Abo nicht dem alten
Gerät zuordnen.

## F1: Die Kennung bekommt eine eigene Datei

`static-site/js/geraete-id.js` — rund 15 Zeilen, eine einzige Aufgabe:
„Welcher Browser ist das?"

Klein genug, um wie `theme.js` im Kopf jeder Seite zu stehen. Eingebunden auf
**15 Seiten**: den zwölf, die `pwa.js` laden, plus Bestellseite,
Bestellstatus und Tagesinfo.

`pwa.js` definiert sie nicht mehr, benutzt sie aber weiterhin — die
Ladereihenfolge ist deshalb festgelegt und wird geprüft.

**Eine Wahrheit:** Eine zweite Kopie in der Bestellseite wäre einfacher
gewesen und hätte denselben Fehler nur woanders wiederholt.

## F2: Kein stiller Ausweichzweig mehr

Die drei Aufrufe rufen jetzt direkt auf:

```js
device_id: dlPushDeviceId()
```

Der Ausweichzweig war das eigentliche Übel. Er hat aus einem klaren Fehler
ein stilles Fehlverhalten gemacht — niemand konnte es bemerken, weder im
Laden noch in den Tests.

Das Risiko ist bedacht: Fehlt die Datei, bricht das Absenden. Dafür steht ein
Wächter bereit, der genau das vor der Auslieferung prüft. Die Datei wird im
`<head>` geladen, genau wie `theme.js`, dem das Projekt seit jeher vertraut.

Ausgenommen bleibt der lesende Rückfall in `kontakt.js`
(`window.dlPushDeviceId ? … : localStorage.getItem(…)`) — er liest dieselbe
Kennung aus demselben Speicher und verschleiert nichts.

## F3: Die Kennung entsteht erst bei Bedarf

Sie wird **nicht** beim bloßen Blättern angelegt, sondern erst beim Bestellen
oder beim Anmelden für Nachrichten.

Ein erster Testentwurf forderte das Gegenteil — die Kennung solle schon beim
Laden feststehen. Das wäre bequemer gewesen, hätte aber jedem Besucher
ungefragt eine Kennung in den Browser geschrieben, auch dem, der nie
bestellt. Nötig ist es nicht: Beim Absenden ist sie rechtzeitig da.

## Test Cases

**Struktur** (`tools/geraete_id_test.py`, ohne Netz):

**TC-GK-01: Genau eine Datei definiert die Kennung.**

**TC-GK-02: Jede Seite, die sie aufruft, lädt sie auch** — auch mittelbar
über eine JS-Datei.

**TC-GK-03: Sie steht vor `pwa.js`.**

**TC-GK-04: Kein stiller Rückfall auf `''`.**

**TC-GK-05: Die Bestellseite schickt die Kennung mit** — alle drei Stellen.

**TC-GK-06: Der Wächter greift selbst** — vier Selbsttests, darunter: ein
Kommentar zählt nicht als Aufruf. (Beim Zeitzonen-Wächter hatte genau das
zu einem Fehlalarm gegen die eigene Dokumentation geführt.)

**Verhalten** (`tests/geraete-kennung.spec.js`):

**TC-GK-07: Die Bestellung trägt eine Geräte-Kennung** — der gemeldete Fall,
ausdrücklich ohne E-Mail.

**TC-GK-08: Dieselbe Kennung bleibt über Besuche hinweg** — eine wechselnde
wäre so nutzlos wie gar keine.

**TC-GK-09: Die Startseite sucht mit genau dieser Kennung** — der Beweis über
die ganze Kette.

**TC-GK-10: Mit E-Mail hat diese Vorrang** — sie gilt über Geräte hinweg.

**TC-GK-11: Bloßes Blättern legt noch keine Kennung an** — dafür steht die
Funktion bereit.

**TC-GK-12: Nach der Bestellung steht sie im Browser.**

### Gegenprobe

Mit dem ursprünglichen Zustand (Einbindung entfernt, Ausweichzweig zurück)
fallen **4 der 6** Verhaltenstests und **3** Strukturprüfungen. Die Wächter
sind nicht blind.

## Was sich nicht reparieren lässt

Bestellungen, die **vor** dieser Änderung ohne E-Mail aufgegeben wurden,
tragen eine leere Kennung. Sie bleiben über die Startseite unauffindbar — es
gibt keinen Schlüssel, der sie einem Browser zuordnet.

Erreichbar sind sie weiterhin über die **Bestellnummer**: Die Bestellseite
legt sie als `bs_nr` ab, und die Seite *Bestellstatus* findet die Bestellung
darüber. Betroffen ist also nur der Kasten auf der Startseite, nicht der
Zugang selbst.

## Betroffene Dateien

Neu: [js/geraete-id.js](../../static-site/js/geraete-id.js),
[tools/geraete_id_test.py](../../tools/geraete_id_test.py),
[tests/geraete-kennung.spec.js](../../tests/geraete-kennung.spec.js).

Geändert: [js/pwa.js](../../static-site/js/pwa.js) (Definition entfernt),
[mittagstisch-bestellen.html](../../static-site/mittagstisch-bestellen.html)
(drei Aufrufe direkt) und 15 Seiten mit der neuen Einbindung.

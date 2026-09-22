# Sonderwunsch am Telefon, Kachelhöhen und Kundenordnung

Drei Meldungen aus dem Laden, alle aus dem Kiosk-Alltag.

## Overview

| # | Meldung | Bereich |
|---|---------|---------|
| F1 | „Bei telefonischer Bestellung kann es eigentlich keine Nachricht vom Kunden geben. Warum blinkt es trotzdem auf?" | Mittagstisch-Karte |
| F2 | „Es schaut blöd aus, wenn eine Bestellung mehrere Chats beinhaltet, da alle anderen Kacheln dann auch die gleiche Größe bekommen." | Mittagstisch-Raster |
| F3 | „Die Daten bitte nach Nachnamen sortiert anzeigen." | Stammkunden |

## F1: Ein selbst notierter Wunsch ist keine Kundennachricht

### F1 Description

Eine Mittagstischbestellung kennt **zwei** Textfelder:

| Feld | Herkunft | Bedeutung |
|---|---|---|
| `anmerkung` | Online-Formular **oder** Erfassung im Laden | Sonderwunsch zum Gericht |
| `kunde_kommentar` | nur der Kunde, später über die App | echte Nachricht |

Der Kiosk unterschied an einer Stelle nicht: `_hasUnseenComment` zählte
**jede** `anmerkung` als ungelesene Kundennachricht. Am Telefon tippt aber
das Personal den Wunsch selbst mit („ohne Beilage, bissi große Portionen").
Die eigene Eingabe kam als blaue, pulsierende Nachricht zurück — mit der
Aufforderung, sie als gelesen zu markieren.

Das blieb nicht bei der Optik. `_hasUnseenComment` steuert fünf Dinge:

1. das blinkende **NEU** im Kartenkopf,
2. das automatische **Aufklappen** der Karte,
3. die **Sperre der Sammelbestätigung** („Bitte zuerst die Kundennachricht
   lesen") — telefonische Bestellungen ließen sich so nicht gesammelt
   bestätigen,
4. den **Nachrichtenzähler** in der Kopfzeile,
5. die **Sortierung** der Nachrichtenliste.

Der Wunsch des Nutzers: *„Es muss aber dann trotzdem als Sonderwunsch
angezeigt werden. Evtl. kann die Nachricht gleich beim Erfassen auf gelesen
gesetzt werden."*

### F1 Behaviour / Acceptance

- Eine `anmerkung` einer **vor Ort oder telefonisch** erfassten Bestellung
  gilt **nicht** als ungelesene Nachricht.
- Sie wird weiterhin angezeigt, aber als **„Sonderwunsch"** in ruhigem Gelb —
  ohne Puls, ohne „Gelesen"-Knopf, ohne NEU.
- Die Karte bleibt trotzdem **aufgeklappt**. Der Wunsch gehört zur
  Zubereitung und darf nicht hinter einem zugeklappten Kopf verschwinden.
  Bisher stand er im Blick, allerdings nur wegen des falschen Befunds.
- Bei **Online**-Bestellungen bleibt alles wie bisher: Dort hat der Kunde
  den Text selbst geschrieben, „Nachricht vom Kunden" ist richtig.
- Ein **`kunde_kommentar`** meldet sich immer — auch an einer telefonisch
  erfassten Bestellung. Ein Kunde kann später über die App schreiben.
- Beim **Anlegen** setzt der Server `dl_kommentar_gelesen` für telefonisch
  und am Tresen erfasste Bestellungen sofort auf `true`. Damit ist auch der
  Zähler sauber, unabhängig von der Anzeige.

### F1 Test Cases

**TC-SW-01: Der Wunsch bleibt sichtbar, heißt aber Sonderwunsch.**

**TC-SW-02: Kein „Gelesen"-Knopf für den eigenen Text.**

**TC-SW-03: Kein blinkendes NEU an einer Telefonbestellung.**

**TC-SW-04: Online bleibt es eine Nachricht vom Kunden** — die Gegenprobe.

**TC-SW-05: Eine echte Kundennachricht meldet sich auch am Telefon.**

**TC-SW-06/07: Telefon und Tresen legen mit `dl_kommentar_gelesen = true` an**
— geprüft am Rumpf, der wirklich nach Dataverse ginge.

**TC-SW-08: Online legt mit `false` an.**

## F2: Eine Karte mit Chat zieht die Nachbarn nicht mit

### F2 Description

Die Karten stehen in einem Raster (`.k-dish-body`, ab 940 px mehrspaltig).
Ohne `align-items` gilt der Standard `stretch`: Jede Karte einer Rasterzeile
wird so hoch wie die höchste. Eine Karte mit Chatverlauf ist schnell fünfmal
so hoch wie eine ohne — daneben standen dann drei fast leere Flächen.

Kein Widerspruch zum früheren Wunsch beim Metzger („die Kacheln links und
rechts gleich hoch, damit das Bild nicht so zerklüftet aussieht"): Dort ging
es um Artikel**zeilen** mit ähnlichem Inhalt, hier um Karten mit stark
unterschiedlichem.

### F2 Behaviour / Acceptance

- Jede Karte ist nur so hoch wie ihr Inhalt (`align-items:start`).
- Bei ähnlichem Inhalt bleibt das Bild ruhig — gleiche Höhen ergeben sich
  dann von selbst.

### F2 Test Cases

**TC-KH-01: Eine Karte mit Chat zieht die Nachbarn nicht mit** — die flachste
Karte ist mindestens 40 px niedriger als die höchste.

**TC-KH-02: Ohne Chat bleiben die Karten gleichmäßig** — Spanne unter 20 px.

## F3: Stammkunden nach Nachnamen

### F3 Description

Die Liste stand nach Vornamen: *Christine Kastler, Josef Rumpfinger, Julian
Rumpfinger, Maria Kailich, Martl, Rosmarie Kailich*. Der Server ordnet nach
`dl_name`, und der beginnt mit dem Vornamen.

Sortiert wird clientseitig. Der Server liefert bis zu 200 Kunden auf einmal,
die Liste ist also vollständig — und eine Sortierung im Kiosk trägt auch
dann, wenn `dl_nachname` nicht gepflegt ist.

### F3 Behaviour / Acceptance

- Sortierschlüssel ist das Feld `nachname`, bei Gleichstand `vorname`.
- Fehlt `nachname`, gilt das **letzte Wort** des Namens; bei einem einzelnen
  Wort („Martl") eben dieses. Eine Annahme, aber die einzige, die ohne
  gepflegte Daten trägt.
- Verglichen wird mit `localeCompare(…, 'de')`, damit Umlaute dort stehen,
  wo sie im Telefonbuch stehen.
- Die **Kundensuche** bei der Bestellerfassung nutzt dieselbe Ordnung.

### F3 Test Cases

**TC-KS-01: Die Liste steht nach Nachnamen.**

**TC-KS-02: Gleicher Nachname wird nach Vornamen geordnet.**

**TC-KS-03: Ohne gepflegtes Feld zählt das letzte Wort.**

**TC-KS-04: Umlaute stehen wie im Telefonbuch** — Österle vor Zwick.

**TC-KS-05: Eine leere Kartei stürzt nicht ab.**

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| [kiosk-klassisch.html](../../static-site/kiosk-klassisch.html) | `_hasUnseenComment`, Anzeige, Aufklappen, `_kundenSortiert` |
| [kiosk-neu.css](../../static-site/css/kiosk-neu.css) | `align-items:start` im Kartenraster |
| [lunch-order/\_\_init\_\_.py](../../api/lunch-order/__init__.py) | `dl_kommentar_gelesen` bei Eigenerfassung |

**Wichtig:** `kiosk-klassisch.html` ist die **Quelle**. `kiosk.html` und
`kiosk-neu.html` entstehen daraus über `tools/build-kiosk-neu.js`, das dabei
auch `css/kiosk-base.css` neu auslagert. Eine Änderung direkt in `kiosk.html`
oder `kiosk-base.css` wird beim nächsten Bau überschrieben.

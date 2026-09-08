# Kiosk-Umbau — Spezifikation

**Status:** Draft

**Owner:** Josef Rumpfinger

**Last updated:** 2026-09-08

## Overview

Der Kiosk (`static-site/kiosk.html` und die Module unter `static-site/js/`) ist
die Arbeitsoberfläche der Verkäuferinnen im Dorfladen Oberornau. Er ist über
Jahre gewachsen: acht Reiter, rund 10 500 Zeilen Code, **166 aus der Oberfläche
aufgerufene Funktionen**. Die Oberfläche wurde für den Desktop entworfen und
nachträglich mobil notdürftig angepasst.

Auf dem Telefon ist sie heute nicht mehr zumutbar. Gemessen bei 360 px Breite
mit Live-Daten:

| Reiter | Inhaltshöhe | Flächen < 44 × 44 px | Waagerechter Überlauf |
| --- | --- | --- | --- |
| Metzger Mair | 5 672 px (7,7 Bildschirme) | 118 | 30 |
| Bäcker | 4 153 px (5,6 Bildschirme) | 71 | 18 |
| Social | 1 636 px | 200 (davon 138 Eingabefelder) | 0 |
| Mittagstisch | 1 476 px | 37 | 0 |
| Kalender | 569 px | 10 | 6 |

Der Mengendialog im Reiter „Metzger Mair" ist der deutlichste Fall: Er ist
**501 px hoch und beginnt bei y = 731**, liegt also vollständig unterhalb des
Bildschirms und hinter der Fußzeile. Im Code steht dafür bereits eine
Hilfsfunktion `inSicht()`, die ihn an Klebeband und Fußleiste vorbeischiebt —
ein Pflaster auf genau dem Problem, das dieser Umbau beseitigt.

Dieser Umbau vereinheitlicht **alle** Reiter auf ein einziges Bedienmuster,
das von 320 px (iPhone SE) bis 1920 px (Breitbild) ohne zweite Oberfläche
trägt. Er ändert die Darstellung und die Erfassung, **nicht** die Fachlogik:
Jede heute vorhandene Funktion muss danach wieder vorhanden und bedienbar sein.

Der Umbau entsteht als **zweiter, lauffähiger Kiosk neben dem bestehenden**
(F11). Dadurch kann der neue Entwurf jederzeit lokal mit echten Daten geprüft
werden, ohne den laufenden Betrieb zu gefährden.

**Zielgruppe:** ungeschultes Personal ohne Einweisung, oft unter Zeitdruck im
Laden, auf privaten Telefonen unterschiedlicher Größe. Diese Zielgruppe ist der
Maßstab für jede Entwurfsentscheidung in dieser Spezifikation.

## Goals

- Jeder Reiter ist auf jedem Gerät von 320 px bis 1920 px vollständig bedienbar,
  ohne waagerechten Überlauf und ohne abgeschnittenen Text.
- Jede Antippfläche ist mindestens 44 × 44 px groß.
- Erfassungsdialoge sind immer vollständig im Blickfeld und nie hinter festen
  Leisten verdeckt.
- Der Normalfall jeder Erfassung ist mit **einem** Antippen erledigt.
- Offene Vorgänge sind immer erkennbar — Zähler verschwinden nie hinter einem
  „Mehr"-Menü.
- Alle 166 heutigen Funktionen sind nach dem Umbau nachweislich wieder
  vorhanden.
- Ein einziges Bedienmuster für Telefon, Tablet und Desktop; keine getrennte
  Mobilfassung.
- Der neue Entwurf ist während der gesamten Entwicklung lokal mit Live-Daten
  bedienbar und prüfbar.

## Non-Goals

- Keine Änderung an der Fachlogik: Bestellabläufe, Mailversand, Dokument-
  erzeugung, Statuswechsel und Fristen bleiben inhaltlich unverändert.
- Keine Änderung an den API-Endpunkten oder am Datenmodell.
- Keine neuen fachlichen Funktionen. Was heute nicht geht, muss danach auch
  nicht gehen — mit Ausnahme der in F5 geforderten Eingabehilfen.
- Kein Umbau von `cms.html` oder der öffentlichen Website.
- Keine Umstellung auf ein Frontend-Framework. Der Kiosk bleibt reines
  HTML/CSS/JavaScript ohne Build-Schritt.

## Requirements

### F1: Reiternavigation ist immer vollständig sichtbar

#### F1 Description

Alle sichtbaren Reiter sind jederzeit erreichbar und zeigen ihre Zähler. Die
Leiste wandert je nach Gerätebreite, verbirgt aber nie einen Reiter hinter
einem Ausklappmenü.

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Reiterliste | Ja | Die sichtbaren Reiter samt Symbol, Beschriftung und Zähler |
| Gerätebreite | Ja | Bestimmt die Anordnung der Leiste |
| Zählerstand je Reiter | Nein | Fehlt er, wird kein Zähler gezeigt |

#### F1 Behaviour / Acceptance

- Bis 639 px liegt die Leiste **unten**, mit Symbol über Beschriftung.
- Ab 640 px liegt sie **links** als schmale Spalte, Symbol über Beschriftung.
- Ab 1180 px liegt sie links als breite Spalte, Symbol **neben** Beschriftung.
- Der Zähler ist in jeder Anordnung sichtbar und lesbar.
- Ein Reiter mit dringendem Zustand (z. B. Bestellschluss überschritten) hebt
  sich zusätzlich farblich ab.
- Es gibt kein „Mehr"-Menü und keinen waagerechten Bildlauf in der Leiste.

#### F1 Test Cases

**TC-F1-01: Alle Reiter bei 320 px sichtbar**

- **Setup:** Kiosk bei 320 × 568 px, alle Reiter eingeblendet.
- **Action:** Reiterleiste auslesen.
- **Expected:** Jeder sichtbare Reiter hat eine eigene Schaltfläche mit
  mindestens 44 px Höhe; kein Element liegt außerhalb des Bildschirms.

**TC-F1-02: Zähler bleibt in jeder Anordnung sichtbar**

- **Setup:** Reiter „Bäcker" mit Zähler 1 und „Kontakt" mit Zähler 1.
- **Action:** Breiten 320, 360, 744, 768, 1024, 1280, 1920 px prüfen.
- **Expected:** Beide Zähler sind bei jeder Breite sichtbar und haben eine
  Breite größer null.

**TC-F1-03: Kein Ausklappmenü**

- **Setup:** beliebige Breite.
- **Expected:** Es existiert kein Bedienelement, das Reiter verbirgt.

### F2: Fluide Darstellung über alle Gerätebreiten

#### F2 Description

Die Oberfläche rechnet mit relativen Maßen statt fester Pixel und passt sich
jeder Gerätebreite an — auch Größen, die es heute noch nicht gibt.

#### F2 Behaviour / Acceptance

- Abstände und Schriftgrößen wachsen mit der Breite (`clamp()`, `min()`, `%`,
  `fr`); keine festen Breiten über 320 px.
- Höhenangaben nutzen `dvh` statt `vh`, damit die ein- und ausfahrende
  Safari-Leiste das Layout nicht zerschneidet.
- `env(safe-area-inset-*)` wird für Notch und Home-Balken berücksichtigt.
- Kein waagerechter Überlauf bei 320 px. Bewusst waagerecht scrollende Leisten
  (Tagespillen, Filter) sind ausgenommen und als solche erkennbar.
- Kein abgeschnittener Text: Ist der Platz zu klein, wird umbrochen oder die
  Schrift verkleinert, aber nichts unsichtbar gekappt.

#### F2 Test Cases

**TC-F2-01: Kein Überlauf über alle Prüfbreiten**

- **Setup:** Jeder Reiter, Breiten 320, 360, 375, 390, 412, 430, 744, 768,
  1024, 1280, 1920 px.
- **Expected:** Kein Element ragt über den linken oder rechten Rand hinaus,
  ausgenommen Kinder waagerechter Bildlaufleisten.

**TC-F2-02: Kein abgeschnittener Text mit Live-Daten**

- **Setup:** Live-Daten mit den längsten vorhandenen Bezeichnungen
  (z. B. „Sonnenblumenkernbrot 750 g", „Roggensemmel mit Kümmel").
- **Expected:** Für jedes Textelement gilt `scrollWidth <= clientWidth + 1`
  und `scrollHeight <= clientHeight + 1`.

**TC-F2-03: Umlaute werden nicht beschnitten**

- **Setup:** Überschriften mit Umlauten („Bäcker", „Metzger Mair").
- **Expected:** Die Zeilenhöhe ist groß genug, dass Umlautpunkte und
  Unterlängen vollständig sichtbar sind.

### F3: Feste Kopfbereiche, nur die Liste scrollt

#### F3 Description

Die für die Orientierung nötigen Angaben bleiben stehen. Bewegt wird nur die
eigentliche Arbeitsliste.

#### F3 Behaviour / Acceptance

- Kopfzeile, Tagesleiste, Überblickskarte und Filterleiste scrollen nicht mit.
- Nur der Listenbereich hat einen senkrechten Bildlauf.
- Beim Wechsel des Filters oder des Tages springt die Liste an den Anfang.
- Auf Tablet und Desktop ist ohne Bildlauf mehr Inhalt sichtbar als auf dem
  Telefon; ungenutzte Fläche wird durch mehr Spalten gefüllt, nicht durch
  größere Leerräume.

#### F3 Test Cases

**TC-F3-01: Nur die Liste bewegt sich**

- **Setup:** Reiter mit mehr Inhalt als Bildschirmhöhe, 360 × 740 px.
- **Action:** Liste bis zum Ende scrollen.
- **Expected:** Die Bildschirmkoordinaten von Kopfzeile, Tagesleiste,
  Überblickskarte und Filterleiste sind unverändert.

**TC-F3-02: Wenig Leerraum auf großen Schirmen**

- **Setup:** 1280 × 800 px und 1920 × 1080 px mit Live-Daten.
- **Expected:** Unterhalb des letzten Listeneintrags bleiben höchstens 80 px
  ungenutzt, solange noch nicht angezeigte Daten vorhanden sind.

### F4: Jede Antippfläche mindestens 44 × 44 px

#### F4 Description

Alle Bedienelemente sind mit dem Finger sicher zu treffen.

#### F4 Behaviour / Acceptance

- Schaltflächen, Filter, Tagespillen, Reiter, Mengenregler, Auswahlfelder und
  Eingabefelder sind mindestens 44 px hoch und 44 px breit.
- Nebeneinanderliegende Bedienelemente haben mindestens 8 px Abstand.
- Rein darstellende Elemente (Zähler, Symbole ohne eigene Funktion) sind
  ausgenommen.

#### F4 Test Cases

**TC-F4-01: Keine zu kleinen Flächen**

- **Setup:** Jeder Reiter und jeder Erfassungsdialog, Breiten 320 bis 1920 px.
- **Expected:** Kein bedienbares Element ist schmaler oder niedriger als 44 px.

**TC-F4-02: Eingabefelder ausreichend hoch**

- **Setup:** Reiter „Social" (heute 138 zu kleine Eingabefelder).
- **Expected:** Jedes `input`, `select` und `textarea` ist mindestens 44 px hoch.

### F5: Erfassung mit größtmöglicher Hilfestellung

#### F5 Description

Der Kiosk wird von ungeschultem Personal bedient. Jede Erfassung bietet so viel
Unterstützung wie möglich, damit der Normalfall ohne Nachdenken und ohne Tippen
erledigt werden kann.

#### F5 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Letzter vergleichbarer Vorgang | Nein | Grundlage der Vorbelegung |
| Häufige Werte | Nein | Grundlage der Vorschläge zum Antippen |
| Bestandsdaten (Kunden, Artikel, Titel) | Nein | Grundlage der Suchvorschläge |

#### F5 Behaviour / Acceptance

- **Vorbelegung:** Jedes Erfassungsformular öffnet mit sinnvollen Werten aus dem
  letzten vergleichbaren Vorgang, nicht leer.
- **Ein Klick für den Normalfall:** Der häufigste Abschluss eines Vorgangs ist
  mit einem einzigen Antippen erledigt.
- **Vorschläge statt Tippen:** Häufige Mengen, Einheiten, Kunden und
  Textbausteine werden als antippbare Vorschläge angeboten. Freie Eingabe
  bleibt möglich, ist aber nie der einzige Weg.
- **Klartext:** Alle Beschriftungen und Meldungen in verständlichem Deutsch,
  ohne Fachbegriffe, Feldnamen oder technische Angaben.
- **Fehler vermeiden statt melden:** Unmögliche Eingaben werden gar nicht erst
  angeboten. Wo eine Eingabe ungültig wäre, ist das Bedienelement deaktiviert
  und der Grund steht daneben.
- **Rückgängig:** Jede verändernde Aktion ist entweder rückgängig zu machen
  oder wird vorher in einem klaren Dialog bestätigt.
- **Nur ein Formular gleichzeitig offen:** Listen zeigen ihre Einträge als
  ruhige Zeilen mit einer Schaltfläche „Bearbeiten". Eingabefelder erscheinen
  erst für den Eintrag, der gerade bearbeitet wird. Damit endet der heutige
  Zustand, in dem im Reiter „Social" 469 Felder gleichzeitig offen stehen.

#### F5 Test Cases

**TC-F5-01: Formular öffnet vorbelegt**

- **Setup:** Ein vergleichbarer Vorgang existiert (z. B. Bäckerbestellung vom
  letzten gleichen Wochentag).
- **Action:** Erfassung öffnen.
- **Expected:** Die Mengenfelder sind mit den Werten des Vergleichsvorgangs
  gefüllt; kein Feld ist leer, das befüllbar wäre.

**TC-F5-02: Normalfall mit einem Antippen**

- **Setup:** Eine neue Mittagstisch-Bestellung im Zustand „NEU".
- **Action:** Die Bestätigen-Schaltfläche einmal antippen.
- **Expected:** Die Bestellung ist bestätigt; es war kein weiterer Dialog und
  keine weitere Eingabe nötig.

**TC-F5-03: Mengen als Vorschläge**

- **Setup:** Mengenerfassung im Reiter „Metzger Mair".
- **Expected:** Die häufigsten Mengen und Einheiten sind als antippbare
  Vorschläge sichtbar, ohne dass ein Zahlenfeld benutzt werden muss.

**TC-F5-04: Verständliche Meldungen**

- **Setup:** Ein Versand schlägt fehl.
- **Expected:** Die Meldung nennt in Alltagssprache, was nicht geklappt hat und
  was zu tun ist. Sie enthält keinen Ausnahmetext, keinen HTTP-Code und keinen
  Feldnamen.

**TC-F5-05: Rückgängig oder Rückfrage**

- **Setup:** Für jede löschende oder versendende Aktion.
- **Expected:** Entweder erscheint vorher eine klare Rückfrage, oder die Aktion
  lässt sich unmittelbar danach zurücknehmen.

**TC-F5-06: Höchstens ein offenes Formular je Reiter**

- **Setup:** Reiter „Social", Unterreiter „Katalog", mit allen echten Vorlagen
  und Kategorien geladen.
- **Action:** Alle sichtbaren Eingabefelder zählen, dann einen Eintrag über
  „Bearbeiten" öffnen und erneut zählen.
- **Expected:** Vorher höchstens 5 Eingabefelder (Suche und Filter). Nachher nur
  zusätzlich die Felder des einen bearbeiteten Eintrags. Zu keinem Zeitpunkt
  mehr als 20 Eingabefelder gleichzeitig.

### F6: Erfassungsdialoge immer vollständig im Blickfeld

#### F6 Description

Kein Erfassungsdialog liegt außerhalb des Bildschirms oder hinter einer festen
Leiste. Dies ersetzt die heutige Notlösung `inSicht()`.

#### F6 Behaviour / Acceptance

- Auf dem Telefon öffnet ein Dialog als Blatt von unten und beansprucht
  höchstens 90 % der Bildschirmhöhe. Ist der Inhalt höher, scrollt der
  Dialoginhalt — nicht die Seite darunter.
- Kopf und Fußzeile des Dialogs (Titel, Abbrechen, Speichern) bleiben dabei
  stehen.
- Ab 1180 px wird der Dialog zur angedockten Spalte am rechten Rand; die Liste
  daneben bleibt sichtbar und bedienbar und wird **nicht** überdeckt.
- Beim Öffnen liegt der Dialog vollständig im sichtbaren Bereich; kein
  nachträgliches Zurechtschieben ist nötig.
- Die Seite hinter dem Dialog scrollt nicht mit.

#### F6 Test Cases

**TC-F6-01: Dialog liegt im Bild**

- **Setup:** Jeder Erfassungsdialog, 360 × 740 px.
- **Action:** Dialog öffnen.
- **Expected:** Oberkante ≥ 0 und Unterkante ≤ Bildschirmhöhe; der Dialog wird
  von keiner festen Leiste verdeckt.

**TC-F6-02: Nur der Dialoginhalt scrollt**

- **Setup:** Ein Dialog mit mehr Inhalt als Platz, 360 × 740 px.
- **Action:** Im Dialog scrollen.
- **Expected:** Titel und Aktionsleiste bleiben stehen; die Seite dahinter
  bewegt sich nicht.

**TC-F6-03: Desktop verdeckt die Liste nicht**

- **Setup:** 1280 × 800 px, Detail geöffnet.
- **Expected:** Die rechte Kante der Liste liegt links von der linken Kante der
  Detailspalte; beide sind gleichzeitig vollständig sichtbar.

### F7: Funktionserhalt

#### F7 Description

Alle heute aus der Oberfläche aufrufbaren Funktionen sind nach dem Umbau wieder
vorhanden und bedienbar. Grundlage ist das Verzeichnis unter
„Data & Contracts".

#### F7 Behaviour / Acceptance

- Jede der aufgeführten Funktionen ist über die neue Oberfläche erreichbar.
- Fachliches Verhalten, Reihenfolgen, Fristen und Sperren bleiben unverändert.
- Wird eine Funktion bewusst zusammengelegt oder ersetzt, ist das in dieser
  Spezifikation benannt und begründet.
- Kein Datenverlust bei laufender Eingabe: Die automatische Aktualisierung
  verwirft keine angefangenen Eingaben.

#### F7 Test Cases

**TC-F7-01: Verzeichnis vollständig abgedeckt**

- **Setup:** Das Funktionsverzeichnis aus „Data & Contracts".
- **Expected:** Zu jeder Funktion existiert ein Bedienweg in der neuen
  Oberfläche; die Abdeckung ist in `tasks.md` nachgewiesen.

**TC-F7-02: Bestehende Tests bleiben grün**

- **Setup:** Die vorhandenen Playwright-Testdateien unter `tests/`.
- **Expected:** Alle bisher erfolgreichen Tests sind auch nach dem Umbau
  erfolgreich, gegebenenfalls mit angepassten Selektoren, aber unveränderten
  Erwartungen an das Verhalten.

**TC-F7-03: Eingaben überleben die Aktualisierung**

- **Setup:** Eine angefangene Erfassung, automatische Aktualisierung läuft.
- **Expected:** Die Eingabe bleibt erhalten.

### F8: Ausgeblendete Reiter

#### F8 Description

Zwei Reiter sind heute ausgeblendet, tragen aber weiterhin Daten: „Online-Shop"
und der alte Reiter „Metzger" (zum Messzeitpunkt mit den Zählern 4 und 1).
Ihr Umgang wird eindeutig festgelegt, statt sie unbeachtet mitzuschleppen.

#### F8 Behaviour / Acceptance

- Ausgeblendete Reiter erfüllen dieselben Anforderungen F1 bis F6, sobald sie
  eingeblendet werden.
- Ein ausgeblendeter Reiter zeigt keine Zähler und löst keine Hinweise aus.
- Die Sichtbarkeit ist eine Einstellung, kein fest verdrahteter Zustand.

#### F8 Test Cases

**TC-F8-01: Eingeblendeter Reiter erfüllt alle Regeln**

- **Setup:** Ein zuvor ausgeblendeter Reiter wird eingeblendet.
- **Expected:** Er besteht TC-F1-01, TC-F2-01 und TC-F4-01.

**TC-F8-02: Ausgeblendeter Reiter meldet sich nicht**

- **Setup:** Reiter ausgeblendet, offene Vorgänge vorhanden.
- **Expected:** Weder Zähler noch Hinweis noch Ton.

### F9: Zustand ist jederzeit erkennbar

#### F9 Description

Wer den Kiosk ansieht, erkennt sofort, was offen ist und was drängt.

#### F9 Behaviour / Acceptance

- Offene Vorgänge erzeugen einen Zähler am zugehörigen Reiter.
- Dringlichkeit wird zusätzlich zur Farbe durch Text oder Symbol vermittelt,
  nicht allein durch Farbe.
- Der Zustand jedes Listeneintrags (neu, bestätigt, abgeholt, storniert) ist
  ohne Antippen erkennbar.

#### F9 Test Cases

**TC-F9-01: Zähler entspricht der Zahl offener Vorgänge**

- **Setup:** Bekannte Zahl offener Vorgänge je Reiter.
- **Expected:** Der Zähler stimmt mit der Zahl überein.

**TC-F9-02: Dringlichkeit nicht nur farblich**

- **Setup:** Ein Reiter im dringenden Zustand.
- **Expected:** Neben der Farbe gibt es ein Symbol oder einen Text, der die
  Dringlichkeit benennt.

### F10: Ein Bedienmuster für alle Geräte

#### F10 Description

Telefon, Tablet und Desktop nutzen dieselbe Seite und dieselbe Struktur. Es gibt
keine getrennte Mobilfassung, die getrennt gepflegt werden müsste.

#### F10 Behaviour / Acceptance

- Dieselbe HTML-Struktur wird je Breite anders angeordnet.
- Die Umschaltpunkte liegen bei 640 px (Tablet), 940 px (breites Tablet),
  1180 px (Desktop) und 1620 px (Breitbild).
- Es gibt keine Zweigstelle im Code, die zwischen „mobil" und „Desktop"
  unterscheidet und getrennte Bausteine erzeugt.

#### F10 Test Cases

**TC-F10-01: Gleiche Struktur über alle Breiten**

- **Setup:** Ein Reiter bei 360, 768 und 1280 px.
- **Expected:** Die Anzahl und Art der Bausteine ist identisch; nur ihre
  Anordnung unterscheidet sich.

### F11: Lauffähiger Zweitkiosk mit Live-Daten

#### F11 Description

Der neue Entwurf entsteht als eigenständige, voll bedienbare Seite neben dem
bestehenden Kiosk. Sie greift auf dieselben Schnittstellen und damit auf
dieselben echten Daten zu, sodass der Entwurf jederzeit lokal geprüft werden
kann, ohne den laufenden Betrieb zu berühren.

#### F11 Inputs

| Input | Required | Description |
| --- | --- | --- |
| Dev-Proxy | Ja | `node files/dev-proxy.js <port> static-site` leitet `/api/*` ans Live-Backend |
| Bestehende Module | Ja | `kiosk-baecker.js`, `kiosk-metzger-bestellung.js`, `kiosk-kontakt.js`, `kiosk-kalender.js` |

#### F11 Behaviour / Acceptance

- Die neue Seite liegt unter `static-site/kiosk-neu.html` und ist parallel zum
  bestehenden `kiosk.html` erreichbar.
- Sie nutzt **dieselben** JavaScript-Module und dieselben `K.*`-Funktionen wie
  der bestehende Kiosk. Neu sind Gerüst, Anordnung, Gestaltung und die
  Eingabehilfen aus F5 — nicht die Fachlogik.
- Alle Daten stammen aus den echten Schnittstellen; es gibt keine
  Beispieldaten im Auslieferungszustand.
- Schreibende Aktionen wirken auf die echten Daten. Solange die Seite nicht
  freigegeben ist, weist ein deutlich sichtbarer Hinweis darauf hin.
- Der bestehende `kiosk.html` bleibt unverändert lauffähig, bis der Umbau
  abgenommen ist.
- Nach der Abnahme ersetzt die neue Seite den bestehenden Kiosk; die alte
  Fassung wird in einem eigenen Schritt entfernt.

#### F11 Test Cases

**TC-F11-01: Zweitkiosk lädt mit Live-Daten**

- **Setup:** Dev-Proxy läuft, `static-site` als Wurzel.
- **Action:** `kiosk-neu.html` aufrufen.
- **Expected:** Alle Reiter zeigen echte Daten aus den Schnittstellen; keine
  Beispieldaten sind sichtbar.

**TC-F11-02: Bestandskiosk bleibt unberührt**

- **Setup:** Beide Seiten über denselben Proxy.
- **Expected:** `kiosk.html` verhält sich unverändert; alle bestehenden Tests
  dafür bleiben erfolgreich.

**TC-F11-03: Hinweis auf den Entwurfsstand**

- **Setup:** `kiosk-neu.html` vor der Abnahme.
- **Expected:** Ein deutlich sichtbarer Hinweis benennt, dass Aktionen auf
  echte Daten wirken.

## Data & Contracts

### Funktionsverzeichnis (Erhaltungsliste)

Erhoben aus allen `onclick`/`onchange`/`oninput`/`onsubmit`-Aufrufen in
`static-site/kiosk.html` und `static-site/js/kiosk-*.js` sowie aus den
Funktionsdeklarationen von `kiosk-kalender.js` (dieses Modul bindet seine
Ereignisse per `addEventListener`).

**Kiosk-Rahmen, Mittagstisch und Online-Shop — 80 Funktionen**

`K.bulkConfirmDish`, `K.clearOrderKunde`, `K.closeModal`, `K.confirmOrder`,
`K.confirmRevert`, `K.deleteKunde`, `K.deleteShopOrder`, `K.editKunde`,
`K.finishPack`, `K.hideConfirmDialog`, `K.markAllFmRead`, `K.markAllMsgRead`,
`K.markFmRead`, `K.markMsgRead`, `K.markShopMsgRead`, `K.metzgerAlleGesendet`,
`K.newOrderKunde`, `K.noQty`, `K.openFmReplyModal`, `K.openModal`,
`K.openNewKunde`, `K.openNewOrder`, `K.openPackModal`, `K.orderForKunde`,
`K.pickDish`, `K.pkQtyChange`, `K.pkToggle`, `K.printKitchen`,
`K.printMetzgerSammel`, `K.printPackSlip`, `K.promptReadFirst`, `K.refresh`,
`K.resetStatus`, `K.revertMetzgerStatus`, `K.revertShopStatus`,
`K.searchKunden`, `K.searchOrderKunde`, `K.selectOrderKunde`,
`K.sendFmModalReply`, `K.sendMsgReply`, `K.sendReply`, `K.sendShopReply`,
`K.setHistRange`, `K.setHistStatus`, `K.setMetzgerFilter`,
`K.setMetzgerStatus`, `K.setMittagDatum`, `K.setMittagFilter`,
`K.setShopFilter`, `K.setShopStatus`, `K.setStatus`, `K.setSwCompact`,
`K.showConfirmDialog`, `K.showMetzgerStornoDialog`, `K.showMsgReply`,
`K.showOrderDetail`, `K.showShopReply`, `K.showShopStornoDialog`,
`K.showStornoDialog`, `K.submitEditKunde`, `K.submitNewKunde`,
`K.submitNewOrder`, `K.switchTab`, `K.toggleAllFmItems`,
`K.toggleAllSwThreads`, `K.toggleCookBar`, `K.toggleDishGroup`,
`K.toggleFmItemBestellt`, `K.toggleKundeCard`, `K.toggleMetzgerCard`,
`K.toggleMetzgerDayGroup`, `K.toggleMute`, `K.toggleOrderCard`,
`K.toggleQuelleFilter`, `K.toggleShopCard`, `K.toggleSlotGroup`,
`K.toggleSwThread`, `window.print`

**Bäcker — 28 Funktionen**

`KBaecker.aendernSpeichern`, `KBaecker.aktiv`, `KBaecker.baeckerei`,
`KBaecker.bearbeiten`, `KBaecker.dlgZu`, `KBaecker.drucken`,
`KBaecker.korrektur`, `KBaecker.nachdruck`, `KBaecker.neuDialog`,
`KBaecker.neuSpeichern`, `KBaecker.normiere`, `KBaecker.plus`,
`KBaecker.reset`, `KBaecker.senden`, `KBaecker.setz`, `KBaecker.speichern`,
`KBaecker.sub`, `KBaecker.suche`, `KBaecker.tag`, `KBaecker.tagAusVerlauf`,
`KBaecker.umfang`, `KBaecker.verlaufAuf`, `KBaecker.verwerfen`,
`KBaecker.vorschau`, `KBaecker.zusatzAus`, `KBaecker.zusatzDialog`,
`KBaecker.zusatzFrei`, `KBaecker.zusatzWeg`

**Metzger Mair — 31 Funktionen**

`KMetzgerBest.aktiv`, `KMetzgerBest.allesWeg`, `KMetzgerBest.anz`,
`KMetzgerBest.edit`, `KMetzgerBest.editHinweis`, `KMetzgerBest.einheit`,
`KMetzgerBest.feld`, `KMetzgerBest.filter`, `KMetzgerBest.frueher`,
`KMetzgerBest.hinweis`, `KMetzgerBest.hinweisWeg`, `KMetzgerBest.kachel`,
`KMetzgerBest.korrektur`, `KMetzgerBest.korrekturSenden`, `KMetzgerBest.kurz`,
`KMetzgerBest.loeschen`, `KMetzgerBest.nimm`, `KMetzgerBest.pad`,
`KMetzgerBest.senden`, `KMetzgerBest.speichern`, `KMetzgerBest.spring`,
`KMetzgerBest.sub`, `KMetzgerBest.such`, `KMetzgerBest.tag`,
`KMetzgerBest.vakAn`, `KMetzgerBest.verwerfen`, `KMetzgerBest.vorschau`,
`KMetzgerBest.weg`, `KMetzgerBest.zu`, `KMetzgerBest.zusatz`,
`KMetzgerBest.zusatzWeg`

**Kontakt — 12 Funktionen**

`KKontakt.clearSel`, `KKontakt.deleteMsg`, `KKontakt.deleteOne`,
`KKontakt.deleteSelected`, `KKontakt.emoji`, `KKontakt.reload`,
`KKontakt.removeImage`, `KKontakt.send`, `KKontakt.stageImage`,
`KKontakt.toggle`, `KKontakt.toggleSel`, `KKontakt.zoom`

**Social — 15 Funktionen**

`socDeskTab`, `socToggleStep`, `socialClearBild`, `socialDownloadPoster`,
`socialGenPreview`, `socialKatAdd`, `socialKatMgrAdd`,
`socialKatMgrFilterIcons`, `socialKatMgrToggle`, `socialPublishTagesinfo`,
`socialSaveDraft`, `socialShareWhatsApp`, `socialSubTab`, `socialTitelChange`,
`socialToggleDay`

**Kalender — bedienbare Funktionen aus `KalenderKiosk`**

`addEntry`, `applyTemplate`, `close`, `closeDialog`, `collectTemplates`,
`del`, `delOccurrence`, `delSingle`, `endSeries`, `kalConfirm`, `openDialog`,
`refreshTimeQuick`, `renderTemplates`, `searchKunden`, `searchTitles`,
`setAllday`, `setCat`, `setKunde`, `setRecur`, `setTimeQuick`, `setTitle`,
`startPoll`, `stepTime`, `stopPoll`, `syncFilterUI`, `toggleDone`,
`toggleWeekday`, `updateBadge`

### Reiter und Unterreiter

| Reiter | Kennung | Sichtbar | Unterreiter |
| --- | --- | --- | --- |
| Mittagstisch | `mittag` | Ja | — |
| Online-Shop | `abhol` | Nein | — |
| Metzger (alt) | `metzger` | Nein | — |
| Bäcker | `baecker` | Ja | Bestellung, Verlauf, Artikel |
| Metzger Mair | `metzgerbest` | Ja | Bestellung, Verlauf, Artikel |
| Kontakt | `kontakt` | Ja | — |
| Social | `social` | Ja | Neuer Post, Katalog |
| Kalender | `kalender` | Ja | — |

### Unveränderte Schnittstellen

`/api/lunch-order`, `/api/baecker-order`, `/api/baecker-artikel`,
`/api/metzger-order`, `/api/shop-order`, `/api/stammkunden`, `/api/wochenplan`,
`/api/kalender`, `/api/cms-config` — Aufrufform, Parameter und Antwortformat
bleiben unverändert.

### Prüfbreiten

320, 360, 375, 390, 412, 430 (Telefon) · 744, 768, 1024 (Tablet) ·
1280, 1920 (Desktop). Die Verfassung fordert mindestens 375 × 667,
768 × 1024 und 1280 × 800; diese sind enthalten.

## Clarifications

Alle offenen Punkte wurden am 08.09.2026 mit dem Auftraggeber geklärt. Es sind
keine `[NEEDS CLARIFICATION]`-Marker mehr offen.

**C1 — Lage der Reiterleiste.** Die Leiste darf wandern: auf dem Telefon an den
**unteren** Bildschirmrand (Daumenreichweite), auf Tablet und Desktop an den
**linken** Rand. Ausschlaggebend war, dass so alle Reiter samt Zählern dauerhaft
sichtbar bleiben. → umgesetzt in F1.

**C2 — Ausgeblendete Reiter.** „Online-Shop" und „Metzger (alt)" werden
**mit umgebaut, bleiben aber ausgeblendet**. Sie werden nicht entfernt, damit
sie später ohne erneuten Umbau wieder eingeblendet werden können. Der Umbau
gilt als vollständig, wenn beide Reiter nach dem Einblenden F1 bis F6 erfüllen.
→ umgesetzt in F8.

**C3 — Katalogpflege im Reiter „Social".** Sie **bleibt im Kiosk**, wird aber
aufgeräumt: Einträge stehen als ruhige Zeilen mit einer Schaltfläche
„Bearbeiten"; Eingabefelder erscheinen nur für den gerade bearbeiteten Eintrag.
Die heutigen 469 gleichzeitig offenen Felder entfallen. → umgesetzt in F5 und
TC-F5-06.

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02, TC-F1-03 | — | — |
| F2 | TC-F2-01, TC-F2-02, TC-F2-03 | — | — |
| F3 | TC-F3-01, TC-F3-02 | — | — |
| F4 | TC-F4-01, TC-F4-02 | — | — |
| F5 | TC-F5-01, TC-F5-02, TC-F5-03, TC-F5-04, TC-F5-05, TC-F5-06 | — | — |
| F6 | TC-F6-01, TC-F6-02, TC-F6-03 | — | — |
| F7 | TC-F7-01, TC-F7-02, TC-F7-03 | — | — |
| F8 | TC-F8-01, TC-F8-02 | — | — |
| F9 | TC-F9-01, TC-F9-02 | — | — |
| F10 | TC-F10-01 | — | — |
| F11 | TC-F11-01, TC-F11-02, TC-F11-03 | — | — |

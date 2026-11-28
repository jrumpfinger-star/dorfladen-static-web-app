# Inventur — Funktionen des klickbaren Mockups

**Status:** Ausdrücklich bestätigt am 20.11.2026; Mockup-Umsetzung freigegeben  
**Stand:** 2026-11-20  
**Vertrag und Testfälle:** [Inventur-Mockup-Spezifikation](inventur-mockup/spec.md)

Die spätere echte Anwendung ist separat als
[Inventur-Web-App](inventur-web-funktionen.md) spezifiziert. Diese Datei
beschreibt weiterhin ausschließlich den lokalen Mockup.

## Zweck und Grenzen

Der Entwurf zeigt die bestehende PowerApps-Inventur in einer frischen,
mobil bedienbaren Oberfläche. Er arbeitet ausschließlich mit erfundenen
Beispieldaten. Speichern ändert nur den Arbeitsspeicher dieser geöffneten
Seite. Beim Neuladen beginnt die Demo wieder mit dem Ausgangsstand.

Keine Verbindung zu echten Inventuren, keine Kamera, keine
Produktiv-Schreibzugriffe. Die spätere Web-App unter `/inventur` ist nicht
Bestandteil dieses Mockups. Es werden keine zusätzlichen Lösch-, Export-,
Auswertungs- oder Abschlussfunktionen erfunden.

## Einstieg und Menü

Die Seite startet in **Erfassung**. Der kompakte Header zeigt **Inventur**
und die Kennzeichnung als Mockup. Das Menü öffnet die beiden Originalbereiche
**Erfassung** und **Settings**. Ein Ansichtswechsel löscht keine lokalen
Inventurdaten oder ungespeicherten Verwaltungsentwürfe.

## Erfassung

### Inventur auswählen

In der Erfassung sind nur Inventuren mit Status **aktiv** auswählbar.
Zu Beginn ist die erste aktive Beispielinventur ausgewählt. Name, Jahr und
Startdatum bleiben erkennbar. Ist keine Inventur aktiv, erklärt die Seite
den Grund; Artikelmengen können dann nicht gespeichert werden.

Bei einem Inventurwechsel lädt der bereits ausgewählte Artikel seine Menge
aus der neuen Inventur. Gibt es dort noch keine Position, beginnt die Menge
leer. Mengen aus einer anderen Inventur werden niemals übernommen.

### Artikel suchen

Über Bezeichnung oder Barcode suchen. Die Treffer zeigen vollständige
Artikelbezeichnungen und sind nach dem Suchwert sortiert. Lange Trefferlisten
scrollen intern, ohne die Seite mitzuziehen. Auswahl funktioniert mit Touch,
Maus und Tastatur.

Auf Desktop bleibt die vorhandene Trefferliste neben der Erfassung sichtbar;
auf hohen schmalen Tablets darunter. Auf dem kleinen Handy öffnet sie sich
nur zur Suche und schließt nach Auswahl. Diese Anordnung wurde ausdrücklich
bestätigt und nutzt die zusätzliche Fläche für die eigentliche Aufgabe.

Nach der Auswahl erscheint der Artikelkontext; der Fokus steht im Mengenfeld.
Eine bereits vorhandene Inventurposition wird geladen, andernfalls eine
neue vorbereitet. Ein leerer Trefferstand wird verständlich erklärt.

### Barcode simulieren

**Barcode** öffnet einen ausdrücklich als Simulation benannten Dialog.
Es wird keine Kameraberechtigung angefordert. Der Originalschalter
**Manuell Scan** bleibt vorhanden:

- Manuell: Beispiel-Barcode auswählen und bestätigen.
- Automatisch: Ein bereitgestelltes Beispiel-Ergebnis direkt übernehmen.
- Bei mehreren Ergebnis-Barcodes wird wie im Original nur der erste verwendet.

Ein unbekannter Barcode meldet **Artikel nicht gefunden – bitte erneut
scannen oder Barcode prüfen** und sperrt die Mengenerfassung bis zu einer
gültigen Auswahl. Abbrechen verändert keine Position.

### Artikelinformationen und Preise

Die Erfassung zeigt die Artikelbezeichnung, den Barcode und getrennt
**EK** und **VK**. Beide Preise sind nur lesbar.

- Neue Position: EK aus letztem Einkaufspreis.
- Ist letzter EK 0, wird EK aus VK / Steuersatz × 0,67 berechnet:
  Steuerkennzeichen 9 verwendet 1,07, andere Kennzeichen 1,19.
- Bestehende Position: der dort gespeicherte EK bleibt erhalten.
- VK zeigt weiterhin den aktuellen Artikel-VK.

Kennzeichen 0 wird als **Stück**, Kennzeichen 3 als **Gramm** angezeigt.
Unbekannte Kennzeichen werden nicht als eine dieser Einheiten ausgegeben;
die Demo erklärt die fehlende Unterstützung.

### Menge und Plus

**Menge** und **Plus (Hinzufügen)** bleiben zwei getrennte Felder mit
getrennten Aktionen **Speichern** und **Hinzufügen**.

- Menge ersetzt die aktuelle Basis; Plus wird dazu addiert.
- Neue Positionen beginnen mit leerer Menge.
- Plus ohne bisherige Menge addiert zu 0.
- Leere Menge ohne Plus bleibt leer.
- Ganze Zahlen einschließlich 0 und negativer Werte sind zulässig.
- Der exportierte Wertebereich beträgt −2.147.483.648 bis 2.147.483.647.
- Dezimalwerte, ungültige Eingaben und Überlauf werden verständlich
  abgelehnt; der vorherige gespeicherte Zustand bleibt erhalten.
- Ohne gültigen Artikel und aktive Inventur sind Eingaben/Aktionen gesperrt.

Wie im Original speichert eine bestätigte Mengen-/Plus-Änderung beim
Verlassen des Feldes lokal automatisch, nicht bei jedem Tastendruck.
Die beiden ausdrücklichen Aktionen bleiben zusätzlich bedienbar.

Jede Plus-Eingabe wird genau einmal hinzugefügt. Danach zeigt Menge die
neue Gesamtmenge und Plus wird geleert. Feld-Verlassen und anschließender
Buttonklick dürfen dieselbe Differenz nicht doppelt buchen.

Ein Speicherhinweis erklärt die rein lokale Wirkung. Das Originalhäkchen
erscheint nur bei unverändertem/gespeichertem Formular und Menge größer 0.
Auch 0, negative oder leere zulässige Werte erhalten eine klare Rückmeldung,
ohne fälschlich das Häkchen zu zeigen. Nach Erfolg geht der Fokus zum
Scanner-Modus.

### Verdeckte Positionswerte

InventurKey, Artikelreferenz, Inventurreferenz, Mengenerfassungskennzeichen
und Artikelnummer werden lokal mitgeführt. Sie werden nicht als unnötige
zusätzliche Pflichtfelder auf dem Handy angezeigt.

Der Originalschlüssel bleibt Inventurname + "-" + Artikel-Barcode.
Die Demo führt keine neue Schlüsselmigration bei Namensänderung ein.

## Settings: Inventuren verwalten

Die Inventurenliste zeigt **Name, Jahr, Startdatum und Status**. Lange Listen
scrollen intern. Der Detailzugang öffnet den ausgewählten Eintrag zum
Bearbeiten; **Neu** startet eine neue Inventur.

Das vollständige Formular enthält:

| Feld | Verhalten |
| --- | --- |
| Inventurname | Pflichtfeld; bis zu 850 Zeichen wie im exportierten Bestand |
| Jahr | Optionaler Text bis 4000 Zeichen; keine neue Beschränkung auf eine Jahreszahl |
| Startdatum | Optional; vorhandene intern gespeicherte Uhrzeit bleibt bei Bearbeitung erhalten |
| Status | Optional; geplant, aktiv, abgeschlossen |

Änderungen im Verwaltungsformular werden erst durch **Speichern** lokal
übernommen. Der Änderungsstatus bleibt erkennbar. Ein leerer Pflichtname
führt zu einer verständlichen Meldung, nicht zu einem neuen Listeneintrag.

Gespeicherte Statusänderungen wirken auf die aktive Inventurauswahl.
**Abgeschlossen** ist ein Statuswert, keine zusätzliche Veröffentlichung,
Abschlussautomatik oder externe Buchung.

## Bedienung auf Geräten und Rückmeldungen

Am PC öffnet der normale Mockup-Aufruf jetzt zunächst eine **Handy-Vorschau**
mit 375 × 667 CSS-px tatsächlicher Inhaltsfläche. Ein höheres Handyformat
384 × 832 ist wählbar. Es wird nicht als bestimmtes Samsung-Modell bezeichnet,
solange das Modell nicht bestätigt ist. Die Vorschau wird nicht herunterskaliert.
**Responsive Vollansicht** öffnet die gerätebreite Ansicht separat.
Auf dem Handy selbst wird direkt die responsive Seite angezeigt.

Geprüft werden 375 × 667, 768 × 1024, 1280 × 800 und 686 × 1095 CSS-px.
Die Erfassung ist auf dem Handy ohne Seitenscrollen bedienbar.
Nur Suchtreffer und lange Listen scrollen intern. Pflichtfelder, Einheiten,
Speicheraktionen und relevanter Status bleiben sichtbar; keine
Schriftverkleinerung als Platz-Trick.

Die Oberfläche verwendet das gemeinsame Dorfladen-Design, lesbare
Systemschrift, ausreichend große Touch-Flächen und Hell-/Dunkelmodus.
Dialoge haben verständliche Namen, führen den Tastaturfokus und lassen sich
mit Escape schließen. Danach kehrt der Fokus zum Auslöser zurück.
Wichtige Fehler erscheinen im Dialog, kurze Speicherhinweise als kompakter
Status. Keine technischen Fehlercodes oder nativen Browser-alerts.

Bei eingeblendeter Mobil-Tastatur müssen das fokussierte Feld und seine
Aktion erreichbar bleiben. Eine verkleinerte Testansicht allein belegt
noch nicht die Bedienbarkeit mit einer echten Bildschirmtastatur.

## Abnahme und bewusst nicht behauptete Nachweise

Der Mockup belegt keine tatsächlichen Dataverse-Schreibvorgänge,
Produktivberechtigungen, zeitgleichen Bearbeitungen, Scannerhardware oder
Namens-/Schlüsselmigrationen. Alle Funktionen werden gegen die
[Spezifikation und Testfälle](inventur-mockup/spec.md) geprüft.

Ausdrücklich bestätigte Präzisierungen gegenüber unklaren Quellabläufen:
leere Menge/Plus-Basis, Integer-Validierung, Plus-Einmalbuchung mit Reset,
Neu-Laden beim Inventurwechsel. Keine Funktion wird zusammengelegt oder
entfernt.

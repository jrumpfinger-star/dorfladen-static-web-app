# Inventur unter /inventur — geplante Funktionen

**Status:** Fachlich freigegeben und umgesetzt (sicheres Blockieren bei Unklarheit); Abnahme am echten Gerät offen  
**Stand:** 20.11.2026  
**Testbarer Vertrag:** [Spezifikation](inventur/spec.md)

## Einstieg und Zugang

Die echte Seite wird unter `/inventur` geöffnet. Auf dem Handy erscheint sie
direkt bildschirmfüllend; der Handyrahmen gehört ausschließlich zum Mockup
am PC und wird nicht in die echte Anwendung übernommen.

Die vorhandene Kiosk-Anmeldung wird wiederverwendet. Eine gültige
Serversitzung genügt; andernfalls ist das Kiosk-Passwort nötig.
Die Schnittstellen prüfen den Zugang auch beim Lesen. Ein bloß lokal
entsperrtes Kioskfenster erlaubt noch keinen Datenzugriff.

Alle so angemeldeten Nutzer dürfen Artikel erfassen und Inventuren anlegen
oder bearbeiten. Es gibt keine neuen persönlichen Konten oder getrennten
Erfasser-/Verwalterrollen. Ein gemeinsamer Zugang weist nicht nach,
welche einzelne Person eine Menge geändert hat.

## Bestehende Daten statt Beispieldaten

Die Seite nutzt dieselben Inventuren, Positionen und Artikelstammdaten in
Dataverse wie die bestehende PowerApps-App. Der Artikelstamm wird nur gelesen.
Der bisherige Mockup bleibt getrennt und verwendet weiterhin Beispieldaten.

Nur aktive Inventuren können zur Erfassung ausgewählt werden. Name, Jahr
und Startdatum bleiben sichtbar. Gibt es keine aktive Inventur, erklärt die
Seite das und sperrt die Mengenaktionen.

Bei Inventurwechsel wird für den gewählten Artikel die Menge der
Zielinventur geladen. Mengen werden nicht aus einer anderen Inventur
übernommen. Während eines notwendigen Ladevorgangs kann nicht mit dem alten
Kontext gespeichert werden.

## Artikel wählen und mit der Kamera scannen

Artikelsuche nach Bezeichnung oder Barcode bleibt erhalten. Führende Nullen
im Barcode gehen nicht verloren. Lange Ergebnislisten scrollen intern und
laden weitere Treffer, statt einen abgeschnittenen Katalog vorzutäuschen.

**Barcode** öffnet die echte Handykamera erst nach aktivem Antippen:

- **Manuell Scan:** Barcode gezielt erfassen.
- **Automatisch:** Erkanntes Ergebnis ohne weiteren Bestätigungsschritt übernehmen.
- Wiederholte Kamerabilder lösen nicht mehrfach denselben Vorgang aus.
- Ein Scan wählt den Artikel, bucht aber noch keine Menge.
- Kamera schließen beendet ihren Zugriff. Bilder werden nicht gespeichert
  oder übertragen.

Bei verweigerter Berechtigung oder fehlender Kamerafunktion erscheint eine
verständliche Meldung. Die Artikelsuche bleibt verfügbar. Ein unbekannter
Barcode zeigt die Originalwarnung und erlaubt keine Mengenspeicherung für
einen versehentlich vorher ausgewählten Artikel.

Die reale Kamerabedienung wird später auf einem tatsächlichen Mobilgerät
geprüft, nicht nur mit einer verkleinerten Desktopansicht.

## Artikelkontext, Preise und Mengen

Artikelbezeichnung und Barcode sowie getrennte EK-/VK-Anzeige bleiben
erhalten. Die Preise sind nicht bearbeitbar.

Für neue Positionen wird der letzte EK verwendet. Ist er 0, gilt die
vorhandene Berechnung aus VK, Steuerkennzeichen und Faktor 0,67.
Bei bestehenden Positionen bleibt der Positions-EK erhalten.
Einheiten bleiben Stück bzw. Gramm gemäß Artikelstamm.

**Menge** und **Plus (Hinzufügen)** bleiben getrennte Felder:

- Menge ist die Basis, Plus die zusätzliche Differenz.
- Bestätigte Feldänderung beim Verlassen speichert wie bisher automatisch,
  nicht bei jedem Tastendruck. Speichern und Hinzufügen bleiben erreichbar.
- Leere Menge bleibt ohne Plus leer; Plus bei leerer Basis rechnet mit 0.
- Ganze Zahlen einschließlich 0 und negativer Werte sind zulässig.
- Ungültige Eingaben, Dezimalwerte und Integer-Überlauf werden abgelehnt,
  ohne den gespeicherten Stand zu ändern.
- Jede Plus-Buchung wirkt genau einmal. Erst bei eindeutig bestätigtem Erfolg
  wird Plus geleert und die neue Gesamtmenge angezeigt.

Die Seite unterscheidet **speichert**, **gespeichert**, **nicht gespeichert**,
**Konflikt** und **Speicherstand unklar**. Sie meldet keinen lokalen
Scheinerfolg für einen fehlgeschlagenen Dataverse-Aufruf.

## Konflikte, Verbindung und Parallelbetrieb

Hat jemand die Position seit dem Laden geändert, überschreibt die Web-App
sie nicht stillschweigend. Sie zeigt den aktuellen Stand und den eigenen
Entwurf getrennt. Erst nach erneuter bewusster Bestätigung kann weiter
gespeichert werden; eine alte Plus-Differenz wird nicht automatisch neu gebucht.

Bei Verbindungsproblemen bleibt die Eingabe in der geöffneten Seite erhalten.
Es gibt keine dauerhafte Offline-Warteschlange und keine automatische
Nachbuchung, sobald das Netz wieder da ist.

Ist unklar, ob eine Speicherung schon ausgeführt wurde, muss der bisherige
Vorgang erst eindeutig geprüft werden. Einfach dieselbe Menge erneut zu
senden oder nur einen Mengenvergleich vorzunehmen reicht dafür nicht.
Bei einem offenen Vorgang darf kein Inventur-/Artikelwechsel zu einer
Buchung im falschen Kontext führen.

PowerApps bleibt vorerst unverändert nutzbar. Deshalb gilt organisatorisch:
**Dieselbe Position nicht gleichzeitig in beiden Anwendungen bearbeiten.**
Der Web-Konfliktschutz kann nicht verhindern, dass PowerApps nachträglich
wieder überschreibt. Das wird ausdrücklich erklärt; es wird keine
appübergreifende Sperre behauptet.

## Settings: Inventuren verwalten

Die Liste enthält Name, Jahr, Startdatum und Status. Neu/Edit bleiben
verfügbar; lange Listen scrollen intern.

| Feld | Verhalten |
| --- | --- |
| Inventurname | Pflicht, bis 850 Zeichen; nach erster Position gesperrt |
| Jahr | Optionaler Text bis 4000 Zeichen |
| Startdatum | Optional; bestehende Datum-/Zeitbedeutung erhalten |
| Status | Optional: geplant, aktiv, abgeschlossen |

Die Namenssperre ist ausdrücklich bestätigt: Der Originalname steckt im
Positionsschlüssel. Die anderen Felder bleiben bearbeitbar.
Mehrdeutige oder zu lange Schlüssel werden nicht durch zufällige Auswahl
oder Kürzung „repariert“.

Verwaltungsänderungen werden explizit gespeichert und ebenfalls auf
zwischenzeitliche Änderungen geprüft. Der Status abgeschlossen löst keine
zusätzliche Abschlussbuchung, Veröffentlichung oder Löschung aus.

## Bedienung und Umsetzungsvoraussetzungen

Das gemeinsame Dorfladen-Design und alle vier Pflichtansichten gelten.
Auf dem Handy ist die Erfassung bei 375 × 667 ohne Seitenscrollen bedienbar;
Treffer-/Inventurlisten scrollen intern. Kamera, Bildschirmtastatur,
Lade-, Auth-, Fehler- und Konfliktzustände gehören zur Prüfung.

Eine rein lesende PAC-ModelBuilder-Abfrage hat die Feldtypen und
Lookup-Beziehungen der drei beteiligten Tabellen bestätigt. Der Lösungsexport
bestätigt die OData-Navigationsnamen und eine Alternate-Key-Definition auf
dem Positionsschlüssel; deren aktueller Indexstatus ist nicht enthalten.
Eine gesondert freigegebene Aggregation über nichtleere Positionsschlüssel
fand eine Duplikatgruppe; einzelne Werte wurden nicht ausgegeben oder
gespeichert. Vor der Architekturplanung müssen die aktuelle
Concurrency-/ETag-Fähigkeit, der Indexstatus und die atomare
Wiederholsicherheit nachgewiesen werden. Auch Datumsverhalten und
Laufzeitberechtigungen sind noch nicht live bestätigt.

Notwendige Schemaergänzungen werden zunächst nur vorgeschlagen und brauchen
eine eigene Freigabe. Diese Funktionsbeschreibung erlaubt weder eine
Schemaänderung noch Produktivcode, Testbuchungen oder Veröffentlichung.

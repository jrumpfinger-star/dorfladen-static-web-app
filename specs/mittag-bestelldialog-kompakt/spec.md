# Kompakter Kunden-Bestelldialog

Vom Nutzer nach dem bedienbaren Mockup zur Umsetzung und zum Deployment
freigegeben. Betrifft die öffentliche Mittagessen-Bestellung, nicht den
Telefon-Erfassungsdialog.

## F1: Auf das Bestellen konzentrieren

Gericht, Preis, Menge und Mitnehmen bleiben unmittelbar sichtbar.
Sonderwünsche, Kundendaten und Benachrichtigungsoptionen werden mit nativen,
tastaturbedienbaren Klappbereichen dargestellt. Die Namenszeile zeigt den
gespeicherten Namen. Bei fehlendem Pflichtnamen öffnet sich der Datenbereich
automatisch; vorhandene Angaben sind eingeklappt und jederzeit änderbar.
Bei Anmeldung werden die vorhandenen Vorbelegungsregeln weiter angewendet.
Der Anmeldelink bleibt auch bei eingeklappten Daten erreichbar.

- TC-F1-01: Wiederbestellung mit gespeichertem Namen: Daten eingeklappt,
  Name als Text angezeigt, Eingaben nach Aufklappen unverändert vorhanden.
- TC-F1-02: Erstbestellung/fehlender Name: Daten offen; nach erfolgreicher
  Anmeldung Vorbelegung und kompakte Zusammenfassung aktualisiert.
- TC-F1-03: Sonderwunsch und Mitnahme bleiben im POST erhalten; Menge und
  Gesamtpreis funktionieren unverändert.

## F2: Benachrichtigungen ehrlich darstellen

Optionen einklappbar; Zusammenfassung benennt gewählte App-Mitteilungen,
Browser-Blockierung und E-Mail. Die bestehende Push-Anmeldung, Gerätekennung,
Kontozuordnung, E-Mail-Auswahl und Kunden-Speicherung bleiben unverändert.
App ausgewählt bedeutet nicht automatisch erteilte Browserberechtigung.
Fehlender Name oder fehlende Pflicht-E-Mail öffnet den Datenbereich und
fokussiert das betreffende Feld, statt einen versteckten Fehler zu erzeugen.

- TC-F2-01: E-Mail wählen, Adresse fehlt: Datenbereich offen, Fokus auf E-Mail,
  kein POST. Ohne E-Mail-Auswahl weiterhin ohne E-Mail bestellbar.
- TC-F2-02: Blockiertes Push im eingeklappten Zustand erkennbar; gespeicherte
  Konto-/Gerätezuordnung und Request-Felder bleiben erhalten.

## F3: Unübersehbar schließen

Beschrifteter Schließen-Button im Kopf und neben dem Bestellbutton; unten
bleiben die Aktionen beim Scrollen erreichbar. Im eingebetteten Dialog
verwendet Schließen das vorhandene `closeMittagPopup`-Protokoll, als eigene
Seite die bisherige Zurück-/Startseiten-Navigation.
Der äußere Popup-Schließen-Button darf den neuen inneren Button nicht verdecken;
andere über denselben Popup-Container angezeigte Seiten behalten ihren Schließen-Button.
Kopfzeile, Bestellschluss, Formular-Karten und Aktionsleiste haben dieselbe
responsive Breite und schließen links und rechts bündig ab.
Die Aktion „Ändern“/„Zuklappen“ in den Klappbereich-Zusammenfassungen bleibt
rechtsbündig neben der Beschriftung, auch auf schmalen Mobilbildschirmen;
lange Namen oder Status werden dort gekürzt statt in eine zweite Zeile zu brechen.

- TC-F3-01: Beide beschrifteten Buttons schließen die eingebettete Bestellung.
- TC-F3-02: Kopf, Aktionsleiste und aufgeklappte Inhalte passen auf die vier
  Projekt-Viewports, ohne Überdeckung oder horizontales Scrollen.
  Die linken und rechten Außenkanten von Kopf, Bestellschluss, Karten und
  Aktionsleiste stimmen bis auf maximal einen CSS-Pixel überein.
- TC-F3-03: Bestellschluss, Konto-Anmeldung, Bestellbestätigung und bestehende
  Popup-/Kontoseiten verhalten sich unverändert.

Keine Änderung an Zahlungslogik, Preisen, Mengenlimits, Rabattberechnung,
Bestellschluss oder API-Vertrag des Kundenpfads.

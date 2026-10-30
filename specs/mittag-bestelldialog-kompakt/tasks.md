# Aufgaben

| ID | Aufgabe | Voraussetzung | Testfälle |
|---|---|---|---|
| T1 | Klappbereiche und Zusammenfassungen integrieren | freigegebener Mockup/Spec | TC-F1-01..03, TC-F2-01/02 |
| T2 | Beschriftete Schließen-Buttons und äußeren Popup-Container integrieren | T1 | TC-F3-01/02 |
| T3 | Neue Tests und gezielte Konto-/Bestellschlussregressionen ausführen | T2 | alle Testfälle |
| T4 | Dokumentation aktualisieren und geprüften Stand deployen | T3 | TC-F3-03, Workflow-Erfolg und Live-Dateivergleich |

## Prüfprotokoll

- T1/T2 abgeschlossen: produktive Bestellseite und äußerer Popup-Rahmen integriert.
- T3 abgeschlossen: 103 Browserprüfungen erfolgreich, 9 bedingt übersprungen
  (`mittag-bestelldialog-kompakt`, `konto-waehrend-bestellung`,
  `geraete-kennung`, `bestellschluss`).
- Zusatzlauf `kiosk-laufkundschaft` und `konto-modal`: 80 erfolgreich,
  1 übersprungen; 3 bestehende Fehler bei TC-KM-03d (Außenklick).
  Auf unverändertem HEAD reproduziert: Der Bestellstatus-Popup bleibt bereits
  dort nach Außenklick offen. Keine Änderung dieses Bestandsverhaltens.
- API-Laufkundschaft: 12/12 erfolgreich; sämtliche Schreibzugriffe simuliert.
- Syntax aller geänderten eingebetteten Skripte und `git diff --check` geprüft.
- Mobile Standardansicht mit eingeklappten Daten sowie aufgeklappte Ansichten
  visuell geprüft.
- T4: Dokumentation ergänzt; Produktionsfreigabe über den Main-Workflow,
  anschließend Workflow-Ergebnis und ausgelieferte Dateien kontrollieren.

## Nachbesserung: bündige Breite

- Kopfzeile, Bestellschluss und Formular verwenden dieselbe responsive Breite;
  die bisherigen Kartenbreiten bleiben erhalten.
- TC-F3-02 misst beide Außenkanten von Kopf, Bestellschluss, Karten und
  Aktionsleiste im eingebetteten Dialog (Toleranz höchstens 1 CSS-Pixel).
- Lokaler Prüflauf: 28/28 Tests der kompakten Kundenbestellung auf allen vier
  Viewports erfolgreich; Desktop-Screenshot visuell geprüft.

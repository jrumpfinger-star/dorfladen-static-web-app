# Aufgaben: Mittagstisch-Laufkundschaft

Status: T1–T9 lokal umgesetzt und geprüft. Kein Commit oder Deployment.
Grundlage: [spec.md](./spec.md), [plan.md](./plan.md).

| ID | Aufgabe | Voraussetzung | Nachweis |
|---|---|---|---|
| T1 | Funktionsbeschreibung in `specs/kiosk-funktionen.md` ergänzen und vor Code bestätigen lassen | Freigegebene Spezifikation | F1–F5 mit bestätigtem Bedienablauf |
| T2 | Dataverse-Metadaten von `dl_quelle` lesen; neuen Quellwert kontrolliert vorbereiten, ohne historische Datensätze umzudeuten | T1 | Zulässige Quelle für Laufkundschaft dokumentiert; bestehende Werte erhalten |
| T3 | API-Quelle, authentifizierte Heute-Erfassung und Version im Lesevertrag implementieren; Python-Tests hinzufügen | T2 | TC-F1-03/05/06, TC-F2-01/02/04/05/06 |
| T4 | Separaten Laufkundschaft-Dialog, Fußleistenbutton und Tagesauswahl integrieren | T3 | TC-F1-01..06, TC-F2-01..06 |
| T5 | Badge, Quellenfilter und Quellenaggregation in Karten, Kochbedarf und Verlauf trennen | T4 | TC-F3-01..05 |
| T6 | Authentifizierten Mengen-PATCH mit Typ-/Bereichsprüfung und bedingtem Dataverse-Update implementieren | T3 | TC-F4-03..06 |
| T7 | Mengenänderungsdialog für offene Telefon-/Laufkundschaft-Karten implementieren; Summen aktualisieren | T5, T6 | TC-F4-01..06, TC-F5-02 |
| T8 | Kiosk-Ausgaben generieren, responsive Layouts prüfen, gezielte Bestandsregressionen ausführen | T7 | TC-F5-01..03 und alle neuen UI-Testfälle auf vier Viewports |
| T9 | Direkt betroffene Status-Spec, Hilfe, Handbuch und Testfall-Dokumentation aktualisieren | T8 | Dokumentation entspricht verifiziertem Verhalten, echte Testresultate festgehalten |

## Abschlusskriterien

Alle zugeordneten Testfälle bestehen. Keine produktiven Testdaten, kein stilles
Ignorieren ungültiger Mengen, keine pauschale Umdeutung von Personal als
Laufkundschaft und kein Überschreiben zwischenzeitlicher Änderungen.
Keine automatische Abholung und keine Änderung des Telefon-Erfassungsdialogs.

## Validierung

- Dataverse-Metadaten gelesen: `dl_quelle` ist INT; keine Schema- oder
  Bestandsdatenänderung erforderlich.
- Neue Playwright-Datei: 48/48 erfolgreich auf vier Viewports, einschließlich
  des separat beauftragten Kunden-Mockups.
- Erweiterte Prüfung von Küchenliste, Fokus und Neuladen: 4/4 erfolgreich.
- Neue Python-Handler-Tests: 12/12 erfolgreich mit simuliertem Dataverse.
- Bestehende Telefon-/Tagwahl-/Bestellstatus-/Abholtests: 169 erfolgreich,
  3 bereits durch die betreffenden Tests bedingt übersprungen.
- Bestehende Python-Verlauf-/Abholtests erfolgreich.
- Eingebettetes JavaScript und `git diff --check` geprüft.

Keine Testbestellungen in produktives Dataverse geschrieben. Die
Verifikation des API-Vertrags nutzt die echten Handler mit simulierten
Dataverse-Antworten, keine Behauptung eines produktiven Ende-zu-Ende-Tests.

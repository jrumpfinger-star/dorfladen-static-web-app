# Plan: kompakter Kunden-Bestelldialog

Grundlage: [spec.md](./spec.md); Mockup vom Nutzer freigegeben.

1. `static-site/mittagstisch-bestellen.html`: vorhandene Feld-IDs und
   Verarbeitungslogik erhalten. Native Details für Sonderwunsch, Daten und
   Benachrichtigungen; sichere Textzusammenfassung über textContent.
   Datenzustand beim Laden/Anmelden und Eingaben aktualisieren, bei
   Validierungsfehlern öffnen/fokussieren. Sichtbare beschriftete Schließen-
   Buttons und klebende untere Aktionsleiste, passende Header-/Countdown-Höhe.
2. `static-site/index.html`: äußeren X-Button nur bei eingebetteter
   Mittagessen-Bestellseite ausblenden, deren eigene Schließen-Aktionen ihn
   ersetzen. Bei Konto/anderen Popup-Zielen unverändert lassen.
3. Neue gemockte Playwright-Tests auf vier Viewports, bestehende
   Konto-/Bestellschluss-Tests gezielt nachziehen. Keine Produktivbuchungen.
4. Hilfe und Testfalldokumentation aktualisieren, zusammen mit den bereits
   beauftragten Kiosk-Änderungen committen und main deployen.
5. Workflow-Erfolg und ausgelieferte Dateien gegen den Commit prüfen.

Kein neues Paket. Keine Umdeutung gespeicherter Kontodaten. Keine
produktiven API-Schreibzugriffe während Tests.

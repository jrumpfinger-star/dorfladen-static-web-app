# Inventur-Mockup — Aufgaben

**Spec:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

Status wird nach tatsächlichen Nachweisen gepflegt. Dokumentation benötigt
keinen Laufzeittest; Code-Aufgaben gelten erst bei bestandenen zugeordneten
automatisierten Testfällen als erledigt.

| ID | Aufgabe | Abhängigkeit | Testfälle | Status |
| --- | --- | --- | --- | --- |
| T001 | Bestätigte Spec, Funktionsbeschreibung und Architektur erstellen | keine | Dokumentprüfung | erledigt |
| T010 | Lokales Modell, Bereiche, Inventurauswahl und Artikelkontext | T001 | TC-F1-01/02, TC-F2-01/02, TC-F5-01/02/03, TC-F8-01/02 | erledigt |
| T011 | Suche und Barcode-Simulation mit beiden Modi | T010 | TC-F3-01/02, TC-F4-01/02 | erledigt |
| T012 | Integer-Validierung, Menge/Plus, lokale Einmalbuchung und Status | T010 | TC-F6-01/02/03, TC-F7-01/02/03 | erledigt |
| T013 | Vollständige Inventurverwaltung mit lokalem Entwurf | T010 | TC-F9-01/02/03, TC-F1-02 | erledigt |
| T020 | Gemeinsame responsive Gestaltung, Fokus und Dialoge | T011, T012, T013 | TC-F10-01/02, TC-F11-01/02 und automatisierter Teil TC-F11-04 | erledigt |
| T030 | Gezielte Playwright-Tests, Isolation, vier Ansichten und Screenshots | T020 | sämtliche automatisierten TC-F1–F12, insbesondere TC-F11-03 | erledigt |
| T031 | Tatsächliche Mobil-Tastatur prüfen und Ergebnis ausdrücklich ausweisen | T020 | manueller Teil TC-F11-04 | offen: echtes Gerät nicht verfügbar |
| T040 | Testfalldokumentation, geprüften Mockup präsentieren | T030 | Ergebnis-/Dokumentprüfung; T031-Prüfstand ausweisen | dokumentiert, fachliche Mockup-Abnahme ausstehend |
| T050 | Bestätigte Handy-Vorschauhülle für den PC ergänzen und prüfen | T020 | TC-F12-01/02 sowie F1–F11-Regression | erledigt |

Die Schreibschritte T010–T020 bleiben in einer HTML-Datei; keine parallelen
Änderungen daran. Jeder F-Abschnitt der Spec ist durch die aufgeführten
TC-IDs abgedeckt. Keine echte Hardware-/Tastaturprüfung vortäuschen.

Abschlusslauf 20.11.2026: 44/44 automatisierte Prüfungen auf den vier
Zielansichten bestanden. [Testfalldokumentation](../../tests/TESTCASES.md).

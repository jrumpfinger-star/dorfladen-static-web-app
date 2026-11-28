# Inventur-Web-App — Aufgaben

Fertig = die zugeordneten Testfälle laufen grün.

| Nr. | Aufgabe | Testfälle | Stand |
| --- | --- | --- | --- |
| T1 | Zugangsschutz aller Lese-/Schreibwege, Anmeldung, 401-Verhalten | TC-F1-01…03 | `test_inventur.py` (Token), `inventur.spec.js` (Anmeldung, Sitzungsende) |
| T2 | Inventurauswahl, Wechsel lädt Zielmenge | TC-F2-01…03 | `inventur.spec.js` (Inventurwechsel) |
| T3 | Artikelsuche mit internem Scrollen und Nachladen | TC-F3, TC-F10-01 | `inventur.spec.js` (Trefferliste) |
| T4 | Kamera: automatisch, manuell, verweigert, nicht unterstützt | TC-F4-01…02 | `inventur.spec.js` (4 Kamerafälle, simulierte Kamera) |
| T5 | Menge/Plus, EK-Regel, Zahlenprüfung | TC-F5/F6 | `test_inventur.py`, `inventur.spec.js` |
| T6 | Konflikt, unklarer Ausgang, genau eine Plus-Buchung | TC-F6-03, TC-F7 | `test_inventur.py`, `inventur.spec.js` |
| T7 | Inventurverwaltung, Namenssperre, Namenseindeutigkeit | TC-F8 | `test_inventur.py`, `inventur.spec.js` (Settings) |
| T8 | Doppelte/mehrdeutige Positionen blockieren | TC-F8-04 | `test_inventur.py`, `inventur.spec.js` |
| T9 | Route, Service Worker, vier Ansichten | TC-F10-01 | `inventur.spec.js` auf mobile, ipad-mini, desktop, tablet-hoch |
| T10 | Echtes Mobilgerät, isoliertes Schreibziel, `If-Match`-Nachweis | TC-F10-03, TC-F9-01 | **offen** (Abnahme) |

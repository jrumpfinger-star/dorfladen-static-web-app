# Entwurf: kompakter Kunden-Bestelldialog

Zunächst separater Auftrag neben der Kiosk-Implementierung, ausdrücklich **nur Mockup**.
Die anschließende produktive Integration wurde vom Nutzer freigegeben und ist in
[Kompakter Kunden-Bestelldialog](../mittag-bestelldialog-kompakt/spec.md)
mit eigenem Plan, Aufgaben und Regressionstests beschrieben.

## Bestätigtes Verhalten

- Gericht, Portionsmenge, Preis und „Zum Mitnehmen“ sofort sichtbar.
- Gespeicherte Daten als kurze Namenszeile, Eingabefelder zunächst eingeklappt.
- Bei Erstbestellung bzw. fehlendem Pflichtnamen Daten automatisch aufgeklappt.
- Daten jederzeit änderbar; Sonderwünsche und Benachrichtigungsoptionen
  aufklappbar, statt alle Felder ständig zu zeigen.
- Deutlich beschriftetes **Schließen** im Kopf sowie neben dem Bestellbutton.
  Kein ausschließliches Verlassen über ein leicht übersehenes X.
- Beispieldaten, keine API-Aufrufe, keine echte Bestellung und keine
  Verarbeitung der im Screenshot enthaltenen persönlichen Daten.

## Artefakt und Prüfung

[`entwurf-mittag-bestellen.html`](../../static-site/entwurf-mittag-bestellen.html)
ist ein eigenständiger bedienbarer Entwurf mit Umschalter Erst-/Wiederbestellung.

Der Test „Mockup: Daten eingeklappt, Erstbestellung offen und Preis bedienbar“
in `tests/kiosk-laufkundschaft.spec.js` prüft auf vier Viewports die
Aufklappregeln, Preisberechnung, simulierte Bestellung, beide Schließen-Buttons
und fehlende horizontale Überbreite.

Der Entwurf bleibt ein eigenständiges Beispiel ohne echte Bestellungen.
Die produktive Bestellseite verwendet weiterhin ihre bestehenden Verträge
für Konto, Gerätekennung, Push, E-Mail und Bestellschluss.

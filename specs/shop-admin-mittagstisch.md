# Shop-Admin – Mittagstisch-Bestellungen

## Kontext
Die Shop-Admin-Seite (`static-site/shop-admin.html`) zeigt Mittagstisch-Bestellungen in Day-Tabs an. Es gab zwei Bugs:
1. Samstag fehlte in den Day-Tabs → Samstagsbestellungen waren unsichtbar
2. Statusänderung (X-Button) sendete die ID nicht in der URL → 405 "Method not allowed"

## Anforderungen
- [x] Day-Tabs zeigen Mo–Sa (nicht nur Mo–Fr)
- [x] PATCH-Request für Statusänderung sendet ID in der URL (`/api/lunch-order/{id}`)
- [x] Fehlermeldungen als Toast statt alert()

## Betroffene Dateien
- `static-site/shop-admin.html`

## Akzeptanzkriterien
- [x] Samstag erscheint als Tab wenn heute Sa ist oder Sa in den nächsten 4 Geschäftstagen liegt
- [x] Klick auf ❌ bei einer Bestellung ändert den Status ohne "Method not allowed"-Fehler
- [x] Fehlermeldungen erscheinen als Toast-Notification, nicht als Browser-alert()

## Nicht-Ziele
- Keine Sonntags-Unterstützung (Laden ist So geschlossen)

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung gegen Akzeptanzkriterien

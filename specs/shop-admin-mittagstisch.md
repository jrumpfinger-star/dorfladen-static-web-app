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
- `static-site/shop-admin.html` – `mtBuildDayTabs()`, `mtSetStatus()`

## API-Endpunkte
- `PATCH /api/lunch-order/{id}` – Status einer Bestellung ändern
- `GET /api/lunch-order?datum=YYYY-MM-DD` – Bestellungen nach Datum laden

## Akzeptanzkriterien
- [x] AK-MT-01: Samstag erscheint als Tab wenn Sa in den nächsten 5 Geschäftstagen liegt
- [x] AK-MT-02: `mtSetStatus()` sendet PATCH an `/api/lunch-order/{id}` (ID in URL, nicht nur im Body)
- [x] AK-MT-03: Fehlermeldungen als Toast, nicht als Browser-alert()
- [x] AK-MT-04: Nach erfolgreicher Statusänderung wird `loadMittagOrders()` aufgerufen

## Nicht-Ziele
- Keine Sonntags-Unterstützung (Laden ist So geschlossen)

## Status
- [x] Spec reviewed
- [x] Implementierung
- [x] Validierung gegen Akzeptanzkriterien

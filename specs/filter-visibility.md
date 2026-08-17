# Filter-Visibility – Größere und deutlichere Filter-Buttons

## Kontext
Filter-Buttons in mehreren Admin-Seiten waren zu klein und der aktive Zustand zu subtil (nur grüne Unterstriche oder dezente Farbänderungen). Der aktive Filter war schwer zu erkennen, besonders auf Touch-Geräten.

## Anforderungen
- [x] Alle Filter-Buttons größer darstellen (größere Schrift, mehr Padding)
- [x] Aktiver Zustand deutlich sichtbar: grüner Hintergrund + weiße Schrift
- [x] Konsistentes Design über alle Seiten hinweg
- [x] Touch-optimiert (ausreichende Trefferzone)

## Betroffene Stellen

### Kiosk (`kiosk.html`) – `.k-filter-btn`
- [x] Font-size: 11px → **14px**
- [x] Padding: 6px 12px → **10px 16px**
- [x] Aktiv: nur grüne Linie → **grüner BG + weiße Schrift + abgerundete obere Ecken**
- [x] Count-Badge: 10px → **12px**, aktiv: weiß auf halbtransparent

### Shop-Admin (`shop-admin.html`) – `.tab-btn`
- [x] Font-size: 13px → **15px**
- [x] Padding: 12px 16px → **14px 18px**
- [x] Aktiv: grüne Linie → **grüner BG + weiße Schrift**

### Shop-Admin (`shop-admin.html`) – `.mt-filter-btn`
- [x] Font-size: 13px → **15px**
- [x] Padding: 8px 14px → **10px 18px**
- [x] Border: 1px → **2px**
- [x] Aktiv: zusätzlich **box-shadow**

### Shop-Admin (`shop-admin.html`) – `.stat` Kacheln
- [x] Aktiv: nur grüne Border → **grüner BG + weiße Schrift (Label + Value)**

### Shop-Freigabe (`shop-freigabe.html`) – `.filter-btn`
- [x] Font-size: 12px → **14px**
- [x] Padding: 6px 10px → **9px 16px**
- [x] Border: 1px → **2px**
- [x] Font-weight: 500 → **700**
- [x] Aktiv: zusätzlich **box-shadow**

### Angebote (`style.css`) – `.ang-week-btn`
- [x] Font-size: .8rem → **.9rem**
- [x] Padding: 6px 14px → **8px 18px**
- [x] Border: 1px → **2px**
- [x] Font-weight: 600 → **700**
- [x] Aktiv: zusätzlich **box-shadow**

## Akzeptanzkriterien
- [x] AK-FV-01: Kiosk-Filter-Buttons sind 14px groß mit grünem BG bei aktivem Zustand
- [x] AK-FV-02: Shop-Admin Tab-Buttons zeigen aktiven Tab mit grünem BG + weißer Schrift
- [x] AK-FV-03: Shop-Admin Mittagstisch-Filter sind 15px mit box-shadow bei aktiv
- [x] AK-FV-04: Shop-Admin Stat-Kacheln zeigen aktiven Filter mit grünem BG + weißer Schrift
- [x] AK-FV-05: Shop-Freigabe Filter-Buttons sind 14px mit 2px Border
- [x] AK-FV-06: Angebote Wochen-Buttons sind .9rem mit 2px Border und Shadow bei aktiv
- [x] AK-FV-07: Alle Filter-Buttons haben ausreichende Touch-Trefferzone (min 40px Höhe)

## Status
- [x] Spec erstellt (2026-06-23)
- [x] Implementierung
- [ ] Live-Test ausstehend

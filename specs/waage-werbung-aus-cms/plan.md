# Plan: Waage-Werbung aus dem CMS

Siehe `plan.md` der Sitzung für Begründungen; hier die Änderungsübersicht.

## Änderungsübersicht

| Datei | Änderung |
|-------|----------|
| `static-site/cms.js` | HD-Faktor in `generateMenuImage`, `drawAngebotPlakat`, `generateEinzelflyer`; Waagenbild-Erzeuger (Wochenplan, Aktion quer); Knöpfe und Aktionen `waageWP`, `waageAktion`; `showSharePreview(opts.waage)` |
| `static-site/cms-klassisch.html` | Knopf im Wochenplan-Tab, Skript `kiosk-werbebilder.js` |
| `static-site/cms.html`, `cms-neu.html` | erzeugt mit `node tools/build-cms-neu.js` |
| `static-site/js/kiosk-werbebilder.js` | `uebertragen()` (Dialog), gemeinsame Hilfen |
| `static-site/handbuch/anwenderhandbuch.html` | Schaltflächen, HD-Hinweis |
| `tests/cms-waage-werbung.spec.js` | neu |

## Technik HD

`canvas.width = W·S; ctx.setTransform(S,0,0,S,0,0)`; `shadowBlur`/`shadowOffset*` mit S multiplizieren (werden von der
Transformation nicht erfasst). Logo: `images/dorfladen-logo.png` (1002 × 300). Fallback S = 2, wenn `toBlob` null liefert.
Einzelflyer: Editor ruft wie bisher mit S = 1; `_buildZoneHtml` rechnet mit logischen 794 × 1123.

## Technik Querformat

Neuer Zeichner `drawAngebotQuer(data, items, images, opts)` mit den Farben aus `getOfferTheme('plakat', cfg)`:
`bgColor`, `cardBg`, `cardBorder`, `textColor`, `detailsColor`, `tagColor`, `titleColor`, `headerBg`, `headerAccent`.
Maße 800 × 480 logisch, Faktor 2 → 1600 × 960. Übersicht 3 × 2, Einzelbild Artikelbild links (45 %), Text rechts.

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
Maße aus dem Anzeigeprofil, Faktor 2. Übersicht nach F15, Einzelbild Artikelbild links (45 %), Text rechts.
# Erweiterung: native Anzeigeprofile (F7, F12, F13)

1. Gemeinsame Profildefinition, Persistenz und Zielmaße aus `KWerbebilder` in
   `static-site/js/kiosk-werbebilder.js`; CMS-Dialog regeneriert bei Profilwechsel.
2. `static-site/cms.js`: Druck-Einpassen durch native Wochenplanzeilen ersetzen; alle Texte
   vor dem Zeichnen auf Breite/Höhe prüfen. Nicht darstellbare Daten explizit melden.
3. Aktionslayout aus Profilhöhe ableiten; Produkttext, Preis, Stattpreis und Gültigkeit
   in getrennten Bereichen. Gemeinsame Umbruch-/Fitprüfung statt stiller Kürzung.
4. Bestehende HD-Druckerzeugung, FTP und Relais bleiben unverändert.
5. Playwright prüft Profile, native Schriftgrößen, Inhalte, Überlauf und Regressionen
   auf vier Viewports. Hardwareprüfung bestätigt anschließend die vermuteten 800 × 462.
   Kein produktiver Upload und kein Merge ohne Freigabe.
# Korrektur F14: größere Produktfotos

`waageBildZeichnen` bestimmt die sichtbaren Alpha-Grenzen des bereits freigestellten
Canvas und passt diesen Ausschnitt ohne Druck-Vergrößerungslimit ein. Keine Änderung
am gemeinsamen Freisteller oder an Drucklayouts. Leere Bilder überspringen; Lesefehler
explizit melden. `waageUebersicht` nutzt nach F15 die volle seitliche Bildspalte.
Playwright prüft tatsächliche drawImage-Quell-/Zielrechtecke mit gepolsterten und kleinen
Testbildern sowie bestehende Textkollisionsfälle auf allen vier Viewports.
# Dauerwerbung und Vollbild: alle Artikel auf einer seitlichen Übersicht (F15)

Vor dem Zeichnen Rasterkandidaten anhand tatsächlicher Textmessung prüfen.
Zwei Spalten bevorzugen, solange die Mindestschriftgrößen passen; bei Bedarf bis zu vier.
Kompakte Textgruppe vertikal zentrieren, Bildspalte links (36 Prozent), Rest Text.
Eine gemeinsame Übersicht statt Seitenlauf bei beiden Werbearten; Einzelartikel unverändert.
Mindestgrößen prüfen und bei Überlauf vor Upload explizit abbrechen.
Tests: sechs/acht Artikel, hohe Artikelzahl, kleine Werbefläche, tatsächliche Zeichenrechtecke,
Textabstände und dieselbe Einzelübersicht im Vollbild auf vier Viewports.

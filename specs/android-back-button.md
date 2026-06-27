# AK-UI-36: Android Zurück-Button für alle Overlays

## Ziel
Der Android-Zurück-Button (Hardware/Gesture) soll auf allen Seiten offene Modals/Overlays schließen, statt die Seite zu verlassen.

## Prinzip
- Beim Öffnen eines Overlays: `history.pushState({overlay:'name'}, '')` → erzeugt einen Dummy-History-Eintrag
- Beim Schließen per UI (X-Button, Abbrechen): `history.back()` → entfernt den Dummy-Eintrag
- Beim Zurück-Button: `popstate`-Event → Overlay wird geschlossen (kein `history.back()` nötig, da bereits konsumiert)

## Betroffene Seiten

| Seite | Overlays | Implementierung |
|---|---|---|
| Homepage + alle pwa.js-Seiten | Nav, Lightbox, News, Popups, Hilfe, Push, PWA-Banner | `pwa.js` (`pushPopupState`/`removePopupState`) |
| CMS | Tabs, Modal, Kachel-Editor | `cms.js` (eigene pushState/popstate) |
| Shop | Cart, Auth, Confirm, Slot-DD, Cat-DD, Img-Popup | `shop.html` (`getOpenOverlay`/`closeTopOverlay`) |
| Shop-Admin | Order Detail | `shop-admin.html` (pushState bei selectOrder) |
| Hilfe-Popup | Hilfe-Overlay | `hilfe-popup.js` |
| **Kiosk** | 6 Modals (order, kunde, edit-kunde, pack, detail, help) | `openModal`/`closeModal` + `_modalStack` |
| **Pack** | Camera-Overlay, Kasse-Overlay | pushState in `openCamera`/`showKasseModal` |
| **Shop-Freigabe** | Image-Upload-Overlay | pushState in `openImageDialog` |
| **Lunch-Admin** | Storno-Dialog | pushState in `showStornoDialog` |
| **Mittagstisch-Bestellen** | Success-Overlay | pushState nach Bestellerfolg |
| **Fleisch-Bestellen** | Cart-Drawer, Bestätigungs-Ansicht | pushState in `fmOpenCart`/`showConfirmation` |

## Kiosk-Implementierung (Detail)
- `_modalStack[]` trackt offene Modals als Stack
- `openModal(id)` → `push` + `pushState`
- `closeModal(id, viaBack)` → `splice` + nur `history.back()` wenn NICHT via Back
- `popstate`-Listener prüft `_getOpenOverlay()` → schließt oberstes Modal

## Testfälle
Siehe `tests/TESTCASES.md` → AK-UI-36

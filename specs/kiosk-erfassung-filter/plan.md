# Erfassung und Filter im Kiosk — Plan

**Status:** in Umsetzung · **Last updated:** 2026-09-11

## Leitentscheidungen

1. **Zeile auffrischen statt alles neu zeichnen.** Der eigentliche Fehler ist
   nicht der Editor, sondern dass `render()` bei jedem Tastendruck das ganze
   Panel neu schreibt und dabei den Rollstand verliert. `render()` merkt sich
   deshalb den `scrollTop` der `.k-liste` und stellt ihn wieder her — dieselbe
   Lehre wie beim Getränke-Mengenfeld.
2. **Die Zeile anlegen, nicht den Editor.** `inSicht()` heißt künftig
   `zeigeGanz(key)` und richtet sich nach der `.mb-row`. Damit bleibt der
   Artikelname sichtbar, egal wie hoch die Erfassung ist.
3. **Ein gemeinsamer Filter-Baustein für alle drei Reiter.** Markup und CSS
   liegen einmal in `kiosk-neu.css` (`.k-filterzeile`, `.k-filterknopf`,
   `.k-filterblatt`); jedes Fachmodul liefert nur seine drei Umfänge samt
   Trefferzahlen. So kann die Darstellung nicht auseinanderlaufen.
4. **Höhe entscheidet per CSS, nicht per JavaScript.** Beide Varianten stehen
   im Markup; `@media (min-height: …)` blendet die jeweils passende ein. Das
   wirkt sofort beim Drehen des Geräts und braucht keinen Neuaufbau.
5. **Keine Übernahme beim Verlassen des Feldes.** Sie legte Portionen an, die
   niemand wollte. Sichtbarer Haken plus Eingabetaste sind eindeutig.

## Dateien (Change-Map)

| Datei | Änderung |
| --- | --- |
| `static-site/js/kiosk-metzger-bestellung.js` | `editor()` neu (zwei Reihen, kein Bestätigungsknopf, kein „Fertig", Freifeld mit Haken); `zeile()` mit `+`/`−`-Umschalter; `render()` hält den Rollstand; `inSicht()` → `zeigeGanz()`; `_alleArtikel` → `_umfang`; Filter-Baustein im Kopf; `mb-umfang` am Listenende entfällt; Filter aus `detailBlatt()` entfernt. |
| `static-site/js/kiosk-baecker.js` | `_alleArtikel` → `_umfang` (drei Umfänge); Filter-Baustein im Kopf; `bk-umfang` am Listenende entfällt. |
| `static-site/js/kiosk-getraenke.js` | Filter aus `detailBlatt()` in den Kopf; `_filter` bleibt; Beschriftung „Nur bestellte" → „Nur erfasste". |
| `static-site/css/kiosk-neu.css` | Neuer Abschnitt 16: Filter-Baustein (Zeile, Trichter-Knopf, Auswahlblatt) mit den Höhenschwellen; Erfassungszeile, vak-Kästchen, Freifeld mit Haken. |
| `tests/kiosk-erfassung-filter.spec.js` | Neuer Wächter über alle Test Cases. |
| Bestandssuiten | Anpassen, wo sich Bedienwege verschieben. |

## Gemeinsamer Filter-Baustein

```html
<div class="k-suchzeile">
  <input type="search" …>
  <button class="k-filterknopf" …><i data-lucide="list-filter"></i>
    <span class="punkt"></span></button>   <!-- nur < 700 px -->
</div>
<div class="k-filterzeile">                <!-- nur ≥ 700 px -->
  <button data-umfang="ueblich" class="on">Übliche <span class="anz">57</span></button>
  <button data-umfang="alle">Alle <span class="anz">102</span></button>
  <button data-umfang="best">Nur erfasste <span class="anz">3</span></button>
</div>
<div class="k-filterblatt" hidden> … dieselben drei Knöpfe … </div>
```

## Testansatz

- Neuer Wächter `tests/kiosk-erfassung-filter.spec.js`, zuerst geschrieben:
  Er muss den Ist-Zustand als Fehlschlag melden.
- Viewports: die drei Pflichtgrößen plus 360 × 640 als härtester Fall.
- Danach die drei Bestandssuiten grün ziehen.

## Risiken

- **Die Bestandssuiten hängen an `_alleArtikel`.** Beim Bäcker prüft
  TC-F10-06 die zwei Umfänge; das ist anzupassen.
- **`kachel()` legt im Änderungsmodus bisher nicht an.** Ohne den Knopf
  „Ändern" muss jede Änderung sofort durchschreiben, sonst geht sie verloren.
- **Der Positions-Hinweis** darf auf niedrigen Schirmen nicht unerreichbar
  werden (F6) — der Knopf „Hinweis …" ist Pflicht, nicht Zierde.

# App-Anleitung unter /app — Implementation Plan

**Spec:** [spec.md](./spec.md)

**Status:** Angenommen

## Constitution Check

- [x] Spec vorhanden, keine offenen `[NEEDS CLARIFICATION]`
- [x] Keine cloud-eigenen Schnittstellen — reines statisches HTML/JS
- [x] Keine Geheimnisse im Verzeichnisbaum
- [x] Folgt den bestehenden Ordnerregeln (`static-site/`, `specs/`, `tests/`)

## Technical Approach

Eine statische Seite, die **alle acht Wege vollständig im HTML** trägt. Das
JavaScript blendet nur aus, was gerade nicht passt. Das hat drei Vorteile:
Die Seite bleibt ohne Skript lesbar, Suchmaschinen erfassen sie, und ein
Ausfall des Skripts macht sie nicht unbrauchbar — er macht sie nur länger.

Die Erkennung läuft einmal beim Laden und schreibt eine Kennung in die
Adresse. Damit ist jeder Weg verlinkbar (`/app#ios-safari`) und am Telefon
weiterzugeben.

Der Live-Status stützt sich auf vier Quellen, die der Browser ohnehin führt:
`display-mode: standalone`, `navigator.standalone`, `Notification.permission`
und `pushManager.getSubscription()`. Gehandelt wird nur, wo der Browser es
zulässt — ein Knopf, der nichts bewirkt, ist schlimmer als keiner.

## Key Decisions

| Entscheidung | Erwogen | Wahl und Begründung |
| --- | --- | --- |
| Abbildungen | Echte Screenshots vs. nachgezeichnete SVG | **SVG.** Fremde Screenshots von iOS/Android-Menüs sind urheberrechtlich nicht frei; eigene könnte ich nicht aufnehmen. SVG ist klein, scharf auf jedem Schirm, im Seitenstil und später gegen Fotos tauschbar. |
| QR-Code | Bibliothek zur Laufzeit vs. festes SVG | **Festes SVG.** Die Adresse ändert sich nie. Eine Bibliothek wäre Ballast und eine Fehlerquelle offline. |
| Sichtbarkeit der Wege | Nur den passenden ausliefern vs. alle ausliefern | **Alle ausliefern, per Skript filtern.** Ohne Skript bleibt die Seite vollständig; das ist bei einer Hilfeseite entscheidend, denn sie wird gerade dann aufgerufen, wenn etwas klemmt. |
| Zustand merken | `localStorage` vs. Adresse (`#hash`) | **Adresse.** Ein Weg lässt sich weitergeben und drucken. Ein gemerkter Zustand würde beim zweiten Besuch am falschen Gerät irreführen. |
| iPadOS-Erkennung | Nur `userAgent` vs. zusätzlich `maxTouchPoints` | **Mit `maxTouchPoints`.** iPadOS meldet sich als Mac. Ohne diese Prüfung bekämen iPad-Nutzer die Mac-Anleitung — und damit einen Weg, den es auf ihrem Gerät nicht gibt. |
| Sackgassen | Schritte zeigen vs. weiterleiten | **Weiterleiten.** Auf dem iPhone führen Drittbrowser nicht zuverlässig zum Ziel, Firefox auf Android legt nur eine Verknüpfung an. Schritte zu zeigen, die ins Leere laufen, beschädigt das Vertrauen in die ganze Anleitung. |

## Architecture

```
/app.html
  ├─ <header> Seitengerüst wie oeffnungszeiten.html
  ├─ #app-status        Statusband, vom Skript gefüllt
  ├─ #app-wahl          Gerätewahl → Browserwahl
  ├─ .app-weg[data-weg] ×8   alle Wege, je mit Schritten und Abbildung
  ├─ #app-arten         die vier Benachrichtigungsarten [data-art]
  ├─ #app-hilfe         häufige Stolpersteine
  └─ #app-teilen        QR-Code, Adresse, Druckknopf

js/app-anleitung.js
  erkenne()   → Kennung aus userAgent/maxTouchPoints
  zeige(weg)  → genau einen Weg sichtbar schalten, Adresse pflegen
  status()    → standalone / permission / subscription auswerten
  knoepfe()   → beforeinstallprompt binden, pushToggle() aufrufen

js/pwa.js (Änderung)
  pwaInstall(): alert() → Weiterleitung auf /app
  CAT_LABELS/ICONS/DESC + Kategorienliste: kontakt ergänzen
```

Das Skript hängt an `DOMContentLoaded` und ist gegen fehlende Bausteine
abgesichert: Fehlt `pwa.js` (etwa weil der Service Worker eine alte Fassung
hält), bleiben die Anleitungstexte trotzdem bedienbar.

## File-Level Change Map

| Pfad | Änderung | Zweck |
| --- | --- | --- |
| `static-site/app.html` | neu | Die Seite mit allen acht Wegen |
| `static-site/js/app-anleitung.js` | neu | Erkennung, Umschaltung, Status, Knöpfe |
| `static-site/css/app-anleitung.css` | neu | Gestaltung und `@media print` |
| `static-site/images/anleitung/*.svg` | neu | ~14 nachgezeichnete Abbildungen |
| `static-site/images/anleitung/qr-app.svg` | neu | QR-Code auf `/app` |
| `staticwebapp.config.json` | edit | Route `/app` → `/app.html` |
| `static-site/js/pwa.js` | edit | `alert()` ersetzen (F9); Kategorie `kontakt` (F7) |
| `static-site/index.html` | edit | Verweis auf die Anleitung (F9) |
| `static-site/sw.js` | prüfen | Neue Seite wird ausgeliefert |
| `tests/app-anleitung.spec.js` | neu | Wächter für F1–F9 |
| `specs/app-anleitung/{spec,plan,tasks}.md` | neu | SDD-Unterlagen |

## Test Strategy

- **E2E (Playwright):** Der Schwerpunkt. Die Erkennung wird über
  `userAgent`-Vortäuschung je Weg geprüft, der Status über vorgetäuschte
  `matchMedia`- und `Notification`-Werte.
- **Ohne JavaScript:** eigener Kontext mit `javaScriptEnabled: false` — prüft
  TC-F2-02.
- **QR-Code:** Der erzeugte Code wird beim Anlegen mit einem Decoder
  gegengelesen; der Test prüft die Einbindung.
- **Mapping:** Jeder Testfall `TC-Fn-xx` aus der Spec hat genau einen Test.

Aufruf (kein `npx` in dieser Umgebung):

```
python -m http.server 8811 --bind 127.0.0.1   # aus static-site/
$env:TEST_URL='http://127.0.0.1:8811'
node node_modules\@playwright\test\cli.js test tests/app-anleitung.spec.js
```

`test.use({ serviceWorkers: 'block' })` ist zwingend — sonst beantwortet der
Service Worker die Aufrufe aus seinem Zwischenspeicher.

## Risks & Mitigations

| Risiko | Wirkung | Gegenmaßnahme |
| --- | --- | --- |
| Die Schritte veralten, wenn Apple oder Google ihre Menüs ändern | mittel | Je Weg ein Datumsstempel „geprüft im September 2026"; Abbildungen schematisch statt pixelgetreu, damit kleine Änderungen sie nicht falsch machen |
| Umlaute zerschossen durch PowerShell-Umschreibungen | hoch | Bestehende Dateien ausschließlich über das `edit`-Werkzeug ändern, nie `Get-Content -Raw \| Set-Content -Encoding UTF8` |
| Service Worker liefert eine alte Fassung | mittel | `sw.js` prüfen; Tests mit blockiertem Service Worker; nach dem Ausrollen live gegenprüfen |
| Erkennung greift daneben | mittel | Die Wahl bleibt immer sichtbar; bei Unklarheit der häufigste Fall und ein Hinweis „anderes Gerät?" |
| Massen-Eingriff ins Mobil-Menü aller Seiten | mittel | Vorerst nur Startseite, Installationsbanner und Fußzeile |

## Rollout

Keine Datenbankänderung, keine neue Abhängigkeit, kein API-Eingriff. Die
Änderung an `js/pwa.js` ist rückwärtsverträglich: Bestehende Abos behalten
ihre Kategorien, `kontakt` wird nur sichtbar gemacht.

Nach grünen Tests committen, Deploy über die bestehende Azure-Static-Web-Apps-
Kette abwarten, danach `/app` live auf Telefonmaß und am Rechner prüfen.

# Dorfladen – Entwicklungskonventionen

> Diese Regeln gelten projektübergreifend für **alle** Änderungen am Code.
> Jede Spec und jeder PR muss diese Konventionen einhalten.

---

## 1. Funktionsbeschreibung vor Code-Änderung (Pflicht)

**Vor jeder Code-Änderung muss eine detaillierte Funktionsbeschreibung erstellt oder aktualisiert werden.**

### Pflicht-Schritte VOR einer Änderung:
1. **Funktionsbeschreibung** in `specs/*-funktionen.md` erstellen oder aktualisieren:
   - Was macht das Feature? Wie bedient man es? Welche Regeln gelten?
   - Alle Bildschirme, Buttons, Dialoge, Fehlerfälle beschreiben
   - Dient als Basis für spätere Kundendokumentation
2. **Benutzer muss die Funktionsbeschreibung bestätigen** bevor Code geschrieben wird
3. Erst nach Bestätigung: Code implementieren

### Funktionsdoku-Dateien:
| Datei | Bereich |
|-------|---------|
| `specs/kiosk-funktionen.md` | Kiosk (Mittagstisch, Online-Shop, Stammkunden, Social) |
| _weitere nach Bedarf_ | Shop-Admin, Bestellstatus, CMS, etc. |

### Nachholpflicht:
- Fehlende Funktionsbeschreibungen müssen **nachträglich** erstellt werden
- Bei jeder Änderung an einem Bereich ohne Funktionsdoku: zuerst Doku erstellen

---

## 2. Testpflicht bei Änderungen

**Bei jeder Code-Änderung müssen die zugehörigen Testcases aktualisiert werden.**

### Pflicht-Schritte nach einer Änderung:
1. **Playwright-Tests** in `tests/*.spec.js` anlegen oder aktualisieren
2. **TESTCASES.md** (`tests/TESTCASES.md`) ergänzen:
   - Neue Testfälle dokumentieren (Aktion / Prüfung / Erwartung)
   - Testlauf-Tabelle aktualisieren
   - Fehler-Log bei Bugfixes ergänzen
3. **Spec** in `specs/*.md` aktualisieren:
   - Akzeptanzkriterien ergänzen / abhaken
   - Anforderungen bei Änderungen nachziehen
4. **Tests ausführen** – betroffene Tests müssen nach der Änderung laufen:
   - Gezielt: `npx playwright test tests/<file>.spec.js -g "Testname"`
   - Ergebnis in TESTCASES.md dokumentieren (Datum, Ergebnis, ggf. Fehler)

### Keine Fallbacks – Funktionalität muss funktionieren:
- **Fehlende Abhängigkeiten (Datenbankfelder, APIs, Configs) müssen angelegt werden** – nicht per Fallback/Default umgangen
- Ein `try/catch` mit stiller Rückgabe eines Defaults ist **kein Fix**, sondern versteckt den Fehler
- Wenn ein Feature Dataverse-Felder, API-Endpunkte oder Konfiguration braucht, müssen diese existieren und funktionieren
- **Fallbacks sind keine erfolgreichen Tests** – ein Test der nur prüft ob kein Fehler fliegt, aber nicht ob die echten Daten ankommen, ist wertlos
- Tests müssen die **tatsächliche Funktionalität** verifizieren: echte API-Antworten, echte Daten, korrekte Anzeige

### Mit validen Daten testen:
- **Nie Fake-/Dummy-Daten in Produktions-Dataverse schreiben** (z.B. "Testgericht Datum", "Datum-Test ISO")
- Falls Testdaten angelegt wurden, **sofort nach dem Test wieder löschen** (Script: `scripts/delete-test-orders.py`)
- Tests verwenden echte, existierende Daten oder testen nur Struktur/API-Verhalten

### Testcase-Pflege – regelmäßig gegen Anforderungen prüfen:
- **Vor jedem Testlauf prüfen:** Sind die Testcases noch aktuell? Passen sie zu den aktuellen Anforderungen?
- **Obsolete Tests entfernen** – Tests die veraltete Funktionalität prüfen verfälschen die Ergebnisse
- **Nur betroffene Tests ausführen** – bei einer Änderung nur die Tests der geänderten Anforderung laufen lassen
- **Gesamte Suite nur auf explizite Anforderung** des Users, nicht automatisch
- Playwright gezielt: `npx playwright test tests/kiosk.spec.js -g "Testname"`

### PowerShell-Befehle korrekt formulieren:
- `powershell -ExecutionPolicy Bypass -Command` verschluckt `$env:VAR = 'value'` → **die Variable wird nicht gesetzt**
- **Lösung:** Immer `.ps1`-Dateien verwenden, nie Inline-Befehle mit `$env:` in `-Command`
- Pattern für env + Befehl: `powershell -ExecutionPolicy Bypass -File scripts/run-with-secret.ps1 scripts/myscript.py`
- Pattern für Tests: `powershell -ExecutionPolicy Bypass -File test-live.ps1 tests/kiosk.spec.js -g "Testname"`

---

## 3. Icons: Lucide Icons verwenden

**Alle UI-Icons müssen [Lucide Icons](https://lucide.dev/) verwenden** – keine Emoji-Icons (🔄, 📦, etc.) in produktiven UI-Elementen.

### Regeln:
- Lucide via CDN einbinden: `<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>`
- Icons per `<i data-lucide="icon-name"></i>` einfügen, danach `lucide.createIcons()` aufrufen
- Konsistente Größe: `width="18" height="18"` für Inline, `width="24" height="24"` für Buttons
- Farben über CSS `color` steuern, nicht inline

### Ausnahmen:
- Emojis in reinem Text / Toast-Nachrichten sind erlaubt (z.B. Bestätigungsmeldungen)
- Druckansichten (Küchenliste, Beipackzettel) dürfen Emojis verwenden

### Migration:
- Bestehende Emoji-Icons werden schrittweise migriert (nicht sofort alles umbauen)
- Bei jeder Änderung an einer Datei: betroffene Emojis auf Lucide umstellen

---

## 4. UI-Design: Verkäuferinnen-Perspektive

**Das Kiosk-UI wird aus der Perspektive der Verkäuferin designt:**
- Labels sind handlungsorientiert ("Zum Packen", "Warten auf Abholung") statt technisch ("Status 1", "In Bearbeitung")
- Keine Management-KPIs (Umsatz) in der operativen Ansicht
- Überfällige/dringende Aufgaben visuell hervorheben (rot, ⚠️)
- "Alles erledigt"-Indikator wenn keine offenen Aufgaben

---

## 5. Popups & Overlays: Hintergrund-Scroll sperren

**Bei jedem Popup/Overlay/Modal muss der Hintergrund-Scroll gesperrt werden.**

### Regeln:
- Beim **Öffnen** eines Overlays: `body` bekommt `overflow:hidden` + `position:fixed` (verhindert iOS-Scroll-Bug)
- Beim **Schließen**: Scroll-Position wiederherstellen
- Gilt für **alle** Seiten: `index.html`, `shop.html`, `kiosk.html`, etc.
- Standard-Pattern: `dlLockScroll()` beim Öffnen, `dlUnlockScroll()` beim Schließen

### Implementierung:
```css
body.overlay-open { overflow: hidden; position: fixed; width: 100%; top: var(--scroll-y, 0); }
```
```js
function dlLockScroll() {
  document.documentElement.style.setProperty('--scroll-y', '-' + window.scrollY + 'px');
  document.body.classList.add('overlay-open');
}
function dlUnlockScroll() {
  document.body.classList.remove('overlay-open');
  var y = parseInt(document.documentElement.style.getPropertyValue('--scroll-y') || '0') * -1;
  document.documentElement.style.removeProperty('--scroll-y');
  window.scrollTo(0, y);
}
```

### Checkliste bei neuem Popup:
- [ ] `dlLockScroll()` bei jedem Open-Trigger (Button, Link, JS)
- [ ] `dlUnlockScroll()` bei Close-Button UND Overlay-Backdrop-Klick
- [ ] Testen auf Mobile (iOS Safari hat eigenes Scroll-Verhalten)

---

## 6. Sticky Headers (nicht scrollbar)

**Seiten-Header (Navigation, Titel) müssen immer sichtbar bleiben und dürfen nicht mit dem Content scrollen.**

### Regeln:
- Header mit `position: sticky; top: 0; z-index: 100` fixieren
- Sekundäre Banner (Countdown, Status) direkt darunter sticky: `position: sticky; top: <header-höhe>px; z-index: 99`
- Der scrollbare Content beginnt erst unter den fixierten Elementen
- Gilt für **alle** Seiten: Shop, Kiosk, Fleisch-Bestellen, CMS, etc.
- Kein `position: relative` auf Header-Elemente setzen (verhindert sticky)

### Begründung:
- Mobile-Nutzer verlieren sonst die Orientierung
- Zurück-Button und Seitentitel müssen immer erreichbar sein
- Countdown/Deadline-Info muss während des Scrollens sichtbar bleiben

---

## 7. Commit-Konventionen

- `feat:` – Neue Funktionalität
- `fix:` – Bugfix
- `test:` – Testcases hinzufügen/aktualisieren
- `docs:` – Dokumentation/Specs
- `refactor:` – Code-Umbau ohne Funktionsänderung

---

## 8. Branch-Strategie

| Branch | Zweck |
|---|---|
| `main` | Produktion |
| `dev` | Test-Umgebung |
| `feature/bestellsystem` | Bestellsystem-Entwicklung (eigene SWA) |

- Nie direkt auf `main` committen
- Feature-Branches von `feature/bestellsystem` abzweigen

---

## 9. Test-Zugangsdaten

| Zugang | Wert |
|---|---|
| CMS Passwort | `DorfladenCMS!` |
| Live-URL (Bestellsystem) | `https://witty-island-064f9d903.7.azurestaticapps.net` |
| Live-URL (Produktion) | `https://kind-pebble-072605b03.7.azurestaticapps.net` |

---

## 10. Responsive UI-Test-Pflicht

**Jede UI-Änderung muss auf allen drei Gerätekategorien getestet werden, bevor sie committed wird.**

### Geräte-Breakpoints:

| Gerät | Breite | Typisch |
|---|---|---|
| **Mobile** | ≤ 480px | iPhone SE/14, Android |
| **Tablet/iPad** | 481–1024px | iPad Mini/Air/Pro |
| **Desktop** | > 1024px | Laptop, Monitor |

### Checkliste bei jeder UI-Änderung:

- [ ] **Mobile** — Eingabefelder min. 40px Höhe, Touch-Targets min. 44px, kein horizontaler Overflow
- [ ] **iPad** — Formulare und Tabellen brechen sauber um, keine abgeschnittenen Elemente
- [ ] **Desktop** — Layout nutzt verfügbaren Platz, keine unnötig großen Lücken

### Testen mit Browser-DevTools:

1. Chrome/Edge DevTools öffnen (F12)
2. Device Toolbar aktivieren (Strg+Shift+M)
3. Mindestens testen: **iPhone SE** (375px), **iPad Air** (820px), **Desktop** (1280px)

### Touch-Mindestgrößen:

- Eingabefelder: `min-height: 40px`, `padding: 10px 12px`, `font-size: 14px`
- Buttons: `min-height: var(--touch-min, 44px)`
- Checkboxen: `width: 20px; height: 20px`
- Klickbare Icons/Labels: min. 32×32px Touch-Area

# Dorfladen – Entwicklungskonventionen

> Diese Regeln gelten projektübergreifend für **alle** Änderungen am Code.
> Jede Spec und jeder PR muss diese Konventionen einhalten.

---

## 1. Testpflicht bei Änderungen

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

## 2. Icons: Lucide Icons verwenden

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

## 3. UI-Design: Verkäuferinnen-Perspektive

**Das Kiosk-UI wird aus der Perspektive der Verkäuferin designt:**
- Labels sind handlungsorientiert ("Zum Packen", "Warten auf Abholung") statt technisch ("Status 1", "In Bearbeitung")
- Keine Management-KPIs (Umsatz) in der operativen Ansicht
- Überfällige/dringende Aufgaben visuell hervorheben (rot, ⚠️)
- "Alles erledigt"-Indikator wenn keine offenen Aufgaben

---

## 4. Commit-Konventionen

- `feat:` – Neue Funktionalität
- `fix:` – Bugfix
- `test:` – Testcases hinzufügen/aktualisieren
- `docs:` – Dokumentation/Specs
- `refactor:` – Code-Umbau ohne Funktionsänderung

---

## 5. Branch-Strategie

| Branch | Zweck |
|---|---|
| `main` | Produktion |
| `dev` | Test-Umgebung |
| `feature/bestellsystem` | Bestellsystem-Entwicklung (eigene SWA) |

- Nie direkt auf `main` committen
- Feature-Branches von `feature/bestellsystem` abzweigen

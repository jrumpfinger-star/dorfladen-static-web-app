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

### Testlauf nach Fix:
- **Nur fehlgeschlagene Tests erneut ausführen**, nicht die gesamte Suite
- Playwright: `npx playwright test --last-failed` oder gezielt die betroffene Datei
- Gesamte Suite nur bei Release-Kandidaten oder großen Refactorings

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

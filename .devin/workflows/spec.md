---
description: Spec-Driven Development – Vor jeder Implementierung Spec lesen, bei neuen Features Spec schreiben
---

## Ablauf

### 1. Spec lesen (vor jeder Änderung)
// turbo
Lies die relevante Spec-Datei aus `specs/` bevor du Code anfasst:
- Finde die passende Spec unter `specs/*.md`
- Falls keine existiert → Schritt 2
- Falls vorhanden → lies sie komplett, prüfe Akzeptanzkriterien

### 2. Spec schreiben (bei neuem Feature oder fehlendem Spec)
Erstelle eine neue Datei unter `specs/<bereich>-<feature>.md` mit folgendem Format:

```markdown
# <Feature-Titel>

## Kontext
Warum wird das gebraucht? Was ist der aktuelle Zustand?

## Anforderungen
- [ ] Anforderung 1
- [ ] Anforderung 2

## Betroffene Dateien
- `static-site/datei.html`
- `api/endpoint/__init__.py`

## Akzeptanzkriterien
- [ ] Kriterium 1 (testbar)
- [ ] Kriterium 2 (testbar)

## Nicht-Ziele
Was wird NICHT gemacht.

## Status
- [ ] Spec reviewed
- [ ] Implementierung
- [ ] Validierung gegen Akzeptanzkriterien
```

Zeige dem User die Spec und warte auf Bestätigung bevor du implementierst.

### 3. Implementieren
Setze die Anforderungen aus der Spec um. Referenziere die Spec-Datei in Commit-Messages.

### 4. Tests schreiben / aktualisieren (PFLICHT bei jeder Änderung!)
Dies ist NICHT optional – es gehört zur Implementierung dazu:
- Playwright-Tests in `tests/*.spec.js` anlegen oder anpassen
  - Test-IDs im Format `T-XX-01 (AK-YY-ZZ)` mit Referenz auf Akzeptanzkriterium
  - Jedes AK muss mindestens einen zugehörigen Test haben
- `tests/TESTCASES.md` aktualisieren:
  - Neuen Abschnitt mit Aktion / Prüfung / Erwartung für jeden Test
  - Spec-Referenz im Header: `> Spec: specs/<datei>.md → AK-XX-YY`
  - Testlauf-Tabelle mit Datum und Ergebnissen ergänzen
  - Fehler-Log bei Bugfixes ergänzen

### 5. Tests ausführen
// turbo
Betroffene Tests gegen die Live-Umgebung ausführen (NUR betroffene, nicht die ganze Suite):
```
powershell -ExecutionPolicy Bypass -File test-live.ps1 tests/<datei>.spec.js -g "<Testgruppe>"
```
Ergebnisse in TESTCASES.md Testlauf-Tabelle eintragen.

### 6. Validieren
Nach der Implementierung:
- Gehe jedes Akzeptanzkriterium durch
- Markiere erledigte Kriterien in der Spec als `[x]`
- Aktualisiere den Status-Bereich
- Falls ein Kriterium nicht erfüllt → fixe es bevor du weitermachst

### 7. Commit
Commit-Message-Format: `feat(<bereich>): <beschreibung> [spec: <spec-datei>]`

---

## Checkliste (vor jedem Commit prüfen)
- [ ] Spec gelesen oder geschrieben?
- [ ] Akzeptanzkriterien definiert?
- [ ] Playwright-Tests mit AK-Referenz geschrieben?
- [ ] TESTCASES.md aktualisiert (Testcases + Testlauf + ggf. Fehler-Log)?
- [ ] Tests ausgeführt und bestanden?
- [ ] Spec-Checkboxen aktualisiert?

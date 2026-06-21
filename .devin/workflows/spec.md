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

### 4. Validieren
Nach der Implementierung:
- Gehe jedes Akzeptanzkriterium durch
- Markiere erledigte Kriterien in der Spec als `[x]`
- Aktualisiere den Status-Bereich
- Falls ein Kriterium nicht erfüllt → fixe es bevor du weitermachst

### 5. Commit
Commit-Message-Format: `feat(<bereich>): <beschreibung> [spec: <spec-datei>]`

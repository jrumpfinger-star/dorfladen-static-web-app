# Push-Benachrichtigung: Tagesinfo statt Mittagstisch/Angebote

## Kontext
Aktuell gibt es drei Push-Kategorien: **Mittagstisch**, **Angebote**, **News/Aktuelles**.
Die Tagesinfo (Social-Post auf der Homepage) enthält bereits alle relevanten Tagesinformationen 
(Mittagstisch, Angebote, Aktionen). Daher sollen "Mittagstisch" und "Angebote" durch eine 
einzige Kategorie **"Tagesinfo"** ersetzt werden. Wenn eine neue Tagesinfo veröffentlicht wird, 
erhalten alle Tagesinfo-Abonnenten automatisch eine Push-Benachrichtigung.

## Anforderungen

### Frontend – Benachrichtigungs-Dialog (pwa.js)
- [ ] Kategorie "Mittagstisch" entfällt
- [ ] Kategorie "Angebote" entfällt
- [ ] Neue Kategorie "Tagesinfo" mit Icon 📋, Label "Tagesinfo", Beschreibung "Tägliche Infos, Mittagstisch & Angebote"
- [ ] Kategorie "News / Aktuelles" bleibt erhalten
- [ ] Default bei Neuregistrierung: beide Kategorien aktiv (`['tagesinfo','news']`)
- [ ] Bestehende Abonnenten mit `mittagstisch` oder `angebote` → automatisch auf `tagesinfo` migrieren (beim nächsten Öffnen des Settings-Dialogs)

### Frontend – Social-Poster (social-poster.js)
- [ ] Nach erfolgreichem `socialPublishTagesinfo()` → Push an Kategorie `tagesinfo` senden
- [ ] Push-Inhalt: Titel = Post-Titel (oder "Tagesinfo"), Body = Freitext-Auszug oder "Neue Tagesinfo verfügbar!", URL = "/"
- [ ] Kein Push bei geplanten Posts (mit `ziel_datum`) – nur bei sofortiger Veröffentlichung

### Backend – push-subscribe API
- [ ] `ALL_CATEGORIES` aktualisieren: `["tagesinfo", "news"]`
- [ ] Bestehende Subscriptions mit alten Kategorien beim Lesen automatisch migrieren

### Backend – push-send API
- [ ] Keine Änderungen nötig (category-Filter funktioniert bereits generisch)

### CMS – Push-Verwaltung (cms.html + cms.js)
- [ ] Kategorie-Dropdown: "Mittagstisch" und "Angebote" durch "Tagesinfo" ersetzen
- [ ] Quick-Template für "mittagstisch" → auf "tagesinfo" umstellen
- [ ] catLabels aktualisieren

## Betroffene Dateien
- `static-site/js/pwa.js` – Kategorien-Definition, Settings-Dialog, Default-Kategorien
- `static-site/js/social-poster.js` – Push nach Tagesinfo-Veröffentlichung
- `static-site/cms.html` – Kategorie-Dropdown
- `static-site/cms.js` – catLabels, Quick-Templates, Queue-Verarbeitung
- `api/push-subscribe/__init__.py` – ALL_CATEGORIES
- `specs/push-tagesinfo.md` – diese Spec

## Akzeptanzkriterien
- [ ] AK-PT-01: Benachrichtigungs-Dialog zeigt "Tagesinfo" und "News / Aktuelles" (kein Mittagstisch/Angebote)
- [ ] AK-PT-02: Neuregistrierung setzt Default-Kategorien `['tagesinfo','news']`
- [ ] AK-PT-03: Beim Veröffentlichen einer Tagesinfo wird automatisch Push an `tagesinfo`-Abonnenten gesendet
- [ ] AK-PT-04: CMS Kategorie-Dropdown zeigt "Tagesinfo" statt "Mittagstisch"/"Angebote"
- [ ] AK-PT-05: Backend ALL_CATEGORIES ist `["tagesinfo", "news"]`
- [ ] AK-PT-06: Bestehende Subscriber mit `mittagstisch`/`angebote` werden beim Öffnen des Dialogs automatisch auf `tagesinfo` migriert

## Nicht-Ziele
- Kein automatischer Push bei geplanten Posts (ziel_datum) – nur bei sofortiger Veröffentlichung
- Keine E-Mail-Benachrichtigungen
- Keine Änderung am social-post Backend selbst

## Status
- [ ] Spec reviewed
- [ ] Implementierung
- [ ] Validierung gegen Akzeptanzkriterien

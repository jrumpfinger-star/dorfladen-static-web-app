# Staging-Umgebung: Setup-Anleitung

## 1. GitHub Secret AZURE_CREDENTIALS anlegen

Gehe zu: https://github.com/jrumpfinger-star/dorfladen-static-web-app/settings/secrets/actions

Neues Secret erstellen:
- **Name:** `AZURE_CREDENTIALS`
- **Value:** (den kompletten JSON-Block einfügen, siehe unten)

Den JSON-Block aus dem Ergebnis des folgenden Befehls einfügen:

```bash
powershell -ExecutionPolicy Bypass -File setup_sp.ps1
```

Falls der Service Principal bereits erstellt wurde, den gespeicherten JSON-Block verwenden
(lokal gespeichert, NICHT im Repo!).

## 2. Workflow testen

Nach dem Anlegen des Secrets:

```bash
git checkout -b test/staging-setup
git push origin test/staging-setup
```

Dann auf GitHub einen Pull Request von `test/staging-setup` nach `main` erstellen.
Azure erstellt automatisch eine Preview-URL und setzt die Dev-Dataverse-DB.

## 3. Übersicht der Umgebungen

| Umgebung | URL | Dataverse |
|----------|-----|-----------|
| **Produktion** (main) | kind-pebble-072605b03.7.azurestaticapps.net | orgab4e2f00 (Prod) |
| **Preview** (PR) | kind-pebble-072605b03-{nr}.7.azurestaticapps.net | org392a4789 (Dev) |

## 4. Workflow für Änderungen

1. `git checkout -b feature/mein-feature`
2. Änderungen machen
3. `git push origin feature/mein-feature`
4. Pull Request auf GitHub öffnen
5. Preview-URL testen (wird als PR-Kommentar gepostet)
6. PR mergen → geht live

## 5. Hinweis

Die Tabelle `cr5d4_table` (Kassendaten/Preisliste) existiert nur in Prod.
Preisliste und Roter Punkt zeigen in der Preview-Umgebung keine Daten.
Alle anderen Features (News, Angebote, Öffnungszeiten, etc.) funktionieren mit der Dev-DB.

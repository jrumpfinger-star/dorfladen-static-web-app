# Kassenjournal-Automatisierung (Schapfl-Kasse)

Ziel: Das **Kassenjournal** der Schapfl-Kassensoftware (C#-App auf dem
Kassenrechner `172.16.15.26`) automatisiert als **CSV** ausleiten und in einen
**Netzwerk-/Cloud-Ordner** ablegen.

Der Export erfolgt heute **manuell** über das App-Menü. Damit die
Automatisierung robust wird (statt fragiler Klick-Automation), suchen wir
zuerst den besten technischen Zugang — dafür ist das **Discovery-Skript** da.

> Hinweis: Die Skripte laufen **lokal auf dem Kassenrechner**. Es werden keine
> Zugangsdaten im Repository gespeichert.

## Schritt 1 — Discovery (Bestandsaufnahme)

`Invoke-SchapflDiscovery.ps1` sammelt **nur lesend** Informationen, um den
robustesten Export-Weg zu bestimmen. Es verändert, exportiert oder löscht
**nichts** und enthält **keine** Journalinhalte oder Passwörter.

### Ausführen (auf dem Kassenrechner)

1. Skript auf den Kassenrechner kopieren (z. B. auf den Desktop).
2. PowerShell öffnen (am besten **als Administrator**, damit alle Programm-
   ordner lesbar sind).
3. Ausführen:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\Invoke-SchapflDiscovery.ps1 -IncludeJson
   ```

   Optional zusätzliche Laufwerke/Ordner durchsuchen (falls die Kasse z. B. auf
   `D:\` liegt):

   ```powershell
   .\Invoke-SchapflDiscovery.ps1 -SearchRoots 'C:\','D:\' -IncludeJson
   ```

4. Der Report wird standardmäßig unter `Desktop\SchapflDiscovery\` abgelegt
   (`.txt` und `.json`). **Beide Dateien an den Entwickler zurücksenden.**

### Was gesammelt wird

- Laufende Prozesse der Kasse (Pfad, Hersteller)
- Installierte Programme (Registry: Name, Version, Installationsordner)
- Verknüpfungen inkl. **Startparameter** (Hinweis auf stillen/CLI-Export)
- Datenbank-Dateien (`*.mdf, *.sqlite, *.db, *.fdb, *.gdb, *.mdb, ...`)
- Konfig-Dateien im Kassenkontext (`*.config, *.ini, *.xml, *.json`)
- Vorhandene CSV-Dateien (Hinweis auf bereits automatische Export-Ordner)
- Laufende DB-Dienste (SQL Server, Firebird, ...)

### Parameter

| Parameter      | Bedeutung                                            | Standard |
|----------------|------------------------------------------------------|----------|
| `-SearchRoots` | Zu durchsuchende Wurzelordner                        | Programm-/Datenordner |
| `-OutputDir`   | Zielordner für den Report                            | `Desktop\SchapflDiscovery` |
| `-NamePattern` | Erkennungsmuster für die Kasse                       | `schapfl, kasse, pos` |
| `-MaxDepth`    | Maximale Suchtiefe je Wurzel                         | `4` |
| `-IncludeJson` | Zusätzlich strukturierten JSON-Report schreiben      | aus |

## Schritt 2 — Verbindung zur Datenbank ermitteln (DB liegt auf anderem Rechner)

Das Kassenjournal liegt in einer **Datenbank auf einem anderen Rechner**. Um
das Journal später **direkt aus der Datenbank** zu lesen (robustester Weg),
müssen wir wissen: **welcher Server (IP), welcher Port, welche DB-Engine** und
welche Verbindungsdaten die Kasse verwendet.

Dafür gibt es `Watch-SchapflConnection.ps1`. Es liest die Schapfl-`.config`
(Connection-Strings, **Passwörter maskiert**) und protokolliert die
Netzwerk-Verbindungen der Schapfl-Prozesse.

### Ausführen (auf dem Kassenrechner)

1. **PowerShell als Administrator** öffnen (wichtig für die Port-/Prozess-
   zuordnung).
2. Skript starten — **danach** die Schapfl-Kasse öffnen bzw. eine Aktion
   ausführen (z. B. Journal anzeigen), damit eine DB-Verbindung entsteht:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\Watch-SchapflConnection.ps1 -DurationSeconds 180
   ```

   Falls die Prozesse anders heißen oder länger beobachtet werden soll:

   ```powershell
   .\Watch-SchapflConnection.ps1 -ProcessNames 'SchapflClient','SchapflService','Zentrale' -DurationSeconds 300
   ```

3. Das Log liegt unter `Desktop\SchapflDiscovery\schapfl-connection_*.txt`.
   **Diese Datei an den Entwickler zurücksenden.**

### Was ermittelt wird

- **Remote-DB-Server** (IP/Hostname) + **Port** + wahrscheinliche **Engine**
  (z. B. 1433 = SQL Server, 3050 = Firebird, 3306 = MySQL, 5432 = PostgreSQL)
- Connection-Strings aus den `.config`-Dateien (**Passwörter maskiert**)
- Geladene DB-Treiber (z. B. `fbclient.dll`, `System.Data.SqlClient`)

> Sicherheit: Passwörter werden standardmäßig maskiert. Bitte die Log-Datei
> **nicht** entmaskiert weitergeben. Der Parameter `-ShowSecrets` ist nur für
> die lokale Ansicht gedacht.

## Nächste Schritte (nach der Verbindungsanalyse)

**Ergebnis der Verbindungsanalyse (2026-07-31):** Die Kasse (`SchapflService`
und `Zentrale`) verbindet sich zu einem **Microsoft SQL Server** auf
**`172.16.15.30:1433`** (Host `SRV-Lamp.fritz.box`). Das Journal wird also aus
dieser SQL-Server-Datenbank gelesen.

### Schritt 3 — Journal-Tabelle finden (`Get-SchapflDbSchema.ps1`)

> **Ergebnis (2026-07-31):** Windows-Authentifizierung schlägt fehl
> (`Anmeldung stammt aus einer nicht vertrauenswürdigen Domäne`). Der Server ist
> aber erreichbar (echte SQL-Server-Antwort auf Port 1433). Wir brauchen also
> ein **SQL-Login** — siehe Schritt 2.5.

### Schritt 2.5 — SQL-Login der Kasse finden (`Find-SchapflSqlLogin.ps1`)

Rein lesendes Skript, das den SQL-Benutzer/das Passwort ermittelt, das die
Schapfl-App selbst verwendet. Es durchsucht die Schapfl-Configs (inkl.
**verschlüsselter** `connectionStrings`, die im Speicher entschlüsselt werden),
die Schapfl-Ordner und die Registry.

```powershell
# 1) Suchen (Passwort maskiert):
.\Find-SchapflSqlLogin.ps1

# 2) Falls ein Login gefunden wird und du das Klartext-Passwort brauchst
#    (nur lokal, NICHT weitergeben/committen):
.\Find-SchapflSqlLogin.ps1 -ShowSecrets
```

- **Wichtig:** Als der Windows-Benutzer ausführen, unter dem die Kasse läuft
  (`Dorfladen`), damit verschlüsselte Configs entschlüsselt werden können.
- Report unter `Desktop\SchapflDiscovery\schapfl-sqllogin_*.txt`.
- Das Skript nennt am Ende direkt den passenden Aufruf für Schritt 3.

Rein lesendes Skript, das die Datenbanken und Tabellen auflistet und die
Journal-Tabelle findet.

```powershell
# Mit dem gefundenen SQL-Login (aus Schritt 2.5):
# 1) Datenbanken auflisten:
.\Get-SchapflDbSchema.ps1 -User "<login>" -Password "<pw>"

# 2) Tabellen der gefundenen DB + Journal-Kandidaten:
.\Get-SchapflDbSchema.ps1 -User "<login>" -Password "<pw>" -Database "<DatenbankName>"

# 3) Spalten der Journal-Tabelle ansehen:
.\Get-SchapflDbSchema.ps1 -User "<login>" -Password "<pw>" -Database "<DatenbankName>" -Table "dbo.<Tabelle>"
```

- Standard-Server ist `172.16.15.30:1433` (per `-Server` / `-Port` änderbar).
- Standard-Auth ist **Windows** (Integrated Security). Falls der Windows-
  Benutzer keinen DB-Zugang hat, ein **lesendes SQL-Login** verwenden:
  `-User "<login>" -Password "<pw>"`.
- Report unter `Desktop\SchapflDiscovery\schapfl-dbschema_*.txt` — bitte
  zurücksenden (enthält nur Schema-Infos, keine Journaldaten).

### Priorität des Export-Wegs

1. **Direkter SQL-Server-Lesezugriff** (172.16.15.30:1433) — bevorzugt
2. Stiller/CLI-Export der App
3. Automatischer Export-Ordner
4. UI-Automation als Fallback

Danach entstehen:

- `Export-Kassenjournal.ps1` — liest das Journal per SQL-Query (Tagesfilter),
  erzeugt die CSV und legt sie mit Zeitstempel im Netzwerk-/Cloud-Ordner ab
  (mit Logging und Fehlerbehandlung).
- Eine **Windows-Aufgabenplanung** für die tägliche Ausführung.

> Wichtig: Für den DB-Direktzugriff idealerweise ein **lesender** DB-Benutzer
> (nur `SELECT` auf die Journaltabellen). Zugangsdaten kommen in eine lokale
> Konfiguration auf dem Kassenrechner — **niemals** ins Repository.

> Tipp: Parallel beim **Schapfl-Support** anfragen, ob der lesende Zugriff auf
> die Journal-DB freigegeben ist bzw. welche Tabellen/Views das Journal führen.

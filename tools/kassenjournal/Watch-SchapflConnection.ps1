#Requires -Version 5.1
<#
.SYNOPSIS
    Protokolliert, wie sich die Schapfl-Kasse beim Start mit der Datenbank
    (auf einem anderen Rechner) verbindet, um DB-Server, Port und Engine zu
    ermitteln.

.DESCRIPTION
    NUR LESEND. Das Skript wird VOR dem Start der Schapfl-Anwendung gestartet.
    Es liest die Schapfl-Konfigurationsdateien (Connection-Strings; Passwoerter
    werden standardmaessig MASKIERT) und beobachtet anschliessend die
    Netzwerk-Verbindungen der Schapfl-Prozesse. So wird sichtbar, mit welchem
    Remote-Rechner (IP:Port) und ueber welche Datenbank-Engine sich die Kasse
    verbindet.

    Erkannt/aufgezeichnet werden:
      - Connection-Strings + relevante appSettings aus *.config (maskiert)
      - Aktive TCP-Verbindungen der Schapfl-Prozesse zu Remote-Hosts
      - Geladene DB-Treiber (fbclient/fbembed, System.Data.SqlClient,
        Npgsql, MySql, Oracle, sqlite) als Engine-Hinweis
      - Klassifizierung der Ports (1433 MSSQL, 3050 Firebird, 3306 MySQL,
        5432 PostgreSQL, 1521 Oracle, ...)

    Ergebnis: fortlaufendes Log + Zusammenfassung im Ausgabeordner.

.PARAMETER DurationSeconds
    Beobachtungsdauer nach Start. Standard: 180 (3 Minuten).

.PARAMETER IntervalSeconds
    Abtastintervall in Sekunden. Standard: 2.

.PARAMETER ProcessNames
    Zu beobachtende Prozessnamen (ohne .exe). Standard: Schapfl/Zentrale.

.PARAMETER ConfigPaths
    Optionale Liste von .config-Dateien. Standard: automatische Erkennung.

.PARAMETER OutputDir
    Zielordner fuer Log + Zusammenfassung. Standard: Desktop\SchapflDiscovery.

.PARAMETER ShowSecrets
    Wenn gesetzt, werden Passwoerter im Connection-String NICHT maskiert.
    (Nur lokal verwenden; solche Ausgaben NICHT weitergeben/committen.)

.EXAMPLE
    # 1) Dieses Skript starten, DANN die Schapfl-Kasse oeffnen:
    powershell -ExecutionPolicy Bypass -File .\Watch-SchapflConnection.ps1

.EXAMPLE
    .\Watch-SchapflConnection.ps1 -DurationSeconds 300 -ProcessNames 'SchapflClient','Zentrale'

.NOTES
    Nur-Lesen. Am besten als Administrator ausfuehren (fuer Modul-/Portzugriff).
    Lokal auf dem Kassenrechner ausfuehren.
#>

[CmdletBinding()]
param(
    [ValidateRange(10, 3600)]
    [int] $DurationSeconds = 180,

    [ValidateRange(1, 30)]
    [int] $IntervalSeconds = 2,

    [string[]] $ProcessNames = @('SchapflClient', 'SchapflService', 'Zentrale', 'Schapfl'),

    [string[]] $ConfigPaths,

    [string] $OutputDir = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'SchapflDiscovery'),

    [switch] $ShowSecrets
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

# ---------------------------------------------------------------------------
# Vorbereitung / Ausgabe
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$logFile = Join-Path $OutputDir "schapfl-connection_$timestamp.txt"

function Write-Log {
    param([string] $Message, [ConsoleColor] $Color = [ConsoleColor]::Gray)
    $line = ('[{0}] {1}' -f (Get-Date -Format 'HH:mm:ss'), $Message)
    Write-Host $line -ForegroundColor $Color
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
}

function Write-Head {
    param([string] $Title)
    $bar = '=' * 72
    foreach ($l in @('', $bar, "  $Title", $bar)) {
        Write-Host $l -ForegroundColor Cyan
        Add-Content -LiteralPath $logFile -Value $l -Encoding UTF8
    }
}

function Protect-ConnString {
    param([string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $Value }
    if ($ShowSecrets) { return $Value }
    # Passwort-artige Schluessel maskieren
    $masked = [regex]::Replace(
        $Value,
        '(?i)\b(password|pwd|pass)\s*=\s*[^;]*',
        '$1=***MASKIERT***'
    )
    return $masked
}

# Port -> DB-Engine
$portMap = @{
    1433  = 'Microsoft SQL Server'
    1434  = 'SQL Server Browser (UDP)'
    3050  = 'Firebird / InterBase'
    3051  = 'Firebird (alt)'
    3306  = 'MySQL / MariaDB'
    5432  = 'PostgreSQL'
    1521  = 'Oracle'
    50000 = 'IBM DB2'
    27017 = 'MongoDB'
}

# Bekannte DB-Treiber-Module -> Engine
$driverMap = @{
    'fbclient.dll'          = 'Firebird (Client)'
    'fbembed.dll'           = 'Firebird (Embedded)'
    'FirebirdSql'           = 'Firebird (.NET Provider)'
    'System.Data.SqlClient' = 'Microsoft SQL Server (.NET)'
    'Microsoft.Data.SqlClient' = 'Microsoft SQL Server (.NET)'
    'sqlncli'               = 'SQL Server Native Client'
    'Npgsql'                = 'PostgreSQL (.NET)'
    'MySql.Data'            = 'MySQL (.NET)'
    'libmysql'              = 'MySQL (Client)'
    'Oracle.'               = 'Oracle (.NET)'
    'oci.dll'               = 'Oracle (Client)'
    'sqlite3.dll'           = 'SQLite'
    'System.Data.SQLite'    = 'SQLite (.NET)'
}

Write-Head 'SCHAPFL VERBINDUNGS-MONITOR'
Write-Log ("Rechner    : {0}" -f $env:COMPUTERNAME)
Write-Log ("Benutzer   : {0}" -f $env:USERNAME)
Write-Log ("Dauer      : {0}s (Intervall {1}s)" -f $DurationSeconds, $IntervalSeconds)
Write-Log ("Prozesse   : {0}" -f ($ProcessNames -join ', '))
Write-Log ("Modus      : NUR LESEND. Passwoerter maskiert: {0}" -f (-not $ShowSecrets))
Write-Log ''
Write-Log '>>> Bitte JETZT die Schapfl-Kasse starten (falls noch nicht offen). <<<' Yellow

# ---------------------------------------------------------------------------
# 1) Konfigurationsdateien lesen (Connection-Strings)
# ---------------------------------------------------------------------------
Write-Head '1) Konfigurationsdateien (Connection-Strings, maskiert)'

if (-not $ConfigPaths -or $ConfigPaths.Count -eq 0) {
    $ConfigPaths = @(
        'C:\Program Files (x86)\Schapfl\SchapflCenter\Client\SchapflClient.exe.config',
        'C:\Program Files (x86)\Schapfl\SchapflCenter\Service\SchapflService.exe.Config',
        'C:\Program Files (x86)\Schapfl\Zentrale\Zentrale.exe.config',
        'C:\POS\SchapflClient.exe.config',
        'C:\POS\Kasse.exe.config'
    )
}

$connFindings = New-Object System.Collections.Generic.List[object]

foreach ($cfg in $ConfigPaths) {
    if (-not (Test-Path -LiteralPath $cfg)) { continue }
    Write-Log ("Datei: {0}" -f $cfg) White
    $xml = $null
    try { $xml = [xml](Get-Content -LiteralPath $cfg -Raw -ErrorAction Stop) } catch { $xml = $null }

    if ($xml) {
        # <connectionStrings>
        try {
            foreach ($cs in $xml.configuration.connectionStrings.add) {
                if ($null -eq $cs) { continue }
                $val = Protect-ConnString $cs.connectionString
                Write-Log ("  connectionString [{0}] provider={1}" -f $cs.name, $cs.providerName) Green
                Write-Log ("    {0}" -f $val) Green
                $connFindings.Add([pscustomobject]@{ Source = $cfg; Name = $cs.name; Provider = $cs.providerName; Value = $cs.connectionString })
            }
        } catch { }

        # <appSettings> mit DB-/Server-/Host-Hinweisen
        try {
            foreach ($s in $xml.configuration.appSettings.add) {
                if ($null -eq $s) { continue }
                if ($s.key -match '(?i)server|host|data\s*source|datenbank|database|db|ip|port|conn') {
                    Write-Log ("  appSetting {0} = {1}" -f $s.key, (Protect-ConnString $s.value)) Gray
                    $connFindings.Add([pscustomobject]@{ Source = $cfg; Name = $s.key; Provider = 'appSetting'; Value = $s.value })
                }
            }
        } catch { }
    }

    # Rohtext-Suche nach IPs / Server=/Data Source=/Host= (falls kein sauberes XML)
    try {
        $raw = Get-Content -LiteralPath $cfg -Raw -ErrorAction Stop
        $patterns = @(
            '(?i)(data\s*source|server|host|address)\s*=\s*[^;"'']+',
            '\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b'
        )
        foreach ($p in $patterns) {
            foreach ($m in [regex]::Matches($raw, $p)) {
                Write-Log ("  [roh] {0}" -f (Protect-ConnString $m.Value)) DarkGray
            }
        }
    } catch { }
    Write-Log ''
}

if ($connFindings.Count -eq 0) {
    Write-Log 'Keine Connection-Strings in den Standard-Configs gefunden.' Yellow
    Write-Log 'Ggf. -ConfigPaths mit dem tatsaechlichen Pfad angeben.' Yellow
}

# ---------------------------------------------------------------------------
# 2) Netzwerk-Verbindungen der Schapfl-Prozesse beobachten
# ---------------------------------------------------------------------------
Write-Head '2) TCP-Verbindungen der Schapfl-Prozesse (Live-Beobachtung)'

$hasNetTcp = [bool](Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue)
$seenEndpoints = @{}   # Key: pid|remote:port  -> Objekt
$seenDrivers = @{}     # Key: engine
$dnsCache = @{}

function Resolve-HostName {
    param([string] $Ip)
    if ($dnsCache.ContainsKey($Ip)) { return $dnsCache[$Ip] }
    $name = ''
    try { $name = ([System.Net.Dns]::GetHostEntry($Ip)).HostName } catch { $name = '' }
    $dnsCache[$Ip] = $name
    return $name
}

function Get-SchapflProcesses {
    $procs = @()
    foreach ($n in $ProcessNames) {
        $procs += Get-Process -Name $n -ErrorAction SilentlyContinue
    }
    return $procs | Sort-Object Id -Unique
}

function Get-ProcTcpConnections {
    param([int] $ProcId)
    $result = @()
    if ($hasNetTcp) {
        try {
            $result = Get-NetTCPConnection -OwningProcess $ProcId -ErrorAction SilentlyContinue |
                Where-Object { $_.RemoteAddress -and $_.RemoteAddress -notin @('0.0.0.0', '::', '127.0.0.1', '::1') }
        } catch { $result = @() }
    } else {
        # Fallback: netstat -ano parsen
        try {
            $lines = netstat -ano | Select-String -Pattern '\s+TCP\s+'
            foreach ($ln in $lines) {
                $parts = ($ln.ToString() -split '\s+') | Where-Object { $_ -ne '' }
                if ($parts.Count -ge 5 -and [int]$parts[4] -eq $ProcId) {
                    $remote = $parts[2]
                    $state = $parts[3]
                    $idx = $remote.LastIndexOf(':')
                    if ($idx -gt 0) {
                        $rip = $remote.Substring(0, $idx)
                        $rport = $remote.Substring($idx + 1)
                        if ($rip -notin @('0.0.0.0', '127.0.0.1', '::', '::1', '*')) {
                            $result += [pscustomobject]@{ RemoteAddress = $rip; RemotePort = [int]$rport; State = $state }
                        }
                    }
                }
            }
        } catch { $result = @() }
    }
    return $result
}

function Read-ProcDrivers {
    param($Proc)
    try {
        foreach ($m in $Proc.Modules) {
            foreach ($key in $driverMap.Keys) {
                if ($m.ModuleName -like "*$key*" -or $m.FileName -like "*$key*") {
                    $eng = $driverMap[$key]
                    if (-not $seenDrivers.ContainsKey($eng)) {
                        $seenDrivers[$eng] = $true
                        Write-Log ("DB-Treiber erkannt: {0}  ({1})" -f $eng, $m.ModuleName) Green
                    }
                }
            }
        }
    } catch {
        # Modulzugriff kann bei Bitness-/Rechte-Unterschieden fehlschlagen
    }
}

$deadline = (Get-Date).AddSeconds($DurationSeconds)
$announcedRunning = $false

while ((Get-Date) -lt $deadline) {
    $procs = Get-SchapflProcesses
    if ($procs -and -not $announcedRunning) {
        Write-Log ("Schapfl-Prozess(e) erkannt: {0}" -f (($procs | ForEach-Object { '{0}({1})' -f $_.Name, $_.Id }) -join ', ')) White
        $announcedRunning = $true
    }

    foreach ($p in $procs) {
        Read-ProcDrivers -Proc $p
        foreach ($c in (Get-ProcTcpConnections -ProcId $p.Id)) {
            $key = ('{0}|{1}:{2}' -f $p.Id, $c.RemoteAddress, $c.RemotePort)
            if (-not $seenEndpoints.ContainsKey($key)) {
                $engine = if ($portMap.ContainsKey([int]$c.RemotePort)) { $portMap[[int]$c.RemotePort] } else { 'unbekannt' }
                $hostName = Resolve-HostName $c.RemoteAddress
                $obj = [pscustomobject]@{
                    Process = $p.Name
                    Pid     = $p.Id
                    Remote  = $c.RemoteAddress
                    Host    = $hostName
                    Port    = [int]$c.RemotePort
                    Engine  = $engine
                    State   = $c.State
                }
                $seenEndpoints[$key] = $obj
                Write-Log ("VERBINDUNG: {0}({1}) -> {2}:{3}  [{4}]  Host={5}  State={6}" -f `
                        $p.Name, $p.Id, $c.RemoteAddress, $c.RemotePort, $engine, $hostName, $c.State) Green
            }
        }
    }
    Start-Sleep -Seconds $IntervalSeconds
}

# ---------------------------------------------------------------------------
# 3) Zusammenfassung
# ---------------------------------------------------------------------------
Write-Head '3) ZUSAMMENFASSUNG'

if ($seenEndpoints.Count -gt 0) {
    Write-Log 'Gefundene Remote-Verbindungen der Schapfl-Prozesse:' White
    $rows = $seenEndpoints.Values | Sort-Object Remote, Port -Unique
    ($rows | Format-Table Process, Remote, Host, Port, Engine, State -AutoSize | Out-String).TrimEnd().Split("`n") | ForEach-Object {
        Write-Host $_
        Add-Content -LiteralPath $logFile -Value $_ -Encoding UTF8
    }

    # Wahrscheinlichster DB-Server: bekannte DB-Ports zuerst
    $dbCandidates = $rows | Where-Object { $portMap.ContainsKey([int]$_.Port) -and $_.Port -ne 1434 }
    Write-Log ''
    if ($dbCandidates) {
        foreach ($d in ($dbCandidates | Sort-Object Remote, Port -Unique)) {
            Write-Log ("=> Wahrscheinlicher DB-Server: {0}:{1}  ({2})  Host={3}" -f $d.Remote, $d.Port, $d.Engine, $d.Host) Green
        }
    } else {
        Write-Log 'Keine typischen DB-Ports erkannt. Bitte Portliste oben pruefen' Yellow
        Write-Log '(die Kasse nutzt evtl. einen benutzerdefinierten Port).' Yellow
    }
} else {
    Write-Log 'Es wurden keine Remote-Verbindungen aufgezeichnet.' Yellow
    Write-Log 'Moegliche Gruende:' Yellow
    Write-Log '  - Die Kasse wurde waehrend der Laufzeit nicht gestartet/genutzt.' Yellow
    Write-Log '  - Andere Prozessnamen: -ProcessNames anpassen.' Yellow
    Write-Log '  - Skript als Administrator ausfuehren (Portzuordnung braucht Rechte).' Yellow
    Write-Log '  - Verbindung sehr kurzlebig: -DurationSeconds erhoehen.' Yellow
}

if ($seenDrivers.Count -gt 0) {
    Write-Log ''
    Write-Log ("Erkannte DB-Engine(s) aus geladenen Treibern: {0}" -f (($seenDrivers.Keys) -join ', ')) Green
}

Write-Log ''
Write-Log ("Log gespeichert: {0}" -f $logFile) Cyan
Write-Log 'Bitte diese Log-Datei an den Entwickler zuruecksenden.' Cyan
if (-not $ShowSecrets) {
    Write-Log 'Hinweis: Passwoerter sind maskiert. Bitte nichts entmaskieren beim Senden.' Cyan
}

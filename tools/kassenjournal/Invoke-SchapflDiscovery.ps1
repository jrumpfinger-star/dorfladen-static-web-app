#Requires -Version 5.1
<#
.SYNOPSIS
    Discovery-Skript fuer die Schapfl-Kassensoftware auf dem Kassenrechner.

.DESCRIPTION
    Sammelt NUR LESEND Informationen ueber die installierte Schapfl-Kasse, um
    den robustesten Weg fuer das automatisierte Ausleiten des Kassenjournals
    (CSV) zu bestimmen. Es werden keine Daten veraendert, exportiert oder
    geloescht.

    Gesammelt werden u. a.:
      - Laufende Prozesse, die zu "Schapfl"/Kasse passen (Pfad, Startzeit)
      - Installierte Programme laut Registry (DisplayName/InstallLocation)
      - Verknuepfungen (.lnk) inkl. Ziel + Startparameter (Hinweis auf CLI)
      - Kandidaten-Ordner (Programme, ProgramData, AppData, Laufwerks-Roots)
      - Gefundene Datenbank-Dateien (*.mdf,*.sqlite,*.sqlite3,*.db,*.fdb,*.mdb,*.gdb)
      - Konfig-Dateien (*.config,*.ini,*.xml,*.json) im Installationsbereich
      - Vorhandene CSV-Exporte (Namensmuster/Alter) als Hinweis auf Export-Ordner
      - Laufende SQL-Dienste (SQL Server/Firebird) als Hinweis auf DB-Backend

    Ergebnis: lesbarer Text-Report in der Konsole + Dateien im Ausgabeordner
    (Report .txt und optional .json), die an den Entwickler zurueckgeschickt
    werden koennen.

.PARAMETER SearchRoots
    Zu durchsuchende Wurzelverzeichnisse. Standard: gaengige Programm-/Datenordner.

.PARAMETER OutputDir
    Zielordner fuer den Report. Standard: Desktop\SchapflDiscovery.

.PARAMETER NamePattern
    Namensmuster zur Erkennung der Kasse. Standard: 'schapfl','kasse','pos'.

.PARAMETER MaxDepth
    Maximale Suchtiefe je Wurzel (Schutz vor sehr grossen Baeumen). Standard: 4.

.PARAMETER IncludeJson
    Zusaetzlich einen strukturierten JSON-Report schreiben.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Invoke-SchapflDiscovery.ps1

.EXAMPLE
    .\Invoke-SchapflDiscovery.ps1 -SearchRoots 'C:\','D:\' -IncludeJson

.NOTES
    Nur-Lesen. Keine Zugangsdaten. Lokal auf dem Kassenrechner ausfuehren.
#>

[CmdletBinding()]
param(
    [string[]] $SearchRoots,

    [string] $OutputDir = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'SchapflDiscovery'),

    [string[]] $NamePattern = @('schapfl', 'kasse', 'pos'),

    [ValidateRange(1, 8)]
    [int] $MaxDepth = 4,

    [switch] $IncludeJson
)

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

function Write-Section {
    param([string] $Title)
    $line = '=' * 72
    Write-Host ''
    Write-Host $line -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host $line -ForegroundColor Cyan
}

function Test-NameMatch {
    param([string] $Text, [string[]] $Patterns)
    if ([string]::IsNullOrWhiteSpace($Text)) { return $false }
    foreach ($p in $Patterns) {
        if ($Text -match [regex]::Escape($p)) { return $true }
    }
    return $false
}

function Get-SafeChildItems {
    <#
        Rekursive, tiefenbegrenzte und fehlertolerante Verzeichnissuche.
        Vermeidet Abbruch bei Zugriffsfehlern und begrenzt die Tiefe.
    #>
    param(
        [string] $Root,
        [int] $MaxDepth,
        [string[]] $Include
    )
    $results = New-Object System.Collections.Generic.List[object]
    if (-not (Test-Path -LiteralPath $Root)) { return $results }

    $queue = New-Object System.Collections.Generic.Queue[object]
    $queue.Enqueue([pscustomobject]@{ Path = $Root; Depth = 0 })

    while ($queue.Count -gt 0) {
        $node = $queue.Dequeue()
        $childDirs = @()
        try {
            $childDirs = Get-ChildItem -LiteralPath $node.Path -Directory -Force -ErrorAction SilentlyContinue
        } catch { $childDirs = @() }

        # Dateien auf dieser Ebene sammeln (nach Include-Filter)
        try {
            $files = Get-ChildItem -LiteralPath $node.Path -File -Force -ErrorAction SilentlyContinue
            foreach ($f in $files) {
                foreach ($pat in $Include) {
                    if ($f.Name -like $pat) { $results.Add($f); break }
                }
            }
        } catch { }

        if ($node.Depth -lt $MaxDepth) {
            foreach ($d in $childDirs) {
                $queue.Enqueue([pscustomobject]@{ Path = $d.FullName; Depth = $node.Depth + 1 })
            }
        }
    }
    return $results
}

function Resolve-Shortcut {
    param([string] $LnkPath)
    $shell = $null
    try {
        $shell = New-Object -ComObject WScript.Shell
        $sc = $shell.CreateShortcut($LnkPath)
        return [pscustomobject]@{
            Lnk        = $LnkPath
            TargetPath = $sc.TargetPath
            Arguments  = $sc.Arguments
            WorkingDir = $sc.WorkingDirectory
        }
    } catch {
        return $null
    } finally {
        if ($shell) { [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
    }
}

# ---------------------------------------------------------------------------
# Vorbereitung
# ---------------------------------------------------------------------------

if (-not $SearchRoots -or $SearchRoots.Count -eq 0) {
    $candidates = @(
        ${env:ProgramFiles},
        ${env:ProgramFiles(x86)},
        ${env:ProgramData},
        ${env:LOCALAPPDATA},
        ${env:APPDATA}
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    $SearchRoots = $candidates | Select-Object -Unique
}

if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$reportTxt = Join-Path $OutputDir "schapfl-discovery_$timestamp.txt"
$reportJson = Join-Path $OutputDir "schapfl-discovery_$timestamp.json"

# Transcript fuer vollstaendige Konsolenausgabe
try { Start-Transcript -Path $reportTxt -Force | Out-Null } catch { }

$report = [ordered]@{
    GeneratedAt   = (Get-Date).ToString('s')
    ComputerName  = $env:COMPUTERNAME
    UserName      = $env:USERNAME
    OSVersion     = [System.Environment]::OSVersion.VersionString
    PSVersion     = $PSVersionTable.PSVersion.ToString()
    NamePattern   = $NamePattern
    SearchRoots   = $SearchRoots
    Processes     = @()
    InstalledApps = @()
    Shortcuts     = @()
    Databases     = @()
    ConfigFiles   = @()
    CsvExports    = @()
    SqlServices   = @()
}

Write-Section 'SCHAPFL DISCOVERY - Kassenjournal-Automatisierung'
Write-Host ("Rechner   : {0}" -f $env:COMPUTERNAME)
Write-Host ("Benutzer  : {0}" -f $env:USERNAME)
Write-Host ("Zeit      : {0}" -f (Get-Date))
Write-Host ("Suchpfade : {0}" -f ($SearchRoots -join '; '))
Write-Host ("Muster    : {0}" -f ($NamePattern -join ', '))
Write-Host 'Modus     : NUR LESEND - es werden keine Daten veraendert.'

# ---------------------------------------------------------------------------
# 1) Laufende Prozesse
# ---------------------------------------------------------------------------
Write-Section '1) Laufende Prozesse (Kasse/Schapfl/POS)'
try {
    $procs = Get-Process -ErrorAction SilentlyContinue | ForEach-Object {
        $path = $null
        try { $path = $_.Path } catch { }
        [pscustomobject]@{
            Name        = $_.Name
            Id          = $_.Id
            Path        = $path
            Company     = $_.Company
            Description = $_.Description
            StartTime   = $(try { $_.StartTime } catch { $null })
        }
    } | Where-Object {
        (Test-NameMatch $_.Name $NamePattern) -or
        (Test-NameMatch $_.Path $NamePattern) -or
        (Test-NameMatch $_.Company $NamePattern) -or
        (Test-NameMatch $_.Description $NamePattern)
    }
    if ($procs) {
        $procs | Format-Table Name, Id, Company, Path -AutoSize | Out-String | Write-Host
        $report.Processes = $procs
    } else {
        Write-Host 'Keine passenden Prozesse gefunden. (Laeuft die Kasse aktuell?)' -ForegroundColor Yellow
    }
} catch {
    Write-Host ("Fehler beim Auslesen der Prozesse: {0}" -f $_.Exception.Message) -ForegroundColor Red
}

# ---------------------------------------------------------------------------
# 2) Installierte Programme laut Registry
# ---------------------------------------------------------------------------
Write-Section '2) Installierte Programme (Registry Uninstall)'
try {
    $uninstallRoots = @(
        'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*'
    )
    $apps = foreach ($r in $uninstallRoots) {
        Get-ItemProperty -Path $r -ErrorAction SilentlyContinue | ForEach-Object {
            [pscustomobject]@{
                DisplayName     = $_.DisplayName
                DisplayVersion  = $_.DisplayVersion
                Publisher       = $_.Publisher
                InstallLocation = $_.InstallLocation
                InstallDate     = $_.InstallDate
            }
        }
    }
    $apps = $apps | Where-Object {
        (Test-NameMatch $_.DisplayName $NamePattern) -or
        (Test-NameMatch $_.Publisher $NamePattern) -or
        (Test-NameMatch $_.InstallLocation $NamePattern)
    } | Sort-Object DisplayName -Unique
    if ($apps) {
        $apps | Format-Table DisplayName, DisplayVersion, Publisher, InstallLocation -AutoSize | Out-String | Write-Host
        $report.InstalledApps = $apps
    } else {
        Write-Host 'Keine passenden Eintraege in der Uninstall-Registry gefunden.' -ForegroundColor Yellow
    }
} catch {
    Write-Host ("Fehler beim Auslesen der Registry: {0}" -f $_.Exception.Message) -ForegroundColor Red
}

# ---------------------------------------------------------------------------
# 3) Verknuepfungen (.lnk) - Hinweis auf Startparameter / CLI
# ---------------------------------------------------------------------------
Write-Section '3) Verknuepfungen (.lnk) mit Ziel + Startparametern'
try {
    $lnkRoots = @(
        (Join-Path ${env:ProgramData} 'Microsoft\Windows\Start Menu'),
        (Join-Path ${env:APPDATA} 'Microsoft\Windows\Start Menu'),
        ([Environment]::GetFolderPath('Desktop')),
        ([Environment]::GetFolderPath('CommonDesktopDirectory'))
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

    $lnkFiles = foreach ($lr in $lnkRoots) {
        Get-SafeChildItems -Root $lr -MaxDepth 4 -Include @('*.lnk')
    }
    $shortcuts = foreach ($lf in $lnkFiles) {
        $sc = Resolve-Shortcut -LnkPath $lf.FullName
        if ($sc) { $sc }
    }
    $shortcuts = $shortcuts | Where-Object {
        (Test-NameMatch $_.Lnk $NamePattern) -or
        (Test-NameMatch $_.TargetPath $NamePattern) -or
        (Test-NameMatch $_.Arguments $NamePattern) -or
        (Test-NameMatch $_.WorkingDir $NamePattern)
    }
    if ($shortcuts) {
        foreach ($s in $shortcuts) {
            Write-Host ("LNK    : {0}" -f $s.Lnk)
            Write-Host ("Ziel   : {0}" -f $s.TargetPath)
            Write-Host ("Args   : {0}" -f $s.Arguments) -ForegroundColor Green
            Write-Host ("WorkDir: {0}" -f $s.WorkingDir)
            Write-Host ('-' * 60)
        }
        $report.Shortcuts = $shortcuts
        Write-Host 'HINWEIS: Vorhandene Startparameter (Args) koennen auf einen' -ForegroundColor Green
        Write-Host '         stillen/CLI-Export hindeuten - bitte im Report pruefen.' -ForegroundColor Green
    } else {
        Write-Host 'Keine passenden Verknuepfungen gefunden.' -ForegroundColor Yellow
    }
} catch {
    Write-Host ("Fehler beim Lesen der Verknuepfungen: {0}" -f $_.Exception.Message) -ForegroundColor Red
}

# ---------------------------------------------------------------------------
# 4) Datei-Discovery in den Suchpfaden (DB / Config / CSV)
# ---------------------------------------------------------------------------
Write-Section '4) Datei-Discovery (Datenbanken / Konfig / CSV-Exporte)'

# Zusaetzliche Wurzeln aus gefundenen Installationsorten ableiten
$extraRoots = @()
$extraRoots += ($report.InstalledApps | ForEach-Object { $_.InstallLocation }) | Where-Object { $_ }
$extraRoots += ($report.Processes | ForEach-Object { if ($_.Path) { Split-Path $_.Path -Parent } }) | Where-Object { $_ }
$allRoots = @($SearchRoots + $extraRoots) | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -Unique

$dbPatterns  = @('*.mdf', '*.sqlite', '*.sqlite3', '*.db', '*.fdb', '*.gdb', '*.mdb', '*.accdb')
$cfgPatterns = @('*.config', '*.ini', '*.xml', '*.json')
$csvPatterns = @('*.csv')

$dbFiles = New-Object System.Collections.Generic.List[object]
$cfgFiles = New-Object System.Collections.Generic.List[object]
$csvFiles = New-Object System.Collections.Generic.List[object]

foreach ($root in $allRoots) {
    Write-Host ("Durchsuche: {0} (max. Tiefe {1}) ..." -f $root, $MaxDepth)

    foreach ($f in (Get-SafeChildItems -Root $root -MaxDepth $MaxDepth -Include $dbPatterns)) {
        $dbFiles.Add([pscustomobject]@{ Path = $f.FullName; SizeKB = [math]::Round($f.Length / 1KB, 1); Modified = $f.LastWriteTime })
    }
    # Config-Dateien nur, wenn der Pfad zur Kasse passt (sonst zu viele Treffer)
    foreach ($f in (Get-SafeChildItems -Root $root -MaxDepth $MaxDepth -Include $cfgPatterns)) {
        if ((Test-NameMatch $f.FullName $NamePattern)) {
            $cfgFiles.Add([pscustomobject]@{ Path = $f.FullName; SizeKB = [math]::Round($f.Length / 1KB, 1); Modified = $f.LastWriteTime })
        }
    }
    foreach ($f in (Get-SafeChildItems -Root $root -MaxDepth $MaxDepth -Include $csvPatterns)) {
        $csvFiles.Add([pscustomobject]@{ Path = $f.FullName; SizeKB = [math]::Round($f.Length / 1KB, 1); Modified = $f.LastWriteTime })
    }
}

# Datenbanken
Write-Host ''
Write-Host '--- Datenbank-Dateien ---' -ForegroundColor Cyan
if ($dbFiles.Count -gt 0) {
    $dbFiles | Sort-Object Path -Unique | Format-Table Path, SizeKB, Modified -AutoSize | Out-String | Write-Host
    $report.Databases = ($dbFiles | Sort-Object Path -Unique)
    Write-Host 'HINWEIS: Eine gefundene DB kann direkten (robusten) Zugriff erlauben.' -ForegroundColor Green
} else {
    Write-Host 'Keine Datenbank-Dateien in den Suchpfaden gefunden.' -ForegroundColor Yellow
}

# Konfig
Write-Host ''
Write-Host '--- Konfig-Dateien (im Kassenkontext) ---' -ForegroundColor Cyan
if ($cfgFiles.Count -gt 0) {
    $cfgFiles | Sort-Object Path -Unique | Format-Table Path, SizeKB, Modified -AutoSize | Out-String | Write-Host
    $report.ConfigFiles = ($cfgFiles | Sort-Object Path -Unique)
} else {
    Write-Host 'Keine passenden Konfig-Dateien gefunden.' -ForegroundColor Yellow
}

# CSV-Exporte
Write-Host ''
Write-Host '--- Vorhandene CSV-Dateien (moegliche Export-Ordner) ---' -ForegroundColor Cyan
if ($csvFiles.Count -gt 0) {
    $csvSorted = $csvFiles | Sort-Object Modified -Descending | Select-Object -First 50
    $csvSorted | Format-Table Path, SizeKB, Modified -AutoSize | Out-String | Write-Host
    $report.CsvExports = ($csvFiles | Sort-Object Path -Unique)
    Write-Host 'HINWEIS: Ordner mit regelmaessigen CSVs sind ein starker Kandidat' -ForegroundColor Green
    Write-Host '         fuer einen automatischen/geplanten Export.' -ForegroundColor Green
} else {
    Write-Host 'Keine CSV-Dateien in den Suchpfaden gefunden.' -ForegroundColor Yellow
}

# ---------------------------------------------------------------------------
# 5) DB-Dienste (SQL Server / Firebird)
# ---------------------------------------------------------------------------
Write-Section '5) Laufende/registrierte DB-Dienste (Backend-Hinweis)'
try {
    $svc = Get-Service -ErrorAction SilentlyContinue | Where-Object {
        $_.Name -match 'MSSQL|SQLServer|Firebird|MySQL|PostgreSQL' -or
        $_.DisplayName -match 'SQL Server|Firebird|MySQL|PostgreSQL'
    } | Select-Object Name, DisplayName, Status
    if ($svc) {
        $svc | Format-Table Name, DisplayName, Status -AutoSize | Out-String | Write-Host
        $report.SqlServices = $svc
    } else {
        Write-Host 'Keine typischen DB-Dienste gefunden (evtl. eingebettete DB oder Datei-DB).' -ForegroundColor Yellow
    }
} catch {
    Write-Host ("Fehler beim Auslesen der Dienste: {0}" -f $_.Exception.Message) -ForegroundColor Red
}

# ---------------------------------------------------------------------------
# Zusammenfassung / Empfehlung
# ---------------------------------------------------------------------------
Write-Section 'ZUSAMMENFASSUNG / naechste Schritte'
Write-Host ("Prozesse gefunden : {0}" -f @($report.Processes).Count)
Write-Host ("Installierte Apps : {0}" -f @($report.InstalledApps).Count)
Write-Host ("Verknuepfungen    : {0}" -f @($report.Shortcuts).Count)
Write-Host ("Datenbank-Dateien : {0}" -f @($report.Databases).Count)
Write-Host ("Konfig-Dateien    : {0}" -f @($report.ConfigFiles).Count)
Write-Host ("CSV-Dateien       : {0}" -f @($report.CsvExports).Count)
Write-Host ("DB-Dienste        : {0}" -f @($report.SqlServices).Count)
Write-Host ''
Write-Host 'Empfohlene Reihenfolge fuer den Export-Ansatz:' -ForegroundColor Cyan
Write-Host '  1. Startparameter (Args) einer Verknuepfung -> stiller/CLI-Export?'
Write-Host '  2. Ordner mit regelmaessigen CSVs -> automatischer Export vorhanden?'
Write-Host '  3. Gefundene DB -> direkter Lesezugriff auf das Journal moeglich?'
Write-Host '  4. Sonst: UI-Automation als Fallback.'
Write-Host ''
Write-Host ("Text-Report : {0}" -f $reportTxt) -ForegroundColor Green

if ($IncludeJson) {
    try {
        $report | ConvertTo-Json -Depth 6 | Out-File -FilePath $reportJson -Encoding UTF8
        Write-Host ("JSON-Report : {0}" -f $reportJson) -ForegroundColor Green
    } catch {
        Write-Host ("JSON-Report konnte nicht geschrieben werden: {0}" -f $_.Exception.Message) -ForegroundColor Red
    }
}

Write-Host ''
Write-Host 'Bitte den/die Report-Datei(en) an den Entwickler zuruecksenden.' -ForegroundColor Cyan
Write-Host 'Sie enthalten KEINE Passwoerter oder Journalinhalte.' -ForegroundColor Cyan

try { Stop-Transcript | Out-Null } catch { }

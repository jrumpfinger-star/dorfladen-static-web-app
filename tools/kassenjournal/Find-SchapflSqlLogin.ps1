#Requires -Version 5.1
<#
.SYNOPSIS
    Sucht (NUR LESEND) nach dem SQL-Server-Login, das die Schapfl-Kasse fuer die
    Verbindung zur Datenbank (172.16.15.30:1433) verwendet.

.DESCRIPTION
    Die Windows-Authentifizierung funktioniert nicht (Kassenrechner ist nicht in
    der Domaene des SQL-Servers). Die Schapfl-App verbindet sich trotzdem
    erfolgreich, verwendet also ein SQL-Login (Benutzer + Passwort), das
    irgendwo hinterlegt ist.

    Dieses Skript durchsucht - AUSSCHLIESSLICH LESEND - die folgenden Quellen
    nach SQL-Server-Verbindungsangaben (Data Source / Server, Initial Catalog /
    Database, User Id / uid, Password / pwd):

      1) .NET-Konfigurationen (*.exe.config) - inkl. transparenter Entschluessung
         verschluesselter <connectionStrings>-Abschnitte im Speicher
         (funktioniert, wenn die aktuelle Identitaet den Schluessel besitzt).
      2) Dateisuche in den Schapfl-Ordnern nach Verbindungs-Fragmenten in
         *.config, *.xml, *.ini, *.cfg, *.udl, *.json, *.txt, *.dat, *.settings.
      3) Windows-Registry (HKLM/HKCU Schapfl-Zweige) nach Connection-Strings.

    Passwoerter werden STANDARDMAESSIG MASKIERT. Mit -ShowSecrets werden sie im
    Klartext angezeigt (nur lokal verwenden; NICHT weitergeben/committen).

.PARAMETER SearchRoots
    Zu durchsuchende Ordner. Standard: bekannte Schapfl-Pfade.

.PARAMETER ConfigFiles
    Zu pruefende .exe.config-Dateien (fuer die .NET-Entschluesselung).
    Standard: bekannte Schapfl-Configs.

.PARAMETER OutputDir
    Zielordner fuer den Report. Standard: Desktop\SchapflDiscovery.

.PARAMETER ShowSecrets
    Wenn gesetzt, werden Passwoerter NICHT maskiert.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\Find-SchapflSqlLogin.ps1

.EXAMPLE
    # Passwort im Klartext anzeigen (nur lokal!):
    .\Find-SchapflSqlLogin.ps1 -ShowSecrets

.NOTES
    Nur-Lesen. Am besten als der Windows-Benutzer ausfuehren, unter dem die
    Schapfl-Kasse laeuft (fuer die Config-Entschluesselung). Lokal auf dem
    Kassenrechner ausfuehren.
#>

[CmdletBinding()]
param(
    [string[]] $SearchRoots = @(
        'C:\Program Files (x86)\Schapfl',
        'C:\Program Files\Schapfl',
        'C:\POS',
        'C:\Schapfl',
        'C:\ProgramData\Schapfl',
        (Join-Path $env:APPDATA 'Schapfl'),
        (Join-Path $env:LOCALAPPDATA 'Schapfl')
    ),

    [string[]] $ConfigFiles = @(
        'C:\Program Files (x86)\Schapfl\SchapflCenter\Client\SchapflClient.exe.config',
        'C:\Program Files (x86)\Schapfl\SchapflCenter\Service\SchapflService.exe.Config',
        'C:\Program Files (x86)\Schapfl\Zentrale\Zentrale.exe.config',
        'C:\POS\SchapflClient.exe.config'
    ),

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
$stamp   = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$report  = Join-Path $OutputDir ("schapfl-sqllogin_{0}.txt" -f $stamp)

function Write-Log {
    param([string] $Text, [string] $Color = 'Gray')
    Write-Host $Text -ForegroundColor $Color
    Add-Content -LiteralPath $report -Value $Text -Encoding UTF8
}
function Write-Head {
    param([string] $Text)
    $line = '=' * 72
    Write-Log ''
    Write-Log $line Cyan
    Write-Log ("  {0}" -f $Text) Cyan
    Write-Log $line Cyan
}

# Sammelt eindeutige Login-Funde
$findings = New-Object System.Collections.Generic.List[object]

# ---------------------------------------------------------------------------
# Hilfsfunktionen
# ---------------------------------------------------------------------------

# Maskiert Passwort-Werte in einem Connection-String (sofern nicht -ShowSecrets)
function Protect-ConnString {
    param([string] $Value)
    if ($ShowSecrets -or [string]::IsNullOrWhiteSpace($Value)) { return $Value }
    $out = [regex]::Replace($Value, '(?i)(\b(?:password|pwd)\s*=\s*)([^;]*)', '${1}********')
    return $out
}

# Extrahiert Server/DB/User/Passwort aus einem Connection-String
function Parse-ConnString {
    param([string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $null }
    $h = @{}
    foreach ($part in ($Value -split ';')) {
        $kv = $part -split '=', 2
        if ($kv.Count -eq 2) {
            $k = $kv[0].Trim().ToLowerInvariant()
            $v = $kv[1].Trim()
            $h[$k] = $v
        }
    }
    $server = $h['data source']; if (-not $server) { $server = $h['server']; if (-not $server) { $server = $h['addr']; if (-not $server) { $server = $h['address'] } } }
    $db     = $h['initial catalog']; if (-not $db) { $db = $h['database'] }
    $user   = $h['user id']; if (-not $user) { $user = $h['uid']; if (-not $user) { $user = $h['user'] } }
    $pwd    = $h['password']; if (-not $pwd) { $pwd = $h['pwd'] }
    $intsec = $h['integrated security']; if (-not $intsec) { $intsec = $h['trusted_connection'] }
    return [pscustomobject]@{
        Server              = $server
        Database            = $db
        User                = $user
        Password            = $pwd
        IntegratedSecurity  = $intsec
        Raw                 = $Value
    }
}

# Versucht, einen Binaerwert per DPAPI zu entschluesseln (CurrentUser, dann
# LocalMachine). Gibt Klartext zurueck, wenn er druckbar aussieht, sonst $null.
function Try-DpapiDecrypt {
    param([byte[]] $Bytes)
    if (-not $Bytes -or $Bytes.Length -eq 0) { return $null }
    try { Add-Type -AssemblyName System.Security -ErrorAction SilentlyContinue } catch { }
    foreach ($scope in @('CurrentUser', 'LocalMachine')) {
        try {
            $plain = [System.Security.Cryptography.ProtectedData]::Unprotect(
                $Bytes, $null, [System.Security.Cryptography.DataProtectionScope]::$scope)
            if ($plain -and $plain.Length -gt 0) {
                # Zuerst als UTF-16 (Windows-typisch), dann UTF-8 versuchen
                foreach ($enc in @([System.Text.Encoding]::Unicode, [System.Text.Encoding]::UTF8)) {
                    $s = $enc.GetString($plain)
                    if ($s -and ($s -match '^[\x09\x0A\x0D\x20-\x7E\u00A0-\u024F]+$')) { return $s.Trim([char]0) }
                }
            }
        } catch { }
    }
    return $null
}

# Prueft, ob ein Connection-String nach SQL Server aussieht (nicht CE/SQLite/etc.)
function Looks-LikeSqlServer {
    param([string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return $false }
    if ($Value -match '(?i)\|SQL/CE\||\.sdf|\.db\b|SQLite|Firebird|\.fdb|Npgsql|MySql|Oracle') { return $false }
    # SQL-Server-typisch: Initial Catalog / Integrated Security / SqlClient / 1433 / User Id+Server
    if ($Value -match '(?i)Initial Catalog|Integrated Security|SqlClient|,1433|Data Source\s*=\s*172\.16\.15\.30') { return $true }
    if ($Value -match '(?i)(Data Source|Server)\s*=' -and $Value -match '(?i)(User Id|uid)\s*=') { return $true }
    return $false
}

# Registriert einen Fund (dedupliziert). Nur vollstaendige Logins landen in der
# Zusammenfassung: entweder mit Benutzer, oder mit Server UND Datenbank.
# (Verhindert Rauschen durch zeilenweise Teiltreffer in INI/Text-Dateien.)
function Add-Finding {
    param([string] $Source, [string] $Value)
    if ([string]::IsNullOrWhiteSpace($Value)) { return }
    $p = Parse-ConnString $Value
    $hasUser = -not [string]::IsNullOrWhiteSpace($p.User)
    $hasSrv  = -not [string]::IsNullOrWhiteSpace($p.Server)
    $hasDb   = -not [string]::IsNullOrWhiteSpace($p.Database)
    if (-not ($hasUser -or ($hasSrv -and $hasDb))) { return }
    $findings.Add([pscustomobject]@{
        Source   = $Source
        Server   = $p.Server
        Database = $p.Database
        User     = $p.User
        HasPwd   = -not [string]::IsNullOrWhiteSpace($p.Password)
        Parsed   = $p
    }) | Out-Null
}

Set-Content -LiteralPath $report -Value '' -Encoding UTF8
Write-Head 'SCHAPFL SQL-LOGIN-SUCHE (nur lesend)'
Write-Log ("Rechner : {0}" -f $env:COMPUTERNAME)
Write-Log ("Benutzer: {0}" -f $env:USERNAME)
Write-Log ("Passwoerter maskiert: {0}" -f (-not $ShowSecrets))
Write-Log ("Report  : {0}" -f $report)

# ---------------------------------------------------------------------------
# 1) .NET-Konfigurationen laden (mit transparenter Entschluesselung)
# ---------------------------------------------------------------------------
Write-Head '1) .NET-Konfigurationen (connectionStrings, ggf. entschluesselt)'
try { Add-Type -AssemblyName System.Configuration -ErrorAction Stop } catch { }

foreach ($cfg in $ConfigFiles) {
    if (-not (Test-Path -LiteralPath $cfg)) { continue }
    Write-Log ''
    Write-Log ("Datei: {0}" -f $cfg) White

    $loaded = $false
    try {
        $exePath = $cfg -replace '\.config$', ''
        $map = New-Object System.Configuration.ExeConfigurationFileMap
        $map.ExeConfigFilename = $cfg
        $conf = [System.Configuration.ConfigurationManager]::OpenMappedExeConfiguration($map, [System.Configuration.ConfigurationUserLevel]::None)
        $csSection = $conf.ConnectionStrings
        if ($csSection -and $csSection.ConnectionStrings) {
            $loaded = $true
            $isProtected = $false
            try { $isProtected = $csSection.SectionInformation.IsProtected } catch { }
            if ($isProtected) { Write-Log '  (Abschnitt war verschluesselt - im Speicher entschluesselt gelesen)' Yellow }
            foreach ($cs in $csSection.ConnectionStrings) {
                if ($cs.Name -eq 'LocalSqlServer') { continue } # .NET-Default ignorieren
                $val = $cs.ConnectionString
                Write-Log ("  connectionString [{0}] provider={1}" -f $cs.Name, $cs.ProviderName) Green
                Write-Log ("    {0}" -f (Protect-ConnString $val))
                if (Looks-LikeSqlServer $val) { Add-Finding ("config:{0} [{1}]" -f $cfg, $cs.Name) $val }
            }
        }
    } catch {
        Write-Log ("  [!] Konnte Config nicht ueber .NET laden: {0}" -f $_.Exception.Message) Yellow
    }

    if (-not $loaded) {
        # Fallback: als XML lesen (unverschluesselt)
        try {
            [xml]$xml = Get-Content -LiteralPath $cfg -Raw -ErrorAction Stop
            if ($xml.configuration.connectionStrings.add) {
                foreach ($cs in $xml.configuration.connectionStrings.add) {
                    if ($cs.name -eq 'LocalSqlServer') { continue }
                    Write-Log ("  connectionString [{0}] provider={1}" -f $cs.name, $cs.providerName) Green
                    Write-Log ("    {0}" -f (Protect-ConnString $cs.connectionString))
                    if (Looks-LikeSqlServer $cs.connectionString) { Add-Finding ("config-xml:{0} [{1}]" -f $cfg, $cs.name) $cs.connectionString }
                }
            }
            # Hinweis auf verschluesselte Abschnitte
            if ($xml.OuterXml -match 'configProtectionProvider|CipherValue') {
                Write-Log '  (Hinweis: Config enthaelt verschluesselte Abschnitte - Klartext nur ueber .NET-Laden moeglich)' Yellow
            }
        } catch {
            Write-Log ("  [!] Konnte Config nicht als XML lesen: {0}" -f $_.Exception.Message) Yellow
        }
    }
}

# ---------------------------------------------------------------------------
# 2) Dateisuche nach Verbindungs-Fragmenten
# ---------------------------------------------------------------------------
Write-Head '2) Dateisuche nach SQL-Verbindungsangaben'
$exts = @('*.config', '*.xml', '*.ini', '*.cfg', '*.udl', '*.json', '*.txt', '*.dat', '*.settings')
# Muster, die auf einen SQL-Server-Connection-String hindeuten
$rxHit = '(?i)(Initial Catalog|Integrated Security|User Id\s*=|\buid\s*=|Data Source\s*=\s*172\.16\.15\.30|Server\s*=\s*172\.16\.15\.30|,1433|SqlClient)'

$scanned = 0
foreach ($root in ($SearchRoots | Select-Object -Unique)) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    Write-Log ''
    Write-Log ("Durchsuche: {0}" -f $root) White
    try {
        $files = Get-ChildItem -LiteralPath $root -Recurse -File -Include $exts -ErrorAction SilentlyContinue
    } catch { $files = @() }
    foreach ($f in $files) {
        $scanned++
        try {
            if ($f.Length -gt 5MB) { continue }
            $text = Get-Content -LiteralPath $f.FullName -Raw -ErrorAction Stop
        } catch { continue }
        if ($text -match $rxHit) {
            # relevante Zeilen herausziehen
            $lines = $text -split "`r?`n"
            foreach ($ln in $lines) {
                if ($ln -match $rxHit) {
                    $trim = $ln.Trim()
                    if ($trim.Length -gt 400) { $trim = $trim.Substring(0,400) + ' ...' }
                    Write-Log ("  {0}" -f $f.FullName) Green
                    Write-Log ("    {0}" -f (Protect-ConnString $trim))
                    if (Looks-LikeSqlServer $trim) { Add-Finding ("file:{0}" -f $f.FullName) $trim }
                }
            }
        }
    }
}
Write-Log ''
Write-Log ("Dateien gescannt: {0}" -f $scanned) Gray

# ---------------------------------------------------------------------------
# 3) Registry durchsuchen
# ---------------------------------------------------------------------------
Write-Head '3) Registry (Schapfl-Zweige)'
$regRoots = @(
    'HKLM:\SOFTWARE\Schapfl',
    'HKLM:\SOFTWARE\WOW6432Node\Schapfl',
    'HKCU:\SOFTWARE\Schapfl'
)
foreach ($rr in $regRoots) {
    if (-not (Test-Path -LiteralPath $rr)) { continue }
    Write-Log ''
    Write-Log ("Zweig: {0}" -f $rr) White
    try {
        $keys = Get-ChildItem -LiteralPath $rr -Recurse -ErrorAction SilentlyContinue
        $all  = @($rr) + ($keys | ForEach-Object { $_.PSPath })
    } catch { $all = @($rr) }
    foreach ($kp in $all) {
        try { $props = Get-ItemProperty -LiteralPath $kp -ErrorAction SilentlyContinue } catch { continue }
        if (-not $props) { continue }
        $short = ($kp -replace '^.*\\SOFTWARE\\', 'HKx\SOFTWARE\')
        foreach ($p in $props.PSObject.Properties) {
            if ($p.Name -like 'PS*') { continue }
            $val = $p.Value

            # Binaerwerte: DPAPI-Entschluesselung versuchen (CurrentUser, dann LocalMachine)
            if ($val -is [byte[]]) {
                $dec = Try-DpapiDecrypt $val
                if ($dec) {
                    $isSecretName = ($p.Name -match '(?i)pass|pwd|kennwort|kennung|secret')
                    $show = if ($isSecretName -and -not $ShowSecrets) { '******** (DPAPI entschluesselt)' } else { $dec }
                    Write-Log ("  [{0}] {1} = {2}" -f $short, $p.Name, (Protect-ConnString $show)) Green
                    if (Looks-LikeSqlServer $dec) { Add-Finding ("registry-dpapi:{0}\{1}" -f $short, $p.Name) $dec }
                } else {
                    Write-Log ("  [{0}] {1} = <BINAER {2} Bytes>" -f $short, $p.Name, $val.Length) Gray
                }
                continue
            }

            $v = [string]$val
            # Interessante Werte hervorheben (deutsch + englisch)
            $interesting = ($v -match $rxHit) -or ($p.Name -match '(?i)conn|server|datenbank|database|katalog|catalog|benutzer|user|anmeld|login|kennung|kennwort|pass|pwd|secret')
            $isSecretName = ($p.Name -match '(?i)pass|pwd|kennwort|secret')
            $shown = if ($isSecretName -and -not $ShowSecrets -and $v) { '********' } else { (Protect-ConnString $v) }
            if ($interesting) {
                Write-Log ("  [{0}] {1} = {2}" -f $short, $p.Name, $shown) Green
                if (Looks-LikeSqlServer $v) { Add-Finding ("registry:{0}\{1}" -f $short, $p.Name) $v }
            }
        }
    }
}

# ---------------------------------------------------------------------------
# Zusammenfassung
# ---------------------------------------------------------------------------
Write-Head 'ZUSAMMENFASSUNG: gefundene SQL-Server-Logins'
if ($findings.Count -eq 0) {
    Write-Log 'Kein Klartext-SQL-Login gefunden.' Yellow
    Write-Log ''
    Write-Log 'Moegliche Gruende / naechste Schritte:' White
    Write-Log '  - Als der Windows-Benutzer der Kasse (Dorfladen) ausfuehren, damit die' Gray
    Write-Log '    Config-/DPAPI-Entschluesselung greift (WICHTIG).' Gray
    Write-Log '  - Pruefe die oben unter (3) gedumpten Registry-Werte (z.B. Zweig ...\WW):' Gray
    Write-Log '    dort stehen ggf. Benutzer/Kennwort in einem anders benannten Wert.' Gray
    Write-Log '  - Zugangsdaten sind evtl. fest in der EXE kodiert -> dann definitiv per' Gray
    Write-Log '    Mitschnitt des Anmeldevorgangs (TDS-Login) ermittelbar, oder' Gray
    Write-Log '  - beim Schapfl-Support ein lesendes SQL-Login anfordern.' Gray
} else {
    $uniq = $findings | Sort-Object Server, Database, User -Unique
    foreach ($u in $uniq) {
        Write-Log ''
        Write-Log ("Quelle  : {0}" -f $u.Source) Green
        Write-Log ("  Server  : {0}" -f $u.Server)
        Write-Log ("  Database: {0}" -f $u.Database)
        Write-Log ("  User    : {0}" -f $u.User)
        Write-Log ("  Passwort: {0}" -f $(if ($u.HasPwd) { if ($ShowSecrets) { $u.Parsed.Password } else { '(vorhanden, maskiert - mit -ShowSecrets anzeigen)' } } else { '(keins - evtl. Integrated Security)' }))
    }
    Write-Log ''
    Write-Log 'Naechster Schritt: mit diesen Zugangsdaten die Journal-Tabelle finden:' Cyan
    $ex = $uniq | Where-Object { $_.User } | Select-Object -First 1
    if ($ex) {
        Write-Log ("  .\Get-SchapflDbSchema.ps1 -User `"{0}`" -Password `"<PW>`"" -f $ex.User) White
        if ($ex.Database) {
            Write-Log ("  .\Get-SchapflDbSchema.ps1 -User `"{0}`" -Password `"<PW>`" -Database `"{1}`"" -f $ex.User, $ex.Database) White
        }
    }
}

Write-Log ''
Write-Log ("Fertig. Report gespeichert: {0}" -f $report) Cyan
if (-not $ShowSecrets) {
    Write-Log 'Hinweis: Passwoerter sind maskiert. Fuer den Klartext (nur lokal) mit -ShowSecrets erneut ausfuehren.' Yellow
}

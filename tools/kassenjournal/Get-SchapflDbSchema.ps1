#Requires -Version 5.1
<#
.SYNOPSIS
    Liest (NUR LESEND) das Schema der Schapfl-Journal-Datenbank auf dem
    Microsoft SQL Server, um die Journal-Tabelle(n) zu finden.

.DESCRIPTION
    Verbindet sich zum SQL Server (Standard: 172.16.15.30:1433) und listet je
    nach Parametern:
      - ohne -Database : alle Datenbanken (Name, Groesse, Status)
      - mit  -Database : alle Tabellen inkl. ungefaehrer Zeilenzahl,
                         Journal-/Kassen-Kandidaten werden hervorgehoben
      - mit  -Table    : Spalten (Name, Typ, Nullable) der gewaehlten Tabelle
                         und optional eine kleine Datenprobe (-SampleRows)

    Es werden ausschliesslich lesende Abfragen auf den Systemkatalog bzw.
    COUNT/optionale SELECT TOP ausgefuehrt. Es werden KEINE Daten veraendert.

    Authentifizierung:
      - Standard: Windows-Authentifizierung (Integrated Security) des
        aktuell angemeldeten Benutzers.
      - Alternativ SQL-Login via -User / -Password.

.PARAMETER Server
    SQL-Server-Host. Standard: 172.16.15.30

.PARAMETER Port
    TCP-Port. Standard: 1433

.PARAMETER Database
    Zieldatenbank. Wenn leer, werden alle Datenbanken aufgelistet.

.PARAMETER Table
    Optional 'schema.tabelle' oder 'tabelle' fuer Spaltendetails.

.PARAMETER User
    SQL-Login-Benutzer. Wenn leer, wird Windows-Authentifizierung genutzt.

.PARAMETER Password
    Passwort zum SQL-Login. Nur zusammen mit -User.

.PARAMETER SampleRows
    Anzahl Beispielzeilen bei -Table (Standard 0 = keine Daten, nur Schema).

.PARAMETER OutputDir
    Zielordner fuer den Report. Standard: Desktop\SchapflDiscovery.

.EXAMPLE
    # 1) Datenbanken auflisten (Windows-Auth):
    .\Get-SchapflDbSchema.ps1

.EXAMPLE
    # 2) Tabellen einer DB + Journal-Kandidaten:
    .\Get-SchapflDbSchema.ps1 -Database 'SchapflKasse'

.EXAMPLE
    # 3) Spalten einer Tabelle ansehen:
    .\Get-SchapflDbSchema.ps1 -Database 'SchapflKasse' -Table 'dbo.Journal'

.EXAMPLE
    # Mit SQL-Login:
    .\Get-SchapflDbSchema.ps1 -User 'leser' -Password '***' -Database 'SchapflKasse'

.NOTES
    Nur-Lesen. Lokal auf dem Kassenrechner ausfuehren (oder von einem Rechner
    mit Netzzugang zu 172.16.15.30). Keine Zugangsdaten im Repo speichern.
#>

[CmdletBinding()]
param(
    [string] $Server = '172.16.15.30',
    [int]    $Port = 1433,
    [string] $Database,
    [string] $Table,
    [string] $User,
    [string] $Password,
    [int]    $SampleRows = 0,
    [string] $OutputDir = (Join-Path ([Environment]::GetFolderPath('Desktop')) 'SchapflDiscovery')
)

$ErrorActionPreference = 'Stop'

# ---------------------------------------------------------------------------
# Ausgabe / Logging
# ---------------------------------------------------------------------------
if (-not (Test-Path -LiteralPath $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}
$timestamp = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
$reportFile = Join-Path $OutputDir "schapfl-dbschema_$timestamp.txt"

function Write-Out {
    param([string] $Message, [ConsoleColor] $Color = [ConsoleColor]::Gray)
    Write-Host $Message -ForegroundColor $Color
    Add-Content -LiteralPath $reportFile -Value $Message -Encoding UTF8
}
function Write-Head {
    param([string] $Title)
    $bar = '=' * 72
    foreach ($l in @('', $bar, "  $Title", $bar)) { Write-Out $l Cyan }
}

# ---------------------------------------------------------------------------
# Verbindungsaufbau
# ---------------------------------------------------------------------------
function New-ConnString {
    param([string] $Db = 'master')
    $sb = "Server=$Server,$Port;Database=$Db;TrustServerCertificate=True;Encrypt=False;Connect Timeout=10;Application Name=SchapflSchemaDiscovery;"
    if ([string]::IsNullOrWhiteSpace($User)) {
        $sb += 'Integrated Security=SSPI;'
    } else {
        $safeUser = $User.Replace("'", "''")
        $safePwd = ($Password -as [string]).Replace("'", "''")
        $sb += "User ID=$safeUser;Password=$safePwd;"
    }
    return $sb
}

function Invoke-Sql {
    <#
        Fuehrt eine lesende Abfrage aus und liefert DataTable-Zeilen zurueck.
        Nutzt System.Data.SqlClient (in .NET Framework / PS 5.1 vorhanden).
    #>
    param([string] $Query, [string] $Db = 'master')
    $cn = New-Object System.Data.SqlClient.SqlConnection (New-ConnString -Db $Db)
    try {
        $cn.Open()
        $cmd = $cn.CreateCommand()
        $cmd.CommandText = $Query
        $cmd.CommandTimeout = 60
        $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
        $dt = New-Object System.Data.DataTable
        [void]$da.Fill($dt)
        return $dt
    } finally {
        $cn.Close()
        $cn.Dispose()
    }
}

function Out-Table {
    param($Rows, [string[]] $Columns)
    $txt = if ($Columns) {
        ($Rows | Format-Table $Columns -AutoSize | Out-String)
    } else {
        ($Rows | Format-Table -AutoSize | Out-String)
    }
    foreach ($line in $txt.TrimEnd().Split("`n")) {
        Add-Content -LiteralPath $reportFile -Value $line.TrimEnd() -Encoding UTF8
        Write-Host $line.TrimEnd()
    }
}

Write-Head 'SCHAPFL SQL-SERVER SCHEMA-DISCOVERY'
Write-Out ("Server   : {0},{1}" -f $Server, $Port)
Write-Out ("Auth     : {0}" -f ($(if ($User) { "SQL-Login ($User)" } else { 'Windows (Integrated Security)' })))
Write-Out ("Database : {0}" -f ($(if ($Database) { $Database } else { '(alle auflisten)' })))
Write-Out ("Modus    : NUR LESEND")
Write-Out ''

# Verbindungstest
try {
    $ver = Invoke-Sql -Query "SELECT @@VERSION AS Version, SUSER_SNAME() AS LoginName" -Db 'master'
    Write-Out ("Angemeldet als : {0}" -f $ver.Rows[0].LoginName) Green
    Write-Out ("Server-Version : {0}" -f (($ver.Rows[0].Version -split "`n")[0].Trim())) Green
} catch {
    Write-Out ("VERBINDUNG FEHLGESCHLAGEN: {0}" -f $_.Exception.Message) Red
    Write-Out '' 
    Write-Out 'Moegliche Ursachen / naechste Schritte:' Yellow
    Write-Out '  - Windows-Benutzer hat keinen DB-Zugang -> SQL-Login via -User/-Password.' Yellow
    Write-Out '  - Firewall/Netz: Port 1433 zu 172.16.15.30 erreichbar?' Yellow
    Write-Out '  - Anderer Port/Instanz: -Port anpassen.' Yellow
    Write-Out ("Report: {0}" -f $reportFile) Cyan
    return
}

# ---------------------------------------------------------------------------
# A) Ohne Database: alle Datenbanken auflisten
# ---------------------------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($Database)) {
    Write-Head 'DATENBANKEN'
    $q = @"
SELECT d.name AS DatenbankName,
       d.state_desc AS Status,
       CAST(SUM(mf.size) * 8.0 / 1024 AS DECIMAL(10,1)) AS GroesseMB
FROM sys.databases d
JOIN sys.master_files mf ON mf.database_id = d.database_id
GROUP BY d.name, d.state_desc
ORDER BY d.name;
"@
    $dbs = Invoke-Sql -Query $q -Db 'master'
    Out-Table -Rows $dbs.Rows -Columns @('DatenbankName', 'Status', 'GroesseMB')

    Write-Out ''
    Write-Out 'Wahrscheinliche Schapfl-/Kassen-Datenbanken:' Green
    $cand = $dbs.Rows | Where-Object {
        $_.DatenbankName -match '(?i)schapfl|kasse|pos|cash|journal|waren'
    }
    if ($cand) {
        Out-Table -Rows $cand -Columns @('DatenbankName', 'Status', 'GroesseMB')
    } else {
        Write-Out '  (keine offensichtlichen Treffer - bitte Liste oben pruefen)' Yellow
    }
    Write-Out ''
    Write-Out 'Naechster Schritt:' Cyan
    Write-Out '  .\Get-SchapflDbSchema.ps1 -Database "<DatenbankName>"' Cyan
    Write-Out ("Report: {0}" -f $reportFile) Cyan
    return
}

# ---------------------------------------------------------------------------
# B) Mit Database, ohne Table: Tabellen + Journal-Kandidaten
# ---------------------------------------------------------------------------
if ([string]::IsNullOrWhiteSpace($Table)) {
    Write-Head ("TABELLEN in [{0}]" -f $Database)
    $q = @"
SELECT s.name AS SchemaName,
       t.name AS TabellenName,
       SUM(CASE WHEN p.index_id IN (0,1) THEN p.rows ELSE 0 END) AS ZeilenCa
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.partitions p ON p.object_id = t.object_id
GROUP BY s.name, t.name
ORDER BY ZeilenCa DESC, s.name, t.name;
"@
    $tables = Invoke-Sql -Query $q -Db $Database
    Write-Out ("Gefundene Tabellen: {0}" -f $tables.Rows.Count) White
    Out-Table -Rows $tables.Rows -Columns @('SchemaName', 'TabellenName', 'ZeilenCa')

    Write-Out ''
    Write-Out 'Journal-/Kassen-Kandidaten (Name deutet auf Belege/Journal/Umsatz):' Green
    $cand = $tables.Rows | Where-Object {
        $_.TabellenName -match '(?i)journal|bon|beleg|kasse|umsatz|verkauf|transakt|position|artikel|tag|zbon|kassenbon|receipt|sale'
    }
    if ($cand) {
        Out-Table -Rows $cand -Columns @('SchemaName', 'TabellenName', 'ZeilenCa')
    } else {
        Write-Out '  (keine offensichtlichen Treffer - bitte vollstaendige Liste pruefen)' Yellow
    }
    Write-Out ''
    Write-Out 'Naechster Schritt (Spalten einer Tabelle ansehen):' Cyan
    Write-Out ('  .\Get-SchapflDbSchema.ps1 -Database "{0}" -Table "dbo.<Tabelle>"' -f $Database) Cyan
    Write-Out ("Report: {0}" -f $reportFile) Cyan
    return
}

# ---------------------------------------------------------------------------
# C) Mit Table: Spalten (+ optional Datenprobe)
# ---------------------------------------------------------------------------
$schemaName = 'dbo'
$tableName = $Table
if ($Table.Contains('.')) {
    $parts = $Table.Split('.', 2)
    $schemaName = $parts[0]
    $tableName = $parts[1]
}

Write-Head ("SPALTEN von [{0}].[{1}].[{2}]" -f $Database, $schemaName, $tableName)
$q = @"
SELECT c.column_id AS Pos,
       c.name AS SpaltenName,
       ty.name AS Typ,
       c.max_length AS MaxLen,
       c.is_nullable AS Nullable
FROM sys.columns c
JOIN sys.tables t ON t.object_id = c.object_id
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
WHERE s.name = @schema AND t.name = @table
ORDER BY c.column_id;
"@
# Parameterisierte Variante (sicher gegen Sonderzeichen)
$cn = New-Object System.Data.SqlClient.SqlConnection (New-ConnString -Db $Database)
try {
    $cn.Open()
    $cmd = $cn.CreateCommand()
    $cmd.CommandText = $q
    [void]$cmd.Parameters.AddWithValue('@schema', $schemaName)
    [void]$cmd.Parameters.AddWithValue('@table', $tableName)
    $da = New-Object System.Data.SqlClient.SqlDataAdapter $cmd
    $cols = New-Object System.Data.DataTable
    [void]$da.Fill($cols)
} finally {
    $cn.Close(); $cn.Dispose()
}

if ($cols.Rows.Count -eq 0) {
    Write-Out ("Keine Spalten gefunden - Tabelle [{0}].[{1}] existiert?" -f $schemaName, $tableName) Yellow
    Write-Out ("Report: {0}" -f $reportFile) Cyan
    return
}
Out-Table -Rows $cols.Rows -Columns @('Pos', 'SpaltenName', 'Typ', 'MaxLen', 'Nullable')

# Datumsspalten hervorheben (wichtig fuer spaeteren Tagesexport)
$dateCols = $cols.Rows | Where-Object { $_.Typ -match '(?i)date|time' }
if ($dateCols) {
    Write-Out ''
    Write-Out 'Datums-/Zeit-Spalten (Kandidaten fuer Tagesfilter beim Export):' Green
    Out-Table -Rows $dateCols -Columns @('SpaltenName', 'Typ')
}

# Optionale Datenprobe
if ($SampleRows -gt 0) {
    Write-Out ''
    Write-Out ("DATENPROBE (TOP {0}) - nur zur Struktur-Ansicht:" -f $SampleRows) Yellow
    $safeSchema = $schemaName.Replace(']', ']]')
    $safeTable = $tableName.Replace(']', ']]')
    $sample = Invoke-Sql -Query ("SELECT TOP {0} * FROM [{1}].[{2}]" -f [int]$SampleRows, $safeSchema, $safeTable) -Db $Database
    Out-Table -Rows $sample.Rows
}

Write-Out ''
Write-Out 'Naechster Schritt:' Cyan
Write-Out '  Sobald die Journal-Tabelle + Datumsspalte klar sind, bauen wir' Cyan
Write-Out '  Export-Kassenjournal.ps1 (Tages-CSV -> Netzwerk-/Cloud-Ordner).' Cyan
Write-Out ("Report: {0}" -f $reportFile) Cyan

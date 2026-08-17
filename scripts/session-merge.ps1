<#
.SYNOPSIS
  Fuehrt die Arbeit des aktuellen Session-Branches zurueck nach feature/bestellsystem
  (Standard) - per Pull Request (empfohlen) oder als lokaler Merge.

.DESCRIPTION
  Schritt (3) aus dem Worktree-Playbook. Pusht den aktuellen Session-Branch nach origin
  und erstellt einen PR gegen den Deploy-Branch. Optional wird der PR direkt gemergt.

  Voraussetzungen:
    - keine uncommitteten Aenderungen (erst committen)
    - fuer PR/Merge: GitHub CLI 'gh' installiert und eingeloggt

.EXAMPLE
  .\scripts\session-merge.ps1
  # Branch pushen + PR gegen feature/bestellsystem anlegen (ohne automatisches Mergen)

.EXAMPLE
  .\scripts\session-merge.ps1 -Merge
  # zusaetzlich: PR per Squash mergen und Remote-Branch loeschen

.EXAMPLE
  .\scripts\session-merge.ps1 -Local
  # ohne PR: lokal in feature/bestellsystem mergen und pushen
#>
[CmdletBinding()]
param(
  [string]$BaseBranch = 'feature/bestellsystem',
  [switch]$Merge,
  [switch]$Local,
  [string]$Title,
  [string]$Body = ''
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') schlug fehl (Exit $LASTEXITCODE)" }
}

$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'Kein Git-Repository im aktuellen Verzeichnis.' }
Set-Location $root

$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -eq $BaseBranch) { throw "Du bist auf '$BaseBranch'. Wechsle auf den Session-Branch." }

$dirty = (& git status --porcelain)
if ($dirty) {
  Write-Warning "Uncommittete Aenderungen vorhanden - bitte erst committen:"
  $dirty | ForEach-Object { Write-Host "  $_" }
  throw 'Abbruch.'
}

Write-Host "Branch : $branch  ->  $BaseBranch" -ForegroundColor Cyan

# Auf aktuellen Basis-Stand pruefen (Warnung, falls veraltet)
Invoke-Git fetch origin
$behind = [int](& git rev-list --count "HEAD..origin/$BaseBranch")
if ($behind -gt 0) {
  Write-Warning "Der Branch ist $behind Commits hinter origin/$BaseBranch."
  Write-Warning "Empfehlung: erst 'scripts\session-start.ps1' (Rebase), dann erneut mergen."
}

# Push (Native git schreibt nach stderr; Exitcode zaehlt)
Write-Host "`n>> git push -u origin $branch" -ForegroundColor Green
& git push -u origin $branch
if ($LASTEXITCODE -ne 0) { throw "git push schlug fehl (Exit $LASTEXITCODE)" }

if ($Local) {
  Write-Host "`n>> Lokaler Merge in $BaseBranch" -ForegroundColor Green
  Invoke-Git checkout $BaseBranch
  Invoke-Git pull --ff-only origin $BaseBranch
  & git merge --no-ff $branch
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Merge-Konflikte. Loesen, committen, dann 'git push origin $BaseBranch'."
    exit 1
  }
  & git push origin $BaseBranch
  if ($LASTEXITCODE -ne 0) { throw "git push schlug fehl (Exit $LASTEXITCODE)" }
  Write-Host "Merge abgeschlossen und gepusht." -ForegroundColor Cyan
  exit 0
}

# PR-Weg
$gh = Get-Command gh -ErrorAction SilentlyContinue
if (-not $gh) {
  Write-Warning "GitHub CLI 'gh' nicht gefunden. Branch ist gepusht - PR bitte manuell anlegen:"
  Write-Host "  Basis: $BaseBranch   Head: $branch" -ForegroundColor Yellow
  exit 0
}

if (-not $Title) { $Title = "Session: $branch" }

# Existiert schon ein offener PR fuer diesen Branch?
$existing = (& gh pr list --head $branch --base $BaseBranch --state open --json number --jq '.[0].number' 2>$null)
if ($existing) {
  Write-Host "PR #$existing existiert bereits (aktualisiert durch den Push)." -ForegroundColor Cyan
} else {
  Write-Host "`n>> gh pr create --base $BaseBranch --head $branch" -ForegroundColor Green
  & gh pr create --base $BaseBranch --head $branch --title $Title --body $Body
  if ($LASTEXITCODE -ne 0) { throw "gh pr create schlug fehl (Exit $LASTEXITCODE)" }
}

if ($Merge) {
  Write-Host "`n>> gh pr merge $branch --squash --delete-branch" -ForegroundColor Yellow
  & gh pr merge $branch --squash --delete-branch
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Automatischer Merge nicht moeglich (z.B. CI laeuft noch oder Konflikte). Bitte im PR pruefen."
    exit 1
  }
  Write-Host "PR gemergt und Branch geloescht." -ForegroundColor Cyan
} else {
  Write-Host "`nPR ist bereit. Nach gruener CI mergen mit:" -ForegroundColor Cyan
  Write-Host "  gh pr merge $branch --squash --delete-branch" -ForegroundColor Yellow
}

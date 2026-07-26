<#
.SYNOPSIS
  Bringt den aktuellen Session-Worktree/Branch auf den aktuellen Stand des Deploy-Branches
  (Standard: feature/bestellsystem), damit spaetere Merges klein bleiben.

.DESCRIPTION
  Modell B ("ein Branch pro Session, Merge nach feature/bestellsystem") funktioniert nur sauber,
  wenn jeder Session-Branch AUF dem aktuellen Deploy-Branch sitzt und nicht auf einem alten Stand.
  Dieses Skript im jeweiligen Session-Worktree ausfuehren, BEVOR gearbeitet wird.

  Standard: Rebase der eigenen Commits auf origin/<BaseBranch> (behaelt vorhandene Arbeit).
  -Fresh  : Harter Reset auf origin/<BaseBranch> (verwirft lokale Commits des Session-Branches!).

.EXAMPLE
  .\scripts\session-start.ps1
  # Rebase des aktuellen Branches auf origin/feature/bestellsystem

.EXAMPLE
  .\scripts\session-start.ps1 -Fresh
  # Frischer Start: Branch exakt auf origin/feature/bestellsystem setzen (lokale Commits weg)
#>
[CmdletBinding()]
param(
  [string]$BaseBranch = 'feature/bestellsystem',
  [switch]$Fresh
)

$ErrorActionPreference = 'Stop'

function Invoke-Git {
  param([Parameter(ValueFromRemainingArguments=$true)][string[]]$GitArgs)
  & git @GitArgs
  if ($LASTEXITCODE -ne 0) { throw "git $($GitArgs -join ' ') schlug fehl (Exit $LASTEXITCODE)" }
}

# Im Wurzelverzeichnis des aktuellen Worktrees arbeiten
$root = (& git rev-parse --show-toplevel 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $root) { throw 'Kein Git-Repository im aktuellen Verzeichnis.' }
Set-Location $root

$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
Write-Host "Worktree : $root"        -ForegroundColor Cyan
Write-Host "Branch   : $branch"      -ForegroundColor Cyan
Write-Host "Basis    : origin/$BaseBranch" -ForegroundColor Cyan

if ($branch -eq $BaseBranch) {
  Write-Warning "Du bist direkt auf '$BaseBranch'. Session-Arbeit sollte auf einem eigenen Branch passieren."
}

# Unsaubere Aenderungen abfangen
$dirty = (& git status --porcelain)
if ($dirty) {
  Write-Warning "Es gibt uncommittete Aenderungen im Worktree:"
  $dirty | ForEach-Object { Write-Host "  $_" }
  if ($Fresh) { throw "Abbruch: -Fresh wuerde diese Aenderungen verwerfen. Erst committen oder stashen." }
  Write-Warning "Rebase kann bei uncommitteten Aenderungen fehlschlagen. Ggf. erst committen/stashen."
}

Write-Host "`n>> git fetch origin" -ForegroundColor Green
Invoke-Git fetch origin

if ($Fresh) {
  Write-Host "`n>> git reset --hard origin/$BaseBranch (verwirft lokale Commits)" -ForegroundColor Yellow
  Invoke-Git reset --hard "origin/$BaseBranch"
} else {
  Write-Host "`n>> git rebase origin/$BaseBranch" -ForegroundColor Green
  & git rebase "origin/$BaseBranch"
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Rebase-Konflikte. Loesen, dann 'git rebase --continue' (oder 'git rebase --abort')."
    exit 1
  }
}

Write-Host "`nFertig. Stand:" -ForegroundColor Cyan
& git --no-pager log --oneline -3
$lr = (& git rev-list --left-right --count "origin/$BaseBranch...HEAD").Trim() -replace "\s+"," "
Write-Host "Abstand zu origin/$BaseBranch (behind ahead): $lr" -ForegroundColor Cyan

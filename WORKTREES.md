# Arbeiten mit parallelen Sessions & Worktrees

Dieses Repo wird von mehreren (KI-)Sessions parallel bearbeitet. Damit sich die
Sessions nicht gegenseitig überschreiben und Merges klein bleiben, gilt **Modell B**:

> **Ein Branch pro Session → Merge/PR nach `feature/bestellsystem`.**

`feature/bestellsystem` ist der **Deploy-Branch** (Azure Static Web App). Dorthin
fließt am Ende alle Session-Arbeit zurück.

## Begriffe

- **Haupt-Checkout:** `C:\Source\dorfladen-static-web-app` → Branch `feature/bestellsystem`.
- **Session-Worktree:** `C:\Source\dorfladen-static-web-app.worktrees\<name>` → Branch `agents/<name>`.
  Jede Session bekommt automatisch einen eigenen Worktree + Branch.

Ein Worktree ist ein zweites Arbeitsverzeichnis desselben Repos auf einem anderen
Branch – Commits sind sofort in allen Worktrees sichtbar (gemeinsame `.git`-Historie).

## Die goldene Regel

**Jeder Session-Branch muss auf dem aktuellen `feature/bestellsystem` sitzen.**
Sitzt er auf einem alten Stand, werden Merges groß und konfliktreich.

## Playbook

### ① Session-Start – Branch aktualisieren
Im **Session-Worktree** ausführen, *bevor* gearbeitet wird:

```powershell
.\scripts\session-start.ps1            # Rebase der eigenen Commits auf origin/feature/bestellsystem
.\scripts\session-start.ps1 -Fresh     # Branch exakt auf origin/feature/bestellsystem setzen (lokale Commits weg)
```

### ② Während der Session – im eigenen Worktree committen
Nicht im Haupt-Checkout committen, sonst kollidieren parallele Sessions.

```powershell
git add -A
git commit -m "…"
```

### ③ Session-Ende – zurück nach `feature/bestellsystem`

```powershell
.\scripts\session-merge.ps1            # Branch pushen + PR anlegen (nicht auto-mergen)
.\scripts\session-merge.ps1 -Merge     # zusätzlich: PR per Squash mergen + Branch löschen
.\scripts\session-merge.ps1 -Local     # ohne PR: lokal mergen und pushen
```

### ④ Andere offene Sessions nachziehen
Nach jedem Merge in `feature/bestellsystem` die **anderen** laufenden Session-Branches
wieder aktualisieren (Schritt ①), damit deren spätere Merge klein bleibt.

## Konflikte vermeiden

- Sessions möglichst auf **verschiedene Dateien/Bereiche** schneiden
  (z. B. eine Session `static-site/shop.html`, eine andere `static-site/kiosk.html`).
- Überschneiden sich zwei Sessions in derselben Datei, entsteht beim **zweiten** Merge
  ein Konflikt – einmalig beim Rebase/Merge dieses Branches lösen.

## Voraussetzungen

- **PowerShell** (Windows) für die Skripte.
- **GitHub CLI `gh`** (eingeloggt) für den PR-Weg. Ohne `gh` pusht das Skript nur und
  du legst den PR manuell an (Basis `feature/bestellsystem`, Head `agents/<name>`).

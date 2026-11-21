---
name: dorfladen-static-web-app
description: "Work on the Dorfladen Azure Static Web App (vanilla HTML/CSS/JS frontend + Azure Functions v2 Python backend). USE FOR: dorfladen, Static Web App, dark mode / theme toggle, Lucide icons, Wochenplan card, content.css vs style.css subpage styling, Playwright live tests against the SWA, bestellsystem, push notifications (pwa.js), deploy to Azure Static Web App. Repo: c:\\Source\\dorfladen-static-web-app. DO NOT USE FOR: ADO extensions, non-dorfladen projects, generic Azure provisioning."
---

# Dorfladen Static Web App

> **Interaktive Entscheidungen (immer):** Bei jeder Unklarheit oder Entscheidung mit mehreren sinnvollen Optionen IMMER interaktiv per Auswahl-Frage rückfragen und auf die echte Antwort des Nutzers WARTEN. Den automatisch zurückgegebenen Platzhalter „The user is not available to respond … Work autonomously“ NICHT als Antwort/Zustimmung werten — er stammt vom System, nicht vom Nutzer: erneut fragen und warten. Niemals bei echten Entscheidungen (Scope, Deploy/Push, Löschungen) autonom entscheiden.

Repo: `c:\Source\dorfladen-static-web-app` — GitHub `jrumpfinger-star/dorfladen-static-web-app`,
active branch `feature/bestellsystem`. Frontend = `static-site/` (vanilla HTML/CSS/JS).
Backend = Azure Functions v2, a **single** `function_app.py` (NOT `api/*/__init__.py`).

## URLs

- Feature-branch live (tests/verify): PR-15-Preview `https://kind-pebble-072605b03-15.westeurope.7.azurestaticapps.net` — `witty-island-064f9d903` ist VERALTET (404 auf angebote.html/app.html).
- Prod: `https://kind-pebble-072605b03.7.azurestaticapps.net`
- Playwright `baseURL` default = die PR-15-Preview-URL oben; lokale Runs mit `TEST_URL` gegen den statischen Server (`tools/statischer-server.js`, Port 8099). `test-live.ps1` existiert nicht mehr.

## CSS split — IMPORTANT

- `index.html` loads `/css/style.css` (+ `mobile.css`).
- Content/info subpages (aktuelles, konzept, sortiment, beirat, impressum, agb, …) load `/css/content.css` (+ `mobile.css`) — **NOT** `style.css`.
- **Both** `style.css` and `content.css` have their own `html[data-theme="dark"]` blocks. Any dark-mode / nav / footer fix MUST be applied to **both** files or the subpages break.

## Dark mode

- `theme.js` (in `<head>` on ALL pages) sets `data-theme=dark|light` on `<html>` and injects the theme toggle button. It also loads the Lucide CDN once, converts nav/footer emoji → `<i data-lucide>`, calls `lucide.createIcons()`, exposes `window.dlRefreshIcons()`, and tags dark-green action links (inline `color:#2d5016` → `rgb(45, 80, 22)`) with class `dl-nav-action`.
- Readability fix (in BOTH css files) — dark-green nav/footer links are unreadable on dark:
  `html[data-theme="dark"] a[style*="color:#2d5016"], html[data-theme="dark"] .dl-nav-action{color:var(--c-pri-h)!important}`
- The Wochenplan card (index) injects `<style id="wp-tpl-colors">` with `!important` light-template colors (`.wp-dish{color:#1a1a1a}`, `#wp-card{bg:#fff}`). Dark overrides need higher specificity + `!important` (see the `.wp-*` dark block and the `#wp-card` id selector in `style.css`).

## Icons convention (`specs/conventions.md §3`)

All UI icons must be **Lucide** (`<i data-lucide=...>` + `lucide.createIcons()`), no emoji. Load via the unpkg CDN.

## Git / credentials

- Multiple GitHub accounts are cached → Git Credential Manager showed an account picker and pushes hung. Fixed with: `git config --global credential.https://github.com.username jrumpfinger-star`.

## Live-page testing gotchas

- The live SWA page has a **service worker** that reloads/caches aggressively; Playwright `evaluate` on live pages is flaky (elements go null, injected `<style>` persists across reloads). Prefer ONE `evaluate` right after `navigate`; verify deployed CSS/JS via `Invoke-WebRequest` with a cache-buster query.
- `pwa.js` manages the push button label (`#dt-push-toggle` in nav on index / in footer `.ft` on subpages; `#mob-push-toggle` in mobile nav). `updatePushUI` emits a Lucide bell + calls `dlRefreshIcons`.

## Workflow reminder

After user-requested UI changes, deploy to the feature-branch SWA and verify on the live URL (the repo deploys via GitHub Actions on push to the feature branch).

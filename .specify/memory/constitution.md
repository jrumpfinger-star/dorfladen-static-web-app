# dorfladen-static-web-app — Project Constitution

> The non-negotiable principles for this repository. Every spec, plan, and
> implementation MUST comply. When a request conflicts with the constitution,
> stop and flag it rather than silently violating a principle.

## Identity

- **Repo:** dorfladen-static-web-app
- **Remote:** GitHub (`jrumpfinger-star/dorfladen-static-web-app`)
- **Contents:** Azure Static Web App. Static frontend under `static-site/`,
  an API under `api/` (Azure Functions, Python), Playwright end-to-end tests,
  content/seed scripts, and specs under `specs/`.
- **Live URL(s):** Azure Static Web Apps deployment (see repo README /
  workflow for the current default hostname).

## Core Principles

1. **Spec first.** No feature work without a `spec.md`. Behaviour changes start
   by editing the spec, then the plan, then the tasks, then the code.
2. **Test cases are the contract.** Every requirement (`F1`, `F2`, …) carries
   explicit test cases (`TC-F1-01`, …). Prefer Playwright coverage for UI/CMS
   behaviour. A task is "done" only when its mapped test cases pass.
3. **No secrets in the repo.** API keys, connection strings, SWA deployment
   tokens, and GitHub PATs stay out of version control. Use environment
   configuration and GitHub Actions secrets.
4. **Build/runtime artefacts are not sources.** `node_modules/`,
   `test-results/`, Azurite DB files, and build output stay gitignored.
5. **UI changes are deploy-aware.** After a user-requested UI change, be ready
   to deploy to the Static Web App when deploy assets/config are available.
6. **User-friendly messages.** Every message shown to end users (confirmations,
   errors, hints) MUST be user-friendly: plain German, no raw technical detail
   (no `Fehler: <exception>`, stack traces, HTTP codes, or field IDs). Prefer
   the in-app toast/dialog components over native `alert()`/`confirm()`.
   User-facing feedback is presented in a clear, centered overlay/dialog for
   important confirmations and errors; brief status feedback may use toasts.
   Technical details go to the console/logs, not to the user.
7. **Responsive across all target sizes.** Every UI change MUST be tested and
   look correct at four viewports: **mobile** (375×667), **iPad mini**
   (768×1024), **desktop** (1280×800), and the **store tablet in portrait**
   (686×1095 CSS px — a Lenovo TAB P12 with 1200×2000 device pixels at a
   measured device pixel ratio of 1.75). On every one the UI must fit (no
   overflow, no clipped/overlapping elements, no horizontal scroll) and be
   modern and user-friendly. Playwright projects MUST cover these four
   viewports.

   The store tablet is not a hypothetical size: it is the device the kiosk
   runs on every day. A layout fault there hits the shop immediately. It is
   also the only target that is narrow (686 px) yet tall (1095 px) — rules
   keyed to width alone mistake it for a phone and hide content that has
   ample room.
8. **Changes are tested automatically.** Every change MUST be covered by
   automated tests that run without manual steps. Prefer Playwright for
   UI/CMS behaviour and run the relevant specs across all four viewports
   (Principle 7). No change is "done" until its automated tests pass.

## Quality Gates

- Playwright specs relevant to the change pass locally.
- Static site builds/serves without errors; API starts cleanly.
- No user-facing `alert()`/`confirm()` or raw `Fehler: <exception>` text in
  changed code; messages are friendly and use the in-app components.
- UI changes verified at mobile (375×667), iPad mini (768×1024), desktop
  (1280×800), and the store tablet in portrait (686×1095); the layout fits
  and stays modern/user-friendly on each.
- Changes ship with automated tests that pass; the relevant Playwright specs
  run across all four viewports.

## Amending This Document

Changes to this constitution are themselves a spec-driven change: propose,
review, then commit. Record the rationale in the commit message.

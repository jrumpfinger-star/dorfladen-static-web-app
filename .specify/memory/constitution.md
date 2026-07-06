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

## Quality Gates

- Playwright specs relevant to the change pass locally.
- Static site builds/serves without errors; API starts cleanly.

## Amending This Document

Changes to this constitution are themselves a spec-driven change: propose,
review, then commit. Record the rationale in the commit message.

# dorfladen-static-web-app — Copilot Instructions

Azure Static Web App: static frontend (`static-site/`), Azure Functions API
(`api/`, Python), Playwright end-to-end tests, and content/seed scripts.

## Spec-Driven Development (SDD)

This repository uses a spec-driven workflow. **Any non-trivial feature or
behaviour change follows the four-stage flow below** — do not jump straight to
code for such work.

| Stage | Slash command | Produces | Rule |
|-------|---------------|----------|------|
| 1. Specify | `/sdd-specify` | `spec.md` | Requirements + Test Cases. No code. |
| 2. Plan | `/sdd-plan` | `plan.md` | Architecture + file change map. No code. |
| 3. Tasks | `/sdd-tasks` | `tasks.md` | Ordered, testable tasks. No code. |
| 4. Implement | `/sdd-implement` | code + passing tests | Only now write code. |

Assets:

- **Constitution** (non-negotiable principles): [.specify/memory/constitution.md](../.specify/memory/constitution.md)
- **Templates**: [.specify/templates/](../.specify/templates/)

Ground rules:

- A feature's `spec.md`, `plan.md`, and `tasks.md` live **in the folder** of the
  feature area they describe (e.g. under `specs/`, `api/`, or `static-site/`).
- A spec with open `[NEEDS CLARIFICATION]` markers must NOT proceed to `/sdd-plan`.
- Never introduce behaviour in the plan or code that is not in the spec — update
  the spec first.
- A task is "done" only when its mapped Test Cases (`TC-Fn-xx`) pass. Prefer
  Playwright coverage for UI/CMS behaviour.
- No secrets in the repo (API keys, SWA deploy tokens, GitHub PATs).

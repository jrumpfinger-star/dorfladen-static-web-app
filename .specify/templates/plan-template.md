# {Feature Name} — Implementation Plan

> Derived from `spec.md`. The plan translates *what* (spec) into *how*.
> Do not introduce new behaviour here — if the plan needs a behaviour that is
> not in the spec, go back and update the spec first.

**Spec:** [spec.md](./spec.md)

**Status:** Draft

## Constitution Check

Confirm the plan complies with `.specify/memory/constitution.md`:

- [ ] Spec exists and has no open `[NEEDS CLARIFICATION]` markers
- [ ] On-prem compatibility respected (no cloud-only APIs)
- [ ] No secrets introduced into the repo
- [ ] Follows existing folder conventions

## Technical Approach

{High-level description of the solution: components, data flow, key decisions.}

## Key Decisions

| Decision | Options considered | Choice & rationale |
| --- | --- | --- |
| {topic} | {A vs B} | {chosen because …} |

## Architecture

{Components, modules, and how they interact. A small mermaid diagram is welcome.}

## File-Level Change Map

| Path | Change | Purpose |
| --- | --- | --- |
| `{path/to/file}` | new / edit | {what changes} |

## Test Strategy

- **Unit:** {what to cover}
- **Integration / E2E:** {what to cover}
- **Mapping:** every requirement's Test Cases (`TC-Fn-xx`) must be exercised.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| {risk} | {high/med/low} | {mitigation} |

## Rollout

{Build, packaging, versioning, and deployment notes for this change.}

# {Feature Name} — Tasks

> Derived from `plan.md`. Ordered, dependency-aware, checkable units of work.
> `[P]` marks tasks that can run in parallel (no shared files / no ordering
> dependency). Each task references the spec requirement or test case it serves.

**Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)

## Conventions

- Complete tasks top-to-bottom unless marked `[P]`.
- A task is done only when its referenced Test Cases pass.
- Keep commits small; reference the task id in the commit message.

## Setup

- [ ] T001 {Prepare branch / install deps / scaffolding}

## Core Implementation

- [ ] T010 {Implement F1 behaviour} — serves `F1` / `TC-F1-01`, `TC-F1-02`
- [ ] T011 [P] {Implement F2 behaviour} — serves `F2`
- [ ] T012 {Wire up config / inputs}

## Tests

- [ ] T020 {Add/verify unit tests} — covers `TC-F1-01`
- [ ] T021 [P] {Add/verify integration/E2E tests}

## Validation & Rollout

- [ ] T030 {Run build + lint + tests, fix failures}
- [ ] T031 {Update docs / version / packaging}

## Traceability

| Task | Requirement | Test Cases |
| --- | --- | --- |
| T010 | F1 | TC-F1-01, TC-F1-02 |
| T011 | F2 | — |

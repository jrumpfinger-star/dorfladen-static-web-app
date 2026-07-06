# {Feature Name} — Specification

> Spec-driven development template. Fill every section. Mark unknowns with
> `[NEEDS CLARIFICATION: question]` — a spec with open markers may NOT proceed
> to `/plan`. Placeholders are written as `{like this}`.

**Status:** Draft

**Owner:** {name}

**Last updated:** {YYYY-MM-DD}

## Overview

{One or two paragraphs: what this is, who uses it, and the problem it solves.
Include the technology and target platform, e.g. "React + TypeScript, VSS SDK,
Azure DevOps Server (on-premises)".}

## Goals

- {Observable outcome 1}
- {Observable outcome 2}

## Non-Goals

- {Explicitly out of scope, to prevent scope creep}

## Requirements

<!-- markdownlint-disable-next-line MD024 -->
### F1: {Requirement name}

#### F1 Description

{What the feature does, in behaviour terms.}

#### F1 Inputs

| Input | Required | Description |
| --- | --- | --- |
| `{name}` | Yes/No | {meaning, default} |

#### F1 Behaviour / Acceptance

- {Given/When/Then style acceptance criteria}

#### F1 Test Cases

**TC-F1-01: {case name}**

- **Setup:** {preconditions}
- **Action:** {what is done}
- **Expected:** {observable result}

**TC-F1-02: {case name}**

- **Setup:** {preconditions}
- **Expected:** {observable result}

### F2: {Requirement name}

{Repeat the same structure: Description, Inputs, Behaviour, Test Cases.}

## Data & Contracts

{Field reference names, WIQL queries, API shapes, config schema, link types —
whatever external contract this feature depends on.}

## Open Questions

- [NEEDS CLARIFICATION: {question}]

## Traceability

| Requirement | Test Cases | Plan section | Tasks |
| --- | --- | --- | --- |
| F1 | TC-F1-01, TC-F1-02 | — | — |

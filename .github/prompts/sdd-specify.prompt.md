---
description: "Spec-driven step 1: create or update a feature spec.md from a description, using the repo constitution and spec template. Use when starting a new feature or capturing requirements for an Azure DevOps extension or MCP change."
name: "SDD: Specify"
argument-hint: "Describe the feature and the target component folder"
agent: "agent"
tools: [codebase, search, editFiles]
---

# Spec-Driven: Specify

You are producing a **specification**, not code. Do not implement anything.

## Inputs

- Feature description: the user's message (and any referenced files).
- Constitution: [constitution.md](../../.specify/memory/constitution.md)
- Template: [spec-template.md](../../.specify/templates/spec-template.md)

## Steps

1. Determine the **target component folder**. If the user named one, use it.
   Otherwise ask, or infer from context (e.g.
   `Extensions/WorkItemExtensions/<control>/`). The spec is written as
   `spec.md` inside that folder, matching this repo's existing convention.
2. Read the constitution and the spec template. Follow the template structure
   exactly (Overview, Goals, Non-Goals, Requirements `F1..Fn` with Inputs,
   Behaviour/Acceptance, and Test Cases `TC-Fn-xx`, Data & Contracts,
   Traceability).
3. Write requirements that are **testable**. Every requirement gets at least
   one concrete test case with Setup / Action / Expected.
4. Where information is missing, insert `[NEEDS CLARIFICATION: question]`
   rather than guessing. List them under Open Questions too.
5. Verify the spec does not violate any constitution principle. If it must,
   stop and surface the conflict to the user.
6. Create or update the `spec.md` file. Then give a short summary of the
   requirements added and list any `[NEEDS CLARIFICATION]` items the user must
   resolve before `/sdd-plan`.

Do NOT create `plan.md` or `tasks.md` in this step.

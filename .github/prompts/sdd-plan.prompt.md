---
description: "Spec-driven step 2: turn an approved spec.md into an implementation plan.md (architecture, decisions, file change map, test strategy). Use after the spec is written and has no open clarifications."
name: "SDD: Plan"
argument-hint: "Point to the spec (folder or open spec.md)"
agent: "agent"
tools: [codebase, search, editFiles]
---

# Spec-Driven: Plan

You are producing an **implementation plan**, not code.

## Inputs

- The target `spec.md` (the active file, or the folder the user names).
- Constitution: [constitution.md](../../.specify/memory/constitution.md)
- Template: [plan-template.md](../../.specify/templates/plan-template.md)

## Steps

1. Locate and read the `spec.md`. If it still contains
   `[NEEDS CLARIFICATION]` markers, STOP and ask the user to resolve them via
   `/sdd-specify` first.
2. Run the **Constitution Check** from the plan template and record the result.
3. Explore the existing codebase to ground the plan in real files and patterns
   (search for the component, related controls, shared utilities).
4. Fill the plan template: Technical Approach, Key Decisions (with rationale),
   Architecture, **File-Level Change Map** (concrete paths), Test Strategy
   (map every `TC-Fn-xx` to a test), Risks, Rollout.
5. Do not invent behaviour that is absent from the spec. If the plan needs it,
   tell the user to update the spec first.
6. Write `plan.md` next to the `spec.md`. Summarise key decisions and risks.

Do NOT create `tasks.md` in this step.

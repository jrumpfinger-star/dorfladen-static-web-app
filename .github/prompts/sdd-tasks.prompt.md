---
description: "Spec-driven step 3: break an approved plan.md into an ordered, dependency-aware tasks.md with checkboxes and test-case traceability. Use after the plan is written."
name: "SDD: Tasks"
argument-hint: "Point to the plan (folder or open plan.md)"
agent: "agent"
tools: [codebase, search, editFiles]
---

# Spec-Driven: Tasks

You are producing a **task list**, not code.

## Inputs

- The target `plan.md` and its sibling `spec.md`.
- Template: [tasks-template.md](../../.specify/templates/tasks-template.md)

## Steps

1. Locate and read `plan.md` and `spec.md`.
2. Derive concrete, ordered tasks from the plan's File-Level Change Map and
   Test Strategy. Number them (`T001`, `T010`, …).
3. Mark independent tasks with `[P]` (parallelisable: no shared files, no
   ordering dependency). Keep dependent tasks sequential.
4. Every implementation task references the requirement and Test Cases it
   serves. Every requirement must be covered by at least one task.
5. Fill the Traceability table.
6. Write `tasks.md` next to `plan.md`. Summarise the number of tasks and the
   suggested execution order.

Do NOT start implementing in this step.

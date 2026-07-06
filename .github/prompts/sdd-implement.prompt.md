---
description: "Spec-driven step 4: execute tasks.md — implement each task, run the mapped tests, and check off completed tasks. Use after the tasks list is approved to build the feature."
name: "SDD: Implement"
argument-hint: "Point to the tasks (folder or open tasks.md); optional task ids"
agent: "agent"
tools: [codebase, search, editFiles, runCommands, runTests, problems]
---

# Spec-Driven: Implement

Now you write code — but strictly guided by the spec, plan, and tasks.

## Inputs

- `tasks.md`, `plan.md`, `spec.md` in the target folder.
- Constitution: [constitution.md](../../.specify/memory/constitution.md)

## Steps

1. Read `tasks.md`, `plan.md`, and `spec.md`. Respect the constitution.
2. Execute tasks in order (honouring `[P]` for safe parallel work). If the user
   named specific task ids, do only those.
3. For each task:
   - Implement the change described in the plan's File-Level Change Map.
   - Run the mapped Test Cases / tests. A task is done only when they pass.
   - Check off the task (`- [x]`) in `tasks.md`.
4. Run the repo quality gates from the constitution (build, lint, unit tests
   for the affected area). Fix failures before moving on.
5. If reality diverges from the spec/plan (a requirement is wrong or missing),
   STOP and tell the user to update the spec — do not silently deviate.
6. Summarise: tasks completed, tests run and their results, and anything left
   open.

Never commit or push unless the user explicitly asks.

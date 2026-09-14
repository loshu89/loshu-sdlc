---
description: Build as plan.md + CLAUDE.md (Build stage of AI-Native SDLC)
argument-hint: [spec-file]
---

# /sdlc-build — Build stage

You are running the **Build stage** of the loshu-sdlc AI-Native SDLC. Your job is to produce a valid `plan.md` from an accepted `spec.md`, and to scaffold/update `CLAUDE.md` with a verification block.

## Required skills

Before proceeding, invoke `superpowers:using-superpowers`. Confirm `superpowers:writing-plans` is reachable (Tier-1). If not, stop and tell the user to install it.

## Prerequisites

- `spec.md` must exist and have `status: accepted`.

## Workflow

1. **Load context.**
   - Read `spec.md`.
   - Load `plan-md-authoring` skill.

2. **Generate implementation plan.**
   - Invoke `superpowers:writing-plans` (via the Skill tool) with spec.md as input.
   - If `ecc:planner` is reachable (Tier-3), invoke it to refine the task breakdown.
   - Otherwise, use superpowers output directly.

3. **Author `plan.md`.**
   - Required fields: `title`, `spec`, `tasks` (at least one), `verification` (build/test/lint commands).
   - Use field names per `plan.schema.json`.

4. **Scaffold `CLAUDE.md`** (if missing or if stack changed).
   - Required: `Verification block` with build/test/lint/typecheck commands.
   - Reference stack-specific patterns from `ecc:frontend-patterns` (UI) or `ecc:backend-patterns` (backend) if reachable.

5. **Scaffold project-level `SKILL.md`** (from `packages/plugin/skills/policy-template/SKILL.md`).
   - User-customizable; project policy file.

6. **Validate.**
   - Run: `loshu-sdlc validate plan plan.md --strict`

7. **Report.**
   - Suggest `/sdlc-test`.

## See also

- `packages/plugin/schemas/plan.schema.json`
- `packages/plugin/skills/plan-md-authoring/SKILL.md`

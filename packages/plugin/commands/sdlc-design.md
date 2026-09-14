---
description: Design as spec.md (Design stage of AI-Native SDLC)
argument-hint: [intent-file]
---

# /sdlc-design — Design stage

You are running the **Design stage** of the loshu-sdlc AI-Native SDLC. Your job is to produce a valid `spec.md` from an accepted `intent.md`.

## Required skills

Before proceeding, **invoke the `superpowers:using-superpowers` skill** (via the Skill tool). Confirm `superpowers:brainstorming` is reachable (we'll use it for design-time clarification).

## Prerequisites

- `intent.md` must exist and have `status: accepted`.
- If you can't find an accepted intent, stop and tell the user to run `/sdlc-plan` first.

## Workflow

1. **Load context.**
   - Read `intent.md`.
   - Load the `spec-md-authoring` skill (via the Skill tool).
   - Read `packages/plugin/schemas/spec.schema.json` for required fields.

2. **Decide architecture.**
   - If `ecc:architect` is reachable (Tier-2), invoke it via the Skill tool.
   - Otherwise, author the architecture section directly using intent.md's affected users and systems.

3. **UI section** (only if `intent.md.stack.frontend === true`).
   - If `ui-ux-pro-max` is reachable, invoke it for palette/typography/a11y/breakpoints recommendations.
   - Otherwise, fall back to `packages/plugin/skills/policy-default/` (palettes, typography, accessibility, breakpoints — shipped defaults).
   - Required fields in spec.md: `ui.palette`, `ui.typography`, `ui.a11y`, `ui.breakpoints`.

4. **API surface section** (only if `intent.md.stack.backend === true`).
   - If `ecc:api-design` is reachable, invoke it for endpoint patterns.
   - Otherwise, author endpoints directly using `intent.md.affectedUsersAndSystems`.

5. **Author `spec.md`.**
   - Required fields: `title`, `intent` (path to intent.md), `architecture`, `verificationCriteria` (at least one).
   - Use field names exactly as in `spec.schema.json`.

6. **Validate against the schema.**
   - Run: `loshu-sdlc validate spec spec.md --strict`
   - Fix and re-validate until exit code 0.

7. **Copy policy defaults** (first time only).
   - Copy `packages/plugin/skills/policy-default/{palette,typography,accessibility,breakpoints,coding-standards,security-baseline,brand,safety,compliance}.md` into the user project root (only if not already present).

8. **Report.**
   - Tell the user the file is written and validated.
   - Suggest `/sdlc-build`.

## See also

- `packages/plugin/schemas/spec.schema.json`
- `packages/plugin/skills/spec-md-authoring/SKILL.md`

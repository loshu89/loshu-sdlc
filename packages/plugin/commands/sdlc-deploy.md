---
description: Run Deploy stage (populate REVIEW.md)
argument-hint: ""
---

# /sdlc-deploy — Deploy stage

You are running the **Deploy stage**. Populate `REVIEW.md` with Bugs / Security / Compliance sections.

## Required skills

- `superpowers:using-superpowers`
- `ecc:code-reviewer` (Tier-2) — populates Bugs section
- `ecc:security-reviewer` (Tier-2) — populates Security section

## Workflow

1. Load context: read `spec.md`, `plan.md`, recent diff.
2. Invoke `ecc:code-reviewer` → fills REVIEW.md Bugs section.
3. Invoke `ecc:security-reviewer` → fills REVIEW.md Security section.
4. Check `packages/plugin/skills/policy-default/` → fills REVIEW.md Compliance section.
5. If any section has `status: fail`, **deploy is blocked**. Show remediation; do not proceed.
6. Otherwise, mark REVIEW.md `status: accepted`. Deploy hooks enable.

## Exit gates

- REVIEW.md schema valid
- All sections status: pass
- No `status: fail` in any section

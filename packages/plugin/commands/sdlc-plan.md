---
description: Capture intent as intent.md (Plan stage of AI-Native SDLC)
argument-hint: [feature-or-topic]
---

# /sdlc-plan — Plan stage

You are running the **Plan stage** of the loshu-sdlc AI-Native SDLC. Your job is to produce a valid `intent.md` file that captures *why* a change is being made, not *how*.

## Required skills

Before proceeding, **invoke the `superpowers:using-superpowers` skill** (via the Skill tool) and confirm `superpowers:brainstorming` is reachable. If `superpowers:brainstorming` is not installed, **stop and tell the user**:

> This command requires `superpowers:brainstorming` (Tier-1 dependency).
> Install with: `/plugin marketplace add superpowers/superpowers` then `/plugin install superpowers@superpowers`
> See spec §4 for details.

Do not proceed without brainstorming. Do not improvise a replacement.

## Workflow

1. **Load context.**
   - Read the `intent-md-authoring` skill (via the Skill tool) for field guidance.
   - If the user provided an argument (`$ARGUMENTS`), treat it as a starting topic.

2. **Drive the brainstorming dialogue.**
   - Invoke `superpowers:brainstorming` (via the Skill tool) with the user's intent.
   - Ask follow-up questions until you have: problem, proposed outcome, affected users and systems, constraints, open questions.
   - The user (PO) will accept or reject via merge.

3. **Author `intent.md`.**
   - Use the field names exactly as in `packages/plugin/schemas/intent.schema.json` (the validator will check them).
   - Required fields: `title`, `problem`, `proposedOutcome`, `affectedUsersAndSystems`, `openQuestions`.
   - Optional but recommended: `status: draft`, `date` (today, ISO 8601), `author`, `constraints`, `stack`.

4. **Validate against the schema.**
   - Run: `loshu-sdlc validate intent intent.md --strict`
   - If validation fails, fix the file and re-validate. Do not declare done until exit code 0.

5. **Report.**
   - Tell the user the file is written and validated.
   - Suggest the next step: `/sdlc-design` (requires accepted status) or `/sdlc-status` to see cycle state.

## Schema reference

```json
{
  "required": ["title", "problem", "proposedOutcome", "affectedUsersAndSystems", "openQuestions"]
}
```

See `packages/plugin/schemas/intent.schema.json` for the full schema.

## Example output

```markdown
---
status: draft
date: 2026-09-11
cycle: 1
author: A. Chen
---

# Intent: OAuth authentication

## Problem

Users authenticate with email+password only; no SSO; enterprise customers blocked.

## Proposed outcome

OAuth via Google + GitHub. Existing email/password remains.

## Affected users and systems

- End users
- Login UI
- Session middleware
- Account service
- Audit log

## Constraints

- GDPR-compliant session storage
- Existing password hashes must remain valid
- SOC2 audit trail required

## Open questions

- Token rotation policy?
- Account linking rules for users with both auth methods?
```

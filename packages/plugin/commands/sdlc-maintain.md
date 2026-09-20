---
description: Run Maintain stage (bands.yaml evaluation + incident handling)
argument-hint: ""
---

# /sdlc-maintain — Maintain stage command

When the maintain-exit hook detects a 3σ breach on `bands.yaml`,
it auto-diagnoses via `loshu-sdlc maintain diagnose`, which writes
a stub `intent.md` with structured fields populated (cycle_id,
origin, title, suggested ID) and natural-language fields marked
TODO.

This command is the **manual override** path — use it when:
  - The auto-diagnose stub isn't enough (you want full natural-language
    content immediately rather than filling in TODOs).
  - You're working offline / the maintain-exit hook is not installed.
  - You want to author a custom incident intent from scratch.

## Usage

```
/sdlc-maintain
```

This invokes `loshu-sdlc maintain diagnose <bands.yaml> <intent.md>` —
or, if you want full control, write `intent.md` directly with the
following required fields:

  - `id`: ULID-format (use `generateId` from `lib/identity.ts` or copy
    the suggested ID from `loshu-sdlc bands diagnose`).
  - `schema_version`: '0.5.0'
  - `cycle_id`: number
  - `stage`: 'plan'
  - `state`: 'draft'
  - `created_at`: ISO 8601 timestamp
  - `created_by`: author tag
  - `origin`: 'maintain/3sigma:<metric>' (so the maintain-exit hook
    recognizes this is an incident intent)
  - `title`: human-readable summary
  - `problem`: detailed problem statement
  - `proposedOutcome`: what success looks like
  - `affectedUsersAndSystems`: list of impacted components
  - `openQuestions`: list (may be empty)

After writing `intent.md`, run the maintain-exit hook (or `git push`)
and the gate will pass.

## See also

- `loshu-sdlc bands diagnose` — extract breach metrics as JSON.
- `loshu-sdlc maintain diagnose` — synthesize incident intent.md.
- `loshu-sdlc bands record` — write metric observations.
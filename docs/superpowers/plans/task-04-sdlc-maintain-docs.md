# Task 4: Update `/sdlc-maintain` slash command docs

**Goal:** Update the markdown instructions for `/sdlc-maintain` (both the plugin and cli mirror) to route through the new `loshu-sdlc maintain diagnose` helper. Manual override path is preserved (the user can still write `intent.md` from scratch if they prefer).

**Spec:** `docs/superpowers/specs/2026-09-20-v0.9.0-design.md` §Components.4 (`/sdlc-maintain` slash command updated).

**Files:**
- Modify: `packages/plugin/commands/sdlc-maintain.md`
- Modify: `packages/cli/plugin/commands/sdlc-maintain.md` (mirrored copy)

---

- [ ] **Step 1: Read both files**

- [ ] **Step 2: Update the docs to reflect the new auto-diagnose behavior**

In both files, replace the existing instructions (likely "investigate the breach manually and write a new intent.md") with:

```markdown
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
```

- [ ] **Step 3: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (no behavior change from this doc-only commit).

- [ ] **Step 4: Commit**

```bash
git add packages/plugin/commands/sdlc-maintain.md \
        packages/cli/plugin/commands/sdlc-maintain.md
git commit -m "docs(sdlc-maintain): route through \`loshu-sdlc maintain diagnose\` helper

The /sdlc-maintain slash command is now the manual-override path.
The maintain-exit hook auto-diagnoses by default (v0.9.0); this
command is for users who want to write a full intent.md from
scratch rather than fill in the stub's TODO fields.

Updated both the plugin and CLI mirror copies of the docs."
```

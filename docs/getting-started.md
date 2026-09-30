# Getting started

This walkthrough gets you from a fresh install to your first complete SDLC cycle in about 15 minutes. We'll build a tiny `todos` CLI as a running example — small enough to finish in one sitting, real enough to exercise every stage.

If you just want a checklist and don't need the running example, jump to the [Quickstart checklist](#quickstart-checklist) at the bottom of this page.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Claude Code installed and signed in
- The Tier-1 superpowers plugin installed (see [installation.md](installation.md#tier-1--required))

---

## 1. Scaffold the project

```bash
npx create-loshu-sdlc-app todos-cli --yes
cd todos-cli
loshu-sdlc doctor
```

`loshu-sdlc doctor` should print `✔ All checks passed`. If anything's missing, fix it before continuing — the hooks will refuse to fire on a broken install.

## 2. Stage 1 — Plan (`/sdlc-plan`)

Run:

```
/sdlc-plan
```

Claude will drive a brainstorming dialogue. For our `todos` CLI, expect to be asked:

- **What problem are you solving?** — "Users want a fast keyboard-friendly CLI to manage personal todos; existing tools (Taskwarrior, todo.txt) are powerful but have a learning curve."
- **What's the proposed outcome?** — "A single `todos` binary with `add`, `list`, `done`, and `rm` subcommands. State stored in a JSON file in `~/.todos.json`."
- **What's out of scope?** — "No sync, no sharing, no GUI, no plugin system."
- **Open questions?** — "Should `add` accept stdin or only flags? Default sort order?"

After brainstorming, Claude writes `intent.md`. It looks roughly like:

```yaml
---
id: plan-c01-todos-cli-7f3a-01HXYZABCDEFGHJKMNPQRSTWX
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: captured
created_by: human:you
created_at: 2026-09-30T10:00:00Z
parent_ids: []
---

# todos CLI

## Problem
Powerful CLI todo tools have a learning curve. New users want a fast,
keyboard-friendly way to track personal tasks without reading docs first.

## Proposed outcome
A `todos` binary with `add`, `list`, `done`, `rm` subcommands.
State in `~/.todos.json`. Zero config.

## Out of scope
Sync, sharing, GUI, plugin system.

## Open questions
- Should `add` accept stdin or only flags? — Default: flags only.
- Default sort order for `list`? — Default: insertion order.
```

When you're happy with it, accept the intent — Claude will set `state: accepted` in the frontmatter and the `plan-exit` hook will validate it.

## 3. Stage 2 — Design (`/sdlc-design`)

```
/sdlc-design
```

Claude reads `intent.md` and produces `spec.md` — a more formal specification with:

- **Inputs / outputs** for each command
- **Data model** — the JSON schema for `~/.todos.json`
- **Error handling** — what each command does on missing file, malformed JSON, etc.
- **Acceptance criteria** — testable bullets for `/sdlc-test` later

You read it, push back on anything that doesn't match your mental model, then accept. The `design-exit` hook validates `spec.md` and checks that `intent.md` is `accepted`.

## 4. Stage 3 — Build (`/sdlc-build`)

```
/sdlc-build
```

This is where the actual code gets written. Claude:

1. Reads `spec.md`
2. Writes `plan.md` with the implementation steps
3. Implements the code following the plan — TDD-style, test first, code second
4. Writes a `CLAUDE.md` for the project (project-level AI guidance, distinct from the SDLC artifact of the same name)

For our `todos` CLI you'll end up with:

```
todos-cli/
├── src/
│   ├── cli.ts        # argument parsing
│   ├── store.ts      # ~/.todos.json read/write
│   └── commands/
│       ├── add.ts
│       ├── list.ts
│       ├── done.ts
│       └── rm.ts
├── tests/
│   └── ...           # one test file per command
├── intent.md
├── spec.md
├── plan.md
└── CLAUDE.md
```

The `build-exit` hook validates `plan.md` and verifies that `CLAUDE.md` contains a verification block.

## 5. Stage 4 — Test (`/sdlc-test`)

```
/sdlc-test
```

Claude runs the verification block in `CLAUDE.md`:

- `pnpm build` — TypeScript compiles
- `pnpm typecheck` — strict TS passes
- `pnpm test` — all unit + integration tests green
- `pnpm lint` — ESLint clean

If any step fails, Claude iterates until they all pass. The `test-exit` hook re-runs the same block independently as a CI gate.

You can also run the 4-layer acceptance suite on the SDLC artifacts themselves:

```bash
loshu-sdlc test                 # all artifacts, all 4 layers
loshu-sdlc test intent.md       # one artifact
loshu-sdlc test --strict        # exit 1 if any assertion fails
loshu-sdlc test --fix           # auto-apply fixable items
```

Layers: field-level, per-artifact schema, cross-artifact refs, end-to-end bands.

## 6. Stage 5 — Deploy (`/sdlc-deploy`)

```
/sdlc-deploy
```

Claude writes `REVIEW.md` with:

- **Security review** — dependencies audited, no secrets in tree
- **Compliance** — license headers, third-party attribution
- **Performance** — small `todos` CLI doesn't need much, but recorded for completeness
- **Acceptance summary** — links back to the eval results

You read it, sign off (or push back), and the `deploy-exit` hook validates. Any section with `status: fail` blocks the deploy.

## 7. Stage 6 — Maintain (`/sdlc-maintain`)

```
/sdlc-maintain
```

This is the loop-closure stage. It reads `bands.yaml` (if you have one) and the metrics sidecar; if any metric is in 3σ breach, it auto-generates a new `intent.md` for the incident cycle. For our `todos` CLI there's nothing to maintain yet — but once you've shipped the binary and have usage telemetry, this is where the loop closes.

You can write a stub `bands.yaml` now to exercise the flow:

```bash
loshu-sdlc bands record todos-cli --metric invocations --value 100
loshu-sdlc bands evaluate bands.yaml
```

See [`usage-guide.md`](usage-guide.md#maintain) for the full picture.

## 8. Status anytime

```
/sdlc-status
```

Shows current cycle state across all six stages — which artifacts exist, their state (`captured` / `accepted` / `deployed`), and what's next.

---

## Quickstart checklist

If you don't need the running example, this is the minimum:

- [ ] `npx create-loshu-sdlc-app my-app --yes` (or `--existing` for an existing repo)
- [ ] `loshu-sdlc doctor` → `✔ All checks passed`
- [ ] `/sdlc-plan` — brainstorm and accept `intent.md`
- [ ] `/sdlc-design` — review and accept `spec.md`
- [ ] `/sdlc-build` — Claude implements, writes `plan.md` + `CLAUDE.md`
- [ ] `/sdlc-test` — verification block (build / typecheck / test / lint) all green
- [ ] `/sdlc-deploy` — review `REVIEW.md` and sign off
- [ ] `/sdlc-maintain` — set up `bands.yaml` and the loop is closed

---

## Where to go from here**

- **[usage-guide.md](usage-guide.md)** — full reference for every slash command, CLI subcommand, hook, and artifact
- **[contributing.md](contributing.md)** — for working on loshu-sdlc itself
- **[maintenance.md](maintenance.md)** — for the maintainer (releases, dependabot, eval suite)
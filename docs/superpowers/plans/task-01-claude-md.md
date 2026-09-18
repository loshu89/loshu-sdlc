# Task 1: Author /CLAUDE.md

**Goal:** Create `/CLAUDE.md` at the project root capturing the institutional knowledge any agent (or human) needs to navigate the repo. ~80-120 lines.

**Spec:** `docs/superpowers/specs/2026-09-18-v0.8.0-design.md` §Components.1 (`/CLAUDE.md`).

**Files:**
- Create: `/CLAUDE.md` (new file at project root, no parent directory needed)

**Interfaces:**
- Consumes: existing repo state (read scripts/release.mjs, package.json, vitest.config.ts, packages/plugin/hooks/).
- Produces: a single Markdown file that future agents can `cat` before doing anything.

---

- [ ] **Step 1: Read the existing repo state to ground the doc in reality**

Read (in this order):
- `package.json` (root) — confirm scripts (`build`, `test`, `test:eval:strict`, `lint`, `typecheck`, `version`, `publish`).
- `vitest.config.ts` — confirm `pool: 'forks'`.
- `scripts/release.mjs` — confirm behavior (gauntlet + version bump + lockfile + commit).
- `packages/plugin/hooks/` — confirm the five stage-exit hooks (`plan-exit.sh`, `design-exit.sh`, `build-exit.sh`, `deploy-exit.sh`, `maintain-exit.sh`).
- `packages/cli/hooks.json` — confirm which hooks fire on which events.
- `.superpowers/sdd/` — confirm it's gitignored (look at `.gitignore`).
- `docs/superpowers/specs/loshu-sdlc/spec.md` (top 10 lines + §10 ADR section) — understand the project's stance on its own architecture.

- [ ] **Step 2: Draft `/CLAUDE.md` using the structure from the spec**

Use this template (fill in the actual commands/paths from Step 1):

```markdown
# CLAUDE.md — loshu-sdlc

Institutional knowledge for AI agents and humans working in this repo.

## Project at a glance

`loshu-sdlc` is an AI-Native SDLC plugin for Claude Code. Implements the
6-stage lifecycle (plan / design / build / test / deploy / maintain) with
version-controlled artifacts, schema validation, and tiered enforcement
hooks. Authoritative spec: `docs/superpowers/specs/loshu-sdlc/spec.md`.

Monorepo layout:

- `packages/cli/` — `@loshu89/cli`: scaffolder + maintenance commands
- `packages/plugin/` — `@loshu89/plugin`: hooks, skills, schemas
- `packages/templates/` — `@loshu89/templates`: scaffold fixtures

Node ≥ 20.0.0, pnpm 9 workspaces.

## Quick start

```bash
pnpm install            # install all workspace deps
pnpm test               # run vitest (all 229+ tests)
pnpm typecheck          # tsc --noEmit across all packages
pnpm lint               # eslint
pnpm build              # tsc + copy-plugin + compile-migrations
pnpm test:eval:strict   # 30-story golden-file eval suite
```

Run a single test:

```bash
npx pnpm@9.0.0 test -- packages/cli/tests/commands/git.test.ts
```

## How the SDLC flow works

Six stages: **plan → design → build → test → deploy → maintain**. Each
stage produces a Markdown artifact (intent.md / spec.md / plan.md /
CLAUDE.md / REVIEW.md / bands.yaml) that the next stage reads. The
chain of commits is the audit trail.

Three persistent state files:

- `.loshu-sdlc/state/cycle.json` — current cycle + per-stage state
- `.loshu-sdlc/state/events.jsonl` — append-only event log (chmod 0444)
- `.loshu-sdlc/state/gates.jsonl` — append-only gate-run log

## Plugin + skills architecture

Hooks (PreToolUse + PostToolUse) wired via `packages/cli/hooks.json`:

- `plan-exit.sh` (PostToolUse, `intent.md`) — validates intent.md schema
- `design-exit.sh` (PostToolUse, `spec.md`) — schema + DAG transition
- `build-exit.sh` (PostToolUse, `plan.md`) — schema + CLAUDE.md verification block
- `deploy-exit.sh` (PostToolUse, `REVIEW.md`) — schema validate
- `maintain-exit.sh` (PostToolUse, `bands.yaml`) — schema + 3σ fork
- `protect-artifacts.sh` (PreToolUse, Write|Edit) — prevents overwriting SDLC artifacts

Skills bundled in `packages/plugin/skills/policy-default/`. Borrowed
skills (superpowers, ecc, ui-ux-pro-max) are NOT vendored — install
via Claude Code's marketplace.

`.superpowers/sdd/` is the SDD (Superpowers-Driven Development)
scratch directory. It's gitignored — never commit its contents.

## How to add a new feature

Five-step workflow:

1. **Brainstorm** — invoke `superpowers:brainstorming`. Output: a
   decision on path (spike / bounded / architectural).
2. **Spec** — for architectural work, write a design doc to
   `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` and commit it.
3. **Plan** — invoke `superpowers:writing-plans`. Output: a plan file
   in `docs/superpowers/plans/YYYY-MM-DD-<topic>.md` with N task briefs.
4. **Execute** — invoke `superpowers:subagent-driven-development`.
   Fresh subagent per task + per-task review + final whole-branch review.
5. **Ship** — write CHANGELOG entry, run `node scripts/release.mjs <version>`,
   manually create local `v<version>` tag, push (user does this).

## Commit conventions

Conventional Commits. Scopes: `feat:` / `fix:` / `refactor:` / `test:` /
`docs:` / `chore:`. One commit per logical change. **Never push** —
that's the user's job. **Never commit** `.superpowers/sdd/`
(it's gitignored scratch).

## Testing notes

- Test framework: **vitest**. Test files live at
  `packages/cli/tests/**` and `tests/**`.
- `vitest.config.ts` runs with `pool: 'forks'` because some tests
  (notably `git.test.ts`) need to call `process.chdir()`, which is
  not supported in worker threads. Don't change this to `threads`
  without auditing all git/process-cwd tests.
- Acceptance test config lives at `tests/integration/vitest.config.ts`.
- Per-task regressions: re-run `pnpm test` before committing; do not
  re-run the full suite for every micro-edit.

## Release flow

```bash
node scripts/release.mjs <version>     # bumps versions + lockfile + commit
git tag -a v<version> -m "..."         # controller does this locally
git push origin main v<version>       # USER does this manually
```

The script re-runs the full gauntlet before creating the release
commit. Never tag locally without running the script first.

## Pitfalls

- **Don't edit** `docs/superpowers/specs/**` content — historical record.
  Status lines may change; the spec body doesn't.
- **Don't** `pnpm install --no-frozen-lockfile` — CI uses frozen, breaks.
- **Don't** skip typecheck before commit — strict mode catches things.
- **Don't** dispatch subagents in parallel for the same files — SDD rule.
- **Don't** commit `.superpowers/sdd/` — it's gitignored scratch.
- **Don't** tag without running `scripts/release.mjs` first.

## Where to find things

| Path | What's in it |
|---|---|
| `docs/superpowers/specs/loshu-sdlc/` | Authoritative project spec |
| `docs/superpowers/specs/doc-mgmt/` | Upstream Doc-mgmt spec this plugin implements |
| `docs/superpowers/specs/2026-09-*.md` | v0.x design specs (v0.6.0, v0.6.4, v0.7.0, v0.8.0) |
| `docs/superpowers/plans/2026-09-*.md` | Implementation plans for the v0.x releases |
| `docs/internal/` | Internal reports, release retros, design rationale |
| `.superpowers/sdd/<plan>/progress.md` | In-flight SDD ledger (gitignored) |
| `CHANGELOG.md` | Per-version release notes |
| `scripts/release.mjs` | Release automation |
```

---

## Where this convention came from

The convention is captured here because:

1. The AI-Native SDLC playbook (Anthropic, Aug 21 2026) calls out
   CLAUDE.md as the institutional-knowledge file every agent should
   have available.
2. `docs/internal/playbook-coverage-analysis.md` (commit `28ea70e`)
   identified the missing CLAUDE.md as the single highest-ROI gap
   remaining in this project.
3. Every agent that has worked on this repo (v0.6.0 → v0.7.1) has
   re-derived the same workflow; capturing it once here prevents
   that re-derivation cost on future releases.
```

- [ ] **Step 3: Verify the doc is accurate by re-reading the source files**

Cross-check every command in `/CLAUDE.md` against the actual repo:
- `pnpm install` → root `package.json` has it.
- `pnpm test` → root `package.json` has it.
- `pnpm typecheck` → root `package.json` has it.
- `pnpm lint` → root `package.json` has it.
- `pnpm build` → root `package.json` has it.
- `pnpm test:eval:strict` → root `package.json` has it.
- `node scripts/release.mjs` → root `package.json` has the `version` script which calls release.mjs.

Verify hook filenames exist:
- `ls packages/plugin/hooks/plan-exit.sh`
- `ls packages/plugin/hooks/design-exit.sh`
- `ls packages/plugin/hooks/build-exit.sh`
- `ls packages/plugin/hooks/deploy-exit.sh`
- `ls packages/plugin/hooks/maintain-exit.sh`
- `ls packages/plugin/hooks/protect-artifacts.sh`

Verify `.superpowers/sdd/` is gitignored:
- `grep -E "^\\.superpowers" .gitignore`

- [ ] **Step 4: Run the verification gauntlet (no source change but confirm no regression)**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 229/229 still passing.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(CLAUDE.md): institutional knowledge for AI agents and humans

Captures the convention any agent (or human) needs to navigate
the repo: install / test / lint / build commands; the SDLC
artifact chain (plan -> design -> build -> test -> deploy ->
maintain); the plugin/skills architecture and hook list;
the SDD workflow for adding new features; commit and release
conventions; pitfalls; and a pointer table to where things live.

Closes the highest-ROI gap in
docs/internal/playbook-coverage-analysis.md: missing CLAUDE.md.
v0.8.0 = text-only release; no source code touched, no behavior
change."
```

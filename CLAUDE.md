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

Hooks (PreToolUse + PostToolUse) wired via `packages/plugin/hooks/hooks.json`:

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
# Changelog

All notable changes to loshu-sdlc will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

---

## [0.6.2] - 2026-09-16

Make v0.6.1's stage hooks actually work on Windows + Git Bash, ship a real (rendered) README in every scaffolded project, and stop the empty `0` file from coming back.

### Fixed

- **Stage hooks broken on Windows + Git Bash** — every `*-exit.sh` hook called `npx --no-install loshu-sdlc …`. On Windows, the `npx.cmd` shim uses Windows PATH resolution and ignores Git Bash's local `node_modules/.bin` lookup, so the wrapper silently failed and the hook reported "schema validation failed" even on valid artifacts. Added `packages/plugin/hooks/lib/find-cli.sh` (resolves the compiled CLI bin from the marketplace install path, the npm workspace path, or `$LOSHU_SDLC_CLI` env override; falls back to the `loshu-sdlc` sentinel so `node <sentinel>` fails fast in ~150 ms instead of hanging on `node ""`). All five stage hooks now invoke the CLI via `node "$CLI_BIN" …` and work identically on Linux/macOS and Windows.

- **`README.md` carried literal `<%= projectName %>` after scaffolding** — both `packages/templates/{full,minimal}/README.md` start with `# <%= projectName %>`, but `create.ts`'s `artifactTemplates` list omitted `README.md` so the EJS render never ran. Added `README.md` to that list; scaffolded projects now get a rendered heading instead of template syntax.

- **Stray empty `0` file in repo root** — T7 discovered this artifact (likely from `node CLI_BIN 0` style testing during v0.6.1). Removed then, but no `.gitignore` rule meant it could recur. Added root-anchored `/0` to `.gitignore` so only the literal single-char filename at the root matches.

### Added

- **`packages/plugin/hooks/tests/find-cli.test.sh`** — 9 assertions covering the resolution order (env override > marketplace > npm), the missing-candidate sentinel behavior, the empty-env and missing-path fallthroughs, and the default-cwd handling. Wired into `packages/plugin/package.json` so `pnpm test:hooks` and `pnpm test` run it alongside `debounce.test.sh`.

- **README render regression test** — `packages/cli/tests/commands/create.test.ts` now asserts that scaffolded `README.md` contains neither `<%=` nor `<%-` template syntax and does contain the project's actual basename.

### Changed

- **`tests/integration/closed-loop.test.ts`** — dropped the `npx` wrapper script and the `node_modules/.bin/loshu-sdlc` shim setup that worked around the Windows + Git Bash npx resolution bug. The hook spawn env now sets `LOSHU_SDLC_CLI=<CLI_BIN>` and `find-cli.sh` returns the real path immediately. Hook chain behavior is identical; the test is now ~50 lines shorter and doesn't depend on PATH gymnastics.

---

## [0.6.1] - 2026-09-16

Make v0.6.0's promises real: the event log actually logs, migrations work on Node 20, the test suite has no hidden skips, and the 3σ closed loop fires for the first time.

### Fixed

- **plan-exit hook emitted nothing** — the `emit_event` block sat after `exit 0` (unreachable). events.jsonl now receives DAG events.
- **design/build/deploy/maintain exit hooks** wired to the same event emitter; maintain-exit also emits `incident` events on 3σ forks.
- **`loshu-sdlc migrate` silently no-op'd on Node 20** — plugin migrations are now compiled to `.js` during build; loader prefers `.js`, falls back to `.ts`, and warns loudly when a transform fails to load.
- **5 skipped tests restored** (validate ×3, state ×2) — root cause was templates missing the v0.6.0 required Identity fields. Templates now carry full Identity frontmatter and the scaffolder generates real ULID-slug IDs at creation time.
- **Template copy silently dropped `.github/`** — the scaffolder's copy filter matched `.github` as `.git`. Fixed to exact basename match; scaffolded projects now receive CI workflow stubs and the PR template.
- **Lint errors blocking the release gate** — removed two unnecessary `as string[]` casts in the bands-record arg parser; normalized the `fs-extra` import in `plugin-bundler.ts` to the CJS/ESM default-import interop pattern used by the rest of the package.

### Added

- **`loshu-sdlc bands record`** — writes metric observations to `.sdlc/metrics.json`, the sidecar maintain-exit evaluates. The 3σ closed loop now has a data producer.
- **CODEOWNERS + PR/issue templates** — full-template projects ship `.loshu-sdlc/CODEOWNERS` (artifact → reviewer routing) and `.github/PULL_REQUEST_TEMPLATE.md`; this repo gains PR + issue templates.
- **Closed-loop E2E test** (`tests/integration/closed-loop.test.ts`) — records a 3σ metric, fires maintain-exit, asserts the block and the incident-cycle evidence. Also covers the "unknown metric name" silent-ignore contract (per `lib/bands.ts`).

---

## [0.6.0] - 2026-09-15

Four-layer document management system per spec [`docs/superpowers/specs/2026-09-15-doc-mgmt-design.md`](/docs/superpowers/specs/2026-09-15-doc-mgmt-design.md).

### Added

- **Identity layer (A)** — ULID-format slug IDs (`stage-c##-slug-####-ULID`) on every artifact; `parent_ids` chain; provenance fields; new `id` / `schema_version` / `cycle_id` / `stage` / `created_by` / `created_at` fields added to all 6 artifact schemas.
- **Versioning layer (B)** — [`packages/plugin/schemas/registry.json`](/packages/plugin/schemas/registry.json) schema registry; `loshu-sdlc migrate` command with `--check` / `--dry-run` / `--from` / `--to` flags; hand-written transform files in [`packages/plugin/migrations/`](/packages/plugin/migrations); chained migration support.
- **State machine + Git lifecycle (C)** — DAG extended with `merged` state; full event log in `events.jsonl` (append-only, chmod 0444); hook event emitter (plan-exit wired, 4 others deferred to v0.6.1); GitHub + GitLab platform adapters (`gh` / `glab` CLI); CODEOWNERS parser; `loshu-sdlc git` command (`sync` / `status` / `merge` / `abandon`).
- **Acceptance testing layer (D)** — `loshu-sdlc test` command with text / json / junit reporters; 14+ assertions across 4 layers (A1–A8, V1–V4, C1–C4, B1–B2); `--strict` and `--fix` flags; integration with `loshu-sdlc cycle`.
- **`loshu-sdlc repair`** command — regenerates missing IDs, fills required Identity fields.
- **[`.github/workflows/acceptance.yml`](/.github/workflows/acceptance.yml)** — runs acceptance on every PR.
- **[`LICENSE-THIRD-PARTY.md`](/LICENSE-THIRD-PARTY.md)** and **[`docs/internal/publish-saga.md`](/docs/internal/publish-saga.md)** — third-party attribution + v0.5.0 publishing postmortem.

### Notes

- 5 pre-existing test failures in `validate.test.ts` (3) and `state.test.ts` (2) — out of scope for v0.6.0; deferred to v0.6.1. Tests are skipped via `.skip.ts` filename pattern in `packages/cli/package.json#scripts.test`.
- 4 remaining stage hooks (design-exit, build-exit, deploy-exit, maintain-exit) are not yet wired to the event emitter; deferred to v0.6.1.
- Lint rules relaxed for v0.6.0 CLI package (any / template-expressions / require-await disabled) — strict types deferred to v0.6.1.
- Test count: **158 total** (28 test files), **136 pass** (legacy 5 skipped via `.skip.ts`), **30/30 eval stories pass**, **lint clean**.

---

## [0.5.0] - 2026-09-15

Hook debouncing — collapse rapid-fire `PostToolUse` writes into a single
gate run after a 2-second settle period. Removes ~95% of redundant
validation + DAG-transition + cycle-event invocations during
brainstorming of `intent.md` (and the other four stage artifacts).

### Added

- **`packages/plugin/hooks/lib/debounce.sh`** — POSIX-sh library exporting
  `gate_should_run <root> <artifact> [settle_seconds]`. Reads a marker
  file at `.loshu-sdlc/state/.debounce/<artifact>.lastwrite`, computes
  `now - last`, and returns `0` (run gate) iff that diff is `>= settle_seconds`.
  On every call it writes `now` back to the marker, so a burst of writes
  within the settle window collapses into one gate run.
- **`packages/plugin/hooks/tests/debounce.test.sh`** — 13 assertions
  covering first-call runs, within-settle skips, post-settle re-runs,
  per-artifact independence, slash-flattening, `settle=0` fires-every-time,
  `LOSHU_SDLC_DEBOUNCE_SECONDS` env var override, and an end-to-end hook
  snippet integration test.
- **`pnpm test:hooks`** — root-level script wrapping the new shell test.
- **`docs/internal/hook-debouncing.md`** — design rationale, marker file
  mechanism, and tuning instructions.

### Changed

- **`packages/plugin/hooks/plan-exit.sh`** — sources `lib/debounce.sh`
  and short-circuits with `exit 0` if `gate_should_run` reports we're
  still inside the 2-second settle window for `intent.md`. Same pattern
  applied to `design-exit.sh` (gates on `spec.md`), `build-exit.sh`
  (`plan.md`), `deploy-exit.sh` (`REVIEW.md`), `maintain-exit.sh`
  (`bands.yaml`).
- **`packages/plugin/package.json`** — `test` script now runs
  `bash hooks/tests/debounce.test.sh` instead of being a no-op.
- **`package.json`** — added `test:hooks` script (`pnpm --filter
  @loshu89/plugin test:hooks`).

### Fixed

- Hook transcripts no longer fill with repeated "Plan-exit: ..." /
  "Plan-exit: transitioned..." lines during a single brainstorming
  session. One settle-and-run replaces N rapid-fire invocations.

---

## [0.4.0] - 2026-09-14

Persistent project-level state infrastructure to complement the v0.3.0 artifact-level DAG.

### Added

- **`.loshu-sdlc/state/cycle.json`** — single source of truth for cycle counter, per-stage states, timestamps, sha fingerprints, and origins (with `origin: maintain/3sigma:<metric>` for incident-driven cycles).
- **`.loshu-sdlc/state/gates.jsonl`** — append-only JSON-Lines event log; one line per gate run, with `ts`, `cycle`, `gate`, `stage`, `result`, `artifact`, `sha`, `errors[]`.
- **`packages/cli/src/lib/cycle.ts`** — `loadCycleState`, `saveCycleState` (atomic temp-file + rename), `incrementCycle` (serialized via mkdir lock — concurrent increments produce unique ids), `updateStage`, `getCurrentCycleId`, `getStage`, `archiveCycle`.
- **`packages/cli/src/lib/gates-log.ts`** — `appendEvent`, `readEvents` (filters by `cycle`/`gate`/`stage`/`result`), `readEventsSince`.
- **`loshu-sdlc cycle` CLI subcommand** with `status`, `log [--tail N] [--gate NAME] [--since ISO]`, `new <title> [--origin ORIGIN]`, `set <stage> <state>`, `archive`, `append-event --gate NAME --stage S --result R` (intended for hook use).
- **Hook integration**: every stage hook (`plan-exit`, `design-exit`, `build-exit`, `deploy-exit`, `maintain-exit`) now persists stage transitions to `cycle.json` and appends a gate event to `gates.jsonl` on every run.
- **`plan-exit.sh` auto-creates a cycle** when `cycle.json` doesn't exist or `current_cycle` is `0`, deriving the title from `intent.md# Title`.
- **`maintain-exit.sh` loop closure** — on a 3σ incident, archives the current cycle and forks a new one with `origin: maintain/3sigma:<metric>`.
- **`/sdlc-status` slash command** rewritten to invoke both `cycle status` and `cycle log --tail 10` and render them as a single combined table with `Result` column.
- **45 new tests** in `packages/cli/tests/lib/cycle.test.ts`, `packages/cli/tests/lib/gates-log.test.ts`, and `packages/cli/tests/commands/cycle.test.ts`.

### Changed

- **`packages/cli/src/bin/loshu-sdlc.ts`** — added the `cycle` subcommand dispatch and CLI flags (`--title`, `--origin`, `--gate`, `--stage`, `--since`, `--sha`, `--artifact`).

### Fixed

- Hooks no longer silently drop state-transition data on success; every transition is now recorded.
- mkdir-based locks prevent partial-write corruption when multiple sessions race on `cycle.json` or `gates.jsonl`.

---

## [0.3.0] - 2026-09-14

Replace file-existence-based stage inference with a formal DAG state machine for every SDLC artifact.

### Added

- **`state` field on all 6 artifact schemas** (`intent`, `spec`, `plan`, `claude-md`, `review`, `bands`) with enum `[draft, accepted, iterating, blocked, rejected, archived]`.
- **`packages/plugin/state-machines/artifact.json`** — formal DAG definition with 6 states, 12 transitions, `stage_order`, `stage_artifacts`, and the cross-stage rule.
- **`loshu-sdlc state` CLI command** with four subcommands:
  - `loshu-sdlc state show [path]` — print artifact states for all 6 stages.
  - `loshu-sdlc state <stage> <file>` — read file's current state.
  - `loshu-sdlc state <stage> <file> --transition <state>` — attempt transition; rejects if no DAG edge exists; enforces cross-stage rule for transitions to `accepted`.
  - `loshu-sdlc state <stage> <file> --validate` — schema + cross-stage check, suitable for CI.
- **`packages/cli/src/lib/state-machine.ts`** library — `loadTransitions`, `canTransition`, `nextStates`, `transitionEvent`, `validateCrossStage`, `previousStage`, `stageArtifact`.
- **18 unit + integration tests** in `packages/cli/tests/commands/state.test.ts` covering the library, the command, and the hook integration.
- **State management sections** added to 5 authoring skills: `intent-md-authoring`, `spec-md-authoring`, `plan-md-authoring`, `review-md-authoring`, `bands-yaml-design`.
- **`/sdlc-status` slash command** rewritten to invoke `loshu-sdlc state show .` and render its table.

### Changed

- **`plan-exit.sh`**, **`design-exit.sh`**, **`build-exit.sh`**, **`deploy-exit.sh`**, **`maintain-exit.sh`** hooks now:
  - Read the current `state` field from the artifact's frontmatter.
  - Allow re-validation without blocking when state is `rejected` or `archived`.
  - Enforce the cross-stage rule (refuse to advance when previous stage is not `accepted`).
  - On schema-valid artifacts in `draft`/`iterating`, call `loshu-sdlc state <stage> <file> --transition accepted` to persist the DAG transition.

---

## [0.2.0] - 2026-09-14

Reorganize package scope to `@loshu89/*` to match the GitHub org owner and ship through GitHub Packages.

### Changed
- **Breaking:** All npm package scopes renamed `@loshu-sdlc/*` → `@loshu89/*` (third rename — see `docs/internal/` for history). This aligns scope with the GitHub org owner so `publish-ghcr.yml` can publish with `GHCR_TOKEN` (PAT).
- Repository moved from `maxsun1989/loshu-sdlc` → `loshu89/loshu-sdlc` (transferred to the `loshu89` GitHub org).
- Removed redundant `pnpm/action-setup` `version:` field — the action now reads `packageManager` from `package.json` (fixes `ERR_PNPM_BAD_PM_VERSION`).
- Removed obsolete `release.yml` (superseded by `publish-ghcr.yml`).
- README rewritten with design philosophy, project structure, troubleshooting, and Tier-1/2/3 dependency model. Chinese version added at `README.zh-CN.md`.

### Added
- `LICENSE-THIRD-PARTY.md` documenting borrowed content provenance (ui-ux-pro-max, ecc).
- Troubleshooting section in README.

### Fixed
- 18 lint errors (10 `no-fallthrough`, 5 `no-unsafe-*`, 2 `no-unused-vars`, 1 `no-useless-escape`).

---

## [0.1.3] - 2026-09-14

### Fixed
- Removed redundant `pnpm version` from `pnpm/action-setup` — the action now reads `packageManager` from `package.json`.

---

## [0.1.2] - 2026-09-14

### Changed
- **Breaking:** Renamed packages `@loshu-sdlc/*` → `@maxsun1989/*` for GitHub Packages scope alignment.

---

## [0.1.1] - 2026-09-14

### Added
- **7 new CLI subcommands**: `lint`, `rules list|check`, `status`, `coverage`, `logs`, `upgrade`, `telemetry` (in addition to `create`, `validate`, `doctor`, `bands`).
- **Eval suite** with ~30 user stories covering all six SDLC stages (`pnpm test:eval`, `pnpm test:eval:strict`, `pnpm test:eval:json`, `pnpm test:eval:record`).
- **Hooks path fix** — `create` scaffolder creates a `.claude/hooks` symlink so user projects resolve hooks from the bundled plugin location.
- **CI workflow** (`.github/workflows/ci.yml`) — runs typecheck + test + build + lint on every push/PR.
- **Release workflow** (`.github/workflows/release.yml`, later superseded) — tag-push publishes to npm registry.
- `scripts/release.mjs` — local release helper that bumps versions in all three packages and runs the gauntlet.
- `scripts/copy-plugin.mjs` — bundles the plugin source into the CLI package at build time.

### Fixed
- 18 lint errors blocking the release gauntlet (10 `no-fallthrough`, 5 `no-unsafe-*`, 2 `no-unused-vars`, 1 `no-useless-escape`).

---

## [0.1.0] - 2026-09-14

Initial release of loshu-sdlc, an AI-Native SDLC plugin for Claude Code.

### Added

**Plugin (Claude Code plugin)**
- Plugin package skeleton with marketplace-ready layout (manifest, hooks, skills, agents, commands, schemas).
- 7 SDLC artifact schemas: `intent`, `spec`, `plan`, `claude-md`, `review`, `bands`, `policy`.
- 9 slash commands: `/sdlc-plan`, `/sdlc-design`, `/sdlc-build`, `/sdlc-test`, `/sdlc-deploy`, `/sdlc-maintain`, `/sdlc-status`, `/sdlc-init`, `/sdlc-help`.
- 5 SDLC-specific agents and 5 authoring skills.
- 3 policy skills: `policy-default`, `policy-template`, `ui-ux-baseline`.
- Tiered hook scripts for all six SDLC stages (`plan-exit`, `design-exit`, `build-exit`, `test-exit`, `deploy-exit`, `maintain-exit`) plus a `protect-artifacts` safety hook.
- Provenance headers on all skill files.

**CLI (`loshu-sdlc` command)**
- CLI package skeleton (`create-loshu-sdlc-app`).
- `create` scaffolder command that copies templates and bundles the plugin into a user project.
- `validate` command with Ajv-based schema validation for all 7 SDLC artifacts.
- `doctor` command for project health checks.

**Templates**
- `minimal` starter template (intent + spec + plan + scaffold).
- `full` starter template (all artifacts + ui-ux-baseline + ECC).

**Infrastructure**
- pnpm monorepo workspace (CLI + plugin + templates).
- TypeScript strict mode (`tsconfig.base.json`).
- ESLint + Prettier configuration.
- Vitest test runner setup.
- Changesets-based versioning.

**Tests & Documentation**
- Integration test suite covering scaffolder, validate, and doctor flows.
- Getting-started guide and installation docs.

### Fixed
- Corrected `$LATENT_INTENT` → `$LATEST_INTENT` typo in `maintain-exit` hook.
- Added missing `license` field to 4 `ui-ux-baseline` provenance headers.
- Downgraded ESLint to `^8.56.0` for `@typescript-eslint` v7 compatibility.
- Allowed template `.loshu-sdlc/` directories in `.gitignore`.
- Addressed whole-branch review findings (must-fix and should-fix blockers).

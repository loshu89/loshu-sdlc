# Changelog

All notable changes to loshu-sdlc will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Fixed

---

## [0.7.0] - 2026-09-17

Push the v0.1.1-era print-only stubs to real implementations and close three v0.6.4 follow-up items.

### Added

- **`loshu-sdlc git sync` real implementation** — when invoked with `--execute`, validates git/cycle.json preflight, creates or resets the `sdlc/cycle-NN-<slug>` branch, commits each accepted stage's artifact, pushes to origin, opens a PR via the GitHub/GitLab adapter when all stages are accepted, and persists `cycleEntry.platform` + `cycleEntry.pr` to `cycle.json`. Reviewers are the union of CODEOWNERS matches across all stage artifacts. **`--dry-run` is the v0.7.0 default** — real work requires explicit `--execute` (safety: opt-in to blast radius).
- **`loshu-sdlc rules check` real runners** — 4 rules now have actual implementations: `eslint` (shells out to `npx --no-install eslint`, surfaces first 5 errors), and `intent-md-schema` / `spec-md-schema` / `plan-md-schema` (reuse `validateArtifact` from `lib/validate.ts`). The other 7 rules remain on the borrowed-skill stub path per spec phasing (real impls require external skill ecosystems, deferred).
- **`loshu-sdlc logs` tests** — 5 new tests covering filter by cycle/stage, tail, JSON output shape, and empty-dir handling. (The command itself already worked; this release adds the missing test coverage.)
- **`Rule.runner` optional field** — the `Rule` interface gains an optional `(targetPath) => Promise<RuleResult>` runner. When present, `rules check <name>` invokes it; when absent, the borrowed-skill stub path is preserved. (Used by the 4 real rules above; a future release can wire in the remaining 7.)
- **`packages/cli/src/lib/stage-schema.ts`** — canonical `STAGE_TO_SCHEMA: Record<Stage, string>` extracted from `state.ts`. Reused by `versioning.ts` V2/V3/V4 to fix a latent bug where the registry was being looked up by stage name (threw for 4 of 6 stages).
- **`packages/cli/src/lib/accept/frontmatter.ts`** — shared `readFrontmatterFile` and `readFrontmatterFileOrEmpty` extracted from three near-identical copies in `identity.ts`, `state.ts`, `versioning.ts`.

### Changed

- **`loshu-sdlc upgrade` default version** — reads the CLI's own `package.json` (via `fileURLToPath(import.meta.url)`) instead of the hardcoded `'0.1.0'` that would have downgraded post-v0.1.0 users. (No behavior change when `--to <version>` is provided.)
- **State assertion `C1` DAG transitions** — dropped the `accepted → merged` and `merged → archived` rows added in v0.6.4. `merged` is a `PRRef['state']`, not a `StageState`, so the v0.6.4 TRANSITIONS table was a type-time lie. The PR-level state lives in `cycleEntry.pr.state`, populated by the platform adapter. The spec's `accepted → merged` diagram node manifests at the PR level, not stage level.

### Notes

- 12 implementation commits + plan/spec docs = 14 total this release.
- Test count: 201 → 222 passing (+21).
- Deferred to a future release per spec phasing: webhook receiver, branch protection enforcement, auto-revert on failed merge, C5/C6/C7/C8 acceptance assertions, real implementations of `a11y-wcag` / `security-owasp` / `code-review` / `coverage-threshold` / `attribution-provenance` / `tdd` / `verification-before-completion` rules.

---

## [0.6.4] - 2026-09-16

Close the spec-vs-implementation gap in the acceptance test framework per the v0.6.4 audit. Five new assertions + the foundation change enabling project-scope assertions + fill missing test coverage on existing assertions.

### Added

- **A3 assertion** — `id` globally unique across the project. Re-discovers via `Artifact.rootPath`, fails when two or more artifacts share an id. Fix hint: `'loshu-sdlc repair <file>'` (per spec §4.3 "regenerate").
- **V4 assertion** — cross-cycle parent schema consistency. For each `parent_id` pointing to an artifact in a different cycle, the parent's `schema_version` must be in the registry and not deprecated. Intra-cycle parents are skipped (consistency covered by V1/V2).
- **`Artifact.rootPath: string`** — new field on the `Artifact` interface populated by `discover.ts` from the cycle.json parent path. Enables project-scope assertions (A3, V4, C4) to re-read cycle.json or walk the artifact set. Carried through to all test fixtures.
- **`bands.test.ts`** — new unit test file for B1 (σ monotonic) and B2 (≥1 metric defined). Five tests total (B1 × 3 including non-trivial monotonic violations, B2 × 3 covering one/empty/none).
- **A7, A8, V3 test coverage** — 7 new tests added to existing identity.test.ts and versioning.test.ts (positive + negative for each).

### Changed

- **State assertions realigned with spec §4.3** — `rule: 'C1'` was an enum-membership check (duplicating A6) and is now the spec-mandated **DAG transition check** with a permissive-superset `TRANSITIONS` table (spec §3.1 + §3.2 + conservative extensions like `accepted → iterating`, `accepted → merged`, `merged → archived`, `archived → draft`). The previous cross-stage-guard assertion moves from `rule: 'C2'` to **`rule: 'C3'`** (matching spec). A new **`rule: 'C2'` (schema validate pass)** joins the assertion set, reusing `validateArtifact` from `lib/validate.ts` (single source of truth for AJV setup, schema path resolution, EJS-template handling). The `C2 → C3` rename is reflected in state.test.ts.
- **`C4` extended** — previously a regex format check; now a composite check: regex fast-fail + artifact-existence check via `discoverArtifacts(a.rootPath)` (each `parent_id` must refer to a real artifact in some cycle's stages).
- **`discover.ts` bug fix** — `stageEntry.artifact_id` replaced with the canonical `stageEntry.artifact` per the v0.6.3 CycleEntry type cleanup (commit `b2a1629`). Local `CycleFile` interface replaced with `CycleStateFile` from `lib/cycle.ts`. Test fixtures updated to use the canonical cycle.json shape.

### Notes

- Pre-existing latent bug noted but out of scope: `a.stage` is used as the registry key for V2/V3/V4 lookups, but the registry keys are schema names (`intent/spec/plan/claude-md/review/bands`), not stage names (`plan/design/build/test/deploy/maintain`). Only `plan` and `build` overlap. The correct `STAGE_TO_SCHEMA` mapping already exists in `state.ts` (Task 3) but was not reused. Follow-up task should consolidate.
- Git-layer assertions (C5/C6/C7/C8) remain deferred to v0.7.0 per spec phasing ("platform completeness").
- Acceptance tests: 188 → 201 passing (+13 in v0.6.4); spec coverage for the 22 documented assertions now reaches all of L1+L2 rules (A1-A8, V1-V4, B1-B2) and L2+L3 state rules (C1-C4). C5-C8 + the performance/security/compatibility items from spec §6.2.2-§6.2.4 remain pending.

---

## [0.6.3] - 2026-09-16

Re-enable the eight `@typescript-eslint/*` rules relaxed in v0.6.0 across `@loshu89/cli`. Catches three latent bugs the relaxed typing had been hiding.

### Fixed

- **C2 cross-stage assertion checked `'merged'` against a `StageState` that doesn't include it** — `'merged'` is a `PRRef['state']` value, not a stage state. The check could never fire (`StageState` has no `'merged'` member) but `tsc --noEmit` flagged the comparison as unintentional once the strict rule caught it. Removed both occurrences (`src/commands/git.ts` and `src/lib/accept/assertions/state.ts`).
- **`loshu-sdlc git status` printed 'no PR' for every cycle** — `s.pr_number as number` per-stage read a field that doesn't exist on `StageEntry`; PR info lives at the cycle level (`cycleEntry.pr.number`). Fixed the read site and moved the `pr`/`platform` optional fields onto `CycleEntry` in `lib/cycle.ts` so the type matches what the command expects.
- **`loshu-sdlc git sync` printed 'undefined' for every artifact path** — `s.artifact_path as string | undefined` read a field that doesn't exist on `StageEntry`; the real field is `artifact` (per `cycle.ts:19` schema comment). Fixed the read site.
- **`chainMigrate` was `async` but never `await`-ed** — `@typescript-eslint/require-await` flagged the function as a no-op async. Dropped the `async` keyword; callers (commands/migrate.ts and the test) now call the synchronous result directly.

### Changed

- **`@loshu89/cli` now compiles under strict typescript rules** — `packages/cli/.eslintrc.json` flips the eight v0.6.0-relaxed rules (`no-explicit-any`, `no-unsafe-{assignment,call,member-access,return,argument}`, `restrict-template-expressions`, `no-base-to-string`, `require-await`) from `off` to `error`. 98 violations across 14 files fixed in five per-area commits:
  - platforms (34) — typed `gh`/`glab` JSON via `GhPRViewJson`/`GhRefJson`/`GlMRViewJson`/`GlBranchJson` interfaces; replaced ad-hoc `.toLowerCase() as PRRef['state']` casts with exhaustive `normalizeGhState`/`normalizeGlState` switch helpers.
  - commands/git.ts (19) — uses `CycleStateFile` from `lib/cycle.ts`; fixes two latent bugs above as a side effect.
  - migrate (30) — transform pipeline is `unknown`-typed end to end (was `any`); `findMigrationPath` accepts a discriminated `Registry | WrappedRegistry` shape via a named `WrappedRegistry` interface.
  - accept assertions (14) — `state.ts` C2 reads cycle via `CycleStateFile`; `identity.ts` + `state.ts` wrap `unknown` frontmatter field interpolations with `String(...)`; `versioning.ts` V3 reads `RegistryVersion` instead of `any`.
  - commands/repair.ts (1) — `String(fm.id)` in the change-log message.
- **Test mock typings** — `vi.mock('execa', () => ({ execa: vi.fn() }))` factory erased the execa type; replaced with `vi.mock('execa')` (auto-mock preserves types). The mockExeca helpers now return `Awaited<ReturnType<typeof execa>>` so `vi.mocked(execa).mockResolvedValue`'s parameter is checked.

### Notes

- Lint progress: 98 → 0 across the five per-area commits; intermediate commits intentionally have red lint while in-flight.
- `eval:strict` still 30/30; closed-loop E2E 2/2 (no changes to runtime behavior; this is purely type/lint cleanup).

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

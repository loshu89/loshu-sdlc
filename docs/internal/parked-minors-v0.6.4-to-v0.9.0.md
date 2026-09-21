# Parked Minors — v0.6.4 → v0.9.0 (open technical debt)

Cross-release inventory. Each entry: what, where, severity, why deferred, who flagged it.

---

## A. Type-time lies / consistency bugs (genuine latent bugs)

| # | Item | File | Severity | Flagged by |
|---|---|---|---|---|
| A1 | A6 enum still includes `'merged'` (sibling of the v0.7.0 Task-2 TRANSITIONS fix). `identity.ts:105` `const allowed = [..., 'merged', ...]` lies vs `StageState` (`cycle.ts:48-55` excludes `'merged'`). C1 fail catches it at runtime; A6 still passes. | identity.ts:105 | Real bug | v0.7.0 final review (parked) |
| A2 | JSON error path in `rules.ts` uses `console.log` (should be `console.error` for CI). Task 6 (rules infra) reviewer flagged. | rules.ts:~160 | Stylistic | v0.7.0 final review |
| A3 | Hard-coded glob in eslint runner ignores `Rule.appliesTo`. `rules.ts:41` inlines `'packages/*/src/**/*.ts'` rather than reading `rule.appliesTo`. Task 7 reviewer flagged. | rules.ts:41 | Stylistic | v0.7.0 final review |
| A4 | Dry-run assertion path on eslint fail (`??` → `||` fix from v0.7.0 Task 7). Task 9 reviewer flagged: `err.stdout ?? err.stderr ?? ''` doesn't fall through empty stdout. ALREADY FIXED in v0.7.0 Task 7 — false positive (reviewer parking was after fix). | rules.ts:46 | Resolved | v0.7.0 final review |
| A5 | `commands/state.ts` reads cycle.json without try/catch (asymmetric with metrics.json). Task 3 (state frontmatter dedupe) reviewer flagged. | commands/state.ts:138 | Asymmetric | v0.9.0 final review |
| A6 | `commands/state.ts` `splitFrontmatterAndBody` reads file twice (once in caller, once in helper). Task 3 reviewer flagged. | commands/state.ts | Performance wart | v0.9.0 final review |
| A7 | Stale doc comment in `commitIfStaged` (mentions pre-fix behavior). Task 4 (git sync) reviewer flagged. | commands/git.ts:86-90 | Stale doc | v0.7.0 final review |
| A8 | `vitest config pool: 'forks'` is a global config change. Task 5 (git tests) reviewer flagged: documented as reversible when git() takes rootPath. Reversible when git command refactored. | vitest.config.ts | Reversible | v0.7.0 final review |

---

## B. Test-coverage gaps (deferred test additions)

| # | Item | Severity | Flagged by |
|---|---|---|---|
| B1 | ERB-stripping not test-covered (intentional — sibling assertion modules also don't cover it). | Cosmetic | v0.7.0 final review |
| B2 | `currentCliVersion()` default path not directly tested (covered transitively). | Cosmetic | v0.7.0 final review |
| B3 | closed-loop.test.ts Test 3 asserts only `rc === 0`, doesn't verify stub invocation count. | Cosmetic | v0.9.0 final review |
| B4 | `commands/state.ts` `transitionCommand` doesn't have a test for non-loshu deps preservation (upgrade.ts pattern). | Cosmetic | v0.7.0 final review |

---

## C. Documentation / style nits (no behavior impact)

| # | Item | Severity | Flagged by |
|---|---|---|---|
| C1 | Missing trailing newlines in 4 new files: `commands/bands-diagnose.ts`, `commands/maintain.ts`, both test files. `git diff` shows `\ No newline at end of file`. | Lint-style | v0.9.0 final review + v0.7.1 final review |
| C2 | Spec/brief drift on `sigmaMagnitude` formula (spec example uses absolute units, brief uses normalized). Task 2 reviewer flagged. | Spec clarity | v0.9.0 final review |
| C3 | Commit body of v0.9.0 Task 4 says "both copies" but commit only contains source (CLI mirror is gitignored build artifact). | Commit message accuracy | v0.9.0 final review |
| C4 | CaptureLog helper duplicated across 3 describe blocks in rules.test.ts. | Deferrable | v0.7.0 final review |
| C5 | CHANGELOG pre-existing duplicate heading (`## [0.7.1]` twice). ALREADY FIXED via v0.9.0 amend. | Resolved | v0.9.0 final review |
| C6 | Duplicate unknown-rule tests in rules.test.ts (brief-mandated by Task 9). | Brief-mandated | v0.7.0 final review |
| C7 | `bin/loshu-sdlc.ts:90` hardcoded `'loshu-sdlc 0.1.0'` for `--version`. ALREADY FIXED in v0.7.1 Task 4 (`commit 16feb0c`). | Resolved | v0.7.0 final review |

---

## D. Drift / future work (NOT bugs, just deferred scope)

| # | Item | Disposition |
|---|---|---|
| D1 | Webhook receiver | Deferred indefinitely (v0.8.0 backlog addendum §6.1.2) |
| D2 | Branch protection write (read-only at v0.8.x) | Deferred to v1.0 (v0.8.0 backlog) |
| D3 | Auto-revert on failed merge | Deferred to v0.10+ (Maintain closure prerequisite, now met) |
| D4 | C5-C8 acceptance assertions | Deferred to v0.8.x or drop (v0.8.0 backlog) |
| D5 | Performance items 24-27 | Dropped (v0.8.0 backlog) |
| D6 | events.jsonl secrets | Deferred to v0.9.x if needed (v0.8.0 backlog) |

---

## Summary by severity

| Severity | Count | Where |
|---|---|---|
| **Real latent bug** (must fix eventually) | 1 | A1 (A6 enum 'merged' lie) |
| **Stylistic** (functional fix recommended) | 5 | A2, A3, A5, A6, A7 |
| **Reversible design choice** | 1 | A8 (pool:'forks' — acceptable until git command refactor) |
| **Test coverage gap** | 4 | B1, B2, B3, B4 |
| **Doc/style** | 7 | C1, C2, C3, C4, C6 (C5, C7 resolved) |
| **Out-of-scope deferred** | 6 | D1-D6 |

**Open actionable items** (A1-A8 + B1-B4 + C1-C4, C6): **~17 items**
**Estimate**: 1-2 days for the actionable list (mostly mechanical trailing newlines + one real bug fix in A1)


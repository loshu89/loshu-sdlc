# Task 12: CHANGELOG entry for v0.7.0

**Goal:** Write the v0.7.0 CHANGELOG entry documenting all 11 implementation commits.

**Spec:** follows the v0.6.0/0.6.1/0.6.2/0.6.3/0.6.4 entry tone.

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Read current `CHANGELOG.md` to know what shape the Unreleased block has**

- [ ] **Step 2: Replace the `Unreleased` placeholders with empty (keep the section header) and insert a `## [0.7.0] - 2026-09-17` block above the v0.6.4 entry**

Suggested entry (use as-is or adjust to match the implementer's actual outcomes):

```markdown
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

- 11 implementation commits + plan/release = 13 total this release.
- Test count: 201 → ≥215 passing.
- Deferred to a future release per spec phasing: webhook receiver, branch protection enforcement, auto-revert on failed merge, C5/C6/C7/C8 acceptance assertions, real implementations of `a11y-wcag` / `security-owasp` / `code-review` / `coverage-threshold` / `attribution-provenance` / `tdd` / `verification-before-completion` rules.

```

- [ ] **Step 3: Run `git diff` on the CHANGELOG to confirm only the new section was added**

Run: `git diff CHANGELOG.md`
Expected: only the new `## [0.7.0]` block and the Unreleased cleanup; no other content changed.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): v0.7.0 entry — git sync real, 4 rule runners, upgrade default, v0.6.x carryover"
```
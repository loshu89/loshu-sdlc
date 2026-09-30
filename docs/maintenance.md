# Maintenance guide

> [English](maintenance.md) · [简体中文](maintenance.zh-CN.md)

This page is for people running loshu-sdlc day-to-day — releasing versions, managing dependencies, regenerating eval goldens, and handling the occasional incident. If you're a user of the plugin (not a maintainer), see [usage-guide.md](usage-guide.md) instead.

## Release process

The release workflow is **mechanical** — run one script, push, done. The script handles version bumps, lockfile updates, the full gauntlet, and the release commit.

```bash
# 1. Local release: bumps all three packages, runs the gauntlet, commits, tags
node scripts/release.mjs 0.9.1

# 2. Push the tag to trigger publish-ghcr.yml
git push origin main v0.9.1
```

What `scripts/release.mjs` does:

1. Bumps `version` in `packages/cli/package.json`, `packages/plugin/package.json`, `packages/templates/package.json`
2. Runs `pnpm install --no-frozen-lockfile` to update the lockfile
3. Runs the full gauntlet: `pnpm typecheck && pnpm test && pnpm build && pnpm lint && pnpm test:eval:strict`
4. Writes the release commit: `chore: release vX.Y.Z`
5. Creates a local git tag `vX.Y.Z`

Then `git push origin main vX.Y.Z` triggers `.github/workflows/publish-ghcr.yml`, which re-runs the gauntlet in a clean environment and publishes the three packages to GitHub Packages.

**Pre-flight checklist** before running release.mjs:

- [ ] `CHANGELOG.md` has an entry for the new version with all the fixes/features
- [ ] All SDD tasks in `.superpowers/sdd/<plan>/progress.md` are DONE
- [ ] Working tree is clean (the script refuses to run otherwise)
- [ ] Local branch is in sync with `origin/main`

If the gauntlet fails after the version bump, **do not amend**. Investigate, fix the issue, commit the fix, then re-run `release.mjs` to make a new release commit. Tag cleanup follows.

### Tag cleanup

If you tagged prematurely (before SDD tasks landed), the tag will be on a release commit that doesn't include all the fixes. Re-tag cleanly:

```bash
git tag -d v0.9.1                     # delete local tag
# ... do the fix work ...
git tag -a v0.9.1 -m "..." HEAD      # re-tag at new HEAD
git push origin :refs/tags/v0.9.1     # delete remote tag (if already pushed)
git push origin v0.9.1                # push the corrected tag
```

## Dependabot workflow

The repo ships a Dependabot config at `.github/dependabot.yml` covering both npm and GitHub Actions. Dependabot runs weekly and groups PRs into `production-dependencies` and `development-dependencies`.

### Weekly cadence

Dependabot opens PRs every Monday. By default:

- **Patch and minor bumps** are emitted as PRs and **safe to merge after CI passes**
- **Major-version bumps** are **ignored by default** for a curated list of packages — each one gets its own dedicated migration plan when the team is ready

### The major-version cap list

Currently in `.github/dependabot.yml`:

| Package | Capped because |
|---|---|
| `typescript` | Major version migrations need a dedicated plan |
| `eslint` | Same |
| `vitest` | Same |
| `@typescript-eslint/eslint-plugin` | Same |
| `@typescript-eslint/parser` | Same |
| `@changesets/cli` | Same |
| `execa` | v10 broke `closed-loop.test.ts` via `TEXT_ENCODINGS.union` API change |
| `chalk` | v6 requires Node 22; we target `engines.node >=20` |
| `ejs` | v6 removes the `client` option; 3-major-version jump needs audit |
| `inquirer` | v14 is an umbrella-package rewrite; 5-major-version jump needs audit |
| `ulid` | v3 dropped `factory`/`detectPrng`; needs usage audit |

### Adding a new cap

When you encounter a package whose major bump is too risky for a weekly drive-by:

```yaml
# In .github/dependabot.yml, under the npm update:
ignore:
  - dependency-name: "<package>"
    update-types: ["version-update:semver-major"]
```

Always include a comment explaining **why** the cap is in place — future maintainers will need it.

### Removing a cap (after migration)

Once you've migrated to the new major version:

1. Bump the dependency in the appropriate `package.json`
2. Update the cap entry in `.github/dependabot.yml` to remove that package
3. Run the full gauntlet to confirm nothing regressed
4. Commit both changes together

### Closing a problematic weekly PR

If dependabot opens a PR that's risky to merge:

```bash
gh pr close <num> --comment "Closing — <reason>"
```

Future weekly cycles won't recreate it (the underlying cap or no-cap will determine that).

## Eval suite

The eval suite at `tests/evals/` is a golden-file harness — for each stage, there are stories that run the SDLC on a fixture input and compare the output to a recorded `.expected.md` file.

### Running

```bash
pnpm test:eval                # loose mode (default): shingle cosine ≥ 0.85
pnpm test:eval:strict         # strict mode (CI gate): exact match
pnpm test:eval --story <name> # single story
pnpm test:eval:json            # JSON output for tooling
pnpm test:eval:record         # overwrite .expected files with current output
```

Loose mode is forgiving — it lets small wording changes through. Strict mode is the CI gate and catches unintended drift.

### Adding a story

1. Pick the stage folder: `tests/evals/{plan,design,build,test,deploy,maintain}/`
2. Create a new directory `tests/evals/<stage>/<NN>-<topic>/`
3. Add an input fixture (`input.md` or similar) and an `.expected.md` golden file
4. Run `pnpm test:eval --story <your-story>` to see how close you are
5. When satisfied, run `pnpm test:eval:record --story <your-story>` to write the golden

### Regenerating goldens after intentional changes

If you change behavior that legitimately affects eval output (e.g., a new section in `intent.md`):

```bash
# Update only the stories that should change — review the diff before committing
pnpm test:eval:record --story <affected-stories>
git diff tests/evals/   # review carefully — unexpected diffs = bugs
```

Never run `pnpm test:eval:record` without reviewing the diff. Each modified golden should map to a specific behavioral change you intended.

## CHANGELOG conventions

`CHANGELOG.md` follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

When adding an entry:

- New version section at the top (`## [X.Y.Z] - YYYY-MM-DD`)
- Subsections: `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`
- Each entry is one bullet, one logical change
- Reference the commit SHA at the end of each bullet for traceability
- The `### Notes` subsection at the bottom of each version captures out-of-scope items and known follow-ups

The CHANGELOG is written before the release commit (it's part of the SDD plan for each release). The release script copies the new section into the release commit.

## Dependency management policy

- **Production dependencies:** introduced only via SDD plan; each one needs a justification in the plan
- **Development dependencies:** more permissive; ad-hoc OK for tooling
- **Node version:** `engines.node >=20.0.0` in `package.json`. Major Node bumps need an explicit migration plan because they affect scaffold consumers.
- **pnpm version:** managed by `packageManager` field; never bumped via dependabot (it's capped in `.github/dependabot.yml`)

## Incident handling

When the CI breaks on `main`:

1. Check the failing workflow log
2. If the cause is a recent merge, revert that merge via `git revert <sha>` and open an issue
3. If the cause is a flaky test, re-run with `gh run rerun` — don't paper over with code changes
4. If the cause is a real bug, fix it on a hotfix branch and merge via the normal PR flow

For dependabot PRs that fail CI in a non-trivial way, prefer closing with a comment over force-merging — the next weekly cycle may produce a smaller, safer PR.

## Where to find things

| Resource | Path |
|---|---|
| Current spec | `docs/superpowers/specs/loshu-sdlc/spec.md` (local-only — see note below) |
| Version-specific designs (v0.7.0+) | `docs/superpowers/specs/2026-09-*.md` (local-only) |
| Implementation plans | `docs/superpowers/plans/2026-09-*.md` (local-only) |
| Internal reports + retros | `docs/internal/` (local-only) |
| In-flight SDD ledger | `.superpowers/sdd/<plan>/progress.md` (gitignored) |
| CI workflow | `.github/workflows/ci.yml` |
| Publish workflow | `.github/workflows/publish-ghcr.yml` |
| Release script | `scripts/release.mjs` |

> **Note:** Design specs, plans, and internal reports live under `docs/superpowers/` and `docs/internal/`. These directories are kept on the maintainer's local disk but excluded from the public repository (see `.gitignore`). If you need to reference the current spec, ask the maintainer — or check the latest published design at the linked spec file's commit history in git.
# Task 6: CHANGELOG entry for v0.6.4

**Goal:** Write the `## [0.6.4] - <date>` section to `CHANGELOG.md` documenting what landed in this release.

**Depends on:** Tasks 1-5 done (their commits exist in git log).

## File to change

### `CHANGELOG.md`

Read the current file. Then:

1. Replace the `## [Unreleased]` placeholders with empty (keep the section header for future releases)
2. insert a new `## [0.6.4] - 2026-09-16` section above `## [0.6.3]`

Use today's date (2026-09-16 per system context).

## Content shape

Follow the v0.6.3 / v0.6.2 / v0.6.1 entry tone — bullet points, grouped by Added / Changed / Fixed, with commit references where helpful.

### Template

```markdown
## [0.6.4] - 2026-09-16

[One-line summary]

### Added

- **A3 assertion** — [description]
- **V4 assertion** — [description]
- **B1, B2 tests** — [description]

### Changed

- **C1, C2, C3, C4 realigned with spec §4.3** — [description]
- **`Artifact` interface widened with `rootPath`** — [description]

### Fixed

- **`discover.ts` latent bug** — `stageEntry.artifact_id` should have been `stageEntry.artifact` per the v0.6.3 type-cleanup fix; this completes the correction.

### Notes

- [Optional: deferred items, test count change]
```

## Verification

1. `git diff CHANGELOG.md` shows the new section above v0.6.3.
2. No other content changed.

## Commit

```
docs(changelog): v0.6.4 entry — accept gap fill (A3, V4, C1, C2, C3, C4)
```


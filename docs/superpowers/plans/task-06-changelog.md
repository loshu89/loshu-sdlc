# Task 6: CHANGELOG entry for v0.7.1

**Goal:** Write the v0.7.1 CHANGELOG entry documenting the six polish items (Tasks 1-5) and the manual `--version` smoke.

**Spec:** Follows the v0.6.4 / v0.7.0 entry style (one-line summary + `### Added` / `### Changed` / `### Notes`).

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: existing CHANGELOG format.
- Produces: new `## [0.7.1] - 2026-09-18` block above v0.7.0.

- [ ] **Step 1: Read current `CHANGELOG.md` to know the shape of the Unreleased block and the v0.7.0 entry just below**

- [ ] **Step 2: Replace `## [Unreleased]` placeholders with empty (keep header) and insert the `## [0.7.1] - 2026-09-18` block above v0.7.0**

Suggested entry (use as-is or adjust to match the implementer's actual outcomes):

```markdown
## [Unreleased]

### Added

### Changed

### Fixed

---

## [0.7.1] - 2026-09-18

Polish pass: clear the six Minor items the v0.7.0 final whole-branch review parked as deferred.

### Changed

- **`commands/rules.ts` eslint runner** — hoisted the `eslint` glob list to a module-scope `ESLINT_GLOBS` constant referenced from both the runner and the rule entry's `appliesTo` (previously the runner inlined the globs instead of reading the rule entry). Also fixed the stderr fallback from `??` to `||` so empty-string stdout falls through to stderr — some eslint configs route output via stderr; the previous nullish-coalescing silently dropped stderr-only output.
- **`commands/state.ts`** — replaced its local `readFileSync + parseYaml + FRONTMATTER_RE` frontmatter reader with the shared `readFrontmatterFile` helper from `lib/accept/frontmatter.js` (Task 3's dedupe only covered the three acceptance assertion files; this CLI command was explicitly out of scope at the time).
- **`bin/loshu-sdlc.ts` `--version`** — now reads the CLI's own `package.json` version via `currentCliVersion()` (same package-walk pattern as v0.7.0 Task 11's upgrade default) instead of the hardcoded `'loshu-sdlc 0.1.0'` literal.

### Notes

- 5 fix commits + CHANGELOG = 6 commits this release.
- Test count: 228 → 229 (+1 for the new `bin/loshu-sdlc.ts --version` regression test; other fixes are refactors that rely on existing test coverage).
- Spec deferred items (webhook receiver, branch protection enforcement, auto-revert on failed merge) remain deferred per spec phasing — see v0.7.0 design §6.1.2 and the brainstorming discussion for why webhook was judged not worth building.

---

## [0.7.0] - 2026-09-17
```

- [ ] **Step 3: Run `git diff CHANGELOG.md` to verify only the new v0.7.1 block was added**

Expected: only the new `## [0.7.1]` block and the Unreleased cleanup; no other content changed.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): v0.7.1 entry — polish 6 parked Minors from v0.7.0 final review"
```

(No commit in this task beyond the CHANGELOG — release.mjs creates the `chore: release v0.7.1` commit in Task 7.)

# Task 5: CHANGELOG entry for v0.9.0

**Goal:** Write the v0.9.0 CHANGELOG entry documenting the Maintain loop closure.

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: existing CHANGELOG format.
- Produces: new `## [0.9.0] - 2026-09-20` block above v0.8.0.

---

- [ ] **Step 1: Read current `CHANGELOG.md` to know the shape of the Unreleased block and the v0.8.0 entry just below**

- [ ] **Step 2: Insert the v0.9.0 block above v0.8.0**

Suggested entry:

```markdown
## [Unreleased]

### Added

### Changed

### Fixed

---

## [0.9.0] - 2026-09-20

Close the Maintain → Plan loop per the AI-Native SDLC playbook. Two new CLI subcommands + one hook change make the loop close without manual `/sdlc-maintain` invocation.

### Added

- **`loshu-sdlc bands diagnose`** — extract breach metrics as structured JSON (`MaintainDiagnosisProposal` with `breachedMetrics[]`, `evaluationContext`, `suggestedIntentId`). Pure mechanical extraction — no LLM call. Returns the inputs the next subcommand consumes.
- **`loshu-sdlc maintain diagnose <bands.yaml> <intent.md> --root <root>`** — synthesize an incident `intent.md` from bands.yaml + `.sdlc/metrics.json` + cycle context. **Stub mode**: structured fields populated (id, origin, cycle_id, title); natural-language fields (problem, proposedOutcome, affectedUsersAndSystems) marked `TODO:` for the agent to fill in. Future v0.10+ may replace the TODO scaffold with an LLM synthesis call (single-file swap inside `maintainDiagnose`).

### Changed

- **`packages/plugin/hooks/maintain-exit.sh`** — when 3σ is detected and no incident `intent.md` exists, the hook now invokes `loshu-sdlc maintain diagnose` with a 10-second timeout before the existing block-and-tell-user branch. On success: hook exits 0 (no block). On failure or timeout: fall back to today's block behavior with the "Run /sdlc-maintain" message.

### Notes

- **Degraded-mode contract:** the maintain loop closes without an LLM. The TODO scaffold gives the agent (human or LLM) enough structured context to fill in the natural-language fields before committing.
- **Windows note:** the `timeout` command is not available by default on Windows; the hook falls through to today's block path (manual `/sdlc-maintain` required). Windows hook parity is tracked as a follow-up.
- 6 commits this release (bands diagnose + maintain diagnose + maintain-exit wiring + sdlc-maintain docs + CHANGELOG + release.mjs `chore: release v0.9.0`).
- Test count: 229 → ≥233 (≥3 new bands-diagnose tests + ≥2 new maintain tests; shell tests for maintain-exit are excluded from vitest count).
- Auto-revert on failed merge (v0.8.0 backlog §6.1.2 row) remains deferred — its concrete spec arrives in v0.10+ once Maintain loop closure is verified.

---

## [0.8.0] - 2026-09-18
```

- [ ] **Step 3: Run `git diff CHANGELOG.md` to verify only the new v0.9.0 block was added**

Expected: only the new `## [0.9.0]` block and the Unreleased cleanup; no other content changed.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): v0.9.0 entry — Maintain loop closure (auto-diagnose)"
```

(No commit in this task beyond the CHANGELOG — release.mjs creates the `chore: release v0.9.0` commit in Task 6.)

# Task 3: CHANGELOG entry for v0.8.0

**Goal:** Write the v0.8.0 CHANGELOG entry documenting the two text deliverables.

**Spec:** Follows the v0.6.4 / v0.7.0 / v0.7.1 entry style.

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: existing CHANGELOG format.
- Produces: new `## [0.8.0] - 2026-09-18` block above v0.7.1.

---

- [ ] **Step 1: Read current `CHANGELOG.md` to know the shape of the Unreleased block and the v0.7.1 entry just below**

- [ ] **Step 2: Replace `## [Unreleased]` placeholders with empty (keep header) and insert the `## [0.8.0] - 2026-09-18` block above v0.7.1**

Suggested entry:

```markdown
## [Unreleased]

### Added

### Changed

### Fixed

---

## [0.8.0] - 2026-09-18

Close the two highest-ROI gaps from `docs/internal/playbook-coverage-analysis.md`: missing institutional-knowledge file and uncleared spec backlog. Text-only release — no source code changed.

### Added

- **`/CLAUDE.md`** — institutional knowledge file at the project root. Captures the conventions any AI agent or human needs to navigate the repo: install / test / lint / build / release commands; the SDLC artifact chain (plan → design → build → test → deploy → maintain); the plugin/skills architecture and the five stage-exit hooks; the SDD workflow for adding new features; commit and release conventions; pitfalls; and a pointer table to where things live. Called out by the AI-Native SDLC playbook as the institutional-knowledge file every agent should have available; previously absent.

### Notes

- `docs/superpowers/specs/2026-09-18-v0.8.0-backlog.md` — one-page addendum to `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` §6.1.2 / §6.2.2-4 with one-line dispositions per deferred item so future brainstorming doesn't relitigate the same questions. Headlines:
  - **Webhook receiver** — deferred indefinitely (playbook supports polling+push; v0.6.4 already has the 3σ fork primitive).
  - **Branch protection enforcement** — deferred to v1.0 (write requires OAuth scopes not negotiated).
  - **Auto-revert on failed merge** — deferred to v0.8.x as part of the broader Maintain closure spec.
  - **Performance items 24-27** — dropped (CLI tool, not high-throughput service).
  - **Events.jsonl secrets** — deferred to v0.9.x if any secret-handling use case emerges.
  - **Hook signatures, migrate unknown ver, compatibility items 31-33** — already covered / convention enforced.
- 4 commits this release (CLAUDE.md + backlog addendum + CHANGELOG + release.mjs `chore: release v0.8.0`).
- Test count: unchanged (229/229; no source code touched).
- Maintain → Plan loop closure (`playbook-coverage-analysis.md` flagged partial) deferred to v0.8.x spec design.

---

## [0.7.1] - 2026-09-18
```

- [ ] **Step 3: Run `git diff CHANGELOG.md` to verify only the new v0.8.0 block was added**

Expected: only the new `## [0.8.0]` block and the Unreleased cleanup; no other content changed.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(changelog): v0.8.0 entry — CLAUDE.md + spec backlog cleanup"
```

(No commit in this task beyond the CHANGELOG — release.mjs creates the `chore: release v0.8.0` commit in Task 4.)

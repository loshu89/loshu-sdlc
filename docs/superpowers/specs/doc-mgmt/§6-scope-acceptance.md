# §6 Scope Boundaries + System Acceptance

### 6.1 System-Level Scope

#### 6.1.1 In Scope (v0.6.0 MVP)

| Category | Contents |
|---|---|
| Artifacts | 6 user artifacts + state files (cycle.json, events.jsonl, gates.jsonl) |
| Identity | ULID-based slug ID + parent chain + provenance |
| Versioning | Schema registry + chained migrate + hand-written transforms |
| State Machine | Full DAG (incl. `merged`) + 13 transfer events + cross-stage guards |
| Git Integration | Branch lifecycle + commit/push + PR/MR + merge + cleanup |
| Platforms | GitHub (gh CLI + REST API) + GitLab (glab CLI + API) |
| Acceptance Tests | 4 layers + 22 assertions + auto-fix mode |
| CI Integration | GitHub Actions runs acceptance (GitLab CI analog) |
| Events Log | Append-only events.jsonl + chain integrity |
| Concurrency | mkdir-based lockfile + atomic append |

#### 6.1.2 Out of Scope (Deferred)

| Category | Deferred to | Why |
|---|---|---|
| Web UI / dashboard | v1.0 | CLI sufficient for technical users |
| Real-time collaborative editing | v1.0+ | CRDT/OT heavy |
| Webhook receiver | v0.7.0 | Polling + push trigger sufficient |
| Branch protection enforcement | v0.7.0 | GitHub/GitLab native rules, CLI can read but not modify |
| Cross-platform webhook receiver | v1.0+ | Third-party deps not needed |
| Encryption/signing of events.jsonl | never | git GPG on commits suffices |
| Gitea / Bitbucket / Azure DevOps | never | GitHub+GitLab covers 80% |
| Automatic schema versioning | v1.0 | Manual versioning is auditable |
| Auto-revert on failed merge | v0.7.0 | Dangerous; must be manual |
| Multi-user simultaneous editing | never | File lock + git conflict suffice |

### 6.2 System-Level Acceptance Criteria

#### 6.2.1 Functionality (22 items)

1. ✅ Every user artifact has ULID-format `id` field
2. ✅ All artifact IDs in same project are globally unique
3. ✅ Each artifact's `parent_ids` points to real upstream artifacts
4. ✅ Artifact `schema_version` exists in registry
5. ✅ `loshu-sdlc migrate spec.md --to <ver>` succeeds and sets state to `iterating`
6. ✅ `cycle new` auto-creates branch (`sdlc/cycle-N-slug`)
7. ✅ Stage `accepted` auto-commits + pushes to cycle's branch
8. ✅ All stages accepted auto-opens PR/MR + assigns reviewers from CODEOWNERS
9. ✅ PR/MR merge auto-transitions state to `merged`, deletes branch
11. ✅ State machine DAG strict: illegal transition returns error, doesn't execute
12. ✅ events.jsonl append-only + chain integrity
13. ✅ `loshu-sdlc test` runs 22 assertions all green
14. ✅ `loshu-sdlc test --strict` exits 1 on any failure
15. ✅ `loshu-sdlc test --fix` auto-applies fixable items
16. ✅ CODEOWNERS triggers reviewer auto-@-mention
17. ✅ GitHub + GitLab platform adapters both work (mocked tests)
18. ✅ Lock prevents concurrent conflicts (two sessions same project → one succeeds)
19. ✅ Retention policy cleans expired events
20. ✅ events.jsonl tamper detection (chain hash validation)
21. ✅ GitHub Actions runs acceptance + PR comments
22. ✅ Eval suite (30 stories) keeps working + Layer 4 coverage
23. ✅ `loshu-sdlc migrate --check` detects outdated `schema_version`

#### 6.2.2 Performance (4 items)

24. ✅ Acceptance tests on 100-artifact project < 10s
25. ✅ cycle.json read/write < 100ms
26. ✅ events.jsonl append < 10ms (even with 10k+ events)
27. ✅ Lock acquisition < 50ms (no contention)

#### 6.2.3 Security (3 items)

28. ✅ events.jsonl contains no secrets (commit diff visible in git log)
29. ✅ Hook scripts use `set -euo pipefail`, don't eval unsigned input
30. ✅ `loshu-sdlc migrate --to <unknown-ver>` rejects execution

#### 6.2.4 Compatibility (3 items)

31. ✅ Existing v0.5.0 projects (no Identity field) can migrate to v0.6.0 schema (adds ID)
32. ✅ Existing eval suite (30 stories) keeps working, no breaking
33. ✅ Existing CHANGELOG / README / plugin metadata unchanged

### 6.3 Implementation Phases

**v0.6.0 (this design's MVP):**
- Identity, Versioning, State Machine, Acceptance all foundational
- GitHub adapter complete; GitLab adapter deferred
- 23 user acceptance + 4 performance + 3 security + 3 compatibility = 33 items

**v0.7.0:**
- GitLab adapter complete
- Webhook receiver
- Branch protection enforcement
- Auto-revert on failed merge

**v1.0:**
- Web UI dashboard
- Real-time collaboration
- Cross-platform support

### 6.4 Test Strategy

```
unit tests (vitest)
  └─ 4-layer acceptance (run via tsx)
       └─ Per-rule unit tests for assertions (Layer 1, 2, 3, 4 each)
       └─ Cross-rule interaction tests
  └─ E2E: create-loshu-sdlc-app my-app && cd my-app && loshu-sdlc test
  └─ Integration with GitHub Actions
```

New tests in `packages/cli/tests/accept/`:
- `assertions/A*.test.ts` (Layer 1, 8 tests)
- `assertions/V*.test.ts` (Layer 2, 4 tests)
- `assertions/C*.test.ts` (Layer 2+3, 6 tests)
- `assertions/B*.test.ts` (Layer 4, 2 tests)
- `discover.test.ts` (artifact discovery, 3 tests)
- `migrate.test.ts` (chain migration, 4 tests)
- `lock.test.ts` (concurrency, 2 tests)
- `platforms/github.test.ts` (mocked, 4 tests)
- `platforms/gitlab.test.ts` (mocked, 4 tests)

Total: ~37 new acceptance tests + existing 109 → **~146 tests in v0.6.0**.

### 6.5 Phasing Rationale

Why this staged rollout:

- **v0.6.0 = technical core.** **Without** this, the system is half-implemented: state machine exists but no ID/version/git integration. Half-built artifacts can't be safely versioned.
- **v0.7.0 = platform completeness.** GitLab + webhooks bring the system to 95% of users.
- **v1.0 = UX layer.** UI is gold plating; system is functionally complete at v0.7.0.

Each phase is independently usable. v0.6.0 alone ships as a working artifact-management system even without v0.7.0 features.

### 6.6 Scope Boundaries (Repeat for Clarity)

| In scope (v0.6.0) | Out of scope |
|---|---|
| ✅ All 4 layers (Identity/Versioning/State/Acceptance) | ❌ Webhook receiver |
| ✅ GitHub + GitLab dual-platform | ❌ Third-party platforms |
| ✅ 22+4+3+3=33 acceptance assertions + tests | ❌ Performance benchmark suite |
| ✅ v0.6.0 only (not v0.7.0+ features) | ❌ v0.7.0+ functionality |

## Cross-references

- See also: [§1-identity.md](§1-identity.md) for functionality items 1-3 (ID format, uniqueness, parent chain)
- See also: [§2-versioning.md](§2-versioning.md) for functionality items 4-5 and 23 (schema registry, migrate behavior)
- See also: [§3-state-machine-git.md](§3-state-machine-git.md) for functionality items 6-11 (DAG, branch, PR/MR, merge)
- See also: [§4-acceptance.md](§4-acceptance.md) for functionality items 13-15 and 21-22 (test runner, eval suite)
- See also: [§5-storage.md](§5-storage.md) for functionality items 12, 18-20 (events.jsonl, locks, retention, tamper detection) and performance items 25-27
- See also: [spec.md](spec.md) References section for source material and related specs

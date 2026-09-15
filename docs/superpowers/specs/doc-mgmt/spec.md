# Document Management System — Design Spec

> **Status:** Approved
> **Date:** 2026-09-15
> **Target version:** v0.6.0
> **Source:** Continuation of loshu-sdlc v0.5.0 architecture discussion

---

## Description (Layer 1 — always loaded)

loshu-sdlc v0.5.0 ships with a partial artifact management system: the DAG state machine (v0.3.0) and the cycle infrastructure (v0.4.0). v0.6.0 completes it by adding four missing layers:

1. **Identity (A)** — every artifact has a unique, human-readable ID with parent chain
2. **Versioning (B)** — schema registry with chained migration tooling
3. **State Machine + Git Lifecycle (C)** — full DAG plus branch/PR/merge integration
4. **Acceptance Testing (D)** — 4-layer test framework with auto-fix mode

Plus GitHub + GitLab platform adapters for full git workflow integration.

The system answers five questions for every artifact at any time:

- **What** is this artifact? → Identity (A)
- **Which schema version** does it conform to? → Versioning (B)
- **Where** in the lifecycle is it? → State Machine (C)
- **Where** in git is it? → Git lifecycle (C)
- **Is it valid?** → Acceptance Testing (D)

---

## Trigger conditions (Layer 2 — loaded on reference)

This spec is loaded when any of the following commands or events occur:

- `loshu-sdlc migrate <artifact>` — schema migration (loads §2-versioning.md)
- `loshu-sdlc repair <artifact>` — ID regeneration or repair (loads §1-identity.md)
- `loshu-sdlc validate <artifact>` — schema validation (loads §1-identity.md, §2-versioning.md)
- `loshu-sdlc test [<artifact>]` — acceptance test runner (loads §4-acceptance.md)
- `loshu-sdlc cycle new` / `loshu-sdlc cycle archive` — cycle lifecycle (loads §3-state-machine-git.md, §5-storage.md)
- `loshu-sdlc git <action>` — branch/PR/MR operations (loads §3-state-machine-git.md)
- Hook stage-exit events (plan-exit, design-exit, build-exit, test-exit, deploy-exit, maintain-exit) — (loads §3-state-machine-git.md, §4-acceptance.md, §5-storage.md)
- CI workflows (`acceptance.yml`) — (loads §4-acceptance.md)
- Referenced by all §-files in this directory (cross-links via `§N-name.md` syntax)

---

## Detailed design (Layer 3 — lazy load per §)

Each § is a separate file. Load only the §-files relevant to the current operation.

### Identity Layer (A) — [§1-identity.md](§1-identity.md)
Artifact ID format, parent chain semantics, schema changes for identity fields, ID generation algorithm, and conflict detection.

### Versioning Layer (B) — [§2-versioning.md](§2-versioning.md)
Schema registry structure, schema_version frontmatter field, migration tool (chained, hand-written transforms), post-migration state, and scope boundaries.

### State Machine + Git Lifecycle (C) — [§3-state-machine-git.md](§3-state-machine-git.md)
Complete state diagram, 13 transition events with git actions, event schema, branch/PR/MR lifecycle, transition guards, `merged` final state, hook integration flow, and scope boundaries.

### Acceptance Testing Layer (D) — [§4-acceptance.md](§4-acceptance.md)
Four test layers (field-level, per-artifact, cross-artifact, E2E), test discovery, all 22 assertions table, test runner CLI, report format, auto-fix mode, eval-suite relationship, GitHub Actions integration, and scope boundaries.

### Storage Layer — [§5-storage.md](§5-storage.md)
Directory layout, cycle.json schema, events.jsonl append-only guarantee, config.yaml schema, CODEOWNERS format, concurrency locks, and scope boundaries.

### Scope Boundaries + System Acceptance — [§6-scope-acceptance.md](§6-scope-acceptance.md)
System-level scope (in/out), 33-item system acceptance criteria (functionality, performance, security, compatibility), implementation phases, test strategy, and phasing rationale.

---

## References

- **Spec source:** loshu-sdlc v0.5.0 architecture continuation
- **Prior work:** brainstorming transcript + design review
- **Related specs:**
  - `docs/superpowers/specs/2026-09-11-loshu-sdlc-design.md` (original architecture)
  - `docs/superpowers/specs/2026-09-15-loshu-sdlc-state-mgmt-design.md` (TBD after this spec)
- **External patterns:** ULID spec (https://github.com/ulid/spec), GitHub CODEOWNERS, XState

---

## Changelog (Layer 4 — bottom of file, always present)

| Date | Version | Changes |
|---|---|---|
| 2026-09-15 | v0.6.0 | Approved spec; restructured into progressive-disclosure format (spec.md + 6 §-files) |
| 2026-09-15 | v0.1.0 | Initial draft (as monolithic `2026-09-15-doc-mgmt-design.md`) |

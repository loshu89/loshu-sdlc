# loshu-sdlc — Design Spec

> **Status:** Approved
> **Date:** 2026-09-11
> **Target version:** v0.1.0
> **Source material:** [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) (Aug 21, 2026)

---

## Description (Layer 1 — always loaded)

loshu-sdlc is a reusable Claude Code plugin that implements the six-stage AI-Native Software Development Lifecycle (Plan → Design → Build → Test → Deploy → Maintain). It turns Claude Code into an orchestrator that runs each SDLC stage through version-controlled, schema-validated, hook-enforced artifacts (`intent.md → spec.md → plan.md → CLAUDE.md → REVIEW.md → bands.yaml`), and closes the loop by turning production incidents back into new intent documents. The plugin is thin by design: it composes well-built external skills (`superpowers:*`, `ui-ux-pro-max`, ECC's `ecc:*`) for intelligence, and owns the SDLC-specific concerns itself (artifact chain, schema validation, tiered hooks, loop closure, statistical band evaluation).

**Glossary:**

- **Plugin-internal skill:** A `SKILL.md` (or skill directory) inside `packages/plugin/skills/`, used by Claude Code when invoking loshu-sdlc slash commands. Auto-loaded as context. Not user-editable.
- **Project-level SKILL.md:** A `SKILL.md` at the root of the user's project, scaffolded by `/sdlc-build` from `policy-template/`. The user's project policy file. Editable by the user.
- **UI project:** A project whose `intent.md` (or `.loshu-sdlc/config.yaml`) marks `frontend: true` OR `stack` includes React/Vue/Svelte/Angular/Solid/Qwik/HTMX/TSX/JSX. Triggers the `ui-ux-pro-max` Tier-2 warning when missing.
- **Backend project:** A project whose `intent.md` marks `backend: true` OR `stack` includes a server-side framework (Express/Hono/Fastify/Django/Flask/Spring/Rails/Go/Phoenix/etc.). Triggers `ecc:api-design`, `ecc:backend-patterns`, `ecc:database-migrations` Tier-3 hints.
- **Full-stack project:** UI + backend; both sets of hints apply.
- **Cycle:** One traversal of the six stages for one piece of work (one feature, one bug fix, one incident response).
- **Stage gate:** The hook-enforced check between stages (e.g., Design-exit blocks Build entry until `spec.md` validates).
- **Tier-1/2/3:** External dependency tiers (required / recommended / opportunistic). See [§10-adr.md](§10-adr.md).

---

## Trigger conditions (Layer 2 — loaded on reference)

This spec is loaded when:

- **Entering any SDLC stage** via slash commands (`/sdlc-plan`, `/sdlc-design`, `/sdlc-build`, `/sdlc-test`, `/sdlc-deploy`, `/sdlc-maintain`).
- **Cross-stage navigation** via `/sdlc-status` or `loshu-sdlc status` to inspect current cycle state.
- **Project bootstrap** via `npx create-loshu-sdlc-app` (fresh project) or `npx create-loshu-sdlc-app . --existing` (in-place install).
- **Maintenance / loop closure** when the `loshu-sdlc/maintain` hook blocks on a 3σ incident.
- **CLI maintenance** via `loshu-sdlc {doctor, validate, lint, rules, upgrade, logs, coverage}`.
- **Cross-references from §-files** in this directory (every §-file links back to `spec.md`).

---

## Detailed design (Layer 3 — lazy load per §)

Each § is a separate file. Open only the one you need.

### Goals — [§1-goals.md](§1-goals.md)
The six success criteria for loshu-sdlc: universal applicability, full lifecycle coverage, closed feedback loop, composability, auditability, bootstrappability.

### Non-goals — [§2-non-goals.md](§2-non-goals.md)
Five explicit "we will NOT do this" boundaries: not replacing the human, not stack opinionation, not build-system integration, not real-time collaboration, not hosted service.

### Domain model — [§3-domain-model.md](§3-domain-model.md)
Repo layout (monorepo with `packages/{plugin, cli, templates}`), component shapes (`@loshu-sdlc/plugin`, `@loshu-sdlc/cli`, `@loshu-sdlc/templates`), slash command → external dependency map, and what loshu-sdlc owns vs borrows.

### State machine / compliance contract — [§4-state-machine.md](§4-state-machine.md)
The five SDLC compliance rules (landing zone, schema enforcement, hook enforcement, loop closure, provenance) that govern how external capabilities interact with the artifact chain.

### Data flow — [§5-data-flow.md](§5-data-flow.md)
Project bootstrap (fresh + existing), happy path (`/sdlc-plan` → ... → `/sdlc-maintain`), loop closure on 3σ incidents, cross-stage navigation, plus error categories (E1–E10), hook exit semantics, fallback strategy, and CLI exit codes.

### API surface — [§6-api-surface.md](§6-api-surface.md)
`create-loshu-sdlc-app` flags, `loshu-sdlc` subcommands (`doctor`, `validate`, `lint`, `rules`, `upgrade`, `logs`, `status`, `coverage`, `help`, `version`), `.loshu-sdlc/config.yaml` schema, and the no-telemetry default.

### UX wireframes — [§7-ux-wireframes.md](§7-ux-wireframes.md)
ASCII wireframes of CLI command output, scaffold flow, status output, and the README layout users see after bootstrap.

### Acceptance criteria — [§8-acceptance.md](§8-acceptance.md)
Testing layers (unit, integration, eval, smoke), coverage targets per package, and release gating checklist.

### Non-functional requirements — [§9-nfrs.md](§9-nfrs.md)
Versioning policy, distribution channels, support model, deprecation policy, security disclosure SLA, and the v0.1 → v1.0 roadmap.

### Architecture decisions — [§10-adr.md](§10-adr.md)
All locked decisions from user-stated constraints and trimming audit, plus the chronological decision log (start → early → mid → late).

### Open questions — [§11-open-questions.md](§11-open-questions.md)
Seven pre-v1.0 questions: license, marketplace identity, first-party hosting, backing org, brand assets, eval threshold calibration, hook policy overrides.

### References — [§12-references.md](§12-references.md)
External docs: Anthropic AI-Native SDLC Playbook, Claude Academy course, ECC, superpowers plugin, ui-ux-pro-max, Claude Code plugin marketplace docs.

---

## Changelog (Layer 4 — bottom of file, always present)

| Date | Version | Changes |
|---|---|---|
| 2026-09-11 | v0.1.0 | Initial draft (monolithic, 486 lines) |
| 2026-09-15 | v0.1.0 | Restructured into progressive-disclosure: `spec.md` + 12 §-files |

---

**Per-§-file structure:** each §-file ends with a "Cross-references" section listing related §-files via relative links.

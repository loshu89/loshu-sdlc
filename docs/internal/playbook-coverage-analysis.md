# AI-Native SDLC Playbook Coverage Analysis

**Date:** 2026-09-18
**Source:** [The AI-Native SDLC playbook (Anthropic, Aug 21 2026)](https://claude.com/blog/the-ai-native-sdlc-playbook)
**Project baseline:** `loshu-sdlc` at commit `8d06e4d` (v0.7.1, just released)

## Summary

The project implements the AI-native SDLC's **artifact chain** (Plan → Design → Build → Test → Deploy → Maintain) end-to-end through v0.7.1. The cross-cutting concerns (**Skills**, **CLAUDE.md** institutional knowledge, **Hooks**, **Continuous evals**) are partially in place. The one substantial gap is **Maintain → Plan loop closure** — agents don't yet write back breached control bands into a new `intent.md` automatically. The maintain-exit hook *forks* a new cycle on 3σ incidents (v0.6.4), but the broader "agents monitor production, write back to intent" automation from the playbook is not built.

## Detailed coverage

### Per-stage coverage

| Stage | Playbook artifact | Our implementation | Coverage |
|---|---|---|---|
| **Plan** | `intent.md` synthesized from sources | `packages/plugin/schemas/intent.schema.json` (v0.6.0) + `assertions/identity.ts` A1–A8 (v0.6.4) | **Full** |
| **Design** | `spec.md` from a working session with an agent, guided by skills | `packages/plugin/schemas/spec.schema.json` (v0.6.0) + `assertions/versioning.ts` V1–V4 (v0.6.4/v0.7.0) | **Full** |
| **Build** | code + tests + `plan.md` | `packages/plugin/schemas/plan.schema.json` (v0.6.0) + plan-exit hook (v0.6.4) | **Full** |
| **Test** | continuous evals woven through implementation | `pnpm test` (vitest) + `pnpm test:eval:strict` (30/30 passing) | **Full** |
| **Deploy** | agentic review + human for regulated; **hooks** as governance gates | `loshu-sdlc git sync` (v0.7.0) — real branch/commit/push/PR open + cycle.json mutation; `loshu-sdlc rules check` (v0.7.0) — eslint + 3 schema runners; stage-exit hooks (v0.6.4) | **Full** |
| **Maintain** | agents monitor, breached control band → new `intent.md` | `loshu-sdlc bands record` (v0.6.4) — 3σ metrics producer; maintain-exit hook forks incident cycle (v0.6.4) | **Partial** — incident cycle is forked on 3σ but the "diagnose and write back to intent" automation from the playbook is not implemented; no scheduled agent loop watches production |

### Cross-cutting concerns

| Concept | Playbook intent | Our implementation | Coverage |
|---|---|---|---|
| **Skills** (institutional knowledge, versioned) | "standards encoded as skills, versioned in git" | `packages/plugin/skills/policy-default/` + `superpowers:*` skills bundled in `.superpowers/sdd/` | **Full** (the project itself USES skills extensively — including the `superpowers:subagent-driven-development` flow that built v0.6.4 and v0.7.0) |
| **CLAUDE.md** (institutional knowledge) | "institutional knowledge is maintained as versioned machine-readable CLAUDE.md files" | **Missing** — no `CLAUDE.md` at the project root or in `packages/cli/` | **None** |
| **Hooks** (governance gates, "as approval gates") | "Governance is enforced as the AI acts, with hooks as approval gates" | `packages/plugin/hooks/{plan,design,build,deploy,maintain}-exit.sh` + `protect-artifacts.sh` (PreToolUse) | **Full** — five stage-exit hooks wired via `packages/cli/hooks.json` |
| **Continuous evals** (woven through implementation) | "Continuous evals woven through implementation" | `pnpm test:eval:strict` (30/30) + `pnpm test` (229 unit + integration tests) | **Full** |

### Audit trail (the chain of commits)

Per the playbook: "The chain of commits is also the audit trail: who asked for what, what the agent produced, and who approved it. Humans remain accountable for every decision that requires judgment."

| Playbook artifact | Where it lives in our repo | Version-controlled? |
|---|---|---|
| `intent.md` | `packages/templates/minimal/` etc., created per-cycle via `loshu-sdlc cycle new` → `cycle.json` | ✅ |
| `spec.md` | Same templates | ✅ |
| `plan.md` | Same templates | ✅ |
| Diff + tests | git commit history (v0.6.0 → v0.7.1 = 5 releases on main) | ✅ |
| PR with review findings | GitHub PRs (not local) — external to the project | ✅ (via GitHub) |
| Incident record | `events.jsonl` (append-only, chmod 0444) + `gates.jsonl` (v0.6.4) | ✅ |

### Human-in-the-loop checkpoints

Per the playbook: "Every stage commits an artifact the next stage can read. Together, the intent, the spec, the plan, the diff and the review findings are the audit trail."

Our hooks are the human gates:
- `plan-exit.sh` — validates `intent.md` schema (Plan → Design gate)
- `design-exit.sh` — validates `spec.md` schema + state machine (Design → Build gate)
- `build-exit.sh` — validates `plan.md` schema + verifies `CLAUDE.md` has Verification block (Build → Test gate)
- `deploy-exit.sh` — schema-validates `REVIEW.md` (Test → Deploy gate)
- `maintain-exit.sh` — `bands.yaml` schema + 3σ fork (Deploy → Maintain → Plan loop)

All five gates are real and execute via execa-driven git/gh invocations (v0.7.0). The `loshu-sdlc git sync --execute` is the **Deploy gate's automated executor** — it commits, pushes, opens the PR via the GitHub adapter when all stages are accepted.

## Gap summary

1. **CLAUDE.md** — the playbook's institutional-knowledge file is **not present** in the project root or in `packages/cli/`. This is a real gap for an AI-native SDLC project that USES skills (we have many). The fix is one file at the project root: a CLAUDE.md capturing the conventions any agent (us, downstream users) needs to navigate the repo.

2. **Maintain → Plan loop closure** — `maintain-exit.sh` forks an incident cycle on 3σ breaches (v0.6.4 Task 4), but the playbook's broader automation ("Agents monitor live deployments. Any breached control band is diagnosed and written back into the loop as a new intent.md") is not built. We have the **fork** primitive but not the **agent-driven diagnose** primitive.

3. **Maintain monitoring is operator-driven, not agent-driven** — `bands record` writes metrics; `loshu-sdlc logs` reads them. There's no scheduled agent loop that watches live control bands and writes to `intent.md`. This is the playbook's "Maintain" stage in spirit (metrics exist) but not in automation (no continuous monitoring).

## Suggested follow-ups (priority-ordered)

1. **`CLAUDE.md` at project root** — ~30 minutes. Captures the conventions: pnpm install, `node scripts/release.mjs`, test commands, superpowers workflow, `.superpowers/sdd/` directory usage. This is the highest-value/lowest-effort gap; the playbook calls this out explicitly as institutional knowledge.

2. **Specify the maintain-loop closure** — design doc only (no code). When does the production-control-band agent run? What does "diagnose" mean for an SDLC project that ships a plugin? Is this a future v0.7.x feature or v1.0?

3. **Compare to spec §6.1.2 deferred items** — webhook receiver, branch protection enforcement, auto-revert on failed merge. Of these, **auto-revert** maps most directly to the playbook's "Any breached control band is diagnosed and written back into the loop". The playbook's framing supports the user's earlier instinct (v0.7.0 brainstorm) that webhook is optional — "Polling + push trigger sufficient" matches our model.

## Cross-reference

- v0.7.0 design §5 — already documented the carryover items from v0.6.4 audit (where the v0.7.0 deferred backlog originated)
- `.superpowers/sdd/v0.7.0-real-stubs/progress.md` — final review's parked Minors, all addressed in v0.7.1
- `docs/superpowers/specs/loshu-sdlc/spec.md` — our project's authoritative spec (origin: "the playbook this plugin implements")
- `docs/superpowers/specs/loshu-sdlc/12-references.md` — references the playbook + the Claude Academy course + the skills module

## Verdict

The project implements the **artifact chain** + **skill/hook governance** + **continuous evals** well. The single concrete gap is **`CLAUDE.md`**. The **Maintain automation** is partial but the playbook's spec doesn't *require* fully autonomous monitoring for an SDLC plugin (the user could choose to monitor `bands record` outputs themselves). Both gaps are 1–2 day work, not architectural blockers.

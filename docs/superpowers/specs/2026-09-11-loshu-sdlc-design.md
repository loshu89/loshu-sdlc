# loshu-sdlc: A Claude Code Plugin for AI-Native SDLC

**Status:** Draft (awaiting user review)
**Date:** 2026-09-11
**Source material:** [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) (Aug 21, 2026)

---

## 1. Overview

**loshu-sdlc** is a reusable Claude Code plugin that implements the six-stage AI-Native Software Development Lifecycle. It turns Claude Code into an orchestrator that runs each SDLC stage through version-controlled, schema-validated, hook-enforced artifacts (`intent.md → spec.md → plan.md → CLAUDE.md → REVIEW.md → bands.yaml`), and closes the loop by turning production incidents back into new intent documents.

The plugin is **thin by design**: it composes well-built external skills (`superpowers:*`, `ui-ux-pro-max`, ECC's `ecc:*`) for intelligence, and owns the SDLC-specific concerns itself (artifact chain, schema validation, tiered hooks, loop closure, statistical band evaluation).

## 1.1 Glossary

- **Plugin-internal skill:** A `SKILL.md` (or skill directory) inside `packages/plugin/skills/`, used by Claude Code when invoking loshu-sdlc slash commands. Auto-loaded as context. Not user-editable.
- **Project-level SKILL.md:** A `SKILL.md` at the root of the user's project, scaffolded by `/sdlc-build` from `policy-template/`. The user's project policy file. Editable by the user.
- **UI project:** A project whose `intent.md` (or `.loshu-sdlc/config.yaml`) marks `frontend: true` OR `stack` includes React/Vue/Svelte/Angular/Solid/Qwik/HTMX/TSX/JSX. Triggers the `ui-ux-pro-max` Tier-2 warning when missing.
- **Backend project:** A project whose `intent.md` marks `backend: true` OR `stack` includes a server-side framework (Express/Hono/Fastify/Django/Flask/Spring/Rails/Go/Phoenix/etc.). Triggers `ecc:api-design`, `ecc:backend-patterns`, `ecc:database-migrations` Tier-3 hints.
- **Full-stack project:** UI + backend; both sets of hints apply.
- **Cycle:** One traversal of the six stages for one piece of work (one feature, one bug fix, one incident response).
- **Stage gate:** The hook-enforced check between stages (e.g., Design-exit blocks Build entry until `spec.md` validates).
- **Tier-1/2/3:** External dependency tiers (required / recommended / opportunistic). See Section 4.

---

## 2. Goals

1. **Universal applicability.** Works in any codebase, any language, any stack.
2. **Full lifecycle coverage.** All six SDLC stages shippable end-to-end: Plan → Design → Build → Test → Deploy → Maintain.
3. **Closed feedback loop.** Production incidents automatically become new `intent.md` documents, restarting the cycle.
4. **Composable, not duplicative.** Borrows from `superpowers:*`, `ui-ux-pro-max`, and `ecc:*`; ships only what's SDLC-specific.
5. **Auditable.** Every artifact is git-tracked; every gate has a defined enforcer; every borrowed capability has provenance.
6. **Bootstrappable.** One command (`npx create-loshu-sdlc-app`) scaffolds a working project; another (`loshu-sdlc init --existing`) installs into an existing repo.

## 3. Non-goals

1. **Replacing the human.** Every gate the playbook marks as human-owned stays human-owned.
2. **Stack opinionation.** The plugin works in any repo; we don't ship "best practices for React" or "best practices for Django" — those are external skills.
3. **Build-system integration.** We don't generate webpack configs, vite configs, or migration runners. We hand off to existing tooling.
4. **Real-time collaboration.** This is a single-developer (or small-team) tool; no multi-user editing of `intent.md`.
5. **Hosted service.** All artifacts live in the user's repo. We never store project data.

---

## 4. Locked decisions

| Decision | Value | Rationale |
|---|---|---|
| Deliverable | Claude Code plugin (reusable) | user-stated |
| Source material | Anthropic AI-Native SDLC Playbook (Aug 21 2026) | user-pointed |
| Stages covered | All 6 (Plan, Design, Build, Test, Deploy, Maintain) | user-stated |
| Target repos | Language-agnostic | user-stated |
| Distribution | Plugin + scaffolder CLI | user-stated |
| CLI language | Node.js / TypeScript | recommended, user-approved |
| Name | `loshu-sdlc` / `create-loshu-sdlc-app` | user-stated |
| Hook policy | Tiered (block critical, warn soft) | user-stated |
| Repo packaging | npm-workspaces monorepo (Approach A) | recommended, user-approved |
| External deps (Tier 1) | `superpowers:{using-superpowers, brainstorming, writing-plans, tdd, systematic-debugging}` | trimming audit |
| External deps (Tier 2) | `ui-ux-pro-max`, `ecc:{architect, code-reviewer, security-reviewer}`, `superpowers:{verification-before-completion, receiving-code-review}` | trimming audit |
| Quality rules source | superpowers + ECC (borrow) + loshu-sdlc (own what's SDLC-specific) | user-stated |

---

## 5. Architecture & repo layout

```
loshu-sdlc/
├── packages/
│   ├── plugin/                # Claude Code plugin (markdown + JSON, no build)
│   ├── cli/                   # create-loshu-sdlc-app + loshu-sdlc (Node/TS)
│   └── templates/             # starter project templates
├── docs/
│   └── superpowers/specs/     # design + plan docs (this file)
├── examples/
│   └── example-app/           # canonical reference consuming the plugin
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── evals/                 # golden-file eval suite
│   ├── fixtures/
│   └── smoke/
├── package.json               # npm workspaces root
├── tsconfig.base.json
├── .changeset/
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── LICENSE-THIRD-PARTY.md     # borrowed content attribution
```

**Inter-package dependencies:**
```
cli ──depends on──▶  templates (CLI imports templates for scaffolding)
cli  ──bundles──▶     plugin           (CLI copies plugin/ into target project)
plugin ──standalone──                  (no runtime deps; pure markdown + JSON)
templates ──standalone── (only consumed by cli)
```

**Tooling pinned at root:** pnpm workspaces, TypeScript 5.x strict, ESLint + Prettier, Vitest, Changesets, Husky + lint-staged.

---

## 6. Components

### 6.1 `@loshu-sdlc/plugin`

```
packages/plugin/
├── .claude-plugin/
│   └── plugin.json              # id: "loshu-sdlc", version, entry commands
├── commands/                    # 9 slash commands
│   ├── sdlc-plan.md
│   ├── sdlc-design.md
│   ├── sdlc-build.md
│   ├── sdlc-test.md
│   ├── sdlc-deploy.md
│   ├── sdlc-maintain.md
│   ├── sdlc-status.md
│   ├── sdlc-init.md # plan → design → build sequence
│   └── sdlc-help.md
├── agents/                      # 5 SDLC-specific subagents
│   ├── planner.md
│   ├── spec-writer.md
│   ├── test-designer.md
│   ├── reviewer.md
│   └── incident-investigator.md
├── hooks/ # tiered enforcement
│   └── hooks.json               # PreToolUse, PostToolUse, UserPromptSubmit, Stop, SessionEnd
├── schemas/                     # JSON schemas for all SDLC artifacts
│   ├── intent.schema.json
│   ├── spec.schema.json
│   ├── plan.schema.json
│   ├── claude-md.schema.json
│   ├── review.schema.json
│   ├── bands.schema.json
│   └── policy.schema.json
└── skills/                      # plugin-internal skills (auto-loaded as context when slash commands run)
    │                            # NOT to be confused with the project-level SKILL.md generated by /sdlc-build
    ├── intent-md-authoring/     # loaded by /sdlc-plan; structure + field guidance
    ├── spec-md-authoring/       # loaded by /sdlc-design; structure + section guidance
    ├── plan-md-authoring/       # loaded by /sdlc-build; structure + task breakdown guidance
    ├── review-md-authoring/     # loaded by /sdlc-deploy; REVIEW.md structure guidance
    ├── bands-yaml-design/       # loaded by /sdlc-maintain; 1σ/2σ/3σ tier configuration
    ├── ui-ux-baseline/          # borrowed from ui-ux-pro-max (UI project context)
    │   ├── SKILL.md
    │   ├── charts.md
    │   ├── motion.md
    │   ├── icons.md
    │   └── stacks.md
    ├── policy-default/          # shipped defaults — copied into user project by /sdlc-design
    │   ├── palette.md           # borrowed (ui-ux-pro-max)
    │   ├── typography.md        # borrowed (ui-ux-pro-max)
    │   ├── accessibility.md     # borrowed (ui-ux-pro-max)
    │   ├── breakpoints.md       # borrowed (ui-ux-pro-max)
    │   ├── coding-standards.md  # borrowed (ecc:coding-standards)
    │   ├── security-baseline.md # borrowed (ecc:security-reviewer)
    │   ├── brand.md             # loshu-sdlc owns (template)
    │   ├── safety.md            # loshu-sdlc owns (template)
    │   └── compliance.md        # loshu-sdlc owns (template)
    └── policy-template/
        └── SKILL.md             # blank scaffold for user-customized project SKILL.md
```

### 6.2 `@loshu-sdlc/cli`

```
packages/cli/
├── src/
│   ├── create.ts
│   ├── commands/
│   │   ├── create.ts
│   │   ├── doctor.ts
│   │   ├── validate.ts
│   │   ├── lint.ts
│   │   ├── rules.ts
│   │   ├── upgrade.ts
│   │   ├── logs.ts
│   │   ├── status.ts
│   │   └── coverage.ts
│   ├── lib/
│   │   ├── prompts.ts
│   │   ├── render.ts
│   │   ├── plugin-bundler.ts
│   │   ├── git.ts
│   │   ├── validate.ts
│   │   ├── bands.ts
│   │   ├── prompt-policy.ts
│   │   └── attribution.ts
│   └── bin/
│       ├── create-loshu-sdlc-app.ts
│       └── loshu-sdlc.ts
├── templates/                   # symlink → ../templates
├── tests/
└── package.json
```

### 6.3 `@loshu-sdlc/templates`

```
packages/templates/
├── minimal/                     # one-script starter
└── full/                        # full SDLC starter with CI + monitoring stubs
```

### 6.4 Slash command → external dependency map

| Slash command | Tier 1 (required) | Tier 2 (recommended) | Tier 3 (opportunistic) |
|---|---|---|---|
| `/sdlc-plan` | `superpowers:brainstorming` | — | — |
| `/sdlc-design` | — | `ui-ux-pro-max`, `ecc:architect` | `ecc:api-design` (backend) |
| `/sdlc-build` | `superpowers:writing-plans` | — | `ecc:frontend-patterns` (UI), `ecc:backend-patterns` (backend), `ecc:database-migrations`, `ecc:build-error-resolver` |
| `/sdlc-test` | `superpowers:tdd` | `superpowers:verification-before-completion` | `ecc:e2e-runner` |
| `/sdlc-deploy` | — | `superpowers:receiving-code-review`, `ecc:code-reviewer`, `ecc:security-reviewer` | `ecc:deployment-patterns`, `ecc:docker-patterns` |
| `/sdlc-maintain` | `superpowers:systematic-debugging` | — | `ecc:refactor-cleaner`, `ecc:doc-updater` |

---

## 7. SDLC Compliance Contract

Five rules govern how external capabilities interact with the SDLC artifact chain:

1. **Landing zone.** Every borrowed capability's output lands in a defined SDLC artifact (`intent.md`, `spec.md`, `plan.md`, `CLAUDE.md`, `SKILL.md`, `REVIEW.md`, `bands.yaml`, or generated config).
2. **Schema enforcement.** Every artifact validates against a JSON schema in `packages/plugin/schemas/`.
3. **Hook enforcement.** External plugin output cannot bypass tiered hooks. Untrusted until it passes the same gates as human-authored output.
4. **Loop closure.** Every Maintain-stage output that identifies a problem MUST end with a new `intent.md` if a code change is required.
5. **Provenance.** Every borrowed file carries a frontmatter header citing source, license, and "full catalog available in <source>".

---

## 8. Data flow

### 8.1 Project bootstrap

**Fresh project:**
```
$ npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc] [--with-all]
  [--template minimal|full] [--existing] [--coverage 80] [--branch 75]
  [--no-git] [--yes] [--strict] [--json] [--verbose] [--quiet]
```

**Existing project (in-place):**
```
$ npx create-loshu-sdlc-app . --existing
```
Detects existing repo; does not seed `intent.md`/`spec.md`/`plan.md`; starts SDLC at next change.

### 8.2 Happy path

User story → `/sdlc-plan` → `intent.md` → `/sdlc-design` → `spec.md` (also copies `policy-default/` files into the user's project root) → `/sdlc-build` → `plan.md` + `CLAUDE.md` + project-level `SKILL.md` (the project policy file, scaffolded from `policy-template/`) → `/sdlc-test` → verification block + `evals/` → `/sdlc-deploy` → `REVIEW.md` → `/sdlc-maintain` → `bands.yaml` evaluation.

**Terminology note:**
- "Plugin-internal skills" = `packages/plugin/skills/*` — used by Claude Code when invoking our slash commands
- "Project-level SKILL.md" = `<user-project>/SKILL.md` — the project policy file, scaffolded by `/sdlc-build` from `policy-template/`
- "policy-default/*" = shipped defaults copied into user-project root by `/sdlc-design`

### 8.3 Loop closure

3σ incident → `loshu-sdlc/maintain` hook BLOCKS → `/sdlc-maintain` invokes `superpowers:systematic-debugging` → produces new `intent.md` (incident-driven) → PO accepts → cycle restarts at Plan stage.

### 8.4 Cross-stage navigation

`/sdlc-status` (and `loshu-sdlc status`) shows current cycle state: stage, artifact, status, last update, next gate.

---

## 9. Error handling

### 9.1 Error categories

| Code | Severity | Recovery |
|---|---|---|
| E1 | Tier-1 dep missing | Install instructions; hard fail |
| E2 | Schema validation fail | Show field/location; suggest fix |
| E3 | Stage gate not satisfied | Tell user what's missing |
| E4 | Hook block | Specific actionable error |
| E5 | External plugin fail | Retry + fallback (configurable) |
| E6 | REVIEW.md status:fail | Block deploy; show remediation |
| E7 | Band 3σ incident | Auto-generate intent.md |
| E8 | Build/test/lint not green | Block test-exit; show failing command |
| E9 | Coverage below threshold | Block test-exit; show uncovered files |
| E10 | Coverage drop | Warn only |

### 9.2 Hook exit semantics

```
exit 0  → allow
exit 2  → block; stderr fed back to model as error
other  → non-block error; stderr logged
```

### 9.3 Fallback strategy

- `ecc:code-reviewer` fail → loshu-sdlc native code-review
- `ecc:security-reviewer` fail → **block** (security is non-negotiable)
- `ecc:architect` fail → loshu-sdlc native spec authoring
- `ui-ux-pro-max` fail → borrowed baseline in `policy-default/`
- `superpowers:*` fail → **never falls back** (Tier-1)

### 9.4 CLI exit codes

```
0 success; 1 generic; 2 usage; 3 validation; 4 external dep;
5 hook; 6 git; 7 template; 8 permission
```

---

## 10. Testing

### 10.1 Layers

1. **Unit (vitest, ≥90% CLI coverage, 100% schemas/hooks)** — schema validators, hook scripts, CLI commands, bands evaluator, attribution checks.
2. **Integration (vitest + exec)** — scaffolder, `--existing`, doctor, validate, lint, upgrade.
3. **Eval suite (custom harness)** — ~30 golden-file stories covering Plan, Design, Build, Test, Deploy, Maintain. Loose mode (cosine ≥0.85) on PR; strict mode on main.
4. **Smoke (nightly + tagged releases)** — full 6-stage flow on `examples/example-app/` with mocked LLM responses.

### 10.2 Coverage targets

- `packages/cli/src/lib/`: ≥90%
- `packages/plugin/schemas/`: 100%
- `packages/plugin/hooks/`: 100%
- PR coverage delta threshold: ≥-2pp

### 10.3 Release gating

A version can be released only if: all unit + integration tests pass, eval suite (strict) passes, smoke tests pass on tagged commit, coverage delta ≥ -2pp, attribution check passes.

---

## 11. CLI reference

### 11.1 `create-loshu-sdlc-app`

Flags: `--with-ux`, `--with-ecc`, `--with-all`, `--existing`, `--template <name>`, `--coverage <pct>`, `--branch <pct>`, `--no-git`, `--yes`, `--strict`, `--json`, `--verbose`, `--quiet`, `--help`, `--version`.

### 11.2 `loshu-sdlc` subcommands

```
doctor [path] [--fix] [--json]
validate <artifact> [path] [--strict]
lint [path] [--fix]
rules list
rules check <name> [path]
upgrade [path] [--to <version>] [--dry-run]
logs [--tail] [--cycle <n>] [--stage <name>] [--json]
status [path] [--json]
coverage [path] [--diff <sha>]
help [command]
version
```

### 11.3 `.loshu-sdlc/config.yaml`

```yaml
version: 1
coverage: { line: 80, branch: 75, fail_on_drop: false }
hooks: { policy: tiered, block_on_critical: true, warn_on_soft: true }
deps:
  tier1_required: [...]
  tier2_recommended: [...]
  auto_install_offered: true
eval: { mode: loose, similarity_threshold: 0.85 }
logging: { level: info, json: false, redact_secrets: true }
loop: { auto_intent_on_incident: true, require_po_signoff: true }
```

### 11.4 Telemetry

**No telemetry by default.** Zero network calls except explicit `plugin install` and `upgrade`. Logs local-only. Optional opt-in: `loshu-sdlc telemetry enable` sends anonymized install counts only.

---

## 12. Release & operations

### 12.1 Versioning

Shared version across `@loshu-sdlc/plugin`, `@loshu-sdlc/cli`, `@loshu-sdlc/templates`. Semver. `0.x` is pre-stable (breaking changes between minors); `1.x+` is stable (breaking only at major).

### 12.2 Distribution channels

- **npm:** `@loshu-sdlc/cli`, `@loshu-sdlc/templates`
- **Claude Code marketplace:** `@loshu-sdlc/plugin`
- **GitHub Releases:** source + tarballs

### 12.3 Support model

| Version | Status | Security | Bug fixes | Features |
|---|---|---|---|---|
| Latest minor | Active | ✓ | ✓ | ✓ |
| Previous minor | Maintenance | ✓ | ✓ | ✗ |
| LTS major | LTS (18 months) | ✓ | critical only | ✗ |
| Older | EOL | ✗ | ✗ | ✗ |

### 12.4 Deprecation policy

For `1.x+` breaking changes: announce in CHANGELOG, document migration, warn in CLI for 2 releases, remove at next major. For `0.x`: breaking changes allowed between minors.

### 12.5 Security

- Vulnerability disclosure: `SECURITY.md` + GitHub Security Advisories
- Response SLA: 48h acknowledge, 14d critical fix, 30d high fix
- Dependabot + weekly review; critical CVEs patched within 7d
- npm provenance attestations; signed releases

### 12.6 Roadmap

| Version | Target | Highlights |
|---|---|---|
| v0.1.0 | +3 months | All 6 stages; minimal + full templates; Tier-1 superpowers; borrowed UI baseline |
| v0.2.0 | +5 months | UI-ux-pro-max polish; eval suite 30+; example-app reference |
| v0.5.0 | +8 months | ECC integration; perf monitoring; multi-cycle viz |
| v1.0.0 | +12 months | Stable API; full docs site; pilot projects |

---

## 13. What loshu-sdlc owns vs borrows

**Owns (SDLC-specific):**
- Artifact chain (`intent.md → spec.md → plan.md → REVIEW.md → bands.yaml`)
- JSON schemas for all artifacts
- Tiered hook enforcement
- Stage gates
- Loop closure
- Statistical band evaluation (1σ/2σ/3σ)
- Coverage threshold configuration
- Scaffolder + maintenance CLI
- Eval harness

**Borrows from superpowers (Tier 1):** `using-superpowers`, `brainstorming`, `writing-plans`, `tdd`, `systematic-debugging`

**Borrows from superpowers (Tier 2):** `verification-before-completion`, `receiving-code-review`

**Borrows from ui-ux-pro-max (Tier 2 + curated baseline):** palettes, typography, a11y, breakpoints, charts, motion, icons, stacks

**Borrows from ECC (Tier 2):** `architect`, `code-reviewer`, `security-reviewer`

**Borrows from ECC (Tier 3):** `frontend-patterns`, `backend-patterns`, `api-design`, `database-migrations`, `postgres-patterns`, `e2e-runner`, `build-error-resolver`, `refactor-cleaner`, `doc-updater`, `deployment-patterns`, `docker-patterns`, `coding-standards`, `security-review`, `security-scan`, `tdd-workflow`, `e2e-testing`

**Explicitly does NOT depend on:**
- LLM providers (the plugin runs inside Claude Code)
- Cloud services (no backend)
- User analytics platforms (telemetry is opt-in, minimal, local-only)

---

## 14. Open questions (pre-v1.0)

1. **License** — MIT vs Apache 2.0 vs custom? Compatibility with superpowers, ECC, ui-ux-pro-max licenses TBD.
2. **Plugin marketplace identity** — `loshu-sdlc` or `loshu-sdlc-plugin`? Avoid collision with existing plugins.
3. **First-party hosting** — npm under `loshu-sdlc` org or personal?
4. **Backing org** — personal repo or loshu-sdlc GitHub org?
5. **Brand assets** — logo, color palette (could leverage ui-ux-pro-max's 192 palettes).
6. **Eval similarity threshold** — 0.85 is a guess; calibrate against real stories once we have them.
7. **Hook policy overrides** — should users be able to relax Tier-2 BLOCK to WARN via config? (Currently: yes, via `hooks.block_on_critical: false`.)

---

## 15. Decision log

| When | Decision | Alternatives considered | Reason chosen |
|---|---|---|---|
| Start | Deliverable = plugin | reference repo, docs-only, scaffolder-only | user-stated |
| Start | Source = AI-Native SDLC Playbook | none | user-pointed |
| Early | Stages = all 6 | full / build+test / minimal / plan+design | user-stated |
| Early | Target = language-agnostic | Node-targeted / Python / multi-stack | user-stated |
| Early | Distribution = plugin + full scaffolder | marketplace only / plugin + companion CLI / plugin + scaffolder + docs | user-stated |
| Early | CLI = Node/TS | Python / Go / multi-lang | recommended |
| Early | Name = loshu-sdlc | sdlc-claude / ai-sdlc / claude-sdlc | user-stated |
| Early | Hook policy = tiered | strict / advisory / none | user-stated |
| Mid | Repo = monorepo (Approach A) | single pkg / plugin-first | recommended |
| Mid | Borrow superpowers + ui-ux-pro-max + ECC | build everything in-house | user-stated |
| Mid | Quality gates/rules from superpowers + ECC | invent own | user-stated |
| Late | Trimmed external deps (no duplication) | every plugin for every job | user feedback |

---

## 16. References

- [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) (Aug 21, 2026)
- [The AI-Native SDLC Playbook course (Claude Academy)](https://academy.claude.com/courses/ai-native-sdlc-playbook)
- [Skills as institutional knowledge](https://academy.claude.com/courses/ai-native-sdlc-playbook/skills-as-institutional-knowledge)
- [affaan-m/everything-claude-code (ECC)](https://github.com/affaan-m/everything-claude-code)
- [Claude Code plugin marketplace docs](https://docs.claude.com/en/docs/claude-code/plugins)
- [superpowers plugin](https://github.com/superpowers/superpowers)
- [ui-ux-pro-max skill](https://github.com/superpowers/ui-ux-pro-max)
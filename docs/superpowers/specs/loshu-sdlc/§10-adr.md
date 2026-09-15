# §10 Architecture Decisions

<!-- Locked decisions table + chronological decision log. One section per decision. -->

Every "we picked X over Y" decision, both the locked decisions set at the start of the project and the decisions made during the build-out.

## Locked decisions

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

## Decision log (chronological)

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

## Cross-references

- See also: [§3-domain-model.md](§3-domain-model.md) — the repo layout, components, and dependency tiers that these decisions produce
- See also: [§4-state-machine.md](§4-state-machine.md) — the compliance contract that operationalizes the "tiered hook policy" decision
- See also: [§11-open-questions.md](§11-open-questions.md) — items still unresolved that may amend these decisions

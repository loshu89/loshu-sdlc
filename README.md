# loshu-sdlc

> AI-Native Software Development Lifecycle plugin for Claude Code.

[![CI](https://github.com/loshu89/loshu-sdlc/actions/workflows/ci.yml/badge.svg)](https://github.com/loshu89/loshu-sdlc/actions/workflows/ci.yml)
[![Publish](https://github.com/loshu89/loshu-sdlc/actions/workflows/publish-ghcr.yml/badge.svg)](https://github.com/loshu89/loshu-sdlc/actions/workflows/publish-ghcr.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub Packages](https://img.shields.io/badge/GitHub%20Packages-@loshu89-blue)](https://github.com/orgs/loshu89/packages)

[English](README.md) · [简体中文](README.zh-CN.md)

loshu-sdlc implements the six-stage **AI-Native Software Development Lifecycle** described in the [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) (Aug 2026) as a Claude Code plugin.

The plugin turns every change into a version-controlled, schema-validated, hook-enforced artifact (`intent.md → spec.md → plan.md → CLAUDE.md → REVIEW.md → bands.yaml`), and closes the loop by turning production incidents back into new intent documents.

---

## Table of contents

- [Design philosophy](#design-philosophy)
- [Quick start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
  - [Slash commands](#slash-commands)
  - [CLI commands](#cli-commands)
  - [Hooks](#hooks)
  - [The artifact chain](#the-artifact-chain)
- [Project structure](#project-structure)
- [External dependencies](#external-dependencies)
- [Development](#development)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Design philosophy

**Three principles** guided every decision:

1. **Thin by design.** loshu-sdlc is an orchestrator. It composes well-built external skills (`superpowers:*`, `ui-ux-pro-max`, `ecc:*`) for intelligence and ships only what is SDLC-specific: the artifact chain, JSON schemas, tiered hooks, statistical band evaluation, and the closed feedback loop.
2. **Artifacts over chat.** Every stage produces a version-controlled file (`intent.md`, `spec.md`, ...). Decisions are auditable, reviewable, and replayable — not lost in a chat scrollback.
3. **Governed, not gated.** Hooks block only on critical violations (exit 2); soft warnings are logged, not enforced. The human stays in charge; the plugin catches what humans miss.

**Loop closure is the headline.** A 3σ production incident (any metric tripped beyond its `bands.yaml` threshold) auto-generates a new `intent.md`, the cycle restarts, and the fix flows through the same gates as any other change. No separate hot-fix process.

**Three dependency tiers:**

| Tier | Required | What breaks if missing |
|---|---|---|
| **Tier 1 (required)** | `superpowers:{using-superpowers, brainstorming, writing-plans, tdd, systematic-debugging}` | Hard fail — loshu-sdlc refuses to run |
| **Tier 2 (recommended)** | `ui-ux-pro-max`, `ecc:{architect, code-reviewer, security-reviewer}`, `superpowers:{verification-before-completion, receiving-code-review}` | Warn — degraded quality but functional |
| **Tier 3 (opportunistic)** | Other `ecc:*` skills and frontend/backend patterns | Silent — used if installed, ignored otherwise |

---

## Quick start

The fastest way to use loshu-sdlc:

```bash
# 1. Install the CLI scaffolder
npx create-loshu-sdlc-app my-app
cd my-app

# 2. Capture your first intent (brainstorms with you, then writes intent.md)
/sdlc-plan

# 3. Continue through the stages
/sdlc-design    # → spec.md
/sdlc-build     # → plan.md + CLAUDE.md
/sdlc-test      # → verification block + evals
/sdlc-deploy    # → REVIEW.md
/sdlc-maintain  # → bands.yaml + monitoring

# Check progress anytime
/sdlc-status
```

That's the full happy path in five commands.

---

## Installation

### Option A — Install the Claude Code plugin from the marketplace

```bash
claude plugin marketplace add loshu89/loshu-sdlc
claude plugin install loshu-sdlc@loshu-sdlc
```

Then use the slash commands (`/sdlc-plan`, `/sdlc-design`, etc.) in any Claude Code session.

### Option B — Scaffold a new project with the CLI

```bash
npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc] [--template full]
```

Flags:

| Flag | Effect |
|---|---|
| `--with-ux` | Also install `ui-ux-pro-max` |
| `--with-ecc` | Also install `ecc` (Everything Claude Code) |
| `--with-all` | Shorthand for `--with-ux --with-ecc` |
| `--template full` | Use the full SDLC template (default: minimal) |
| `--existing` | Install into an existing repo (don't scaffold) |
| `--coverage 80` | Line coverage threshold (default 80) |
| `--branch 75` | Branch coverage threshold (default 75) |
| `--no-git` | Skip `git init` and the first commit |
| `--yes` / `-y` | Skip interactive prompts |
| `--strict` | Enable strict eval mode |
| `--help` / `-h` | Show help |

### Option C — Install the scaffolder CLI globally

The npm packages are published to **GitHub Packages** under the `@loshu89` scope.

```bash
# 1. Tell npm to use GitHub Packages for the @loshu89 scope
echo "@loshu89:registry=https://npm.pkg.github.com" >> ~/.npmrc

# 2. Authenticate with a GitHub token that has `read:packages`
echo "//npm.pkg.github.com/:_authToken=ghp_xxxxxxxxxxxxxxxxxxxx" >> ~/.npmrc

# 3. Install the CLI globally
npm install -g @loshu89/cli

# 4. Use it
create-loshu-sdlc-app my-app
```

> **Note:** GitHub Packages requires authentication even for public packages. Unlike `npmjs.com`, anonymous download is not allowed. Create a personal access token at <https://github.com/settings/tokens/new> with the `read:packages` scope.

### Required external skills

For full functionality, install the Tier-1 superpowers plugin (the only hard requirement):

```bash
claude plugin marketplace add superpowers/superpowers
claude plugin install superpowers@superpowers
```

Without it, loshu-sdlc refuses to run. Tier-2 and Tier-3 skills are optional — the plugin warns or silently skips when they're missing.

---

## Usage

### Slash commands

Once the plugin is installed, you have nine slash commands:

| Command | Stage | Purpose |
|---|---|---|
| `/sdlc-plan` | Plan | Brainstorm with Claude and write `intent.md` |
| `/sdlc-design` | Design | Translate intent into `spec.md` |
| `/sdlc-build` | Build | Generate `plan.md` and scaffold `CLAUDE.md` |
| `/sdlc-test` | Test | Run TDD discipline and the verification block |
| `/sdlc-deploy` | Deploy | Populate `REVIEW.md` with security + compliance checks |
| `/sdlc-maintain` | Maintain | Evaluate `bands.yaml`; auto-generate incident-driven `intent.md` on 3σ |
| `/sdlc-status` | (meta) | Show current cycle state |
| `/sdlc-init` | (meta) | Run plan → design → build in sequence |
| `/sdlc-help` | (meta) | Show command reference |

### CLI commands

The `loshu-sdlc` CLI also ships with maintenance commands:

```
loshu-sdlc create    [path]      Scaffold a new SDLC project
loshu-sdlc validate  <artifact> <file>
                                Validate an artifact (intent, spec, plan, etc.) against its schema
loshu-sdlc doctor    [path]      Health checks for an SDLC project
loshu-sdlc bands     evaluate <file>
                                Evaluate bands.yaml against current metrics
loshu-sdlc lint      [path]      Lint borrowed plugin skills (with --fix)
loshu-sdlc rules     list|check  Inspect the rule registry
loshu-sdlc status    [path]      Render per-stage status table
loshu-sdlc coverage  [path]      Run coverage and emit a JSON report
loshu-sdlc logs                  Read ~/.loshu-sdlc/logs/*.log
loshu-sdlc upgrade   [path]      Bump loshu-sdlc version pins in package.json
loshu-sdlc telemetry             Toggle telemetry in ~/.loshu-sdlc/config.json
loshu-sdlc help      [command]   Show help
```

### Hooks

Hooks fire at stage transitions to enforce the artifact chain:

| Hook | When | What it does |
|---|---|---|
| `plan-exit` | After `/sdlc-plan` writes `intent.md` | Validates the file against `intent.schema.json` |
| `design-exit` | After `/sdlc-design` writes `spec.md` | Validates `spec.md`; ensures `intent.md` is `accepted` |
| `build-exit` | After `/sdlc-build` writes `plan.md` | Validates `plan.md`; ensures `CLAUDE.md` has the verification block |
| `test-exit` | After `/sdlc-test` | Runs the verification block (build / test / lint / typecheck must all exit 0) |
| `deploy-exit` | After `/sdlc-deploy` writes `REVIEW.md` | Validates `REVIEW.md`; blocks on `status: fail` in any section |
| `maintain-exit` | After `/sdlc-maintain` | Validates `bands.yaml`; requires new `intent.md` on 3σ incidents |
| `protect-artifacts` | On any Write/Edit tool call | Allow-all stub; reserved for future artifact protection |

All hooks use Claude Code's `exit 0` (allow) / `exit 2` (block) semantics.

### The artifact chain

Each stage produces a version-controlled artifact. Together they form an auditable decision trail:

```
   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐    ┌───────────┐    ┌────────────┐
   │ intent  │ ─▶ │  spec   │ ─▶ │  plan   │ ─▶ │ CLAUDE   │ ─▶ │  REVIEW   │ ─▶ │  bands    │
   │   .md   │    │   .md   │    │   .md   │    │   .md    │    │   .md     │    │   .yaml   │
   └─────────┘    └─────────┘    └─────────┘    └──────────┘    └───────────┘    └────────────┘
        │               │              │              │               │               │
        └───────────────┴──────────────┴──────────────┴───────────────┘               │
                                  ▼                                                   │
                          project history                                            │
                          (all git-tracked)                                           │
                                                                                      │
                                  ◀───────────── 3σ incident ────────────────────────┘
                                          (auto-generates new intent.md)
```

Each artifact has a JSON schema in `packages/plugin/schemas/`. `loshu-sdlc validate <artifact> <file>` runs the schema check.

---

## Project structure

This repository is an npm-workspaces monorepo with three packages:

```
loshu-sdlc/
├── packages/
│   ├── plugin/                     # Claude Code plugin (markdown + JSON only)
│   │   ├── .claude-plugin/
│   │   │   └── plugin.json         # plugin manifest
│   │   ├── commands/               # 9 slash commands
│   │   │   ├── sdlc-plan.md
│   │   │   ├── sdlc-design.md
│   │   │   ├── sdlc-build.md
│   │   │   ├── sdlc-test.md
│   │   │   ├── sdlc-deploy.md
│   │   │   ├── sdlc-maintain.md
│   │   │   ├── sdlc-status.md
│   │   │   ├── sdlc-init.md
│   │   │   └── sdlc-help.md
│   │   ├── agents/                 # 5 SDLC-specific subagents
│   │   ├── skills/                 # authoring skills + policy defaults + UI baseline
│   │   ├── hooks/                  # 6 tiered enforcement scripts
│   │   └── schemas/                # 7 JSON schemas for artifacts
│   │
│   ├── cli/                        # Scaffolder + maintenance CLI (Node + TypeScript)
│   │   ├── src/
│   │   │   ├── bin/                # create-loshu-sdlc-app + loshu-sdlc entrypoints
│   │   │   ├── commands/           # create, validate, doctor, bands, lint, rules,
│   │   │   │                       #   status, coverage, logs, upgrade, telemetry
│   │   │   └── lib/                # render, git, plugin-bundler, prompts,
│   │   │                           #   validate (Ajv), bands (statistics), attribution
│   │   ├── tests/                  # vitest unit tests
│   │   └── plugin/                 # bundled plugin copy (gitignored, regenerated on build)
│   │
│   └── templates/                  # Starter projects
│       ├── minimal/                 # minimal: README + intent.md + .loshu-sdlc/config.yaml
│       └── full/                    # full: all 6 artifacts + 2 CI workflow stubs
│
├── tests/
│   └── evals/                      # ~30 golden-file eval stories across 6 stages
│       ├── plan/, design/, build/, test/, deploy/, maintain/
│       └── run.ts                  # eval harness (loose + strict modes)
│
├── scripts/                        # release.mjs + copy-plugin.mjs
├── docs/                           # User-facing docs
│   ├── getting-started.md
│   └── installation.md
├── .github/workflows/              # ci.yml + publish-ghcr.yml
├── .changeset/                     # changesets config + entries
├── package.json                    # workspace root (pnpm)
├── tsconfig.base.json              # shared TS config
├── vitest.config.ts                # multi-project vitest config
└── README.md (this file) / README.zh-CN.md
```

**Package purposes:**

| Package | Purpose | Published as |
|---|---|---|
| `@loshu89/plugin` | The Claude Code plugin — slash commands, agents, skills, hooks, schemas | GitHub Packages |
| `@loshu89/cli` | Scaffolder (`create-loshu-sdlc-app`) + maintenance CLI (`loshu-sdlc`) | GitHub Packages |
| `@loshu89/templates` | Starter templates consumed by the scaffolder | GitHub Packages |

---

## External dependencies

loshu-sdlc orchestrates external skills. Tier-1 is required; Tier-2/3 are optional.

**Tier 1 (required):**
- `superpowers:using-superpowers`, `superpowers:brainstorming`, `superpowers:writing-plans`, `superpowers:tdd`, `superpowers:systematic-debugging`

**Tier 2 (recommended):**
- `ui-ux-pro-max` (UI/UX design intelligence)
- `ecc:architect`, `ecc:code-reviewer`, `ecc:security-reviewer`
- `superpowers:verification-before-completion`, `superpowers:receiving-code-review`

**Tier 3 (opportunistic):**
- Other `ecc:*` skills (frontend-patterns, backend-patterns, api-design, database-migrations, etc.)

Install with `claude plugin install <name>@<marketplace>`.

---

## Development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

### Setup

```bash
git clone https://github.com/loshu89/loshu-sdlc.git
cd loshu-sdlc
pnpm install
```

### Common scripts

```bash
pnpm typecheck                    # TypeScript check across all packages
pnpm test                         # Vitest unit + integration tests (46 tests)
pnpm build                        # Build CLI + bundle plugin
pnpm lint                         # ESLint
pnpm test:eval                    # Eval suite (~30 stories, loose mode, cosine ≥ 0.85)
pnpm test:eval:strict             # Eval suite (strict mode, CI gate)
pnpm test:eval:json               # JSON output for tooling
pnpm test:eval:record             # Overwrite .expected files with current output
```

### Release

```bash
# Local release (bumps all three packages, runs the gauntlet, commits, tags)
node scripts/release.mjs 0.2.1

# Push the tag to trigger publish-ghcr.yml
git push origin main v0.2.1
```

The CI workflow (`publish-ghcr.yml`) runs `tests/eval:strict` plus the full gauntlet and publishes to GitHub Packages.

---

## Troubleshooting

**"Tier-1 dep missing"**
Install superpowers (see [Required external skills](#required-external-skills)). loshu-sdlc refuses to run without it.

**Hook blocked my edit**
Hooks use `exit 2` to block with a specific reason on stderr. Read the message, fix the issue, retry.

**Plugin commands not appearing in Claude Code**
After installing via `claude plugin install loshu-sdlc@loshu-sdlc`, restart your Claude Code session. Slash commands are discovered at session start.

**Scaffolder creates project but hooks don't fire**
The `create` command creates a symlink `.claude/hooks → .claude/plugins/loshu-sdlc/hooks/`. If your filesystem doesn't support symlinks (some Windows configs), hooks won't fire. Workaround: copy the `hooks/` directory manually after scaffold.

**Tests fail on fresh clone**
Run `pnpm install --frozen-lockfile` to ensure lockfile consistency. Then `pnpm test`.

**Eval suite has unexpected failures**
Run `pnpm test:eval --loose` (default) or `pnpm test:eval --strict`. Loose mode allows shingle cosine ≥ 0.85; strict requires exact match. To regenerate golden files, use `pnpm test:eval:record`.

**GitHub Packages publish fails with E401**
This is almost always the org's third-party app restriction. Either:
1. Approve the GitHub Actions app in org settings → Third-party access
2. Or use a PAT (added as `GHCR_TOKEN` secret) — see workflow file for current auth approach

---

## License

MIT © loshu-sdlc contributors

Third-party content (palettes, typography, accessibility, coding standards, security baselines) is borrowed from `ui-ux-pro-max` and `ecc` under their respective licenses — see [`LICENSE-THIRD-PARTY.md`](LICENSE-THIRD-PARTY.md).

---

[Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) · [GitHub Packages](https://github.com/orgs/loshu89/packages) · [Issues](https://github.com/loshu89/loshu-sdlc/issues)

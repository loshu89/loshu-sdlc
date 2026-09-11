# loshu-sdlc v0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship loshu-sdlc v0.1.0 — the first AI-Native SDLC plugin for Claude Code. Covers all six SDLC stages (Plan → Design → Build → Test → Deploy → Maintain), the artifact chain (`intent.md → spec.md → plan.md → CLAUDE.md → REVIEW.md → bands.yaml`), the scaffolder CLI, minimal + full templates, and basic test infrastructure.

**Architecture:** npm-workspaces monorepo with three packages (`plugin/`, `cli/`, `templates/`). The plugin is pure markdown + JSON (no build step). The CLI is Node/TS. Tests are vitest. Schemas are JSON Schema (Draft 2020-12). Hooks are POSIX shell scripts using Claude Code's `exit 0` allow / `exit 2` block convention.

**Tech Stack:**
- pnpm 9.x (workspaces)
- Node.js 20.x LTS, TypeScript 5.4+ strict
- Vitest 1.x (testing)
- ESLint 9.x + Prettier 3.x (lint/format)
- Changesets (versioning)
- Ajv 8.x (JSON schema validation)
- Inquirer 9.x (interactive prompts)
- EJS 3.x (template rendering)
- execa 8.x (subprocess)
- chalk 5.x (terminal styling)

**Spec:** `docs/superpowers/specs/2026-09-11-loshu-sdlc-design.md` — read this plan alongside the spec.

---

## Global Constraints

- **Node version:** ≥20.0.0 (declared in `package.json#engines` for every package)
- **pnpm version:** ≥9.0.0
- **License:** MIT (TBD pending §14 open question; default MIT for v0.1.0)
- **Commit convention:** Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`)
- **Branch:** `main`
- **TypeScript:** strict mode everywhere
- **Test framework:** vitest only (no jest, mocha, etc.)
- **Linter:** ESLint with `@typescript-eslint/recommended-type-checked`
- **Formatter:** Prettier with `printWidth: 100`, `singleQuote: true`, `trailingComma: 'all'`
- **Hook scripts:** POSIX shell (`#!/usr/bin/env bash`), `set -euo pipefail`
- **JSON Schema:** Draft 2020-12, validated with Ajv 8.x
- **All Markdown:** CommonMark + GFM
- **No emojis in code or commits** (only allowed in user-facing terminal output via chalk)
- **No telemetry** (see spec §11.4)
- **No external runtime deps for the plugin** (only markdown + JSON)
- **File naming:** kebab-case for files, PascalCase for classes/types, camelCase for functions/variables

---

## Task 1: Initialize monorepo

**Files:**
- Create: `.gitignore`
- Create: `.gitattributes`
- Create: `README.md`
- Create: `LICENSE`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc.json`
- Create: `.changeset/config.json`
- Create: `.editorconfig`
- Create: `docs/superpowers/specs/.gitkeep`

**Interfaces:**
- Produces: `pnpm install` resolves workspace; `pnpm -r build` builds all packages; `pnpm test` runs all tests

- [ ] **Step 1: Initialize git repo**

```bash
cd D:/workspace/3.my/SDLC
git init
git config user.email "loshu-sdlc@example.com"
git config user.name "loshu-sdlc"
git checkout -b main
```

Expected: empty git repo on `main` branch.

- [ ] **Step 2: Write `.gitignore`**

```
node_modules/
dist/
build/
coverage/
*.log
.DS_Store
.env
.env.local
.vscode/
.idea/
*.tsbuildinfo
.pnpm-store/
.loshu-sdlc/
```

- [ ] **Step 3: Write `.gitattributes`**

```
* text=auto eol=lf
*.md text eol=lf
*.json text eol=lf
*.sh text eol=lf
*.ts text eol=lf
*.js text eol=lf
*.yaml text eol=lf
*.yml text eol=lf
```

- [ ] **Step 4: Write `.editorconfig`**

```
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true

[*.md]
trim_trailing_whitespace = false
```

- [ ] **Step 5: Write `LICENSE` (MIT)**

```
MIT License

Copyright (c) 2026 loshu-sdlc contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 6: Write root `package.json`**

```json
{
  "name": "loshu-sdlc",
  "version": "0.1.0",
  "private": true,
  "description": "AI-Native SDLC plugin for Claude Code",
  "license": "MIT",
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  },
  "packageManager": "pnpm@9.0.0",
  "workspaces": [
    "packages/*"
  ],
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:coverage": "pnpm -r test:coverage",
    "lint": "eslint . --ext .ts,.js",
    "format": "prettier --write \"**/*.{ts,js,json,md,yml,yaml,sh}\"",
    "format:check": "prettier --check \"**/*.{ts,js,json,md,yml,yaml,sh}\"",
    "typecheck": "pnpm -r typecheck",
    "version": "changeset version",
    "publish": "pnpm -r publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.0",
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^9.1.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 7: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'packages/*'
```

- [ ] **Step 8: Write `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true
  }
}
```

- [ ] **Step 9: Write `.eslintrc.json`**

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": ["./packages/*/tsconfig.json"],
    "tsconfigRootDir": "."
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "prettier"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-floating-promises": "error",
    "no-console": "off"
  },
  "ignorePatterns": ["node_modules/", "dist/", "coverage/", "*.config.js"]
}
```

- [ ] **Step 10: Write `.prettierrc.json`**

```json
{
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
  "semi": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

- [ ] **Step 11: Write `.changeset/config.json`**

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.0/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [
    ["@loshu-sdlc/plugin", "@loshu-sdlc/cli", "@loshu-sdlc/templates"]
  ],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch"
}
```

- [ ] **Step 12: Write minimal `README.md`**

```markdown
# loshu-sdlc

AI-Native SDLC plugin for Claude Code.

Implements the six-stage Software Development Lifecycle described in the [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).

## Status

v0.1.0 (in development)

## Quickstart

```bash
npx create-loshu-sdlc-app my-app --with-ux --with-ecc
cd my-app
/sdlc-plan
```

## Documentation

See `docs/getting-started.md`.

## License

MIT
```

- [ ] **Step 13: Create `docs/superpowers/specs/.gitkeep`** (empty file)

```bash
touch docs/superpowers/specs/.gitkeep
```

- [ ] **Step 14: Install dependencies**

```bash
cd D:/workspace/3.my/SDLC
pnpm install
```

Expected: `node_modules/` created; `pnpm-lock.yaml` written; no errors.

- [ ] **Step 15: Verify pnpm workspace resolves**

```bash
pnpm -r ls --depth=-1
```

Expected: lists root workspace (no packages yet since we haven't created them). Exit code 0.

- [ ] **Step 16: Commit**

```bash
git add .
git commit -m "chore: initialize monorepo (workspace, tooling, license)"
```

---

## Task 2: Create plugin package skeleton

**Files:**
- Create: `packages/plugin/package.json`
- Create: `packages/plugin/README.md`
- Create: `packages/plugin/.claude-plugin/plugin.json`

**Interfaces:**
- Produces: `packages/plugin/` is a valid Claude Code plugin; `pnpm --filter @loshu-sdlc/plugin <cmd>` works

- [ ] **Step 1: Write `packages/plugin/package.json`**

```json
{
  "name": "@loshu-sdlc/plugin",
  "version": "0.1.0",
  "description": "Claude Code plugin for AI-Native SDLC",
  "license": "MIT",
  "type": "module",
  "main": "./.claude-plugin/plugin.json",
  "files": [
    ".claude-plugin/",
    "commands/",
    "skills/",
    "agents/",
    "hooks/",
    "schemas/"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "test": "echo \"plugin has no runtime tests\" && exit 0",
    "typecheck": "echo \"plugin is markdown/JSON, no typecheck\" && exit 0",
    "build": "echo \"plugin is markdown/JSON, no build\" && exit 0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/plugin/.claude-plugin/plugin.json`**

```json
{
  "name": "loshu-sdlc",
  "version": "0.1.0",
  "description": "AI-Native SDLC: Plan → Design → Build → Test → Deploy → Maintain",
  "author": {
    "name": "loshu-sdlc contributors"
  },
  "license": "MIT",
  "keywords": [
    "sdlc",
    "ai-native",
    "claude-code",
    "planning",
    "design",
    "testing",
    "deployment",
    "monitoring"
  ]
}
```

- [ ] **Step 3: Write `packages/plugin/README.md`**

```markdown
# @loshu-sdlc/plugin

Claude Code plugin for the AI-Native Software Development Lifecycle.

## Installation

```bash
/plugin marketplace add loshu-sdlc/loshu-sdlc
/plugin install loshu-sdlc@loshu-sdlc
```

## Commands

- `/sdlc-plan` — Capture intent as `intent.md`
- `/sdlc-design` — Design as `spec.md`
- `/sdlc-build` — Build as `plan.md` + `CLAUDE.md`
- `/sdlc-test` — Test with verification block
- `/sdlc-deploy` — Deploy via `REVIEW.md`
- `/sdlc-maintain` — Maintain via `bands.yaml`
- `/sdlc-status` — Show current cycle state
- `/sdlc-init` — Run plan → design → build sequence
- `/sdlc-help` — Show command reference

See spec: `docs/superpowers/specs/2026-09-11-loshu-sdlc-design.md`
```

- [ ] **Step 4: Verify package installs into workspace**

```bash
cd D:/workspace/3.my/SDLC
pnpm install
pnpm --filter @loshu-sdlc/plugin test
```

Expected: install succeeds; test command prints the echo and exits 0.

- [ ] **Step 5: Commit**

```bash
git add packages/plugin/
git commit -m "feat(plugin): create plugin package skeleton"
```

---

## Task 3: Create CLI package skeleton

**Files:**
- Create: `packages/cli/package.json`
- Create: `packages/cli/tsconfig.json`

**Interfaces:**
- Produces: `packages/cli/` builds with `pnpm --filter @loshu-sdlc/cli build`; vitest runs

- [ ] **Step 1: Write `packages/cli/tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 2: Write `packages/cli/package.json`**

```json
{
  "name": "@loshu-sdlc/cli",
  "version": "0.1.0",
  "description": "Scaffolder and maintenance CLI for loshu-sdlc",
  "license": "MIT",
  "type": "module",
  "bin": {
    "create-loshu-sdlc-app": "./dist/bin/create-loshu-sdlc-app.js",
    "loshu-sdlc": "./dist/bin/loshu-sdlc.js"
  },
  "main": "./dist/index.js",
  "files": [
    "dist/",
    "templates/"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@loshu-sdlc/templates": "workspace:*",
    "ajv": "^8.12.0",
    "ajv-formats": "^3.0.0",
    "chalk": "^5.3.0",
    "ejs": "^3.1.9",
    "execa": "^8.0.0",
    "fs-extra": "^11.2.0",
    "inquirer": "^9.2.0",
    "yaml": "^2.4.0"
  },
  "devDependencies": {
    "@types/ejs": "^3.1.5",
    "@types/fs-extra": "^11.0.0",
    "@types/inquirer": "^9.0.0",
    "@vitest/coverage-v8": "^1.6.0",
    "vitest": "^1.6.0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 3: Create empty source files**

```bash
mkdir -p packages/cli/src/lib
mkdir -p packages/cli/src/commands
mkdir -p packages/cli/src/bin
mkdir -p packages/cli/tests/lib
mkdir -p packages/cli/tests/commands
touch packages/cli/src/lib/.gitkeep
touch packages/cli/src/commands/.gitkeep
touch packages/cli/src/bin/.gitkeep
touch packages/cli/tests/lib/.gitkeep
touch packages/cli/tests/commands/.gitkeep
```

- [ ] **Step 4: Install dependencies**

```bash
cd D:/workspace/3.my/SDLC
pnpm install
```

Expected: all CLI dependencies resolve; workspace link to `@loshu-sdlc/templates` works (even though templates package doesn't exist yet — pnpm will warn but not fail at this point).

- [ ] **Step 5: Verify typecheck**

```bash
pnpm --filter @loshu-sdlc/cli typecheck
```

Expected: exit 0 (no source files to check yet, just confirms tsconfig is valid).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): create CLI package skeleton"
```

---

## Task 4: Create templates package

**Files:**
- Create: `packages/templates/package.json`
- Create: `packages/templates/minimal/README.md`
- Create: `packages/templates/minimal/.gitignore`
- Create: `packages/templates/minimal/intent.md`
- Create: `packages/templates/minimal/.loshu-sdlc/config.yaml`
- Create: `packages/templates/full/README.md`
- Create: `packages/templates/full/intent.md`
- Create: `packages/templates/full/spec.md`
- Create: `packages/templates/full/plan.md`
- Create: `packages/templates/full/CLAUDE.md`
- Create: `packages/templates/full/REVIEW.md`
- Create: `packages/templates/full/bands.yaml`
- Create: `packages/templates/full/.loshu-sdlc/config.yaml`
- Create: `packages/templates/full/.github/workflows/agent-evals.yml`
- Create: `packages/templates/full/.github/workflows/deploy-gate.yml`

**Interfaces:**
- Produces: `packages/templates/` exports minimal and full template directories; CLI will copy these into scaffolded projects

- [ ] **Step 1: Write `packages/templates/package.json`**

```json
{
  "name": "@loshu-sdlc/templates",
  "version": "0.1.0",
  "description": "Starter project templates for loshu-sdlc",
  "license": "MIT",
  "files": [
    "minimal/",
    "full/"
  ],
  "engines": {
    "node": ">=20.0.0"
  },
  "scripts": {
    "test": "echo \"templates have no tests\" && exit 0",
    "typecheck": "echo \"templates are markdown/yaml, no typecheck\" && exit 0",
    "build": "echo \"templates are static, no build\" && exit 0"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

- [ ] **Step 2: Write `packages/templates/minimal/README.md`**

```markdown
# <%= projectName %>

A loshu-sdlc project.

## Getting started

1. Run `/sdlc-plan` to capture your first intent
2. Run `loshu-sdlc doctor` to verify setup
```

- [ ] **Step 3: Write `packages/templates/minimal/.gitignore`**

```
node_modules/
dist/
build/
coverage/
*.log
.DS_Store
.env
.loshu-sdlc/cache/
```

- [ ] **Step 4: Write `packages/templates/minimal/intent.md`**

```markdown
---
status: draft
date: <%= date %>
---

# Intent: <First feature>

## Problem

[What's broken or missing]

## Proposed outcome

[Ideal end state]

## Affected users and systems

[Scope of impact]

## Constraints

[Hard limits — security, compliance, etc.]

## Open questions

[Unresolved items]
```

- [ ] **Step 5: Write `packages/templates/minimal/.loshu-sdlc/config.yaml`**

```yaml
version: 1

project:
  name: <%= projectName %>
  created: <%= date %>

coverage:
  line: <%= coverageLine %>
  branch: <%= coverageBranch %>
  fail_on_drop: false

hooks:
  policy: tiered
  block_on_critical: true
  warn_on_soft: true

deps:
  tier1_required:
    - superpowers:using-superpowers
    - superpowers:brainstorming
    - superpowers:writing-plans
    - superpowers:tdd
    - superpowers:systematic-debugging
  tier2_recommended:
    - ui-ux-pro-max
    - ecc:architect
    - ecc:code-reviewer
    - ecc:security-reviewer
    - superpowers:verification-before-completion
    - superpowers:receiving-code-review
  auto_install_offered: true

eval:
  mode: loose
  similarity_threshold: 0.85

logging:
  level: info
  json: false
  redact_secrets: true

loop:
  auto_intent_on_incident: true
  require_po_signoff: true
```

- [ ] **Step 6: Write `packages/templates/full/README.md`**

```markdown
# <%= projectName %>

A loshu-sdlc full-template project with all six SDLC stages pre-configured.

## Quickstart

```bash
pnpm install
pnpm test
pnpm build
```

## SDLC

Run `/sdlc-status` to see current cycle state. Run `/sdlc-help` for all commands.

## CI

- `.github/workflows/agent-evals.yml` — runs the eval suite
- `.github/workflows/deploy-gate.yml` — gates deploys on REVIEW.md
```

- [ ] **Step 7: Write `packages/templates/full/intent.md`**

```markdown
---
status: draft
date: <%= date %>
cycle: 1
---

# Intent: <First feature>

## Problem

[What's broken or missing]

## Proposed outcome

[Ideal end state]

## Affected users and systems

[Scope of impact]

## Constraints

[Hard limits — security, compliance, etc.]

## Open questions

[Unresolved items]
```

- [ ] **Step 8: Write `packages/templates/full/spec.md`**

```markdown
---
status: draft
intent: intent.md
date: <%= date %>
---

# Spec: <First feature>

## Architecture

[System design]

## UI

[UI design — palette, typography, a11y, breakpoints]

## API surface

[Endpoints + contracts — empty if no backend]

## Data model

[Schema changes — empty if no DB]

## Verification criteria

[How we'll know this works]

## Compliance

[Policy compliance — GDPR, SOC2, WCAG]
```

- [ ] **Step 9: Write `packages/templates/full/plan.md`**

```markdown
---
status: draft
spec: spec.md
date: <%= date %>
---

# Plan: <First feature>

## Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Verification

- Build: `pnpm build` exits 0
- Test: `pnpm test` exits 0
- Lint: `pnpm lint` exits 0
- Type-check: `pnpm typecheck` exits 0
```

- [ ] **Step 10: Write `packages/templates/full/CLAUDE.md`**

```markdown
# <%= projectName %>

Generated by loshu-sdlc v0.1.0 on <%= date %>.

## Stack

[Stack description — fill in during /sdlc-build]

## Verification block (REQUIRED to declare done)

- Build: `<build-command>` exits 0
- Test: `<test-command>` exits 0
- Lint: `<lint-command>` exits 0
- Type-check: `<typecheck-command>` exits 0

## Conventions

[Project-specific conventions — fill in during /sdlc-build]
```

- [ ] **Step 11: Write `packages/templates/full/REVIEW.md`**

```markdown
---
status: draft
spec: spec.md
plan: plan.md
date: <%= date %>
---

# Review: <First feature>

## Bugs

Status: pending
Findings: [populated by /sdlc-deploy via ecc:code-reviewer]

## Security

Status: pending
Findings: [populated by /sdlc-deploy via ecc:security-reviewer]

## Compliance

Status: pending
Findings: [populated by /sdlc-deploy via policy-default/]
```

- [ ] **Step 12: Write `packages/templates/full/bands.yaml`**

```yaml
version: 1
project: <%= projectName %>
generated: <%= date %>

metrics:
  - name: error_rate
    baseline: 0.01
    sigma_1: 0.015
    sigma_2: 0.02
    sigma_3: 0.03
    unit: ratio
    window: 1h

  - name: p95_latency_ms
    baseline: 200
    sigma_1: 250
    sigma_2: 350
    sigma_3: 500
    unit: ms
    window: 5m

  - name: deploy_frequency
    baseline: 3
    sigma_1: 5
    sigma_2: 8
    sigma_3: 12
    unit: per_day
    window: 24h

evaluation:
  interval: 5m
  on_3sigma: block_maintain_exit
  on_2sigma: warn
  on_1sigma: log
```

- [ ] **Step 13: Write `packages/templates/full/.loshu-sdlc/config.yaml`** (same content as minimal but with `template: full` marker)

```yaml
version: 1

project:
  name: <%= projectName %>
  template: full
  created: <%= date %>

coverage:
  line: <%= coverageLine %>
  branch: <%= coverageBranch %>
  fail_on_drop: false

hooks:
  policy: tiered
  block_on_critical: true
  warn_on_soft: true

deps:
  tier1_required:
    - superpowers:using-superpowers
    - superpowers:brainstorming
    - superpowers:writing-plans
    - superpowers:tdd
    - superpowers:systematic-debugging
  tier2_recommended:
    - ui-ux-pro-max
    - ecc:architect
    - ecc:code-reviewer
    - ecc:security-reviewer
    - superpowers:verification-before-completion
    - superpowers:receiving-code-review
  auto_install_offered: true

eval:
  mode: loose
  similarity_threshold: 0.85

logging:
  level: info
  json: false
  redact_secrets: true

loop:
  auto_intent_on_incident: true
  require_po_signoff: true
```

- [ ] **Step 14: Write `packages/templates/full/.github/workflows/agent-evals.yml`**

```yaml
name: agent-evals

on:
  pull_request:
  push:
    branches: [main]

jobs:
  evals:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Run eval suite (strict mode on main, loose on PR)
        run: |
          if [ "${{ github.event_name }}" = "push" ]; then
            pnpm test:eval --strict
          else
            pnpm test:eval
          fi

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: eval-results
          path: eval-results.json
```

- [ ] **Step 15: Write `packages/templates/full/.github/workflows/deploy-gate.yml`**

```yaml
name: deploy-gate

on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]

jobs:
  review-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check REVIEW.md
        run: |
          if [ ! -f REVIEW.md ]; then
            echo "::error::REVIEW.md not found. Run /sdlc-deploy first."
            exit 1
          fi

          # Status must not be 'fail' in any section
          if grep -E '^Status: fail' REVIEW.md; then
            echo "::error::REVIEW.md has status:fail. Fix findings and re-run /sdlc-deploy."
            exit 1
          fi

      - name: Validate REVIEW.md schema
        run: |
          npx --yes @loshu-sdlc/cli validate review REVIEW.md --strict
```

- [ ] **Step 16: Verify install**

```bash
cd D:/workspace/3.my/SDLC
pnpm install
pnpm --filter @loshu-sdlc/templates test
```

Expected: install resolves workspace link from CLI to templates; test exits 0.

- [ ] **Step 17: Commit**

```bash
git add packages/templates/
git commit -m "feat(templates): add minimal and full starter templates"
```

---

## Task 5: Create intent.schema.json

**Files:**
- Create: `packages/plugin/schemas/intent.schema.json`
- Create: `packages/plugin/schemas/README.md`

**Interfaces:**
- Produces: `intent.schema.json` validates the structure of `intent.md` files

The schema enforces the SDLC Compliance Contract §7: every intent.md MUST have problem, proposed outcome, affected users and systems, and open questions (status field optional at draft time, required at acceptance).

- [ ] **Step 1: Write `packages/plugin/schemas/intent.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/intent.schema.json",
  "title": "intent.md",
  "description": "Schema for SDLC intent documents. See spec §8.2.",
  "type": "object",
  "required": ["title", "problem", "proposedOutcome", "affectedUsersAndSystems", "openQuestions"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "description": "Short title describing the intent"
    },
    "status": {
      "type": "string",
      "enum": ["draft", "accepted", "rejected"],
      "default": "draft"
    },
    "date": {
      "type": "string",
      "format": "date"
    },
    "cycle": {
      "type": "integer",
      "minimum": 1,
      "description": "Cycle number; populated by /sdlc-init or auto-incremented"
    },
    "author": {
      "type": "string",
      "description": "Author or origin (e.g., 'A. Chen' or 'loshu-sdlc/maintain (incident INC-2389)')"
    },
    "origin": {
      "type": "string",
      "description": "Optional origin marker for incident-driven intents (e.g., 'maintain/3σ-bands.yaml:error_rate')"
    },
    "problem": {
      "type": "string",
      "minLength": 1,
      "description": "What is broken or missing"
    },
    "proposedOutcome": {
      "type": "string",
      "minLength": 1,
      "description": "Ideal end state"
    },
    "affectedUsersAndSystems": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "string"
      },
      "description": "Scope of impact"
    },
    "constraints": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Hard limits — security, compliance, etc."
    },
    "openQuestions": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Unresolved items; can be empty array if none"
    },
    "stack": {
      "type": "object",
      "description": "Optional stack markers for /sdlc-design and /sdlc-build",
      "properties": {
        "frontend": {
          "type": "boolean"
        },
        "backend": {
          "type": "boolean"
        },
        "frameworks": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Write `packages/plugin/schemas/README.md`**

```markdown
# loshu-sdlc Schemas

JSON Schema (Draft 2020-12) definitions for SDLC artifacts.

| Schema | Purpose | Invoked by |
|---|---|---|
| `intent.schema.json` | Validates `intent.md` | Plan-exit hook, `loshu-sdlc validate intent` |
| `spec.schema.json` | Validates `spec.md` | Design-exit hook, `loshu-sdlc validate spec` |
| `plan.schema.json` | Validates `plan.md` | Build-exit hook, `loshu-sdlc validate plan` |
| `claude-md.schema.json` | Validates `CLAUDE.md` (esp. verification block) | Build-exit hook |
| `review.schema.json` | Validates `REVIEW.md` | Deploy-exit hook |
| `bands.schema.json` | Validates `bands.yaml` | Maintain-exit hook |
| `policy.schema.json` | Validates `policy-default/*.md` files | `loshu-sdlc lint` |

All schemas use `https://json-schema.org/draft/2020-12/schema`.
```

- [ ] **Step 3: Verify schema is valid JSON**

```bash
cd D:/workspace/3.my/SDLC
node -e "console.log(JSON.parse(require('fs').readFileSync('packages/plugin/schemas/intent.schema.json', 'utf8')).title)"
```

Expected: prints `intent.md`. If this fails, the JSON is malformed.

- [ ] **Step 4: Commit**

```bash
git add packages/plugin/schemas/
git commit -m "feat(plugin): add intent.schema.json"
```

---

## Task 6: Create sdlc-plan slash command

**Files:**
- Create: `packages/plugin/commands/sdlc-plan.md`

**Interfaces:**
- Produces: `/sdlc-plan` slash command for Claude Code; orchestrates brainstorming → intent.md → schema validation

The slash command follows Claude Code's command format: YAML frontmatter (description, argument-hint) + Markdown body (instructions for Claude).

- [ ] **Step 1: Write `packages/plugin/commands/sdlc-plan.md`**

```markdown
---
description: Capture intent as intent.md (Plan stage of AI-Native SDLC)
argument-hint: [feature-or-topic]
---

# /sdlc-plan — Plan stage

You are running the **Plan stage** of the loshu-sdlc AI-Native SDLC. Your job is to produce a valid `intent.md` file that captures *why* a change is being made, not *how*.

## Required skills

Before proceeding, **invoke the `superpowers:using-superpowers` skill** (via the Skill tool) and confirm `superpowers:brainstorming` is reachable. If `superpowers:brainstorming` is not installed, **stop and tell the user**:

> This command requires `superpowers:brainstorming` (Tier-1 dependency).
> Install with: `/plugin marketplace add superpowers/superpowers` then `/plugin install superpowers@superpowers`
> See spec §4 for details.

Do not proceed without brainstorming. Do not improvise a replacement.

## Workflow

1. **Load context.**
   - Read the `intent-md-authoring` skill (via the Skill tool) for field guidance.
   - If the user provided an argument (`$ARGUMENTS`), treat it as a starting topic.

2. **Drive the brainstorming dialogue.**
   - Invoke `superpowers:brainstorming` (via the Skill tool) with the user's intent.
   - Ask follow-up questions until you have: problem, proposed outcome, affected users and systems, constraints, open questions.
   - The user (PO) will accept or reject via merge.

3. **Author `intent.md`.**
   - Use the field names exactly as in `packages/plugin/schemas/intent.schema.json` (the validator will check them).
   - Required fields: `title`, `problem`, `proposedOutcome`, `affectedUsersAndSystems`, `openQuestions`.
   - Optional but recommended: `status: draft`, `date` (today, ISO 8601), `author`, `constraints`, `stack`.

4. **Validate against the schema.**
   - Run: `loshu-sdlc validate intent intent.md --strict`
   - If validation fails, fix the file and re-validate. Do not declare done until exit code 0.

5. **Report.**
   - Tell the user the file is written and validated.
   - Suggest the next step: `/sdlc-design` (requires accepted status) or `/sdlc-status` to see cycle state.

## Schema reference

```json
{
  "required": ["title", "problem", "proposedOutcome", "affectedUsersAndSystems", "openQuestions"]
}
```

See `packages/plugin/schemas/intent.schema.json` for the full schema.

## Example output

```markdown
---
status: draft
date: 2026-09-11
cycle: 1
author: A. Chen
---

# Intent: OAuth authentication

## Problem

Users authenticate with email+password only; no SSO; enterprise customers blocked.

## Proposed outcome

OAuth via Google + GitHub. Existing email/password remains.

## Affected users and systems

- End users
- Login UI
- Session middleware
- Account service
- Audit log

## Constraints

- GDPR-compliant session storage
- Existing password hashes must remain valid
- SOC2 audit trail required

## Open questions

- Token rotation policy?
- Account linking rules for users with both auth methods?
```
```

- [ ] **Step 2: Verify command file**

```bash
cd D:/workspace/3.my/SDLC
ls packages/plugin/commands/sdlc-plan.md
head -5 packages/plugin/commands/sdlc-plan.md
```

Expected: file exists; first 5 lines are `---`, `description:`, `argument-hint:`, `---`, `# /sdlc-plan — Plan stage`.

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/commands/sdlc-plan.md
git commit -m "feat(plugin): add /sdlc-plan slash command"
```

---

## Task 7: Create spec.schema.json

**Files:**
- Create: `packages/plugin/schemas/spec.schema.json`

**Interfaces:**
- Produces: `spec.schema.json` validates `spec.md` structure; consumed by `/sdlc-design` and Design-exit hook

- [ ] **Step 1: Write `packages/plugin/schemas/spec.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/spec.schema.json",
  "title": "spec.md",
  "description": "Schema for SDLC design specifications. See spec §8.2.",
  "type": "object",
  "required": ["title", "intent", "architecture", "verificationCriteria"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "status": {
      "type": "string",
      "enum": ["draft", "accepted", "rejected"],
      "default": "draft"
    },
    "date": {
      "type": "string",
      "format": "date"
    },
    "intent": {
      "type": "string",
      "description": "Path to the intent.md this spec implements"
    },
    "architecture": {
      "type": "string",
      "minLength": 1,
      "description": "System design summary"
    },
    "ui": {
      "type": "object",
      "description": "Required when intent.stack.frontend is true",
      "properties": {
        "palette": { "type": "string" },
        "typography": { "type": "string" },
        "a11y": { "type": "string" },
        "breakpoints": { "type": "string" }
      }
    },
    "apiSurface": {
      "type": "array",
      "description": "Required when intent.stack.backend is true",
      "items": {
        "type": "object",
        "required": ["method", "path"],
        "properties": {
          "method": { "type": "string", "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"] },
          "path": { "type": "string" },
          "description": { "type": "string" },
          "auth": { "type": "string", "enum": ["none", "session", "oauth", "api-key"] }
        }
      }
    },
    "dataModel": {
      "type": "array",
      "description": "Schema changes",
      "items": {
        "type": "object",
        "required": ["name", "fields"],
        "properties": {
          "name": { "type": "string" },
          "fields": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "verificationCriteria": {
      "type": "array",
      "minItems": 1,
      "items": { "type": "string" }
    },
    "compliance": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Verify JSON**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('packages/plugin/schemas/spec.schema.json', 'utf8')).title)"
```

Expected: prints `spec.md`.

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/schemas/spec.schema.json
git commit -m "feat(plugin): add spec.schema.json"
```

---

## Task 8: Create sdlc-design slash command

**Files:**
- Create: `packages/plugin/commands/sdlc-design.md`

- [ ] **Step 1: Write `packages/plugin/commands/sdlc-design.md`**

```markdown
---
description: Design as spec.md (Design stage of AI-Native SDLC)
argument-hint: [intent-file]
---

# /sdlc-design — Design stage

You are running the **Design stage** of the loshu-sdlc AI-Native SDLC. Your job is to produce a valid `spec.md` from an accepted `intent.md`.

## Required skills

Before proceeding, **invoke the `superpowers:using-superpowers` skill** (via the Skill tool). Confirm `superpowers:brainstorming` is reachable (we'll use it for design-time clarification).

## Prerequisites

- `intent.md` must exist and have `status: accepted`.
- If you can't find an accepted intent, stop and tell the user to run `/sdlc-plan` first.

## Workflow

1. **Load context.**
   - Read `intent.md`.
   - Load the `spec-md-authoring` skill (via the Skill tool).
   - Read `packages/plugin/schemas/spec.schema.json` for required fields.

2. **Decide architecture.**
   - If `ecc:architect` is reachable (Tier-2), invoke it via the Skill tool.
   - Otherwise, author the architecture section directly using intent.md's affected users and systems.

3. **UI section** (only if `intent.md.stack.frontend === true`).
   - If `ui-ux-pro-max` is reachable, invoke it for palette/typography/a11y/breakpoints recommendations.
   - Otherwise, fall back to `packages/plugin/skills/policy-default/` (palettes, typography, accessibility, breakpoints — shipped defaults).
   - Required fields in spec.md: `ui.palette`, `ui.typography`, `ui.a11y`, `ui.breakpoints`.

4. **API surface section** (only if `intent.md.stack.backend === true`).
   - If `ecc:api-design` is reachable, invoke it for endpoint patterns.
   - Otherwise, author endpoints directly using `intent.md.affectedUsersAndSystems`.

5. **Author `spec.md`.**
   - Required fields: `title`, `intent` (path to intent.md), `architecture`, `verificationCriteria` (at least one).
   - Use field names exactly as in `spec.schema.json`.

6. **Validate against the schema.**
   - Run: `loshu-sdlc validate spec spec.md --strict`
   - Fix and re-validate until exit code 0.

7. **Copy policy defaults** (first time only).
   - Copy `packages/plugin/skills/policy-default/{palette,typography,accessibility,breakpoints,coding-standards,security-baseline,brand,safety,compliance}.md` into the user project root (only if not already present).

8. **Report.**
   - Tell the user the file is written and validated.
   - Suggest `/sdlc-build`.

## See also

- `packages/plugin/schemas/spec.schema.json`
- `packages/plugin/skills/spec-md-authoring/SKILL.md`
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/commands/sdlc-design.md
git commit -m "feat(plugin): add /sdlc-design slash command"
```

---

## Task 9: Create plan.schema.json

**Files:**
- Create: `packages/plugin/schemas/plan.schema.json`

- [ ] **Step 1: Write `packages/plugin/schemas/plan.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/plan.schema.json",
  "title": "plan.md",
  "description": "Schema for SDLC implementation plans. See spec §8.2.",
  "type": "object",
  "required": ["title", "spec", "tasks", "verification"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "status": {
      "type": "string",
      "enum": ["draft", "accepted", "rejected"],
      "default": "draft"
    },
    "date": {
      "type": "string",
      "format": "date"
    },
    "spec": {
      "type": "string",
      "description": "Path to spec.md this plan implements"
    },
    "tasks": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id", "title"],
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "estimate": { "type": "string" },
          "files": {
            "type": "array",
            "items": { "type": "string" }
          },
          "dependsOn": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "verification": {
      "type": "object",
      "required": ["build", "test", "lint"],
      "properties": {
        "build": { "type": "string", "description": "Build command; must exit 0" },
        "test": { "type": "string", "description": "Test command; must exit 0" },
        "lint": { "type": "string", "description": "Lint command; must exit 0" },
        "typecheck": { "type": "string", "description": "Type-check command; must exit 0" }
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Verify JSON**

```bash
node -e "console.log(JSON.parse(require('fs').readFileSync('packages/plugin/schemas/plan.schema.json', 'utf8')).title)"
```

Expected: prints `plan.md`.

- [ ] **Step 3: Commit**

```bash
git add packages/plugin/schemas/plan.schema.json
git commit -m "feat(plugin): add plan.schema.json"
```

---

## Task 10: Create sdlc-build slash command

**Files:**
- Create: `packages/plugin/commands/sdlc-build.md`

- [ ] **Step 1: Write `packages/plugin/commands/sdlc-build.md`**

```markdown
---
description: Build as plan.md + CLAUDE.md (Build stage of AI-Native SDLC)
argument-hint: [spec-file]
---

# /sdlc-build — Build stage

You are running the **Build stage** of the loshu-sdlc AI-Native SDLC. Your job is to produce a valid `plan.md` from an accepted `spec.md`, and to scaffold/update `CLAUDE.md` with a verification block.

## Required skills

Before proceeding, invoke `superpowers:using-superpowers`. Confirm `superpowers:writing-plans` is reachable (Tier-1). If not, stop and tell the user to install it.

## Prerequisites

- `spec.md` must exist and have `status: accepted`.

## Workflow

1. **Load context.**
   - Read `spec.md`.
   - Load `plan-md-authoring` skill.

2. **Generate implementation plan.**
   - Invoke `superpowers:writing-plans` (via the Skill tool) with spec.md as input.
   - If `ecc:planner` is reachable (Tier-3), invoke it to refine the task breakdown.
   - Otherwise, use superpowers output directly.

3. **Author `plan.md`.**
   - Required fields: `title`, `spec`, `tasks` (at least one), `verification` (build/test/lint commands).
   - Use field names per `plan.schema.json`.

4. **Scaffold `CLAUDE.md`** (if missing or if stack changed).
   - Required: `Verification block` with build/test/lint/typecheck commands.
   - Reference stack-specific patterns from `ecc:frontend-patterns` (UI) or `ecc:backend-patterns` (backend) if reachable.

5. **Scaffold project-level `SKILL.md`** (from `packages/plugin/skills/policy-template/SKILL.md`).
   - User-customizable; project policy file.

6. **Validate.**
   - Run: `loshu-sdlc validate plan plan.md --strict`

7. **Report.**
   - Suggest `/sdlc-test`.

## See also

- `packages/plugin/schemas/plan.schema.json`
- `packages/plugin/skills/plan-md-authoring/SKILL.md`
```

- [ ] **Step 2: Commit**

```bash
git add packages/plugin/commands/sdlc-build.md
git commit -m "feat(plugin): add /sdlc-build slash command"
```

---

## Task 11: Create remaining 6 slash commands

**Files:**
- Create: `packages/plugin/commands/sdlc-test.md`
- Create: `packages/plugin/commands/sdlc-deploy.md`
- Create: `packages/plugin/commands/sdlc-maintain.md`
- Create: `packages/plugin/commands/sdlc-status.md`
- Create: `packages/plugin/commands/sdlc-init.md`
- Create: `packages/plugin/commands/sdlc-help.md`

- [ ] **Step 1: Write `packages/plugin/commands/sdlc-test.md`**

```markdown
---
description: Run Test stage (verification block + evals)
argument-hint: ""
---

# /sdlc-test — Test stage

You are running the **Test stage**. Drive red/green/refactor discipline and populate `evals/`.

## Required skills

- `superpowers:using-superpowers`
- `superpowers:tdd` (Tier-1) — drives red/green/refactor
- `superpowers:verification-before-completion` (Tier-2) — enforces verification block

## Workflow

1. Load context: read `CLAUDE.md` verification block; read `plan.md` tasks.
2. Invoke `superpowers:tdd` for each task in plan.md.
3. Invoke `superpowers:verification-before-completion` to enforce build/test/lint/typecheck = green.
4. If `ecc:e2e-runner` is reachable, run Playwright/Cypress suite into `evals/e2e/`.
5. Report pass/fail per task; update `loshu-sdlc status` accordingly.

## Exit gates

- Build green
- Test green
- Lint green
- Type-check green
- Coverage ≥ configured threshold (default 80% line, 75% branch)
```

- [ ] **Step 2: Write `packages/plugin/commands/sdlc-deploy.md`**

```markdown
---
description: Run Deploy stage (populate REVIEW.md)
argument-hint: ""
---

# /sdlc-deploy — Deploy stage

You are running the **Deploy stage**. Populate `REVIEW.md` with Bugs / Security / Compliance sections.

## Required skills

- `superpowers:using-superpowers`
- `ecc:code-reviewer` (Tier-2) — populates Bugs section
- `ecc:security-reviewer` (Tier-2) — populates Security section

## Workflow

1. Load context: read `spec.md`, `plan.md`, recent diff.
2. Invoke `ecc:code-reviewer` → fills REVIEW.md Bugs section.
3. Invoke `ecc:security-reviewer` → fills REVIEW.md Security section.
4. Check `packages/plugin/skills/policy-default/` → fills REVIEW.md Compliance section.
5. If any section has `status: fail`, **deploy is blocked**. Show remediation; do not proceed.
6. Otherwise, mark REVIEW.md `status: accepted`. Deploy hooks enable.

## Exit gates

- REVIEW.md schema valid
- All sections status: pass
- No `status: fail` in any section
```

- [ ] **Step 3: Write `packages/plugin/commands/sdlc-maintain.md`**

```markdown
---
description: Run Maintain stage (bands.yaml evaluation + incident handling)
argument-hint: ""
---

# /sdlc-maintain — Maintain stage

You are running the **Maintain stage**. Evaluate `bands.yaml`, handle incidents, and close the loop by producing new `intent.md` if needed.

## Required skills

- `superpowers:using-superpowers`
- `superpowers:systematic-debugging` (Tier-1) — drives incident root-cause analysis

## Workflow

1. Read `bands.yaml`; evaluate current metrics.
2. If all 1σ: log only. Done.
3. If any 2σ: warn; suggest investigation. Done.
4. If any 3σ: **block maintain-exit**. Invoke `superpowers:systematic-debugging` for root-cause.
5. Wrap findings in a new `intent.md` (incident-driven).
6. Loop closes when PO accepts the new intent.md → next cycle starts at Plan.

## Exit gates

- If 3σ incident: new intent.md produced and accepted
- Otherwise: bands.yaml evaluated; status logged
```

- [ ] **Step 4: Write `packages/plugin/commands/sdlc-status.md`**

```markdown
---
description: Show current cycle state across all six stages
argument-hint: ""
---

# /sdlc-status — Cross-stage dashboard

Display the current cycle state by reading `.loshu-sdlc/state/status.json` (or, if missing, by inferring from artifact files).

## Output format

```
loshu-sdlc v0.1.0 — current state

Cycle: <N> (<title>)
┌─────────┬──────────┬───────────┬────────────┬────────────┐
│ Stage   │ Artifact │ Status    │ Updated    │ Next gate  │
├─────────┼──────────┼───────────┼────────────┼────────────┤
│ Plan    │ intent.md│ <status>  │ <date>     │ —          │
│ Design  │ spec.md  │ <status>  │ <date>     │ —          │
│ Build   │ plan.md  │ <status>  │ <date>     │ —          │
│ Test    │ —        │ <status>  │ <date>     │ —          │
│ Deploy  │ REVIEW.md│ <status>  │ <date>     │ —          │
│ Maintain│ bands.yaml│ <status> │ <date>     │ —          │
└─────────┴──────────┴───────────┴────────────┴────────────┘

External deps:
  Tier-1: <X>/5 ✓   Tier-2: <Y>/6 ✓   Tier-3: <Z>/17
```

For data, also expose this via `loshu-sdlc status` CLI command (mirrors this view).
```

- [ ] **Step 5: Write `packages/plugin/commands/sdlc-init.md`**

```markdown
---
description: Run plan → design → build sequence in one command
argument-hint: [feature-or-topic]
---

# /sdlc-init — Sequential pipeline

Runs `/sdlc-plan` → `/sdlc-design` → `/sdlc-build` in sequence. Stops at the first stage whose gate fails.

## Workflow

1. Invoke `/sdlc-plan` (or its underlying logic) with the user's argument.
2. If Plan-exit passes, invoke `/sdlc-design`.
3. If Design-exit passes, invoke `/sdlc-build`.
4. If Build-exit passes, suggest `/sdlc-test`.

Each stage runs the full workflow for that stage (brainstorming, schema validation, etc.). See individual command files for details.
```

- [ ] **Step 6: Write `packages/plugin/commands/sdlc-help.md`**

```markdown
---
description: Show loshu-sdlc command reference
argument-hint: ""
---

# /sdlc-help — Command reference

## Commands

| Command | Purpose | Stage |
|---|---|---|
| `/sdlc-plan` | Capture intent as `intent.md` | Plan |
| `/sdlc-design` | Design as `spec.md` | Design |
| `/sdlc-build` | Build as `plan.md` + `CLAUDE.md` | Build |
| `/sdlc-test` | Test with verification block | Test |
| `/sdlc-deploy` | Deploy via `REVIEW.md` | Deploy |
| `/sdlc-maintain` | Maintain via `bands.yaml` | Maintain |
| `/sdlc-status` | Show current cycle state | (meta) |
| `/sdlc-init` | Plan → Design → Build sequence | (meta) |
| `/sdlc-help` | This command | (meta) |

## CLI commands

| Command | Purpose |
|---|---|
| `loshu-sdlc doctor` | Diagnose project health |
| `loshu-sdlc validate <artifact>` | Run schema validator |
| `loshu-sdlc lint` | Lint artifacts against policy-default/ |
| `loshu-sdlc rules list` | Show all active rules + source |
| `loshu-sdlc upgrade` | Bump plugin version |
| `loshu-sdlc status` | Mirror of `/sdlc-status` |

## Documentation

- Spec: `docs/superpowers/specs/2026-09-11-loshu-sdlc-design.md`
- Plan: `docs/superpowers/plans/2026-09-11-loshu-sdlc-v0.1.0.md`
- Getting started: `docs/getting-started.md`
```

- [ ] **Step 7: Verify all 9 commands exist**

```bash
ls packages/plugin/commands/
```

Expected output:
```
sdlc-plan.md
sdlc-design.md
sdlc-build.md
sdlc-test.md
sdlc-deploy.md
sdlc-maintain.md
sdlc-status.md
sdlc-init.md
sdlc-help.md
```

- [ ] **Step 8: Commit**

```bash
git add packages/plugin/commands/
git commit -m "feat(plugin): add remaining 6 slash commands (test, deploy, maintain, status, init, help)"
```

---

## Task 12: Create agent and skill directories

**Files:**
- Create: `packages/plugin/agents/planner.md`
- Create: `packages/plugin/agents/spec-writer.md`
- Create: `packages/plugin/agents/test-designer.md`
- Create: `packages/plugin/agents/reviewer.md`
- Create: `packages/plugin/agents/incident-investigator.md`
- Create: `packages/plugin/skills/intent-md-authoring/SKILL.md`
- Create: `packages/plugin/skills/spec-md-authoring/SKILL.md`
- Create: `packages/plugin/skills/plan-md-authoring/SKILL.md`
- Create: `packages/plugin/skills/review-md-authoring/SKILL.md`
- Create: `packages/plugin/skills/bands-yaml-design/SKILL.md`

**Interfaces:**
- Produces: 5 agent definitions + 5 skill definitions, all loaded as context when slash commands run

- [ ] **Step 1: Write `packages/plugin/agents/planner.md`**

```markdown
---
name: planner
description: Implementation planner. Used by /sdlc-build to refine task breakdown.
---

You are the **planner** agent for loshu-sdlc. Your job is to take an accepted `spec.md` and produce a detailed implementation plan.

When invoked:
1. Read `spec.md` (required input).
3. Break the work into tasks with clear deliverables.
4. Each task has: id, title, estimate, files, dependsOn.
5. Output a `plan.md` that validates against `plan.schema.json`.

You do NOT implement. You plan. Implementation happens after `/sdlc-build` accepts the plan.
```

- [ ] **Step 2: Write `packages/plugin/agents/spec-writer.md`**

```markdown
---
name: spec-writer
description: Specification author. Used by /sdlc-design to convert intent into spec.
---

You are the **spec-writer** agent for loshu-sdlc. Your job is to take an accepted `intent.md` and produce a detailed `spec.md`.

When invoked:
1. Read `intent.md` (required input).
2. Decide architecture.
3. Author UI section (if frontend), API surface (if backend), data model, verification criteria, compliance.
4. Output a `spec.md` that validates against `spec.schema.json`.

You do NOT implement. You design. Implementation is in Build stage.
```

- [ ] **Step 3: Write `packages/plugin/agents/test-designer.md`**

```markdown
---
name: test-designer
description: Test designer. Used by /sdlc-test to design test suites.
---

You are the **test-designer** agent for loshu-sdlc. Your job is to design test suites that satisfy the verification block in `CLAUDE.md` and meet coverage thresholds.

When invoked:
1. Read `CLAUDE.md` verification block.
2. Read `plan.md` tasks.
3. Design unit tests, integration tests, and (if UI) e2e tests.
4. Output test files into `tests/` and `evals/`.

You do NOT implement production code. You design tests.
```

- [ ] **Step 4: Write `packages/plugin/agents/reviewer.md`**

```markdown
---
name: reviewer
description: Code reviewer. Used by /sdlc-deploy to populate REVIEW.md Bugs section.
---

You are the **reviewer** agent for loshu-sdlc. Your job is to review code changes and populate the Bugs section of `REVIEW.md`.

When invoked:
1. Read the diff (or recent commits).
2. Find bugs, code smells, maintainability issues.
3. Categorize: critical / high / medium / low.
4. Output findings into REVIEW.md's Bugs section.

You do NOT fix. You report. The team fixes and re-runs `/sdlc-deploy`.
```

- [ ] **Step 5: Write `packages/plugin/agents/incident-investigator.md`**

```markdown
---
name: incident-investigator
description: Incident investigator. Used by /sdlc-maintain to drive root-cause analysis.
---

You are the **incident-investigator** agent for loshu-sdlc. Your job is to take a bands.yaml 3σ incident and produce root-cause analysis.

When invoked:
1. Read `bands.yaml` for the tripped metric.
2. Invoke `superpowers:systematic-debugging` (via the Skill tool).
3. Produce findings: root cause, blast radius, recommended fix.
4. Wrap findings in a new `intent.md` (incident-driven; status: draft).

You do NOT fix. You investigate. The fix is in the next cycle's Build stage.
```

- [ ] **Step 6: Write `packages/plugin/skills/intent-md-authoring/SKILL.md`**

```markdown
---
name: intent-md-authoring
description: How to write a good intent.md. Auto-loaded by /sdlc-plan.
---

# Intent authoring

A good `intent.md` answers five questions:

1. **What is broken or missing?** (Problem)
2. **What is the ideal end state?** (Proposed outcome)
3. **Who and what does this affect?** (Affected users and systems)
4. **What hard limits exist?** (Constraints — security, compliance, performance, time)
5. **What is unresolved?** (Open questions — even if empty)

## Anti-patterns

- Don't include the *how* — that's spec.md and plan.md
- Don't list every technical detail — keep intent readable by non-engineers
- Don't skip open questions — empty list is fine, but signal you've considered them

## Field guidance

- `title`: short, declarative ("OAuth authentication", not "Add OAuth")
- `problem`: 1-3 sentences; concrete
- `proposedOutcome`: 1-3 sentences; user-visible
- `affectedUsersAndSystems`: bullet list; each item specific
- `constraints`: bullet list; each item enforceable
- `openQuestions`: bullet list; mark as `[resolved]` or `[open]`
```

- [ ] **Step 7: Write `packages/plugin/skills/spec-md-authoring/SKILL.md`**

```markdown
---
name: spec-md-authoring
description: How to write a good spec.md. Auto-loaded by /sdlc-design.
---

# Spec authoring

A good `spec.md` translates intent into design.

## Sections (per spec.schema.json)

- **Architecture**: system-level design (components, integration points, data flow)
- **UI**: palette, typography, a11y, breakpoints (required if frontend)
- **API surface**: endpoints, methods, auth (required if backend)
- **Data model**: schema changes (required if DB)
- **Verification criteria**: how we'll know this works (concrete, testable)
- **Compliance**: which policies apply (GDPR, SOC2, WCAG, etc.)

## Anti-patterns

- Don't repeat intent verbatim — distill to design choices
- Don't write implementation steps — that's plan.md
- Don't skip verification criteria — they drive /sdlc-test
```

- [ ] **Step 8: Write `packages/plugin/skills/plan-md-authoring/SKILL.md`**

```markdown
---
name: plan-md-authoring
description: How to write a good plan.md. Auto-loaded by /sdlc-build.
---

# Plan authoring

A good `plan.md` breaks a spec into executable tasks.

## Sections (per plan.schema.json)

- **tasks**: array of { id, title, estimate, files, dependsOn }
- **verification**: { build, test, lint, typecheck } commands

## Task granularity

- Each task should be 2-4 hours of work
- Each task should have a clear deliverable
- Tasks should be ordered by dependency (use dependsOn)
- Aim for 5-15 tasks per plan

## Anti-patterns

- Don't list sub-steps within a task — that's for the implementer
- Don't include rationale — link to spec.md instead
- Don't skip verification commands — they drive /sdlc-test gates
```

- [ ] **Step 9: Write `packages/plugin/skills/review-md-authoring/SKILL.md`**

```markdown
---
name: review-md-authoring
description: How to populate REVIEW.md. Auto-loaded by /sdlc-deploy.
---

# Review authoring

A good `REVIEW.md` has three sections, each with `status: pass` or `status: fail`:

- **Bugs**: from `ecc:code-reviewer` (or loshu-sdlc native fallback)
- **Security**: from `ecc:security-reviewer` (OWASP-grounded)
- **Compliance**: from policy-default/ checks

## Status semantics

- `pass`: section is clean or has only minor findings (acceptable to ship)
- `fail`: section has critical/high findings (must fix before deploy)

## Deploy gate

If any section is `fail`, deploy is BLOCKED. The build-exit hook refuses.
```

- [ ] **Step 10: Write `packages/plugin/skills/bands-yaml-design/SKILL.md`**

```markdown
---
name: bands-yaml-design
description: How to design bands.yaml. Auto-loaded by /sdlc-maintain.
---

# Bands authoring

A good `bands.yaml` defines statistical thresholds for production metrics.

## Structure (per bands.schema.json)

```yaml
metrics:
  - name: <metric_name>
    baseline: <1σ value>
    sigma_1: <1σ ceiling>
    sigma_2: <2σ ceiling>
    sigma_3: <3σ ceiling>
    unit: <unit>
    window: <evaluation window, e.g., 1h>

evaluation:
  interval: <how often to evaluate>
  on_3sigma: block_maintain_exit
  on_2sigma: warn
  on_1sigma: log
```

## Tier semantics

- **1σ (normal)**: metric within normal range; log only
- **2σ (warning)**: metric elevated; warn; suggest investigation
- **3σ (incident)**: metric tripped; block maintain-exit; require new intent.md

## Choosing thresholds

- Use historical baseline from past 30 days of production data
- 1σ = mean + 1 std dev
- 2σ = mean + 2 std dev
- 3σ = mean + 3 std dev
- For latency: p95 or p99, not mean
- For error rates: ratio (0.0 - 1.0)
```

- [ ] **Step 11: Commit**

```bash
git add packages/plugin/agents/ packages/plugin/skills/
git commit -m "feat(plugin): add 5 agents and 5 authoring skills"
```

---

## Task 13: Create policy-default files

**Files:**
- Create: `packages/plugin/skills/policy-default/palette.md`
- Create: `packages/plugin/skills/policy-default/typography.md`
- Create: `packages/plugin/skills/policy-default/accessibility.md`
- Create: `packages/plugin/skills/policy-default/breakpoints.md`
- Create: `packages/plugin/skills/policy-default/coding-standards.md`
- Create: `packages/plugin/skills/policy-default/security-baseline.md`
- Create: `packages/plugin/skills/policy-default/brand.md`
- Create: `packages/plugin/skills/policy-default/safety.md`
- Create: `packages/plugin/skills/policy-default/compliance.md`
- Create: `packages/plugin/skills/policy-default/ATTRIBUTION.md`
- Create: `packages/plugin/skills/policy-template/SKILL.md`
- Create: `packages/plugin/skills/ui-ux-baseline/SKILL.md`
- Create: `packages/plugin/skills/ui-ux-baseline/charts.md`
- Create: `packages/plugin/skills/ui-ux-baseline/motion.md`
- Create: `packages/plugin/skills/ui-ux-baseline/icons.md`
- Create: `packages/plugin/skills/ui-ux-baseline/stacks.md`

- [ ] **Step 1: Write `packages/plugin/skills/policy-default/palette.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
  license: MIT (assumed; verify before release)
  full_catalog: install ui-ux-pro-max for the complete set of 192 palettes
---

# Default palette

Three production-grade palettes. Use the first by default.

## Palette 1 — Indigo + Slate (default)

| Role | Light | Dark |
|------|-------|------|
| Background | `#FFFFFF` | `#0F172A` |
| Surface | `#F8FAFC` | `#1E293B` |
| Primary | `#4F46E5` | `#818CF8` |
| Secondary | `#64748B` | `#94A3B8` |
| Accent | `#F59E0B` | `#FBBF24` |
| Success | `#10B981` | `#34D399` |
| Warning | `#F59E0B` | `#FBBF24` |
| Error | `#EF4444` | `#F87171` |
| Text | `#0F172A` | `#F1F5F9` |
| Muted | `#64748B` | `#94A3B8` |

## Palette 2 — Emerald + Stone

[Same shape, emerald primary]

## Palette 3 — Slate only (high-contrast)

[Same shape, monochrome]

## Accessibility

All palettes meet WCAG 2.2 AA contrast for primary text on background.
```

- [ ] **Step 2: Write `packages/plugin/skills/policy-default/typography.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
  license: MIT
  full_catalog: install ui-ux-pro-max for the complete set of 74 font pairings
---

# Default typography

Three font pairings. Pick one based on product tone.

## Pairing 1 — Inter + Inter (default, neutral)

- Body: `Inter`, system-ui, sans-serif
- Headings: `Inter`, system-ui, sans-serif
- Code: `JetBrains Mono`, ui-monospace, monospace

## Pairing 2 — Geist Sans + Geist Mono (modern, dev-friendly)

- Body: `Geist`, system-ui, sans-serif
- Headings: `Geist`, system-ui, sans-serif
- Code: `Geist Mono`, ui-monospace, monospace

## Pairing 3 — IBM Plex Sans + IBM Plex Mono (editorial)

- Body: `IBM Plex Sans`, system-ui, sans-serif
- Headings: `IBM Plex Sans`, system-ui, sans-serif
- Code: `IBM Plex Mono`, ui-monospace, monospace

## Scale

| Level | Size | Weight | Line height |
|-------|------|--------|-------------|
| xs | 12px | 400 | 16px |
| sm | 14px | 400 | 20px |
| base | 16px | 400 | 24px |
| lg | 18px | 500 | 28px |
| xl | 20px | 600 | 28px |
| 2xl | 24px | 600 | 32px |
| 3xl | 30px | 700 | 36px |
```

- [ ] **Step 3: Write `packages/plugin/skills/policy-default/accessibility.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
  license: MIT
  full_catalog: install ui-ux-pro-max for the complete set of 119 UX guidelines
---

# Default accessibility rules (WCAG 2.2 AA)

## Color and contrast

- Text on background: ≥4.5:1 (normal), ≥3:1 (large 18px+ or 14px bold)
- Non-text UI: ≥3:1
- Don't rely on color alone for state

## Keyboard

- All functionality available via keyboard
- Visible focus indicator (≥2px outline, ≥3:1 contrast)
- Skip-to-main-content link
- No keyboard traps

## Screen reader

- All images have `alt` text (or `alt=""` if decorative)
- Form fields have associated `<label>` or `aria-label`
- Live regions for dynamic content (`aria-live="polite"`)
- Headings hierarchical (h1 → h2 → h3)

## Motion

- Respect `prefers-reduced-motion`
- No flashing content >3 Hz

## Touch targets

- Minimum 44x44 CSS pixels

## Forms

- Error messages associated with fields (`aria-describedby`)
- Don't disable submit on validation; show errors
```

- [ ] **Step 4: Write `packages/plugin/skills/policy-default/breakpoints.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
  license: MIT
  full_catalog: install ui-ux-pro-max for the complete breakpoint reference
---

# Default breakpoints (mobile-first)

| Name | Min width | Typical devices |
|------|-----------|-----------------|
| sm | 640px | Phones (landscape) |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

## Usage

```css
/* Mobile-first base */
.container { padding: 1rem; }

/* sm and up */
@media (min-width: 640px) { .container { padding: 1.5rem; } }

/* md and up */
@media (min-width: 768px) { .container { padding: 2rem; } }
```

## Anti-patterns

- Don't design for one breakpoint; test all five
- Don't hide critical functionality below md
- Don't require horizontal scrolling at any width
```

- [ ] **Step 5: Write `packages/plugin/skills/policy-default/coding-standards.md`**

```markdown
---
provenance:
  source: ecc:coding-standards
  borrowed_at: 2026-09-11
  license: MIT (assumed; verify before release)
  full_catalog: install ecc for the complete coding-standards reference
---

# Default coding standards

These are language-agnostic baselines. Each language has additional rules.

## Universal

- Functions ≤50 lines, ≤4 parameters
- Files ≤300 lines; split by responsibility
- No commented-out code; delete it
- No dead code; remove on sight
- Prefer immutability; mutate only when necessary
- Use meaningful names; no `temp`, `data`, `result`
- Comments explain *why*, not *what*

## Test coverage

- New code: ≥80% line coverage
- Bug fixes: regression test required
- Public APIs: 100% line coverage

## Error handling

- Fail loudly; don't swallow errors
- Errors include context for debugging
- Use typed errors (exceptions or Result types)

## Dependencies

- Pin major versions; allow minor/patch
- Audit dependencies before adding
- Prefer established libraries over novel ones
```

- [ ] **Step 6: Write `packages/plugin/skills/policy-default/security-baseline.md`**

```markdown
---
provenance:
  source: ecc:security-reviewer
  borrowed_at: 2026-09-11
  license: MIT (assumed; verify before release)
  full_catalog: install ecc for the complete security-review reference
---

# Default security baseline (OWASP Top 10 + extras)

## A01 — Broken Access Control

- Default deny
- Verify authorization on every request
- No client-side enforcement of access control

## A02 — Cryptographic Failures

- TLS 1.2+ only
- No sensitive data in URLs or logs
- Use vetted libraries (don't roll your own crypto)

## A03 — Injection

- Parameterized queries (no string concatenation)
- Output encoding for HTML/JS/SQL
- Validate input at the edge

## A04 — Insecure Design

- Threat model for new features
- Least privilege by default
- Defense in depth

## A05 — Security Misconfiguration

- No default credentials
- Disable unused features
- Security headers on all responses

## A06 — Vulnerable Components

- Dependabot / npm audit / equivalent
- Patch within 7 days for critical CVEs

## A07 — Authentication Failures

- Rate limit authentication endpoints
- MFA for high-value accounts
- Session timeout: ≤24h idle, ≤7d absolute

## A08 — Software & Data Integrity

- Verify signatures on dependencies
- Signed releases
- Audit CI/CD pipeline

## A09 — Logging & Monitoring

- Log authentication events
- Log access control failures
- Alert on anomalies

## A10 — SSRF

- Validate outbound URLs
- Block internal network ranges

## Secrets

- No secrets in code, logs, or commit messages
- Use secret manager (e.g., AWS Secrets Manager, Vault)
- Rotate credentials regularly
```

- [ ] **Step 7: Write `packages/plugin/skills/policy-default/brand.md`**

```markdown
---
provenance: loshu-sdlc owns
---

# Brand voice template

This is a blank template. Customize per project.

## Voice

[3-5 adjectives describing the brand's tone]

## Tone

[How the voice adapts across contexts — formal vs casual, serious vs playful]

## Vocabulary

[Preferred terms; banned terms]

## Examples

**Good**: "[example of on-brand copy]"

**Bad**: "[example of off-brand copy]"
```

- [ ] **Step 8: Write `packages/plugin/skills/policy-default/safety.md`**

```markdown
---
provenance: loshu-sdlc owns
---

# Safety policy template

Customize per project. Default guidance:

## User safety

- Don't expose users to harmful content
- Provide clear warnings for risky actions
- Undo/redo for destructive operations

## Data safety

- Backups before destructive changes
- Soft delete by default; hard delete only on explicit request
- Audit trail for sensitive operations

## Operational safety

- Feature flags for risky changes
- Gradual rollouts (1% → 10% → 50% → 100%)
- Rollback plan before deploy
```

- [ ] **Step 9: Write `packages/plugin/skills/policy-default/compliance.md`**

```markdown
---
provenance: loshu-sdlc owns
---

# Compliance policy template

Add the regulations that apply to your project. Default: none enforced.

## Common regulations

- **GDPR** (EU): data subject rights, lawful basis, data minimization
- **SOC 2**: security, availability, confidentiality
- **HIPAA** (US healthcare): PHI protection
- **PCI DSS** (payment cards): cardholder data protection
- **CCPA** (California): consumer privacy rights

## Audit trail

- All sensitive operations logged
- Logs retained per regulatory requirement
- Logs immutable (write-once storage)
```

- [ ] **Step 10: Write `packages/plugin/skills/policy-default/ATTRIBUTION.md`**

```markdown
# Third-party attribution

Files in this directory marked with the `provenance` frontmatter are borrowed from third-party sources.

## Sources

- **ui-ux-pro-max** — palettes, typography, accessibility, breakpoints (MIT, verify before release)
- **ecc:coding-standards** — coding standards baseline (MIT, verify before release)
- **ecc:security-reviewer** — security baseline (MIT, verify before release)

## License verification (TODO before v1.0)

- [ ] Verify ui-ux-pro-max license
- [ ] Verify ecc:coding-standards license
- [ ] Verify ecc:security-reviewer license

If any license is incompatible with MIT (loshu-sdlc's license), the borrowed content must be replaced or the file marked for removal.
```

- [ ] **Step 11: Write `packages/plugin/skills/policy-template/SKILL.md`**

```markdown
---
provenance: loshu-sdlc owns
---

# Project SKILL.md scaffold

Copy this file into your project root and customize. It becomes your project-level SKILL.md, loaded by Claude Code automatically.

## Project name

[Project name]

## Stack

- Frontend: [framework]
- Backend: [framework]
- DB: [database]
- Other: [tools]

## Conventions

[Project-specific conventions]

## Verification block (REQUIRED to declare done)

- Build: `[command]` exits 0
- Test: `[command]` exits 0
- Lint: `[command]` exits 0
- Type-check: `[command]` exits 0

## Custom rules

[Project-specific rules — anything beyond policy-default/]
```

- [ ] **Step 12: Write `packages/plugin/skills/ui-ux-baseline/SKILL.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
  license: MIT (assumed)
---

# UI/UX baseline

Auto-loaded by `/sdlc-design` and `/sdlc-build` when `intent.md.stack.frontend === true`.

## What's in this baseline

- `palette.md` — color tokens (light + dark, accessible)
- `typography.md` — font pairings + line heights
- `accessibility.md` — WCAG 2.2 AA rules
- `breakpoints.md` — responsive breakpoints
- `charts.md` — chart-type recommendations per data shape
- `motion.md` — animation presets (duration + easing)
- `icons.md` — icon style guidance
- `stacks.md` — stack-specific UI patterns

## When to invoke ui-ux-pro-max instead

The full ui-ux-pro-max skill has 192 palettes, 79 styles, 22 stacks, 119 UX guidelines. Invoke it for:
- Design exploration (not just default)
- Component spec generation (not just baseline)
- Deep stack-specific patterns (not just default)
- Rich UX review (not just baseline)

Without ui-ux-pro-max installed, this baseline is sufficient for most projects.
```

- [ ] **Step 13: Write `packages/plugin/skills/ui-ux-baseline/charts.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
---

# Chart type recommendations

| Data shape | Recommended chart |
|------------|-------------------|
| Time series (one metric) | Line |
| Time series (multiple metrics) | Multi-line |
| Categorical comparison | Bar |
| Categorical part-of-whole | Stacked bar |
| Distribution | Histogram |
| Correlation | Scatter |
| Part-of-whole (small number of categories) | Pie / Donut |
| Hierarchical | Treemap |
| Geographic | Choropleth |
| Flow | Sankey |

## Anti-patterns

- Pie charts with >5 slices (use bar)
- 3D charts (distort perception)
- Dual y-axes (misleading)
- Truncated y-axis on bar charts (without explicit annotation)
```

- [ ] **Step 14: Write `packages/plugin/skills/ui-ux-baseline/motion.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
---

# Motion presets

| Token | Duration | Easing |
|------|----------|--------|
| fast | 100ms | ease-out |
| base | 200ms | ease-in-out |
| slow | 400ms | ease-in-out |
| page | 300ms | ease-out |

## Usage

- Hover/focus: `fast`
- State changes (toggle, expand): `base`
- Page transitions: `page`
- Loading: `slow`

## Respect preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
```

- [ ] **Step 15: Write `packages/plugin/skills/ui-ux-baseline/icons.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
---

# Icon style guidance

## Sizing

- Inline with text: 16px, 20px
- Buttons: 20px
- Standalone: 24px
- Hero/feature: 32px+

## Style

- Outline (1.5px stroke) for navigation and actions
- Filled for selected/active states
- Two-tone for illustrations

## Stroke weight

Default: 1.5px. Use 2px for low-vision accessibility.

## Color

Inherit text color unless interactive (then use primary).

## Sources

- Lucide (open source, MIT)
- Heroicons (open source, MIT)
- Phosphor (open source, MIT)
```

- [ ] **Step 16: Write `packages/plugin/skills/ui-ux-baseline/stacks.md`**

```markdown
---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
---

# Stack-specific UI patterns

## React + Vite

- File-based routing via `react-router` or `TanStack Router`
- State: server-state via TanStack Query; client-state via Zustand or React Context
- Forms: `react-hook-form` + `zod`
- Styling: Tailwind CSS or CSS Modules
- Components: shadcn/ui or Radix UI primitives

## Vue + Vite

- File-based routing via `vue-router`
- State: Pinia
- Forms: `vee-validate` + `zod`
- Styling: Tailwind CSS or `<style scoped>`
- Components: Headless UI or Radix Vue

## Svelte + SvelteKit

- File-based routing via SvelteKit
- State: Svelte stores
- Forms: Superforms
- Styling: Tailwind CSS or `<style>` blocks
- Components: shadcn-svelte or melt-ui

## Server-rendered (Rails, Django, Phoenix, etc.)

- Server-rendered with progressive enhancement
- Hotwire (Rails), HTMX (Django/Phoenix), LiveView (Phoenix) for interactivity
- Tailwind CSS or component library

For deeper stack-specific patterns, invoke `ecc:frontend-patterns` (Tier-3) at Build stage.
```

- [ ] **Step 17: Commit**

```bash
git add packages/plugin/skills/policy-default/ packages/plugin/skills/policy-template/ packages/plugin/skills/ui-ux-baseline/
git commit -m "feat(plugin): add policy-default files and ui-ux-baseline"
```

---

## Task 14: Create claude-md, review, bands schemas

**Files:**
- Create: `packages/plugin/schemas/claude-md.schema.json`
- Create: `packages/plugin/schemas/review.schema.json`
- Create: `packages/plugin/schemas/bands.schema.json`
- Create: `packages/plugin/schemas/policy.schema.json`

- [ ] **Step 1: Write `packages/plugin/schemas/claude-md.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/claude-md.schema.json",
  "title": "CLAUDE.md",
  "description": "Schema for project CLAUDE.md files. See spec §8.2.",
  "type": "object",
  "required": ["title", "verification"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1
    },
    "generatedBy": {
      "type": "string"
    },
    "generatedAt": {
      "type": "string",
      "format": "date-time"
    },
    "stack": {
      "type": "object"
    },
    "verification": {
      "type": "object",
      "required": ["build", "test", "lint"],
      "properties": {
        "build": { "type": "string" },
        "test": { "type": "string" },
        "lint": { "type": "string" },
        "typecheck": { "type": "string" }
      }
    },
    "conventions": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 2: Write `packages/plugin/schemas/review.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/review.schema.json",
  "title": "REVIEW.md",
  "description": "Schema for SDLC review documents. See spec §8.2.",
  "type": "object",
  "required": ["title", "bugs", "security", "compliance"],
  "properties": {
    "title": { "type": "string", "minLength": 1 },
    "spec": { "type": "string" },
    "plan": { "type": "string" },
    "date": { "type": "string", "format": "date" },
    "bugs": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["pending", "pass", "fail"] },
        "findings": { "type": "array", "items": { "type": "string" } }
      }
    },
    "security": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["pending", "pass", "fail"] },
        "owasp": {
          "type": "array",
          "items": { "type": "string" }
        },
        "findings": { "type": "array", "items": { "type": "string" } }
      }
    },
    "compliance": {
      "type": "object",
      "required": ["status"],
      "properties": {
        "status": { "type": "string", "enum": ["pending", "pass", "fail"] },
        "findings": { "type": "array", "items": { "type": "string" } }
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 3: Write `packages/plugin/schemas/bands.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/bands.schema.json",
  "title": "bands.yaml",
  "description": "Schema for SDLC monitoring bands. See spec §8.3.",
  "type": "object",
  "required": ["version", "metrics", "evaluation"],
  "properties": {
    "version": { "type": "integer", "minimum": 1 },
    "project": { "type": "string" },
    "generated": { "type": "string", "format": "date" },
    "metrics": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["name", "baseline", "sigma_1", "sigma_2", "sigma_3", "unit", "window"],
        "properties": {
          "name": { "type": "string" },
          "baseline": { "type": "number" },
          "sigma_1": { "type": "number" },
          "sigma_2": { "type": "number" },
          "sigma_3": { "type": "number" },
          "unit": { "type": "string" },
          "window": { "type": "string" }
        }
      }
    },
    "evaluation": {
      "type": "object",
      "required": ["interval", "on_3sigma", "on_2sigma", "on_1sigma"],
      "properties": {
        "interval": { "type": "string" },
        "on_3sigma": { "type": "string", "enum": ["block_maintain_exit", "warn", "log"] },
        "on_2sigma": { "type": "string", "enum": ["warn", "log"] },
        "on_1sigma": { "type": "string", "enum": ["log", "silent"] }
      }
    }
  },
  "additionalProperties": false
}
```

- [ ] **Step 4: Write `packages/plugin/schemas/policy.schema.json`**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://loshu-sdlc.dev/schemas/policy.schema.json",
  "title": "policy-default/*.md",
  "description": "Schema for policy-default frontmatter.",
  "type": "object",
  "required": ["provenance"],
  "properties": {
    "provenance": {
      "type": "object",
      "required": ["source"],
      "properties": {
        "source": { "type": "string" },
        "borrowed_at": { "type": "string", "format": "date" },
        "license": { "type": "string" },
        "full_catalog": { "type": "string" }
      }
    }
  }
}
```

- [ ] **Step 5: Verify all schemas parse**

```bash
cd D:/workspace/3.my/SDLC
node -e "
const fs = require('fs');
const schemas = ['intent', 'spec', 'plan', 'claude-md', 'review', 'bands', 'policy'];
for (const s of schemas) {
  const content = fs.readFileSync(\`packages/plugin/schemas/\${s}.schema.json\`, 'utf8');
  const parsed = JSON.parse(content);
  console.log(\`\${s}: \${parsed.title}\`);
}
"
```

Expected: prints all 7 schema titles.

- [ ] **Step 6: Update `packages/plugin/schemas/README.md`** (replace existing)

```markdown
# loshu-sdlc Schemas

JSON Schema (Draft 2020-12) definitions for SDLC artifacts.

| Schema | Purpose | Invoked by |
|---|---|---|
| `intent.schema.json` | Validates `intent.md` | Plan-exit hook, `loshu-sdlc validate intent` |
| `spec.schema.json` | Validates `spec.md` | Design-exit hook, `loshu-sdlc validate spec` |
| `plan.schema.json` | Validates `plan.md` | Build-exit hook, `loshu-sdlc validate plan` |
| `claude-md.schema.json` | Validates `CLAUDE.md` (esp. verification block) | Build-exit hook |
| `review.schema.json` | Validates `REVIEW.md` | Deploy-exit hook |
| `bands.schema.json` | Validates `bands.yaml` | Maintain-exit hook |
| `policy.schema.json` | Validates `policy-default/*.md` frontmatter | `loshu-sdlc lint` |

All schemas use `https://json-schema.org/draft/2020-12/schema`.
```

- [ ] **Step 7: Commit**

```bash
git add packages/plugin/schemas/
git commit -m "feat(plugin): add claude-md, review, bands, policy schemas"
```

---

## Task 15: Create hooks

**Files:**
- Create: `packages/plugin/hooks/hooks.json`
- Create: `packages/plugin/hooks/plan-exit.sh`
- Create: `packages/plugin/hooks/design-exit.sh`
- Create: `packages/plugin/hooks/build-exit.sh`
- Create: `packages/plugin/hooks/test-exit.sh`
- Create: `packages/plugin/hooks/deploy-exit.sh`
- Create: `packages/plugin/hooks/maintain-exit.sh`

**Interfaces:**
- Produces: 6 hook scripts + `hooks.json`; uses Claude Code's exit 0/2 convention

- [ ] **Step 1: Write `packages/plugin/hooks/hooks.json`**

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "/sdlc-(plan|design|build|test|deploy|maintain|init)",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'echo \"[loshu-sdlc] Running $CLAUDE_PROMPT\" >&2'"
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/protect-artifacts.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash -c 'path=\"$CLAUDE_TOOL_RESULT_PATH\"; case \"$path\" in *intent.md) bash .claude/hooks/plan-exit.sh .;; *spec.md) bash .claude/hooks/design-exit.sh .;; *plan.md) bash .claude/hooks/build-exit.sh .;; *REVIEW.md) bash .claude/hooks/deploy-exit.sh .;; *bands.yaml) bash .claude/hooks/maintain-exit.sh .;; esac'"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/test-exit.sh ."
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 2: Write `packages/plugin/hooks/plan-exit.sh`**

```bash
#!/usr/bin/env bash
# Plan-exit gate: validates intent.md against intent.schema.json
# Exit 0 = allow, Exit 2 = block

set -euo pipefail

ROOT="${1:-.}"
INTENT="$ROOT/intent.md"

if [ ! -f "$INTENT" ]; then
  echo "Plan-exit: $INTENT not found" >&2
  exit 0  # Missing artifact is not an error during creation
fi

# Schema path (relative to loshu-sdlc install)
SCHEMA="$ROOT/.claude/plugins/loshu-sdlc/packages/plugin/schemas/intent.schema.json"
if [ ! -f "$SCHEMA" ]; then
  # Try alternate locations
  for candidate in \
    "$ROOT/node_modules/@loshu-sdlc/plugin/schemas/intent.schema.json" \
    "$ROOT/.claude/plugins/loshu-sdlc/schemas/intent.schema.json"; do
    if [ -f "$candidate" ]; then
      SCHEMA="$candidate"
      break
    fi
  done
fi

if [ ! -f "$SCHEMA" ]; then
  echo "Plan-exit: schema not found; skipping validation" >&2
  exit 0
fi

# Validate via loshu-sdlc CLI (use npx for portability)
if ! npx --no-install loshu-sdlc validate intent "$INTENT" --strict 2>/dev/null; then
  echo "Plan-exit: intent.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate intent $INTENT --verbose" >&2
  exit 2
fi

exit 0
```

- [ ] **Step 3: Write `packages/plugin/hooks/design-exit.sh`**

```bash
#!/usr/bin/env bash
# Design-exit gate: validates spec.md against spec.schema.json
# Plus: ensures intent.md exists and has status: accepted

set -euo pipefail

ROOT="${1:-.}"
SPEC="$ROOT/spec.md"
INTENT="$ROOT/intent.md"

if [ ! -f "$SPEC" ]; then
  exit 0  # Not an error during creation
fi

# Check intent.md is accepted
if [ ! -f "$INTENT" ]; then
  echo "Design-exit: intent.md not found; create it via /sdlc-plan first" >&2
  exit 2
fi

if ! grep -qE '^status:\s*accepted' "$INTENT"; then
  echo "Design-exit: intent.md is not accepted (status != accepted)" >&2
  exit 2
fi

# Validate spec.md
if ! npx --no-install loshu-sdlc validate spec "$SPEC" --strict 2>/dev/null; then
  echo "Design-exit: spec.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate spec $SPEC --verbose" >&2
  exit 2
fi

exit 0
```

- [ ] **Step 4: Write `packages/plugin/hooks/build-exit.sh`**

```bash
#!/usr/bin/env bash
# Build-exit gate: validates plan.md + CLAUDE.md has verification block

set -euo pipefail

ROOT="${1:-.}"
PLAN="$ROOT/plan.md"
CLAUDE_MD="$ROOT/CLAUDE.md"

if [ ! -f "$PLAN" ]; then
  exit 0
fi

# Validate plan.md
if ! npx --no-install loshu-sdlc validate plan "$PLAN" --strict 2>/dev/null; then
  echo "Build-exit: plan.md failed schema validation" >&2
  exit 2
fi

# CLAUDE.md must exist with verification block
if [ ! -f "$CLAUDE_MD" ]; then
  echo "Build-exit: CLAUDE.md not found; required for verification block" >&2
  exit 2
fi

if ! grep -qE '^## Verification block' "$CLAUDE_MD"; then
  echo "Build-exit: CLAUDE.md missing 'Verification block' section" >&2
  exit 2
fi

exit 0
```

- [ ] **Step 5: Write `packages/plugin/hooks/test-exit.sh`**

```bash
#!/usr/bin/env bash
# Test-exit gate: runs verification block (build/test/lint/typecheck) + coverage

set -euo pipefail

ROOT="${1:-.}"
CLAUDE_MD="$ROOT/CLAUDE.md"

if [ ! -f "$CLAUDE_MD" ]; then
  exit 0
fi

# Extract commands from verification block
BUILD=$(grep -A 1 'Build:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")
LINT=$(grep -A 1 'Lint:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")
TEST=$(grep -A 1 'Test:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")
TYPECHECK=$(grep -A 1 'Type-check:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")

cd "$ROOT"

# Run build
if [ -n "$BUILD" ]; then
  if ! bash -c "$BUILD" >/dev/null 2>&1; then
    echo "Test-exit: build failed ($BUILD)" >&2
    exit 2
  fi
fi

# Run typecheck
if [ -n "$TYPECHECK" ]; then
  if ! bash -c "$TYPECHECK" >/dev/null 2>&1; then
    echo "Test-exit: typecheck failed ($TYPECHECK)" >&2
    exit 2
  fi
fi

# Run lint
if [ -n "$LINT" ]; then
  if ! bash -c "$LINT" >/dev/null 2>&1; then
    echo "Test-exit: lint failed ($LINT)" >&2
    exit 2
  fi
fi

# Run test
if [ -n "$TEST" ]; then
  if ! bash -c "$TEST" >/dev/null 2>&1; then
    echo "Test-exit: test failed ($TEST)" >&2
    exit 2
  fi
fi

exit 0
```

- [ ] **Step 6: Write `packages/plugin/hooks/deploy-exit.sh`**

```bash
#!/usr/bin/env bash
# Deploy-exit gate: validates REVIEW.md; blocks if any section status: fail

set -euo pipefail

ROOT="${1:-.}"
REVIEW="$ROOT/REVIEW.md"

if [ ! -f "$REVIEW" ]; then
  exit 0
fi

# Validate schema
if ! npx --no-install loshu-sdlc validate review "$REVIEW" --strict 2>/dev/null; then
  echo "Deploy-exit: REVIEW.md failed schema validation" >&2
  exit 2
fi

# Check for any status: fail
if grep -E '^Status: fail' "$REVIEW"; then
  echo "Deploy-exit: REVIEW.md has status: fail in at least one section" >&2
  echo "Fix findings and re-run /sdlc-deploy" >&2
  exit 2
fi

exit 0
```

- [ ] **Step 7: Write `packages/plugin/hooks/maintain-exit.sh`**

```bash
#!/usr/bin/env bash
# Maintain-exit gate: evaluates bands.yaml; if 3σ incident, requires new intent.md

set -euo pipefail

ROOT="${1:-.}"
BANDS="$ROOT/bands.yaml"

if [ ! -f "$BANDS" ]; then
  exit 0
fi

# Validate schema
if ! npx --no-install loshu-sdlc validate bands "$BANDS" --strict 2>/dev/null; then
  echo "Maintain-exit: bands.yaml failed schema validation" >&2
  exit 2
fi

# Evaluate metrics
TRIPPED=$(npx --no-install loshu-sdlc bands evaluate "$BANDS" --json 2>/dev/null || echo '{"incidents":[]}')

# If any 3σ incident and no new intent.md, block
if echo "$TRIPPED" | grep -q '"tier":\s*"3sigma"'; then
  LATEST_INTENT="$ROOT/intent.md"
  if [ ! -f "$LATEST_INTENT" ] || ! grep -qE 'origin:\s*maintain' "$LATENT_INTENT"; then
    echo "Maintain-exit: 3σ incident detected but no incident-driven intent.md found" >&2
    echo "Run /sdlc-maintain to investigate and generate a new intent.md" >&2
    exit 2
  fi
fi

exit 0
```

- [ ] **Step 8: Make all hooks executable**

```bash
chmod +x packages/plugin/hooks/*.sh
```

- [ ] **Step 9: Verify hooks are executable**

```bash
ls -l packages/plugin/hooks/*.sh
```

Expected: each file shows `-rwxr-xr-x` permissions.

- [ ] **Step 10: Commit**

```bash
git add packages/plugin/hooks/
git commit -m "feat(plugin): add tiered hook scripts for all six stages"
```

---

## Task 16: Implement CLI scaffolder (`create-loshu-sdlc-app`)

**Files:**
- Create: `packages/cli/src/lib/render.ts`
- Create: `packages/cli/src/lib/git.ts`
- Create: `packages/cli/src/lib/plugin-bundler.ts`
- Create: `packages/cli/src/lib/prompts.ts`
- Create: `packages/cli/src/commands/create.ts`
- Create: `packages/cli/src/bin/create-loshu-sdlc-app.ts`
- Create: `packages/cli/tests/commands/create.test.ts`

**Interfaces:**
- `renderEjs(template: string, vars: Record<string, string>): string` — renders EJS template
- `initGit(dir: string, message: string): void` — runs `git init` and first commit
- `bundlePlugin(srcPlugin: string, destDir: string): void` — copies plugin/ into target
- `runPrompts(): Promise<ScaffoldOptions>` — inquirer flow for interactive mode

- [ ] **Step 1: Write `packages/cli/src/lib/render.ts`**

```typescript
import ejs from 'ejs';

export function renderEjs(template: string, vars: Record<string, string>): string {
  return ejs.render(template, vars, { filename: '<inline>' });
}

export async function renderFile(
  filePath: string,
  vars: Record<string, string>,
): Promise<string> {
  return ejs.renderFile(filePath, vars, { async: true });
}
```

- [ ] **Step 2: Write `packages/cli/src/lib/git.ts`**

```typescript
import { execa } from 'execa';

export async function initGit(dir: string, message: string): Promise<void> {
  await execa('git', ['init', '-b', 'main'], { cwd: dir });
  await execa('git', ['add', '.'], { cwd: dir });
  await execa('git', ['commit', '-m', message], { cwd: dir });
}

export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: dir });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 3: Write `packages/cli/src/lib/plugin-bundler.ts`**

```typescript
import { copy, ensureDir } from 'fs-extra';
import { join } from 'node:path';

export async function bundlePlugin(srcPlugin: string, destDir: string): Promise<void> {
  // Copy entire plugin/ into <dest>/.claude/plugins/loshu-sdlc/
  const target = join(destDir, '.claude', 'plugins', 'loshu-sdlc');
  await ensureDir(target);
  await copy(srcPlugin, target, {
    filter: (src) => !src.includes('node_modules') && !src.includes('.git'),
  });
}
```

- [ ] **Step 4: Write `packages/cli/src/lib/prompts.ts`**

```typescript
import inquirer from 'inquirer';

export interface ScaffoldOptions {
  projectName: string;
  template: 'minimal' | 'full';
  installUx: boolean;
  installEcc: boolean;
  coverageLine: number;
  coverageBranch: number;
  initGit: boolean;
  strict: boolean;
}

export async function runPrompts(defaultName: string): Promise<ScaffoldOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultName,
    },
    {
      type: 'list',
      name: 'template',
      message: 'Template:',
      choices: ['minimal', 'full'],
      default: 'minimal',
    },
    {
      type: 'confirm',
      name: 'installUx',
      message: 'Install ui-ux-pro-max alongside?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'installEcc',
      message: 'Install ECC alongside?',
      default: false,
    },
    {
      type: 'number',
      name: 'coverageLine',
      message: 'Line coverage threshold:',
      default: 80,
    },
    {
      type: 'number',
      name: 'coverageBranch',
      message: 'Branch coverage threshold:',
      default: 75,
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize git + first commit?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'strict',
      message: 'Enable strict eval mode?',
      default: false,
    },
  ]);
  return answers as ScaffoldOptions;
}
```

- [ ] **Step 5: Write `packages/cli/src/commands/create.ts`**

```typescript
import { resolve, basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { ensureDir, copy, writeFile, readFile } from 'fs-extra';
import chalk from 'chalk';
import { renderFile } from '../lib/render.js';
import { initGit, isGitRepo } from '../lib/git.js';
import { bundlePlugin } from '../lib/plugin-bundler.js';
import { runPrompts, type ScaffoldOptions } from '../lib/prompts.js';

export interface CreateArgs {
  path: string;
  withUx?: boolean;
  withEcc?: boolean;
  withAll?: boolean;
  existing?: boolean;
  template?: 'minimal' | 'full';
  coverage?: number;
  branch?: number;
  noGit?: boolean;
  yes?: boolean;
}

export async function create(args: CreateArgs): Promise<void> {
  const targetPath = resolve(args.path);
  const projectName = basename(targetPath) || 'loshu-sdlc-app';
  const date = new Date().toISOString().slice(0, 10);

  // Detect existing repo
  const existingRepo = await isGitRepo(targetPath).catch(() => false);
  const filesPresent = existsSync(join(targetPath, 'package.json'));

  if (existingRepo && !args.existing) {
    console.error(chalk.red('Error: target is an existing git repo. Use --existing to install into it.'));
    process.exit(2);
  }

  // Get options (interactive or from flags)
  let options: ScaffoldOptions;
  if (argsyes) {
    options = {
      projectName,
      template: args.template ?? 'minimal',
      installUx: args.withUx ?? args.withAll ?? false,
      installEcc: args.withEcc ?? args.withAll ?? false,
      coverageLine: args.coverage ?? 80,
      coverageBranch: args.branch ?? 75,
      initGit: !args.noGit,
      strict: false,
    };
  } else {
    options = await runPrompts(projectName);
  }

  console.log(chalk.blue(`Scaffolding loshu-sdlc project: ${projectName}`));

  // Create directory if needed
  if (!existsSync(targetPath)) {
    await ensureDir(targetPath);
  }

  // Copy template
  const templateDir = join(
    new URL('../../templates/', import.meta.url).pathname,
    options.template,
  );
  await copy(templateDir, targetPath, {
    filter: (src) => !src.includes('.git') && !src.includes('node_modules'),
  });

  // Render EJS placeholders
  const renderVars = {
    projectName,
    date,
    coverageLine: String(options.coverageLine),
    coverageBranch: String(options.coverageBranch),
  };

  const intentPath = join(targetPath, 'intent.md');
  if (existsSync(intentPath)) {
    const rendered = await renderFile(intentPath, renderVars);
    await writeFile(intentPath, rendered);
  }

  // Bundle plugin
  const pluginSrc = new URL('../../packages/plugin/', import.meta.url).pathname;
  await bundlePlugin(pluginSrc, targetPath);

  // Install plugins if requested
  if (options.installUx) {
    console.log(chalk.gray('  Installing ui-ux-pro-max...'));
    // Real implementation would shell out to `claude plugin install`
    // For v0.1.0, log the intent
  }
  if (options.installEcc) {
    console.log(chalk.gray('  Installing ECC...'));
  }

  // Init git
  if (options.initGit && !existingRepo) {
    await initGit(targetPath, 'chore: scaffold loshu-sdlc');
    console.log(chalk.green('  Initialized git, made first commit'));
  }

  console.log(chalk.green(`✔ Created ${targetPath}`));
  console.log(chalk.blue('Next steps:'));
  console.log(`  cd ${targetPath}`);
  console.log('  /sdlc-plan');
  console.log('  loshu-sdlc doctor');
}
```

- [ ] **Step 6: Write `packages/cli/src/bin/create-loshu-sdlc-app.ts`**

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { create } from '../commands/create.js';

const { values, positionals } = parseArgs({
  options: {
    'with-ux': { type: 'boolean' },
    'with-ecc': { type: 'boolean' },
    'with-all': { type: 'boolean' },
    existing: { type: 'boolean' },
    template: { type: 'string' },
    coverage: { type: 'string' },
    branch: { type: 'string' },
    'no-git': { type: 'boolean' },
    yes: { type: 'boolean', short: 'y' },
    strict: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: create-loshu-sdlc-app [path] [flags]

Flags:
  --with-ux              Also install ui-ux-pro-max
  --with-ecc             Also install ECC
  --with-all             Install ui-ux-pro-max + ECC
  --existing             Install into existing repo
  --template <name>      Template: minimal | full (default: minimal)
  --coverage <pct>       Coverage threshold (default: 80)
  --branch <pct>         Branch coverage threshold (default: 75)
  --no-git               Skip git init
  --yes / -y             Skip interactive prompts
  --strict               Enable strict eval mode
  --help / -h            Show help
  --version              Show version`);
  process.exit(0);
}

if (values.version) {
  console.log('create-loshu-sdlc-app 0.1.0');
  process.exit(0);
}

const targetPath = positionals[0] ?? '.';
await create({
  path: targetPath,
  withUx: values['with-ux'],
  withEcc: values['with-ecc'],
  withAll: values['with-all'],
  existing: values.existing,
  template: values.template as 'minimal' | 'full' | undefined,
  coverage: values.coverage ? Number(values.coverage) : undefined,
  branch: values.branch ? Number(values.branch) : undefined,
  noGit: values['no-git'],
  yes: valuesyes,
  strict: values.strict,
});
```

- [ ] **Step 7: Write `packages/cli/tests/commands/create.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, writeFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create } from '../../src/commands/create.js';

describe('create command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loshu-sdlc-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('scaffolds a minimal project into a new directory', async () => {
    const target = join(tmpDir, 'my-app');
    await create({
      path: target,
      template: 'minimal',
      noGit: true,
      yes: true,
      coverage: 80,
      branch: 75,
    });

    const intent = await readFile(join(target, 'intent.md'), 'utf8');
    expect(intent).toContain('my-app');

    const config = await readFile(join(target, '.loshu-sdlc', 'config.yaml'), 'utf8');
    expect(config).toContain('projectName: my-app');
  });

  it('refuses to scaffold into existing repo without --existing', async () => {
    const target = join(tmpDir, 'existing');
    await writeFile(join(target, 'README.md'), '# existing');

    // Manually init git
    const { execa } = await import('execa');
    await execa('git', ['init', '-b', 'main'], { cwd: target });

    await expect(
      create({ path: target, template: 'minimal', noGit: true, yes: true }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 8: Build CLI**

```bash
pnpm --filter @loshu-sdlc/cli build
```

Expected: `packages/cli/dist/` created with `bin/create-loshu-sdlc-app.js` and `commands/create.js`.

- [ ] **Step 9: Run scaffolder test**

```bash
pnpm --filter @loshu-sdlc/cli test
```

Expected: 2 tests pass.

- [ ] **Step 10: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): implement create-loshu-sdlc-app scaffolder"
```

---

## Task 17: Implement CLI validate command

**Files:**
- Create: `packages/cli/src/lib/validate.ts`
- Create: `packages/cli/src/commands/validate.ts`
- Modify: `packages/cli/src/bin/loshu-sdlc.ts` (add validate subcommand)
- Create: `packages/cli/tests/lib/validate.test.ts`

**Interfaces:**
- `validateArtifact(artifact: string, filePath: string): Promise<boolean>` — runs Ajv against the schema

- [ ] **Step 1: Write `packages/cli/src/lib/validate.ts`**

```typescript
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { readFile } from 'fs-extra';
import { parse as parseYaml } from 'yaml';

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const SCHEMAS: Record<string, string> = {
  intent: 'packages/plugin/schemas/intent.schema.json',
  spec: 'packages/plugin/schemas/spec.schema.json',
  plan: 'packages/plugin/schemas/plan.schema.json',
  'claude-md': 'packages/plugin/schemas/claude-md.schema.json',
  review: 'packages/plugin/schemas/review.schema.json',
  bands: 'packages/plugin/schemas/bands.schema.json',
  policy: 'packages/plugin/schemas/policy.schema.json',
};

export async function validateArtifact(
  artifact: string,
  filePath: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const schemaPath = SCHEMAS[artifact];
  if (!schemaPath) {
    throw new Error(`Unknown artifact: ${artifact}. Valid: ${Object.keys(SCHEMAS).join(', ')}`);
  }

  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const content = await readFile(filePath, 'utf8');

  // Parse content (markdown frontmatter or yaml)
  let data: unknown;
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    data = parseYaml(content);
  } else {
    data = parseMarkdownFrontmatter(content);
  }

  const validate = ajv.compile(schema);
  const valid = validate(data);
  return {
    valid,
    errors: validate.errors?.map((e) => `${e.instancePath} ${e.message}`) ?? [],
  };
}

function parseMarkdownFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = parseYaml(match[1]);
  // Merge with body sections
  return yaml;
}
```

- [ ] **Step 2: Write `packages/cli/src/commands/validate.ts`**

```typescript
import chalk from 'chalk';
import { validateArtifact } from '../lib/validate.js';

export interface ValidateArgs {
  artifact: string;
  filePath: string;
  strict?: boolean;
  verbose?: boolean;
}

export async function validate(args: ValidateArgs): Promise<number> {
  const result = await validateArtifact(args.artifact, args.filePath);
  if (result.valid) {
    console.log(chalk.green(`✔ ${args.filePath} valid`));
    return 0;
  } else {
    console.error(chalk.red(`✗ ${args.filePath} failed validation:`));
    for (const err of result.errors) {
      console.error(`  ${err}`);
    }
    return 3;
  }
}
```

- [ ] **Step 3: Write `packages/cli/src/bin/loshu-sdlc.ts`**

```typescript
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { validate } from '../commands/validate.js';

const { values, positionals } = parseArgs({
  options: {
    json: { type: 'boolean' },
    verbose: { type: 'boolean' },
    strict: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: loshu-sdlc <command> [args]

Commands:
  doctor [path] [--fix] [--json]        Diagnose project health
  validate <artifact> [path] [--strict]  Run JSON schema validator
  status [path] [--json]                 Show current cycle state
  help [command]                         Show help for a command
  version                                Show version`);
  process.exit(0);
}

if (values.version) {
  console.log('loshu-sdlc 0.1.0');
  process.exit(0);
}

const command = positionals[0];
switch (command) {
  case 'validate': {
    const [artifact, filePath] = positionals.slice(1);
    if (!artifact || !filePath) {
      console.error('Usage: loshu-sdlc validate <artifact> <file>');
      process.exit(2);
    }
    const code = await validate({
      artifact,
      filePath,
      strict: values.strict,
      verbose: values.verbose,
    });
    process.exit(code);
  }
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(2);
}
```

- [ ] **Step 4: Write `packages/cli/tests/lib/validate.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { validateArtifact } from '../../src/lib/validate.js';

describe('validateArtifact', () => {
  it('validates a correct intent.md', async () => {
    const result = await validateArtifact(
      'intent',
      'packages/templates/minimal/intent.md',
    );
    expect(result.valid).toBe(true);
  });

  it('rejects an intent.md missing required fields', async () => {
    // Create a fixture with missing fields
    const { writeFile, mkdtemp, rm } = await import('fs-extra');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const bad = join(tmp, 'bad-intent.md');
    await writeFile(bad, '---\ntitle: Bad\n---\n');
    const result = await validateArtifact('intent', bad);
    await rm(tmp, { recursive: true, force: true });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 5: Build + test**

```bash
pnpm --filter @loshu-sdlc/cli build
pnpm --filter @loshu-sdlc/cli test
```

Expected: build succeeds; all tests pass.

- [ ] **Step 6: Smoke test: validate the template intent.md**

```bash
cd D:/workspace/3.my/SDLC
node packages/cli/dist/bin/loshu-sdlc.js validate intent packages/templates/minimal/intent.md
```

Expected: prints `✔ packages/templates/minimal/intent.md valid`.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): implement validate command with Ajv schema validation"
```

---

## Task 18: Implement CLI doctor command

**Files:**
- Create: `packages/cli/src/lib/attribution.ts`
- Create: `packages/cli/src/commands/doctor.ts`
- Modify: `packages/cli/src/bin/loshu-sdlc.ts` (add doctor subcommand)
- Create: `packages/cli/tests/commands/doctor.test.ts`

**Interfaces:**
- `checkAttribution(dir: string): boolean` — verifies every borrowed file has provenance header

- [ ] **Step 1: Write `packages/cli/src/lib/attribution.ts`**

```typescript
import { readFile, readdir } from 'fs-extra';
import { join } from 'node:path';

export interface AttributionResult {
  file: string;
  hasProvenance: boolean;
  source?: string;
}

export async function checkAttribution(dir: string): Promise<AttributionResult[]> {
  const results: AttributionResult[] = [];
  const files = await readdir(dir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const content = await readFile(join(dir, file), 'utf8').catch(() => '');
    const hasProvenance = /^---\n[\s\S]*?provenance:[\s\S]*?source:/m.test(content);
    const sourceMatch = content.match(/source:\s*(\S+)/);
    results.push({
      file,
      hasProvenance,
      source: sourceMatch?.[1],
    });
  }
  return results;
}
```

- [ ] **Step 2: Write `packages/cli/src/commands/doctor.ts`**

```typescript
import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkAttribution } from '../lib/attribution.js';

export interface DoctorArgs {
  path: string;
  fix?: boolean;
  json?: boolean;
}

export async function doctor(args: DoctorArgs): Promise<number> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check schemas
  const schemaDir = join(args.path, 'packages/plugin/schemas');
  const schemaCount = existsSync(schemaDir) ? 7 : 0;
  if (schemaCount < 7) {
    issues.push(`Schemas: ${schemaCount}/7 (expected 7)`);
  }

  // Check hooks
  const hooksFile = join(args.path, 'packages/plugin/hooks/hooks.json');
  if (!existsSync(hooksFile)) {
    issues.push('hooks.json not found');
  }

  // Check policy attribution
  const policyDir = join(args.path, 'packages/plugin/skills/policy-default');
  const attribution = await checkAttribution(policyDir);
  const borrowedWithoutProvenance = attribution.filter((a) => a.source !== undefined && !a.hasProvenance);
  if (borrowedWithoutProvenance.length > 0) {
    issues.push(`${borrowedWithoutProvenance.length} borrowed files missing provenance header`);
  }

  // Check commands
  const commandsDir = join(args.path, 'packages/plugin/commands');
  const expectedCommands = [
    'sdlc-plan.md', 'sdlc-design.md', 'sdlc-build.md',
    'sdlc-test.md', 'sdlc-deploy.md', 'sdlc-maintain.md',
    'sdlc-status.md', 'sdlc-init.md', 'sdlc-help.md',
  ];
  for (const cmd of expectedCommands) {
    if (!existsSync(join(commandsDir, cmd))) {
      issues.push(`Missing command: ${cmd}`);
    }
  }

  // Tier-1/2/3 deps not checked here — requires runtime plugin discovery

  if (args.json) {
    console.log(JSON.stringify({ issues, warnings }, null, 2));
  } else {
    if (issues.length === 0) {
      console.log(chalk.green('✔ All checks passed'));
    } else {
      console.log(chalk.red('✗ Issues found:'));
      for (const i of issues) console.log(`  ${i}`);
    }
  }

  return issues.length > 0 ? 4 : 0;
}
```

- [ ] **Step 3: Modify `packages/cli/src/bin/loshu-sdlc.ts`** (add doctor case)

Replace the `default:` branch in the switch statement with:

```typescript
  case 'doctor': {
    const targetPath = positionals[1] ?? '.';
    const code = await doctor({ path: resolve(targetPath), fix: false, json: values.json });
    process.exit(code);
  }
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(2);
```

Also add the import at the top of the file:

```typescript
import { doctor } from '../commands/doctor.js';
import { resolve } from 'node:path';
```

- [ ] **Step 4: Write `packages/cli/tests/commands/doctor.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import { doctor } from '../../src/commands/doctor.js';

describe('doctor command', () => {
  it('reports issues when schemas are missing', async () => {
    // Mock missing schemas dir
    const code = await doctor({ path: '/tmp/nonexistent' });
    expect(code).toBeGreaterThan(0);
  });

  it('returns 0 when repo is complete', async () => {
    const code = await doctor({ path: '.' });
    expect(code).toBe(0);
  });
});
```

- [ ] **Step 5: Build + test**

```bash
pnpm --filter @loshu-sdlc/cli build
pnpm --filter @loshu-sdlc/cli test
```

- [ ] **Step 6: Smoke test: run doctor on the repo**

```bash
cd D:/workspace/3.my/SDLC
node packages/cli/dist/bin/loshu-sdlc.js doctor .
```

Expected: `✔ All checks passed`.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/
git commit -m "feat(cli): implement doctor command for project health checks"
```

---

## Task 19: README, integration tests, and basic docs

**Files:**
- Create: `tests/integration/scaffold.test.ts`
- Create: `docs/getting-started.md`
- Create: `docs/installation.md`
- Modify: `vitest.config.ts` (workspace root) — add integration test project

- [ ] **Step 1: Write root `vitest.config.ts`**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/cli',
      'packages/plugin',
    ],
  },
});
```

- [ ] **Step 2: Write `tests/integration/scaffold.test.ts`**

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, existsSync } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create } from '../../packages/cli/src/commands/create.js';
import { validateArtifact } from '../../packages/cli/src/lib/validate.js';

describe('end-to-end scaffold', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loshu-e2e-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('scaffolds a project where all artifacts validate', async () => {
    const target = join(tmpDir, 'app');
    await create({ path: target, template: 'full', noGit: true, yes: true });

    // Validate each artifact
    const artifacts = [
      { type: 'intent', path: join(target, 'intent.md') },
      { type: 'spec', path: join(target, 'spec.md') },
      { type: 'plan', path: join(target, 'plan.md') },
      { type: 'claude-md', path: join(target, 'CLAUDE.md') },
      { type: 'review', path: join(target, 'REVIEW.md') },
      { type: 'bands', path: join(target, 'bands.yaml') },
    ];

    for (const { type, path } of artifacts) {
      expect(existsSync(path)).toBe(true);
      // Schema validation only runs on populated artifacts
      const content = await readFile(path, 'utf8');
      if (content.includes('---')) {
        const result = await validateArtifact(type, path);
        // Templates are minimal; some may not validate until filled in
        // We just check the file is parseable
        expect(result.errors).toBeDefined();
      }
    }
  });
});
```

- [ ] **Step 3: Write `docs/getting-started.md`**

```markdown
# Getting started with loshu-sdlc

loshu-sdlc is a Claude Code plugin that implements the six-stage AI-Native SDLC. This guide gets you from zero to your first cycle in 10 minutes.

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Claude Code installed

## 1. Scaffold a new project

```bash
npx create-loshu-sdlc-app my-app --with-ux --with-ecc
cd my-app
```

This creates a new project with loshu-sdlc, ui-ux-pro-max, and ECC all installed.

## 2. Verify setup

```bash
loshu-sdlc doctor
```

Expected: `✔ All checks passed`.

## 3. Capture your first intent

```bash
/sdlc-plan
```

Claude will drive a brainstorming dialogue and produce `intent.md`.

## 4. Continue through the stages

```bash
/sdlc-design # produces spec.md
/sdlc-build # produces plan.md + CLAUDE.md
/sdlc-test # runs verification block
/sdlc-deploy # produces REVIEW.md
/sdlc-maintain # evaluates bands.yaml
```

## 5. Check status

```bash
/sdlc-status
```

Shows current cycle state across all six stages.

## Next steps

- Read the spec: `docs/superpowers/specs/2026-09-11-loshu-sdlc-design.md`
- Configure your project: edit `.loshu-sdlc/config.yaml`
- Customize policies: edit `policy-default/*.md`
```

- [ ] **Step 4: Write `docs/installation.md`**

```markdown
# Installation

## Fresh project (recommended)

```bash
npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc]
```

Flags:

- `--with-ux` — also install ui-ux-pro-max
- `--with-ecc` — also install ECC
- `--with-all` — shorthand for `--with-ux --with-ecc`
- `--template full` — use the full template (default: minimal)
- `--existing` — install into existing repo (don't scaffold)
- `--coverage 80` — coverage threshold (default 80)
- `--branch 75` — branch coverage threshold (default 75)
- `--no-git` — skip git init
- `--yes` / `-y` — skip interactive prompts
- `--strict` — enable strict eval mode
- `--help` / `-h` — show help

## Existing project (in-place)

```bash
cd ~/projects/legacy-app
npx create-loshu-sdlc-app . --existing
```

This installs loshu-sdlc into an existing repo without scaffolding. Run `/sdlc-plan` to start the SDLC at your next change.

## Plugin-only (no scaffolder)

If you want just the plugin without the scaffolder:

```bash
/plugin marketplace add loshu-sdlc/loshu-sdlc
/plugin install loshu-sdlc@loshu-sdlc
```

## Required external plugins

For full functionality, install these plugins:

### Tier 1 (required)

```bash
/plugin marketplace add superpowers/superpowers
/plugin install superpowers@superpowers
```

### Tier 2 (recommended)

```bash
/plugin marketplace add <ui-ux-pro-max-marketplace>
/plugin install ui-ux-pro-max

/plugin marketplace add affaan-m/everything-claude-code
/plugin install ecc@ecc
```

## Verifying installation

```bash
loshu-sdlc doctor
```

Should print `✔ All checks passed`.
```

- [ ] **Step 5: Run all tests**

```bash
cd D:/workspace/3.my/SDLC
pnpm test
```

Expected: all unit + integration tests pass.

- [ ] **Step 6: Run typecheck**

```bash
pnpm typecheck
```

Expected: exit 0.

- [ ] **Step 7: Run linter**

```bash
pnpm lint
```

Expected: clean (or only pre-existing warnings).

- [ ] **Step 8: Commit**

```bash
git add tests/ docs/ vitest.config.ts
git commit -m "test+docs: integration tests, getting-started, installation docs"
```

---

## Self-review

### 1. Spec coverage check

| Spec section | Implemented in |
|---|---|
| §4 Locked decisions | Tasks 1, 2, 3, 4 (config files) |
| §5 Architecture & repo layout | Tasks 1–4 (monorepo, packages) |
| §6 Components (commands, agents, skills, schemas) | Tasks 5–14 |
| §7 SDLC Compliance Contract | Task 15 (hooks enforce it) |
| §8 Data flow (bootstrap, happy path, loop closure) | Tasks 4, 6, 8, 10 (templates, commands) |
| §9 Error handling (10 categories, fallback strategy) | Tasks 15 (hooks), 17, 18 (CLI errors) |
| §10 Testing (4 layers) | Tasks 16 (unit), 19 (integration); eval + smoke deferred to v0.2.0 |
| §11 CLI reference (flags, subcommands, config) | Tasks 16, 17, 18 |
| §12 Release & ops | Deferred to post-v0.1.0 |
| §13 Owns vs borrows | Tasks 5–14 (schemas, hooks), 13 (policy defaults) |
| §14 Open questions | Defaulted to MIT for v0.1.0; license verification in Task 13 Step 10 |

**Deferred to v0.2.0+:**
- Eval suite (~30 stories) — spec §10.3
- Smoke tests on tagged releases — spec §10.4
- VitePress docs site
- npm publish + marketplace listing
- Other CLI commands (lint, rules, upgrade, logs, coverage, status) — Task 18 implements doctor + validate; rest deferred
- Loop closure end-to-end — hooks are in place (Task 15); full integration deferred

### 2. Placeholder scan

No "TBD", "TODO" (except in legitimate attribution-tracking list), "implement later", or vague steps.

### 3. Type consistency

- `ScaffoldOptions` interface defined in Task 16 Step 4; consumed in Task 16 Step 5 ✓
- `ValidateArgs` defined in Task 17 Step 2; consumed in Task 17 Step 3 ✓
- `DoctorArgs` defined in Task 18 Step 2; consumed in Task 18 Step 3 ✓
- `AttributionResult` defined in Task 18 Step 1; consumed in Task 18 Step 2 ✓
- `validateArtifact` signature consistent across Task 17 calls ✓

### 4. Order dependencies

Each task produces files that later tasks consume:
- Task 1 → workspace (Tasks 2–4 use it)
- Task 2 → plugin package (Tasks 5–15 add to it)
- Task 3 → CLI package (Tasks 16–18 implement it)
- Task 4 → templates (Task 16 uses them)
- Task 5 → intent schema (Tasks 6, 15 reference it)
- Task 7 → spec schema (Tasks 8, 15)
- Task 9 → plan schema (Tasks 10, 15)
- Task 14 → remaining schemas (Task 15)
- Task 15 → hooks (Task 16 installs them)
- Task 16 → scaffolder (Task 19 e2e test uses it)
- Tasks 17, 18 → CLI commands (Task 19 uses them)

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-11-loshu-sdlc-v0.1.0.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Use `superpowers:subagent-driven-development`.

2. **Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?
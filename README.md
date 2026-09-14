# loshu-sdlc

[![CI](https://github.com/maxsun1989/loshu-sdlc/actions/workflows/ci.yml/badge.svg)](https://github.com/maxsun1989/loshu-sdlc/actions/workflows/ci.yml)
[![Release](https://github.com/maxsun1989/loshu-sdlc/actions/workflows/release.yml/badge.svg)](https://github.com/maxsun1989/loshu-sdlc/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

AI-Native SDLC plugin for Claude Code.

Implements the six-stage Software Development Lifecycle described in the [Anthropic AI-Native SDLC Playbook](https://claude.com/blog/the-ai-native-sdlc-playbook).

## Status

v0.1.1 — released.

## What's in v0.1.1

- **7 new CLI subcommands** on top of `create` / `validate` / `doctor` / `bands`: `lint`, `rules list|check`, `status`, `coverage`, `logs`, `upgrade`, `telemetry`.
- **Eval suite** — ~30 user stories covering every SDLC stage, runnable via `pnpm test:eval` (and `pnpm test:eval:strict` for gate enforcement).
- **Hooks path fix** — `create` scaffolder now creates the `.claude/hooks` symlink so user projects resolve hooks from the bundled plugin instead of the wrong location.
- **CI workflow** — GitHub Actions run typecheck + test + build + lint on every push / PR.
- **Release workflow** — Tag-push workflow that publishes to npm and creates a GitHub Release via changesets.

## Quickstart

### Install the plugin from the marketplace

```bash
# 1. Add the loshu-sdlc marketplace
claude plugin marketplace add maxsun1989/loshu-sdlc

# 2. Install the plugin into your Claude Code session
claude plugin install loshu-sdlc@loshu-sdlc

# 3. Use the slash commands
/sdlc-plan
```

### Scaffold a new SDLC project

```bash
npx create-loshu-sdlc-app my-app --with-ux --with-ecc
cd my-app
/sdlc-plan
```

## CLI commands at a glance

```
loshu-sdlc create    [path]      Scaffold a new SDLC project
loshu-sdlc validate  [path]      Validate SDLC artifacts against schemas
loshu-sdlc doctor    [path]      Health checks for an SDLC project
loshu-sdlc bands                 Print the SDLC quality bands
loshu-sdlc lint      [path]      Lint borrowed plugin skills (with --fix)
loshu-sdlc rules     list|check  Inspect the rule registry
loshu-sdlc status    [path]      Render per-stage status table
loshu-sdlc coverage  [path]      Run coverage and emit a JSON report
loshu-sdlc logs                  Read ~/.loshu-sdlc/logs/*.log
loshu-sdlc upgrade   [path]      Bump loshu-sdlc version pins in package.json
loshu-sdlc telemetry             Toggle telemetry in ~/.loshu-sdlc/config.json
```

## Running the eval suite

```bash
pnpm test:eval           # ~30 stories, human-readable report
pnpm test:eval:strict    # same stories, non-zero exit on any failure (CI gate)
pnpm test:eval:json      # machine-readable JSON output
```

## Documentation

See `docs/getting-started.md` and `docs/installation.md`.

## License

MIT

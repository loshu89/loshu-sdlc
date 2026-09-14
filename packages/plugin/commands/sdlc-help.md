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

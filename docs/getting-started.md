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

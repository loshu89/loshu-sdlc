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

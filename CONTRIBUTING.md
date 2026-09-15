# Contributing to loshu-sdlc

Thanks for your interest! loshu-sdlc is a Claude Code plugin implementing the AI-Native SDLC.

## Development setup

1. Clone the repo
2. Install Node 20+ and pnpm 9+
3. `pnpm install` (uses npm workspaces)
4. `pnpm typecheck` — TypeScript strict mode across all packages
5. `pnpm test` — 100+ unit + integration tests
6. `pnpm build` — CLI compiles; bundles plugin into CLI package
7. `pnpm test:eval` — 30 golden-file eval stories across 6 SDLC stages
8. `pnpm lint` — ESLint

## Repository structure

- `packages/plugin/` — Claude Code plugin (markdown + JSON, no build)
- `packages/cli/` — Node/TS scaffolder + maintenance CLI
- `packages/templates/` — starter project templates
- `tests/evals/` — golden-file eval stories
- `docs/superpowers/specs/` — design specs
- `docs/superpowers/plans/` — implementation plans
- `docs/internal/` — internal development reports (postmortems, phase summaries)

## Commit conventions

Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
The release workflow uses `pnpm changeset` to draft CHANGELOG.

## Adding a slash command

1. Write the command markdown in `packages/plugin/commands/`
2. If it produces a new artifact type, add a JSON schema in `packages/plugin/schemas/`
3. Update the relevant authoring skill in `packages/plugin/skills/`
4. Add eval stories under `tests/evals/<stage>/`
5. If the command needs to read state, update `packages/cli/src/lib/`

## Adding a CLI subcommand

1. Implement in `packages/cli/src/commands/<name>.ts`
2. Add dispatch case in `packages/cli/src/bin/loshu-sdlc.ts`
3. Add unit + integration tests in `packages/cli/tests/`
4. Update README's CLI command table

## Releasing

Maintainers run `node scripts/release.mjs <version>` to bump and tag locally,
then `git push origin main v0.X.Y` to trigger `.github/workflows/publish-ghcr.yml`.

## Reporting bugs

Open an issue at https://github.com/loshu89/loshu-sdlc/issues with reproduction steps.

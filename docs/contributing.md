# Contributing to loshu-sdlc

> [English](contributing.md) · [简体中文](contributing.zh-CN.md)

Thanks for your interest! loshu-sdlc is a Claude Code plugin implementing the AI-Native SDLC. This page is for people working **on loshu-sdlc itself** — not for users of the plugin (see [usage-guide.md](usage-guide.md) for that).

## Development setup

1. Clone the repo: `git clone https://github.com/loshu89/loshu-sdlc.git`
2. Install Node 20+ and pnpm 9+
3. `pnpm install` (uses npm workspaces)
4. `pnpm typecheck` — TypeScript strict mode across all packages
5. `pnpm test` — 238 unit + integration tests
6. `pnpm build` — CLI compiles; bundles plugin into CLI package
7. `pnpm test:eval` — 30 golden-file eval stories across 6 SDLC stages
8. `pnpm lint` — ESLint

## Repository structure

```
loshu-sdlc/
├── packages/
│   ├── plugin/                     # Claude Code plugin (markdown + JSON, no build)
│   │   ├── commands/               # 9 slash commands (sdlc-*.md)
│   │   ├── agents/                 # SDLC-specific subagents
│   │   ├── skills/                 # authoring skills + policy defaults
│   │   ├── hooks/                  # 7 enforcement scripts
│   │   └── schemas/                # JSON schemas for the 6 artifacts
│   ├── cli/                        # Node/TS scaffolder + maintenance CLI
│   │   ├── src/
│   │   │   ├── bin/                # create-loshu-sdlc-app + loshu-sdlc entrypoints
│   │   │   ├── commands/           # CLI subcommands (create, validate, doctor, ...)
│   │   │   └── lib/                # render, git, plugin-bundler, prompts, validate, bands
│   │   └── tests/                  # vitest unit + integration tests
│   └── templates/                  # starter project templates (minimal, full)
├── tests/
│   └── evals/                      # 30 golden-file eval stories across 6 stages
├── docs/
│   ├── installation.md             # install paths
│   ├── getting-started.md          # tutorial
│   ├── usage-guide.md              # reference
│   ├── contributing.md             # this file
│   └── maintenance.md              # for maintainers
├── scripts/                        # release.mjs + copy-plugin.mjs
└── .github/workflows/              # ci.yml + publish-ghcr.yml
```

> Design specs, implementation plans, and internal retros live under `docs/superpowers/` and `docs/internal/`. These directories are kept on the maintainer's local disk but excluded from the public repo (see `.gitignore`). Contributors don't need to write or read them — the maintainer drives specs and plans for each release.

## Commit conventions

Conventional Commits. Scopes: `feat:` / `fix:` / `refactor:` / `test:` / `docs:` / `chore:` / `style:`.

- One commit per logical change
- Commit message body explains **why**, not what
- Use the `BREAKING CHANGE:` footer for breaking changes
- Never commit `.superpowers/sdd/` (gitignored)

## Adding a slash command

1. Write the command in `packages/plugin/commands/sdlc-<name>.md`
2. Mirror it to `packages/cli/plugin/commands/sdlc-<name>.md` (the bundled copy; regenerated on `pnpm build`)
3. If it produces a new artifact type, add a JSON schema in `packages/plugin/schemas/<artifact>.schema.json`
4. Update the relevant authoring skill in `packages/plugin/skills/`
5. Add eval stories under `tests/evals/<stage>/`
6. If the command needs to read or write state, add code in `packages/cli/src/lib/`
7. Update `docs/usage-guide.md` slash commands table
8. Update the slash-command dispatch in `packages/plugin/.claude-plugin/hooks.json` if it triggers a hook

## Adding a CLI subcommand

1. Implement in `packages/cli/src/commands/<name>.ts`
2. Add the dispatch case in `packages/cli/src/bin/loshu-sdlc.ts`
3. Add unit + integration tests in `packages/cli/tests/`
4. Update `docs/usage-guide.md` CLI commands table
5. If it produces artifacts, run `loshu-sdlc test --fix` on a sample and verify the assertions pass

## Adding an eval story

1. Pick the stage folder: `tests/evals/{plan,design,build,test,deploy,maintain}/`
2. Add a new directory with an input fixture and an `.expected.md` golden file
3. Run `pnpm test:eval --loose` to see how close you are
4. When you're satisfied, run `pnpm test:eval:record` to write the golden

## Adding a hook

1. Add the shell script to `packages/plugin/hooks/<name>.sh`
2. Register it in `packages/plugin/hooks/hooks.json` (`PostToolUse` or `PreToolUse` matcher)
3. Add a shell test in `packages/plugin/hooks/tests/<name>.test.sh`
4. If the hook fires on a slash command, update the relevant `commands/sdlc-*.md` to mention it
5. Update `docs/usage-guide.md` hooks table

## Coding style

- TypeScript strict mode (`tsconfig.base.json` enables it across all packages)
- ESLint runs in CI; run `pnpm lint` before committing
- Prefer small, focused functions; readability over cleverness
- Comments explain **why**, not what
- Match the existing surrounding code style

## Testing discipline

- New behavior needs tests. PRs without tests are sent back for revision.
- Use vitest. Test files live at `packages/cli/tests/**` and `tests/**`.
- The CLI's `vitest.config.ts` runs with `pool: 'forks'` because some tests (notably `git.test.ts`) need to call `process.chdir()`. Don't change this to `threads` without auditing every git/process-cwd test.
- Acceptance test config lives at `tests/integration/vitest.config.ts`.
- Per-task regressions: re-run `pnpm test` before committing; don't re-run the full suite for every micro-edit.

## Pull request flow

1. Branch from `main`. Branch name: `<scope>/<short-topic>` (e.g. `fix/lint-prompts-ts`, `feat/bands-monotonic`).
2. Implement + test locally (`pnpm typecheck && pnpm test && pnpm lint`)
3. Push the branch; open a PR
4. The CI workflow runs build, typecheck, test, lint, and acceptance
5. A maintainer reviews — expect a few rounds of feedback
6. Squash-merge once green

If your change is bigger than a small fix, open an issue first to discuss — the maintainer will drive the design spec and implementation plan for any significant work. See [maintenance.md](maintenance.md) for the release workflow.

## Reporting bugs

Open an issue at <https://github.com/loshu89/loshu-sdlc/issues> with:

- Reproduction steps
- Expected vs actual behavior
- Output of `loshu-sdlc doctor`
- Versions: `pnpm ls --depth=0` output

## License

By contributing, you agree that your contributions will be licensed under the project's MIT license.
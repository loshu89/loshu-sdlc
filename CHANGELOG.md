# Changelog

All notable changes to loshu-sdlc will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — v0.1.1

<!-- v0.1.1 entries will be added below -->

### Added
<!-- v0.1.1 entries will be added below -->

### Fixed
<!-- v0.1.1 entries will be added below -->

## [0.1.0] - 2026-09-14

Initial release of loshu-sdlc, an AI-Native SDLC plugin for Claude Code.

### Added

**Plugin (Claude Code plugin)**
- Plugin package skeleton with marketplace-ready layout (manifest, hooks, skills, agents, commands, schemas)
- 7 SDLC artifact schemas: `intent`, `spec`, `plan`, `claude-md`, `review`, `bands`, `policy`
- 9 slash commands: `/sdlc-plan`, `/sdlc-design`, `/sdlc-build`, `/sdlc-test`, `/sdlc-deploy`, `/sdlc-maintain`, `/sdlc-status`, `/sdlc-init`, `/sdlc-help`
- 5 SDLC-specific agents and 5 authoring skills
- 3 policy skills: `policy-default`, `policy-template`, `ui-ux-baseline`
- Tiered hook scripts for all six SDLC stages (`plan-exit`, `design-exit`, `build-exit`, `test-exit`, `deploy-exit`, `maintain-exit`) plus a `protect-artifacts` safety hook
- Provenance headers on all skill files

**CLI (`loshu-sdlc` command)**
- CLI package skeleton (`create-loshu-sdlc-app`)
- `create` scaffolder command that copies templates and bundles the plugin into a user project
- `validate` command with Ajv-based schema validation for all 7 SDLC artifacts
- `doctor` command for project health checks

**Templates**
- `minimal` starter template (intent + spec + plan + scaffold)
- `full` starter template (all artifacts + ui-ux-baseline + ECC)

**Infrastructure**
- pnpm monorepo workspace (CLI + plugin + templates)
- TypeScript strict mode (`tsconfig.base.json`)
- ESLint + Prettier configuration
- Vitest test runner setup
- Changesets-based versioning

**Tests & Documentation**
- Integration test suite covering scaffolder, validate, and doctor flows
- Getting-started guide and installation docs

### Fixed

- Corrected `$LATENT_INTENT` → `$LATEST_INTENT` typo in `maintain-exit` hook
- Added missing `license` field to 4 `ui-ux-baseline` provenance headers
- Downgraded ESLint to `^8.56.0` for `@typescript-eslint` v7 compatibility
- Allowed template `.loshu-sdlc/` directories in `.gitignore`
- Addressed whole-branch review findings (must-fix and should-fix blockers)

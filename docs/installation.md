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
/plugin marketplace add loshu89/loshu-sdlc
/plugin install loshu-sdlc@loshu-sdlc
```

## Install from GitHub Packages

The `@loshu89/*` packages are published to GitHub Packages. To install them via npm, configure your npm scope:

```bash
# Tell npm to use GitHub Packages for the @loshu89 scope
echo "@loshu89:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Authenticate with a GitHub personal access token (needs `read:packages` scope)
npm login --registry=https://npm.pkg.github.com
```

Then install:

```bash
npm install -g @loshu89/cli
```

Or one-off:

```bash
npx --yes @loshu89/cli --help
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

## Environment variables (for git lifecycle automation, v0.6.0+)

`loshu-sdlc git` requires platform credentials:

| Variable | Purpose | Example |
|---|---|---|
| `GHCR_TOKEN` (or `GITLAB_TOKEN`) | Platform token with `repo` + `write:packages` | `ghp_xxx…` (**never paste in chat**) |
| `LOSHU_REPO` | `owner/name` of target repository | `loshu89/loshu-sdlc` |

`loshu-sdlc git status` and `loshu-sdlc git sync --dry-run` work without tokens (read-only).

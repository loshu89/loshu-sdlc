# Installation

> [English](installation.md) · [简体中文](installation.zh-CN.md)

Three install paths. Pick the one that matches your situation.

| Path | When to use it |
|---|---|
| **[Scaffold a new project](#scaffold-a-new-project)** | Starting greenfield. The scaffolder sets up a project, the plugin, and the artifacts all at once. |
| **[Add to an existing repo](#add-to-an-existing-repo)** | You have a codebase and want to adopt loshu-sdlc in place. |
| **[Plugin only](#plugin-only)** | You only want the slash commands and hooks — bring your own project structure. |

All paths require the **[required external plugins](#required-external-plugins)** below.

---

## Scaffold a new project

```bash
npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc]
cd my-app
```

This creates a new directory with:

- The `@loshu89/plugin` plugin installed in `.claude/`
- Slash commands (`/sdlc-plan`, `/sdlc-design`, ...) and hooks wired up
- A starter `intent.md` and `.loshu-sdlc/config.yaml`
- A git repo with the initial scaffold as the first commit

### Flags

| Flag | Effect |
|---|---|
| `--with-ux` | Also install `ui-ux-pro-max` (UI/UX design intelligence) |
| `--with-ecc` | Also install `ecc` (Everything Claude Code) |
| `--with-all` | Shorthand for `--with-ux --with-ecc` |
| `--template full` | Use the full SDLC template — all 6 artifacts + 2 CI workflows (default: `minimal`) |
| `--existing` | Install into an existing repo instead of scaffolding (see [next section](#add-to-an-existing-repo)) |
| `--coverage 80` | Line coverage threshold for the verification block (default: 80) |
| `--branch 75` | Branch coverage threshold (default: 75) |
| `--no-git` | Skip `git init` and the initial commit |
| `--yes` / `-y` | Skip interactive prompts (use defaults) |
| `--strict` | Enable strict eval mode |
| `--help` / `-h` | Show the full help text |

---

## Add to an existing repo

```bash
cd ~/projects/legacy-app
npx create-loshu-sdlc-app . --existing
```

This installs the plugin and writes `.claude/` + `.loshu-sdlc/config.yaml` into your existing repo without disturbing your code. Run `/sdlc-plan` at your next change to start the SDLC cycle.

If you have an unusual filesystem (some Windows configs without symlinks), see the **[troubleshooting entry](#hook-doesnt-fire-after-scaffold)** at the bottom of this page.

---

## Plugin only

If you want the plugin without the scaffolder — e.g., you're experimenting or your project has a non-standard layout:

```bash
claude plugin marketplace add loshu89/loshu-sdlc
claude plugin install loshu-sdlc@loshu-sdlc
```

You get all 9 slash commands and the 7 hooks. You'll need to create the artifact files (`intent.md`, etc.) yourself — see [`docs/usage-guide.md`](usage-guide.md) for the schema requirements.

---

## Install from GitHub Packages (advanced)

The `@loshu89/*` packages are published to **both** the public npm registry (`registry.npmjs.org`) and GitHub Packages (`npm.pkg.github.com`). The public registry is the default — `npx create-loshu-sdlc-app` resolves through it without any setup.

You only need the GitHub Packages path if the public npm publish hasn't completed yet, or if your organization restricts installs to GitHub Packages only. To install from GitHub Packages:

```bash
# 1. Tell npm to use GitHub Packages for the @loshu89 scope
echo "@loshu89:registry=https://npm.pkg.github.com" >> ~/.npmrc

# 2. Authenticate with a GitHub personal access token (needs `read:packages`)
npm login --registry=https://npm.pkg.github.com
```

Then:

```bash
npm install -g @loshu89/cli     # scaffolder + maintenance CLI
# or
npx --yes @loshu89/cli --help   # one-off, no install
```

> **Note:** GitHub Packages requires authentication even for public packages — unlike `npmjs.com`, anonymous download is not allowed. Create a token at <https://github.com/settings/tokens/new> with the `read:packages` scope.

Most users should use the public npm registry path (the default). Direct GitHub Packages install is for plugin authors, mirror users, or unusual deployment setups.

---

## Install from a GitHub Release tarball (no registry required)

If neither the public npm registry nor GitHub Packages is an option for you (e.g., you can't reach `registry.npmjs.org`, or your org blocks both), every tagged release attaches a self-contained CLI tarball:

```bash
npm install -g https://github.com/loshu89/loshu-sdlc/releases/download/<TAG>/cli-v<TAG>.tar.gz
```

For example, to install v0.9.1:

```bash
npm install -g https://github.com/loshu89/loshu-sdlc/releases/download/v0.9.1/cli-v0.9.1.tar.gz
```

The tarball is built by `.github/workflows/publish-ghcr.yml` on every tag push. It bundles the compiled CLI, the plugin, and the templates into a single npm-installable package — no registry authentication required.

Verify the binary is on your PATH:

```bash
which create-loshu-sdlc-app
create-loshu-sdlc-app --help
```

---

## Required external plugins

loshu-sdlc depends on two external plugin sets. **Tier 1 is required** — without it, loshu-sdlc refuses to run. **Tier 2 is recommended** for full functionality.

### Tier 1 — required

```bash
claude plugin marketplace add superpowers/superpowers
claude plugin install superpowers@superpowers
```

Provides the brainstorming, writing-plans, TDD, and verification skills that drive each `/sdlc-*` command.

### Tier 2 — recommended

```bash
# UI/UX design intelligence
claude plugin marketplace add <ui-ux-pro-max-marketplace>
claude plugin install ui-ux-pro-max

# Everything Claude Code (architect, code-reviewer, security-reviewer)
claude plugin marketplace add affaan-m/everything-claude-code
claude plugin install ecc@ecc
```

Without Tier 2, loshu-sdlc still runs but design and review quality degrade.

### Tier 3 — opportunistic

Any other `ecc:*` skills (frontend-patterns, backend-patterns, api-design, database-migrations, etc.) are picked up automatically if installed.

---

## Verifying installation

```bash
loshu-sdlc doctor
```

Should print `✔ All checks passed`. If it reports missing plugins or skills, the error message tells you exactly which `claude plugin install` to run.

---

## Git lifecycle credentials (v0.6.0+)

The `loshu-sdlc git` command family (used by `/sdlc-deploy` and `/sdlc-maintain` for cross-repo sync) needs platform credentials:

| Variable | Purpose | Example |
|---|---|---|
| `GHCR_TOKEN` (or `GITLAB_TOKEN`) | Platform token with `repo` + `write:packages` | `ghp_xxx…` (never paste in chat) |
| `LOSHU_REPO` | `owner/name` of target repository | `loshu89/loshu-sdlc` |

`loshu-sdlc git status` and `loshu-sdlc git sync --dry-run` work without tokens (read-only).

---

## Troubleshooting

**Hook doesn't fire after scaffold.** The scaffolder creates a symlink `.claude/hooks → .claude/plugins/loshu-sdlc/hooks/`. If your filesystem doesn't support symlinks (some Windows configs), hooks won't fire. Workaround: copy the `hooks/` directory manually after scaffold.

**Plugin commands don't appear in Claude Code.** After `claude plugin install`, restart your Claude Code session — slash commands are discovered at session start.

**GitHub Packages install fails with E401.** Usually an org-level third-party app restriction. Either approve the GitHub Actions app in org settings, or use a PAT added as the `GHCR_TOKEN` secret. See [the README troubleshooting entry](../README.md#troubleshooting) for details.
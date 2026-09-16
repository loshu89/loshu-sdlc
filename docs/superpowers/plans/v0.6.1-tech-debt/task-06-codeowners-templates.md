# Task 6: CODEOWNERS + PR/issue templates

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Debt:** D6 + D9 — the CODEOWNERS parser (`packages/cli/src/lib/codeowners.ts`) and reviewer-assignment logic exist, but NO CODEOWNERS file exists anywhere (repo or templates), so reviewer assignment never fires. The repo also has no PR/issue templates, and scaffolded projects get none either.

## Files

- Create: `packages/templates/full/.loshu-sdlc/CODEOWNERS`
- Create: `packages/templates/full/.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md` (this repo)
- Create: `.github/ISSUE_TEMPLATE/bug_report.md` (this repo)
- Create: `.github/ISSUE_TEMPLATE/feature_request.md` (this repo)
- Create: `.github/ISSUE_TEMPLATE/config.yml` (this repo)
- Modify: `packages/cli/src/commands/create.ts` — ONLY if `.gitignore` filtering excludes dotdirs from the template copy (verify in Step 3)

## Interfaces

- **Consumes:** `parseCodeowners(content)` + `reviewersForPath(entries, path)` from `lib/codeowners.ts` (existing, tested). `git.ts`'s `loadCodeowners(rootPath)` reads `<root>/.loshu-sdlc/CODEOWNERS` (existing path constant — the template must land exactly there).
- **Produces:** scaffolded projects contain a working CODEOWNERS file; this repo has contribution templates.

## Steps

- [ ] **Step 1: Create the template CODEOWNERS**

```
# packages/templates/full/.loshu-sdlc/CODEOWNERS
# Reviewer routing for SDLC artifacts (loshu-sdlc git sync reads this).
# Syntax: <artifact-path> <@owner>... — last match wins.
# Replace the placeholder owners with your team's GitHub usernames/teams.

/intent.md    @product-owner
/spec.md      @architect @security-reviewer
/plan.md      @tech-lead
/CLAUDE.md    @tech-lead
/REVIEW.md    @security-reviewer @qa-lead
/bands.yaml   @sre-oncall
/*            @tech-lead
```

- [ ] **Step 2: Create the template PR template**

```markdown
<!-- packages/templates/full/.github/PULL_REQUEST_TEMPLATE.md -->
## SDLC Cycle

- Cycle: <!-- loshu-sdlc cycle number -->
- Artifacts: <!-- intent.md / spec.md / plan.md links -->
- Review gate: `loshu-sdlc test --strict` <!-- paste result -->

## Changes

<!-- What & why. Link the spec § sections this implements. -->

## Checklist

- [ ] `loshu-sdlc test --strict` passes
- [ ] Artifacts' `state` fields reflect review outcome
- [ ] REVIEW.md sections (Bugs/Security/Compliance) are `pass` or justified
- [ ] CHANGELOG updated (if user-facing)
```

- [ ] **Step 3: Verify the scaffolder copies dot-directories**

`create.ts` copies templates via `fs-extra.copy` with a filter. Read the filter (search for `filter:` in `packages/cli/src/commands/create.ts`). Current filter (from v0.1.0 Task 16): `(src) => !src.includes('.git') && !src.includes('node_modules')`.

**PROBLEM:** `!src.includes('.git')` also matches `.github` and would exclude the template's `.github/` dir! And `.gitignore`-style prefix matching may catch `.loshu-sdlc` too (it contains "git"? No — `.loshu-sdlc` does not contain `.git`; only `.github` is affected).

Fix the filter to be precise — exclude only the actual `.git` directory:

```typescript
import { basename } from 'node:path';
// ...
filter: (src) => {
  const base = basename(src);
  return base !== '.git' && base !== 'node_modules';
},
```

Verify `.gitignore` files still copy (they should — basename is `.gitignore`, not `.git`).

- [ ] **Step 4: Test scaffolder output includes the new files**

```bash
cd "D:/workspace/3.my/SDLC"
npx pnpm@9.0.0 --filter @loshu89/cli build
TMP=$(mktemp -d)
node packages/cli/dist/bin/create-loshu-sdlc-app.js "$TMP/app" --template full --yes --no-git 2>/dev/null || node packages/cli/dist/bin/loshu-sdlc.js create "$TMP/app" --template full --yes --no-git
ls -la "$TMP/app/.loshu-sdlc/" "$TMP/app/.github/"
rm -rf "$TMP"
```

Expected: `CODEOWNERS` in `.loshu-sdlc/`, `PULL_REQUEST_TEMPLATE.md` in `.github/`. (Use whichever bin invocation the built CLI supports — check `packages/cli/package.json#bin`.)

- [ ] **Step 5: Add an integration assertion (extend existing scaffold test)**

In `tests/integration/scaffold.test.ts`, inside the existing full-template test, add:

```typescript
    expect(existsSync(join(target, '.loshu-sdlc', 'CODEOWNERS'))).toBe(true);
    expect(existsSync(join(target, '.github', 'PULL_REQUEST_TEMPLATE.md'))).toBe(true);
```

(match the file's existing import/variable names — read it first.)

- [ ] **Step 6: This repo's own templates**

`.github/PULL_REQUEST_TEMPLATE.md`:

```markdown
## What

<!-- One paragraph: what this PR does. -->

## Why

<!-- Link the spec §/debt item/task file that motivates it. -->

## Verification

- [ ] `pnpm typecheck` clean
- [ ] `pnpm test` all pass (no new excludes)
- [ ] `pnpm lint` clean
- [ ] `pnpm test:eval` 30/30
- [ ] CHANGELOG.md updated under [Unreleased] (user-facing changes)
```

`.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Something in loshu-sdlc behaves wrong
labels: bug
---

**Version:** <!-- loshu-sdlc --version -->
**OS / Node:** <!-- e.g. Windows 11 / Node 20.11 -->

## What happened

## What you expected

## Reproduction

```bash
# minimal commands
```

## Output / logs

<!-- paste terminal output, hook stderr, or .loshu-sdlc/state/gates.jsonl lines -->
```

`.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature request
about: Propose an addition to the SDLC workflow
labels: enhancement
---

## Problem

<!-- What SDLC friction does this remove? -->

## Proposal

<!-- Sketch of the command/hook/schema change. -->

## Which stage?

Plan / Design / Build / Test / Deploy / Maintain / Cross-cutting
```

`.github/ISSUE_TEMPLATE/config.yml`:

```yaml
blank_issues_enabled: false
contact_links:
  - name: loshu-sdlc discussions
    url: https://github.com/loshu89/loshu-sdlc/discussions
    about: Questions and workflow ideas (enable Discussions in repo settings first)
```

- [ ] **Step 7: Run tests + commit**

```bash
cd "D:/workspace/3.my/SDLC"
npx pnpm@9.0.0 test
git add packages/templates/full/.loshu-sdlc/CODEOWNERS packages/templates/full/.github/ packages/cli/src/commands/create.ts tests/integration/scaffold.test.ts .github/PULL_REQUEST_TEMPLATE.md .github/ISSUE_TEMPLATE/
git commit -m "feat: ship CODEOWNERS + PR/issue templates (repo and scaffolded projects); fix .github exclusion in template copy"
```

## Known gotchas

- The template copy filter bug (Step 3) means `.github/` was SILENTLY dropped from full-template scaffolds since v0.1.0 — the two CI workflow stubs in `packages/templates/full/.github/workflows/` were probably never landing in scaffolded projects either. Your filter fix repairs that too; mention it in the report.
- Windows + git: empty directories aren't tracked; every new dir must contain at least one file (they all do here).
- CODEOWNERS placeholder owners (`@product-owner` etc.) are intentional — the scaffolded project's owner replaces them. Add a one-line note to the template README if it lists project files.

## Report contract

Write report to the SDD workspace `task-06-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line test summary (incl. the new integration assertions)
- Concerns (if any)
- Report file path

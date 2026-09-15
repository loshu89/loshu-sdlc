# Publish Saga Postmortem: v0.2.0 → v0.4.1

**Date:** 2026-09-15
**Scope:** Every failure mode encountered while publishing `@loshu-sdlc/*` then `@maxsun1989/*` then `@loshu89/*` packages between v0.1.0 and v0.4.1.
**Goal:** Prevent future maintainers (human or AI) from re-debugging the same issues.

This is a single, durable record. It supersedes the per-incident notes in
`v0.1.1-ghcr-publish-migration-report.md`, `v0.2.0-rename-report.md`, and
`v0.2.0-rename-to-loshu89-report.md`.

---

## 1. Timeline

A chronological account of what actually happened, in order.

1. **v0.1.0 / v0.1.1 — initial release attempts to npmjs.com.**
   The first attempt to publish was the public `npm` registry. The maintainer's
   IP was in mainland China; Cloudflare returned a captcha on the `npm login`
   page that the headless CLI workflow could not satisfy.

2. **npmjs.com requires "I'm not a robot" verification.**
   Even with a logged-in browser session, `npm publish` triggered an interactive
   verification challenge that automation cannot pass. The registry would not
   accept publishes from the Chinese egress IP.

3. **First scope rename: `@loshu-sdlc/*` → `@maxsun1989/*`.**
   Decision: switch the publish target from `npmjs.com` to **GitHub Packages**
   (`https://npm.pkg.github.com`) to avoid the captcha and IP-block. GitHub
   Packages requires that the npm scope equal the GitHub owner. The repo
   belonged to the personal user `maxsun1989`, so the scope had to be
   `@maxsun1989/*`. Commit: `a9f68ce refactor(rename): rename @loshu-sdlc/* packages to @maxsun1989/* for GitHub Packages`.

4. **GitHub Packages requires scope = owner; `maxsun1989` is a user, not an org.**
   Publishing succeeded for the first time, but the long-term home for the
   project was clearly the `loshu89` org. The maintainer decided to migrate
   the repository from `maxsun1989` to the `loshu89` GitHub org rather than
   keep the scope bound to a personal account.

5. **E401 Unauthorized — multiple causes.**
   On every transition the publish step returned `E401 Unauthorized` at least
   once. There were at least four distinct root causes; the same error
   message masked all of them.

6. **Repository transferred from `maxsun1989` to `loshu89` GitHub org.**
   After the transfer, the previous PAT was still owned by `maxsun1989` and
   could no longer push packages under the new owner. Commit: `60d936c chore(remote): update origin to loshu89/loshu-sdlc`.

7. **Second scope rename: `@loshu-sdlc/*` → `@loshu89/*`.**
   Now the scope could match the org. Commit: `1db4f2e refactor(rename): rename @loshu-sdlc/* to @loshu89/* to match GitHub org owner`. (This re-applies the rename from step 3 against the new org.)

8. **First PAT did not work (org-level scope mismatch).**
   The PAT that had been used under `maxsun1989` was personal. GitHub Packages
   rejects org-owned packages when the token is owned by an outside user.
   A new PAT had to be minted by a member of the `loshu89` org.

9. **Workflow switched to `GHCR_TOKEN` secret.**
   Once the new PAT was minted it was added as a repository secret named
   `GHCR_TOKEN`. The workflow referenced `${GHCR_TOKEN}`. Commit:
   `997e573 ci: switch publish-ghcr to use GHCR_TOKEN secret (PAT) instead of GITHUB_TOKEN`.

10. **Token leaked into chat (recovery: rotate PAT, never paste secrets).**
    During a debugging session the raw PAT was pasted into a chat transcript
    that the maintainer treats as durable. Recovery: rotate the PAT
    immediately, scrub the transcript, and add a rule to never paste secrets
    into any conversation channel.

11. **E401 persisted even with PAT — root cause: `.npmrc` referenced `${NPM_TOKEN}` but workflow passed `${GHCR_TOKEN}`.**
    The publish step still failed. The misleading symptom was `E401`. The
    actual cause was a **name mismatch between two configuration files**:
    - `.npmrc` contained `//npm.pkg.github.com/:_authToken=${NPM_TOKEN}`
    - `publish-ghcr.yml` set `env: GHCR_TOKEN: ${{ secrets.GHCR_TOKEN }}`
    pnpm reads the **project** `.npmrc` ahead of the user-level config, so the
    `${NPM_TOKEN}` placeholder was never substituted and pnpm passed an empty
    string to GitHub Packages, which then returned `E401`.

12. **v0.4.1 fix: change `.npmrc` env var name.**
    Aligning the env var name across `.npmrc` and the workflow
    (`GHCR_TOKEN` on both sides) was the entire fix. Commit:
    `116d592 fix(ci): use GHCR_TOKEN env var in .npmrc instead of NPM_TOKEN`.

---

## 2. Root Causes (Per Failure)

| # | Symptom | Root cause |
|---|---|---|
| 1 | `npm login` returns captcha | Chinese egress IP + Cloudflare "I'm not a robot" challenge. Public npmjs.com blocks automation from this IP. |
| 2 | `npm publish` is rejected with verification prompt | `registry.npmjs.org` requires interactive human verification, which CI cannot satisfy. |
| 3 | GitHub Packages refuses to accept `@loshu-sdlc/*` | GH Packages scope rule: the npm scope **must** equal the repo owner. `loshu-sdlc` is neither a user nor an org. |
| 4 | E401 — personal PAT cannot publish to `loshu89/*` | The PAT was created under the `maxsun1989` personal account. GH Packages requires the token owner to be the same owner/org as the scope. |
| 5 | E401 — even after switching to a new PAT | `.npmrc` referenced `${NPM_TOKEN}` but the workflow only exported `GHCR_TOKEN`. The token never reached pnpm. |
| 6 | E401 — env var name drift between `.npmrc` and workflow | pnpm config resolution order: project `.npmrc` overrides `~/.npmrc`. A missing or differently-named env var produces an empty `_authToken`, which GH Packages reports as E401. |
| 7 | Token leak | The PAT was pasted into a chat transcript that is treated as durable. Recovery: rotate the token; never paste secrets into any conversational channel. |

---

## 3. Lessons

- **Always read WARN/error messages carefully.** pnpm emits
  `WARN  Failed to replace env in config: ...` when a placeholder cannot be
  resolved. That one line was the entire root cause in step 11. The `E401`
  from GitHub Packages is the downstream symptom, not the cause.
- **pnpm config resolution order is project > user.** A `.npmrc` checked into
  the repo overrides `~/.npmrc` silently. If the project file references
  `${NPM_TOKEN}` and the workflow only exports `GHCR_TOKEN`, no user-level
  config can save you.
- **GitHub Packages is strict about scope/owner matching.** Scope must equal
  the repo owner. Personal accounts work but are not a stable long-term
  identity — prefer a GitHub org.
- **PAT ownership matters.** A PAT is bound to the user or org that minted
  it. To publish under `@<org>/*`, the PAT must be created by a member of
  `<org>`. A token from a personal account outside the org will E401.
- **Never paste secrets in chat.** Chat transcripts persist forever and are
  the worst possible place for a credential. Use `gh secret set` or the
  GitHub UI. Rotate immediately if a secret ever appears in any channel.
- **Doctor workflows should print token identity.** A first-time
  verification step that logs the first four masked characters of the token
  (e.g. `ghp_XXXX…`) confirms the right secret is flowing without
  disclosing the value.
- **Surface drift between config files and workflows.** Add a
  pre-publish check that greps `.npmrc` for env var names and asserts the
  same names are exported by the workflow.

---

## 4. Checklist for Future Releases

Run through this before any first-time publish to a new registry or org.

- [ ] **Repo owner matches npm scope.** The npm scope on every package must
      equal the GitHub owner that owns this repo. If the repo moved, the
      scope must move with it.
- [ ] **PAT created under the correct org/user.** The token owner must match
      the scope. A personal PAT cannot publish to an org's packages.
- [ ] **PAT has `write:packages` scope.** Without it, the token authenticates
      but cannot push.
- [ ] **`.npmrc` env var names match workflow secret names.** Open both files
      side-by-side. Every `${VAR}` in `.npmrc` must be exported by the
      publish step.
- [ ] **Workflow `pnpm config set` doesn't override `.npmrc`.** Setting
      `_authToken` in the project `.npmrc` is preferred. A workflow that
      runs `pnpm config set //npm.pkg.github.com/:_authToken $SECRET` writes
      to a different store and may not take effect on every pnpm version.
- [ ] **Test with `pnpm publish --dry-run` before tagging.** Dry-run shows
      the resolved registry and the auth token (truncated) without
      creating a real publish. It catches name drift cheaply.
- [ ] **Use `gh secret set` to manage secrets, never chat paste.** Secrets
      belong in `gh secret set` or the GitHub UI. Treat any secret that
      touches a chat transcript as compromised and rotate it.
- [ ] **Add `set -x` to the publish step temporarily for first-time
      verification.** A `bash -x` trace shows the exact env vars that
      pnpm sees. Remove it before merge.
- [ ] **Confirm the publish step exports the secret in `env:`.** An
      `env:` block that doesn't match a `.npmrc` placeholder is the
      single most common cause of E401 here.
- [ ] **Rotate any PAT that ever appeared outside the secret store.** If
      it was pasted in a chat, on a screen-share, in a screenshot, or in
      a commit, treat it as public and rotate.

---

## 5. Current State (v0.4.1)

- **Registry:** `https://npm.pkg.github.com` (GitHub Packages)
- **Scope:** `@loshu89/*`
- **Org:** `loshu89` (the GitHub org, not a personal account)
- **Token name:** `GHCR_TOKEN` (matches the env var exported by
  `publish-ghcr.yml` and the placeholder in `.npmrc`)
- **Auth source:** Project `.npmrc` (the workflow does not also call
  `pnpm config set` to avoid double-source drift)
- **Publishing path:** `git push origin main v0.X.Y` triggers
  `.github/workflows/publish-ghcr.yml`, which runs `pnpm install`,
  `typecheck`, `test`, `build`, `test:eval`, then `pnpm -r --filter './packages/*' publish --access public --no-git-checks --tag latest`.

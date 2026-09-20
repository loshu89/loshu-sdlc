# Task 6: Release v0.9.0

**Goal:** Run `scripts/release.mjs 0.9.0` to bump versions, run the gauntlet, refresh lockfile, and commit. Then manually create the local `v0.9.0` tag. Do NOT push.

**Files:**
- (release.mjs creates the version bumps and the `chore: release v0.9.0` commit automatically.)

---

- [ ] **Step 1: Verify clean tree**

Run: `git status --porcelain`
- Expected: empty (or only `tests/evals/results.json` if the gauntlet ran and refreshed the timestamp).
- If `tests/evals/results.json` changed, commit it: `git add tests/evals/results.json && git -c user.name=loshu-sdlc -c user.email=loshu-sdlc@local commit -m "chore(eval): refresh eval results timestamp (30/30 strict still passing)"`
- If a stray file exists at repo root (e.g., `0`, `a.rule`, `errors.push(msg)`), `rm` it before running release.mjs.

- [ ] **Step 2: Run the release script**

Run: `node scripts/release.mjs 0.9.0`
Expected output:
- CI gauntlet passes (typecheck + test + build + lint + eval:strict).
- Versions bumped in all 3 workspace packages (`@loshu89/plugin`, `@loshu89/cli`, `@loshu89/templates`) from 0.8.0 → 0.9.0.
- `pnpm install --lockfile-only` refreshes the lockfile.
- `git add -A && git commit -m "chore: release v0.9.0"` creates the release commit.

- [ ] **Step 3: Create the local tag**

Run: `git tag -a v0.9.0 -m "v0.9.0 — Maintain loop closure (auto-diagnose)"`
Expected: tag created locally.

- [ ] **Step 4: Verify final state**

```bash
git tag -l "v0.9*"
git log --oneline -10
cat packages/cli/package.json | grep version
```

Expected:
- `v0.8.0`, `v0.9.0` listed.
- Log shows the 6 v0.9.0 commits + the release commit.
- `packages/cli/package.json` shows `"version": "0.9.0"`.

- [ ] **Step 5: Report to the user**

Tell the user:
- v0.9.0 is ready to ship at `<commit>` with local tag `v0.9.0`.
- Push command: `git push origin main v0.9.0` (the user does this manually).
- Watch https://github.com/loshu89/loshu-sdlc/actions for the publish-ghcr.yml workflow to go green.

(No commit in this task beyond release.mjs — release.mjs creates the `chore: release v0.9.0` commit. The tag is local-only.)

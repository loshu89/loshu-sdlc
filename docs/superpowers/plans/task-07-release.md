# Task 7: Release v0.6.4

**Goal:** Run `scripts/release.mjs 0.6.4` to bump versions, run the gauntlet, refresh lockfile, and commit. Then manually create the local tag `v0.6.4`.

**Depends on:** Task 6 done (CHANGELOG entry exists).

## Steps

1. **Verify clean tree:** `git status --porcelain` should be empty (except possibly `tests/evals/results.json` if the gauntlet ran and refreshed the timestamp).
2. **If results.json changed:** `git add tests/evals/results.json && git -c user.name=loshu-sdlc -c user.email=loshu-sdlc@local commit -m "chore(eval): refresh eval results timestamp (30/30 strict still passing)"`
3. **Run release script:** `node scripts/release.mjs 0.6.4`
   - It will re-run the gauntlet (typecheck + test + build + lint + eval:strict).
   - It will bump versions in all 3 workspace packages (`@loshu89/plugin`, `@loshu89/cli`, `@loshu89/templates`) from 0.6.3 → 0.6.4.
   - It will run `pnpm install --lockfile-only` to refresh the lockfile.
   - It will create a `chore: release v0.6.4` commit.
4. **Tag:** `git tag -a v0.6.4 -m "v0.6.4 — accept gap fill (A3, V4, realign state with spec)"`
5. **Report:** Show the commit + tag, and tell the user how to push (`git push origin main v0.6.4`).

## Verification

1. `git tag -l "v0.6*"` shows v0.6.4.
2. `git log --oneline -8` shows the new release commit.
3. `cat packages/cli/package.json | grep version` shows `0.6.4`.

## Notes

- Don't push — the user does that manually.
- If the release script fails the gauntlet, fix the issue and re-run.

## Commit

(No manual commit here — `release.mjs` creates the `chore: release v0.6.4` commit. The tag is local only.)

# Task 4: Git sync real implementation

**Goal:** Replace the print-only `git sync` with a real implementation that, when invoked with `--execute`, does the full flow: validate preconditions, create/update branch, commit each accepted stage's artifact, push to origin, open a PR if all stages are accepted, persist `cycleEntry.platform` + `cycleEntry.pr` to `cycle.json`. `--dry-run` (the v0.7.0 default) prints the same flow without mutating anything.

**Spec:** v0.7.0-design §1 (git sync — Real Implementation).

**Files:**
- Modify: `packages/cli/src/commands/git.ts` (full rewrite of the `sync` subcommand; `status`/`merge`/`abandon` subcommands are unchanged).

**Interfaces:**
- Consumes: `CycleStateFile` (from `lib/cycle.ts`), `Platform` / `createPlatform` (from `lib/platforms/`), `execa` for `git`/`gh` calls, `parseCodeowners` / `reviewersForPath` (from `lib/codeowners.js`), `readFile`/`writeFile` from `node:fs/promises`.
- Produces:
  - `GitArgs.execute?: boolean` — new optional field; when true, do real work; default false (v0.7.0 safety).
  - Persists to `cycle.json`: `cycleEntry.platform = { provider, repo }`, `cycleEntry.pr = { number, url, state }` (when sync completes).

**Detailed contract for the `sync` subcommand:**

1. **Preflight:**
   - `await execa('git', ['rev-parse', '--git-dir'])` — must succeed; else `console.error("git sync: not in a git working tree")` and exit 2.
   - `loadCycle(rootPath)` — must succeed; else exit 2.
   - Cycle entry exists for `args.cycleId ?? cycle.current_cycle`; else exit 2.
   - Platform config: prefer `cycleEntry.platform`, fallback to `configFromEnv()`. If no token, exit 2.

2. **Branch:**
   - Compute `branch = \`sdlc/cycle-${String(cycleId).padStart(2, '0')}-${slug}\`` where slug = `cycleEntry.title.toLowerCase().replace(/\s+/g, '-')`.
   - Get base branch SHA: `git rev-parse <baseBranch>` (default `main`).
   - `git checkout -B <branch> <baseSha>` — creates or resets.

3. **Per stage:**
   - For each `[stageName, stageEntry]` in `Object.entries(cycleEntry.stages)` where `stageEntry.artifact` is set:
     - `git add <artifact>` — relative to `rootPath`.
     - `git commit -m "sdlc(<stageName>): <artifact> accepted for cycle <cycleId>"` — skip with a warning if nothing to commit (exit code != 0 from `git diff --cached --quiet`).
     - Continue to next stage.

4. **Push:**
   - `git push origin <branch> --set-upstream` (idempotent — handles both first push and subsequent).

5. **PR open (if all stages are `accepted`):**
   - Determine `reviewers` via `reviewersForPath(codeowners, stageArtifact)`. Use the first stage's artifact path or union across all paths (implementer decides; document choice).
   - Compute `title = cycleEntry.title`, `body = "Automated SDLC cycle ${cycleId}."` (placeholder body is fine; spec doesn't define schema).
   - `platform.openPR(baseBranch, branch, title, body, reviewers)` → returns `{ number, url, state }`.
   - Persist `cycleEntry.platform = { provider, repo }` and `cycleEntry.pr = { number, url, state }` via `cycle.ts:saveCycleState`.
   - `console.log("git sync: PR #<number> opened at <url>")`.

6. **Dry-run mode (default):**
   - Print the intended commands + platform call as `console.log`.
   - Do not mutate anything on disk or remote.
   - Exit 0.

7. **Error handling:**
   - `execa` non-zero exit → bubble stderr prefix `error`, exit 1.
   - `cycle.json` write failure → exit 1 (do NOT roll back pushed commits; print warning "Push succeeded but cycle.json write failed; reconcile manually").
   - Existing `console.log` lines for dry-run must be preserved verbatim so existing tests at `tests/commands/git.test.ts` (if any) don't break.

- [ ] **Step 1: Read current `git.ts` end-to-end and the test file `tests/commands/git.test.ts` (if it exists)**

- [ ] **Step 2: Add `execute` to `GitArgs` interface**

In `packages/cli/src/commands/git.ts`:
```ts
export interface GitArgs {
  subcommand: 'sync' | 'status' | 'merge' | 'abandon';
  cycleId?: number | undefined;
  dryRun?: boolean | undefined;   // default true in v0.7.0 (safe); --execute to opt in
  execute?: boolean | undefined;   // explicit opt-in to real commit/push/PR
}
```

- [ ] **Step 3: Add imports for execa and `saveCycleState`**

At the top of `git.ts`:
```ts
import { execa } from 'execa';
import { saveCycleState } from '../lib/cycle.js';
```

- [ ] **Step 4: Add preflight helpers at the top of the file (before `git` function)**

```ts
async function ensureGitRepo(rootPath: string): Promise<void> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: rootPath });
  } catch {
    throw new Error('not in a git working tree');
  }
}

async function ensureToken(): Promise<void> {
  // configFromEnv throws if no token; rely on that.
  configFromEnv();
}
```

- [ ] **Step 5: Add a `runGit(args, cwd)` helper that prints or executes per the mode**

```ts
async function runGit(
  args: string[],
  cwd: string,
  opts: { dryRun: boolean },
): Promise<{ stdout: string } | null> {
  console.log(`$ git ${args.join(' ')}`);
  if (opts.dryRun) return null;
  const r = await execa('git', args, { cwd });
  return { stdout: r.stdout };
}
```

- [ ] **Step 6: Add a `commitIfStaged(stageArtifact, rootPath, message, dryRun)` helper**

```ts
async function commitIfStaged(
  artifactRelPath: string,
  rootPath: string,
  message: string,
  dryRun: boolean,
): Promise<boolean> {
  await runGit(['add', artifactRelPath], rootPath, { dryRun });
  if (dryRun) return true;
  // If nothing to commit, `git commit` exits non-zero. Check first.
  const staged = await execa('git', ['diff', '--cached', '--quiet'], { cwd: rootPath }).catch(() => null);
  if (staged && staged.exitCode === 0) {
    console.log(`git sync: nothing to commit for ${artifactRelPath} (already committed)`);
    return false;
  }
  await execa('git', ['commit', '-m', message], { cwd: rootPath });
  return true;
}
```

- [ ] **Step 7: Rewrite the `case 'sync'` block in the `git` function**

Replace the existing `case 'sync'` (currently `git.ts:64-92`) with the real implementation. Sketch:

```ts
case 'sync': {
  const dryRun = args.execute ? false : (args.dryRun ?? true);
  if (!dryRun) {
    console.warn('git sync: --execute is set; this will commit, push, and (if all stages accepted) open a PR.');
  }
  // 1. Preflight
  try { await ensureGitRepo(rootPath); } catch (e) {
    console.error(`git sync: ${(e as Error).message}`);
    return 2;
  }
  let cycle: CycleStateFile;
  try { cycle = await loadCycle(rootPath); } catch (e) {
    console.error(`git sync: cannot read cycle.json: ${(e as Error).message}`);
    return 2;
  }
  const cycleId = args.cycleId ?? cycle.current_cycle;
  const cycleEntry = cycle.cycles[String(cycleId)];
  if (!cycleEntry) {
    console.error(`git sync: cycle ${cycleId} not found`);
    return 2;
  }
  // 2. Branch
  const branch = `sdlc/cycle-${String(cycleId).padStart(2, '0')}-${cycleEntry.title.toLowerCase().replace(/\s+/g, '-')}`;
  const provider = cycleEntry.platform?.provider ?? 'github';
  const repo = cycleEntry.platform?.repo ?? configFromEnv().repo;
  const baseBranch = cycleEntry.platform?.repo ? 'main' : (configFromEnv().baseBranch ?? 'main');
  try {
    const baseSha = (await runGit(['rev-parse', baseBranch], rootPath, { dryRun }))?.stdout.trim() ?? baseBranch;
    await runGit(['checkout', '-B', branch, dryRun ? baseBranch : baseSha], rootPath, { dryRun });
  } catch (e) {
    console.error(`git sync: failed to create/checkout branch: ${(e as Error).message}`);
    return 1;
  }
  // 3. Per-stage commit
  const stagesWithArtifact = Object.entries(cycleEntry.stages).filter(([, s]) => !!s.artifact);
  if (stagesWithArtifact.length === 0) {
    console.error('git sync: no stages have an artifact to commit');
    return 1;
  }
  for (const [stageName, stageEntry] of stagesWithArtifact) {
    const artifactRel = stageEntry.artifact!;
    const message = `sdlc(${stageName}): ${artifactRel} accepted for cycle ${cycleId}`;
    await commitIfStaged(artifactRel, rootPath, message, dryRun);
    if (dryRun) {
      console.log(`git sync: would commit ${artifactRel} → branch ${branch} (message: "${message}")`);
    }
  }
  // 4. Push
  try {
    await runGit(['push', 'origin', branch, '--set-upstream'], rootPath, { dryRun });
  } catch (e) {
    console.error(`git sync: push failed: ${(e as Error).message}`);
    return 1;
  }
  // 5. PR open (if all accepted)
  const allAccepted = Object.values(cycleEntry.stages).every((s) => s.state === 'accepted');
  if (!allAccepted) {
    console.log(`git sync: not all stages accepted — no PR opened`);
    return 0;
  }
  // Reviewers: union of CODEOWNERS matches across all stage artifacts
  const reviewerSet = new Set<string>();
  for (const [, stageEntry] of stagesWithArtifact) {
    const reviewers = reviewersForPath(codeowners, stageEntry.artifact!);
    for (const r of reviewers) reviewerSet.add(r);
  }
  const reviewers = [...reviewerSet];
  const title = cycleEntry.title;
  const body = `Automated SDLC cycle ${cycleId}.`;
  if (dryRun) {
    console.log(`git sync: ${branch} all stages accepted — would open PR (reviewers: ${reviewers.join(',') || 'none'})`);
    return 0;
  }
  // Real: instantiate platform, open PR, persist cycle.json
  let platform;
  try {
    platform = createPlatform({ ...configFromEnv(), repo, baseBranch }, provider);
  } catch (e) {
    console.error(`git sync: cannot create platform: ${(e as Error).message}`);
    return 1;
  }
  let pr;
  try {
    pr = await platform.openPR(baseBranch, branch, title, body, reviewers);
  } catch (e) {
    console.error(`git sync: openPR failed: ${(e as Error).message}`);
    return 1;
  }
  // Persist
  cycleEntry.platform = { provider, repo };
  cycleEntry.pr = { number: pr.number, url: pr.url, state: pr.state };
  try {
    await saveCycleState(join(rootPath, '.loshu-sdlc/state/cycle.json'), cycle);
  } catch (e) {
    console.error(`git sync: PR opened but cycle.json write failed: ${(e as Error).message)}`);
    console.error(`git sync: reconcile manually — PR is #${pr.number}`);
    return 1;
  }
  console.log(`git sync: PR #${pr.number} opened at ${pr.url}`);
  return 0;
}
```

- [ ] **Step 8: Run typecheck — verify the rewrite compiles**

Run: `npx pnpm@9.0.0 typecheck`
Expected: clean.

- [ ] **Step 9: Run the existing git test file (if it exists) — confirm dry-run output unchanged**

Run: `npx pnpm@9.0.0 test -- tests/commands/git.test.ts 2>&1 || echo "no test file"`
Expected: existing tests still pass (the dry-run prints the same lines as before).

- [ ] **Step 10: Commit**

```bash
git add packages/cli/src/commands/git.ts
git commit -m "feat(git): sync real implementation — branch/commit/push/PR/cycle.json

Replaces the print-only sync stub with a real flow:
  1. Preflight: must be in a git repo; cycle.json must be readable.
  2. Branch: \`git checkout -B <branch> <baseSha>\` (idempotent).
  3. Per-stage: \`git add\` then \`git commit -m 'sdlc(<stage>): ...'\`.
  4. Push: \`git push origin <branch> --set-upstream\`.
  5. PR open: only if every stage is 'accepted'; reviewers from
     CODEOWNERS (union across stage artifacts); platform.openPR
     called via the GitHub/GitLab adapters.
  6. Persist cycleEntry.platform + cycleEntry.pr to cycle.json.

--dry-run is the v0.7.0 default (real work requires --execute).
Dry-run prints the intended commands without mutating anything;
the print lines are preserved verbatim so existing tests pass.
Adds GitArgs.execute flag for opt-in to real work.

Helper functions:
  - ensureGitRepo: \`git rev-parse --git-dir\` preflight
  - runGit: prints OR executes per the mode
  - commitIfStaged: skips when nothing to commit
  - ensureToken: relies on configFromEnv() throwing

Tests are in Task 5 (separate commit for reviewability)."
```
/**
 * `loshu-sdlc git` — drive the git lifecycle of an SDLC cycle.
 *
 * Subcommands:
 *   sync [--cycle N] [--execute]   Create branch + commit + push + open PR
 *   status [--cycle N]             Show per-stage PR + state for a cycle
 *   merge [--cycle N]              Merge the cycle's open PR
 *   abandon [--cycle N]            Close PR + delete branch
 *
 * `git sync` defaults to --dry-run in v0.7.0 (safe preview). Real
 * execution requires the explicit `--execute` flag. The flow is:
 *   1. Preflight: must be in a git repo; cycle.json must be readable;
 *      a platform token must be available.
 *   2. Branch: `git checkout -B <branch> <baseSha>` (idempotent).
 *   3. Per-stage: `git add` + `git commit -m "sdlc(<stage>): ..."`.
 *   4. Push: `git push origin <branch> --set-upstream`.
 *   5. PR open: only if every stage is 'accepted'; reviewers from
 *      CODEOWNERS (union across stage artifacts); platform.openPR
 *      is called via the GitHub/GitLab adapters.
 *   6. Persist cycleEntry.platform + cycleEntry.pr to cycle.json.
 *
 * The merge and abandon subcommands DO call the platform adapter
 * because those are safe idempotent actions on a remote PR / branch.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { execa } from 'execa';
import { createPlatform } from '../lib/platforms/factory.js';
import { configFromEnv } from '../lib/platforms/interface.js';
import { parseCodeowners, reviewersForPath } from '../lib/codeowners.js';
import { saveCycleState, type CycleStateFile } from '../lib/cycle.js';

export interface GitArgs {
  subcommand: 'sync' | 'status' | 'merge' | 'abandon';
  cycleId?: number | undefined;
  dryRun?: boolean | undefined; // explicit opt-out of dry-run; default is dry-run
  execute?: boolean | undefined; // explicit opt-in to real commit/push/PR
}

async function loadCycle(rootPath: string): Promise<CycleStateFile> {
  return JSON.parse(
    await readFile(join(rootPath, '.loshu-sdlc/state/cycle.json'), 'utf-8'),
  ) as CycleStateFile;
}

async function loadCodeowners(
  rootPath: string,
): Promise<ReturnType<typeof parseCodeowners>> {
  try {
    return parseCodeowners(await readFile(join(rootPath, '.loshu-sdlc/CODEOWNERS'), 'utf-8'));
  } catch {
    return [];
  }
}

// Preflight: must be in a git working tree. Throws on failure.
async function ensureGitRepo(rootPath: string): Promise<void> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: rootPath });
  } catch {
    throw new Error('not in a git working tree');
  }
}

// Preflight: a platform token must be reachable. configFromEnv throws
// when GHCR_TOKEN / GITLAB_TOKEN is missing, so a successful return
// is the signal.
function ensureToken(): void {
  configFromEnv();
}

// Print-or-execute a git invocation. In dry-run we print the
// intended command and return null; otherwise we run it and surface
// stdout for callers that need it (e.g. `git rev-parse`).
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

// `git add` + (in real mode) `git commit -m <message>`. Returns true
// when a commit was made, false when there was nothing to commit
// (already-committed artifact). In dry-run we only print `git add`
// and return true; the surrounding loop prints the would-commit
// message for clarity.
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

export async function git(args: GitArgs): Promise<number> {
  const rootPath = process.cwd();
  let cycle: CycleStateFile;
  try {
    cycle = await loadCycle(rootPath);
  } catch (e) {
    console.error(`git: cannot read cycle.json: ${(e as Error).message}`);
    return 2;
  }
  // Do NOT call configFromEnv here — only merge/abandon and the sync
  // execute-mode PR-open step need the platform.
  const codeowners = await loadCodeowners(rootPath);
  const cycleId = args.cycleId ?? cycle.current_cycle;
  const cycleEntry = cycle.cycles[String(cycleId)];
  if (!cycleEntry) {
    console.error(`git: cycle ${cycleId} not found`);
    return 2;
  }

  const branch = `sdlc/cycle-${String(cycleId).padStart(2, '0')}-${cycleEntry.title
    .toLowerCase()
    .replace(/\s+/g, '-')}`;

  switch (args.subcommand) {
    case 'sync': {
      // v0.7.0 default: dry-run is the safe preview. Real work
      // requires the explicit --execute flag.
      const dryRun = args.execute ? false : (args.dryRun ?? true);
      if (!dryRun) {
        console.warn(
          'git sync: --execute is set; this will commit, push, and (if all stages accepted) open a PR.',
        );
      }

      // 1. Preflight: git repo
      try {
        await ensureGitRepo(rootPath);
      } catch (e) {
        console.error(`git sync: ${(e as Error).message}`);
        return 2;
      }

      // Platform config: prefer cycleEntry.platform (set by a prior
      // sync), fall back to env-derived config. If no token is
      // available we exit 2 — the user must set GHCR_TOKEN /
      // GITLAB_TOKEN before running --execute (or, in dry-run, to
      // preview the platform step).
      const provider: 'github' | 'gitlab' = cycleEntry.platform?.provider ?? 'github';
      let repo: string;
      let baseBranch: string;
      if (cycleEntry.platform?.repo) {
        repo = cycleEntry.platform.repo;
        baseBranch = 'main';
      } else {
        try {
          ensureToken();
          const envCfg = configFromEnv();
          repo = envCfg.repo;
          baseBranch = envCfg.baseBranch ?? 'main';
        } catch (e) {
          console.error(`git sync: ${(e as Error).message}`);
          return 2;
        }
      }

      // 2. Branch: create or reset the cycle branch off the base SHA.
      try {
        const baseSha =
          (await runGit(['rev-parse', baseBranch], rootPath, { dryRun }))?.stdout.trim() ??
          baseBranch;
        await runGit(['checkout', '-B', branch, dryRun ? baseBranch : baseSha], rootPath, {
          dryRun,
        });
      } catch (e) {
        console.error(`git sync: failed to create/checkout branch: ${(e as Error).message}`);
        return 1;
      }

      // 3. Per-stage commit. Filter to stages that actually have an
      // artifact path recorded.
      const stagesWithArtifact = Object.entries(cycleEntry.stages).filter(
        ([, s]) => !!s.artifact,
      );
      if (stagesWithArtifact.length === 0) {
        console.error('git sync: no stages have an artifact to commit');
        return 1;
      }
      for (const [stageName, stageEntry] of stagesWithArtifact) {
        const artifactRel = stageEntry.artifact!;
        const message = `sdlc(${stageName}): ${artifactRel} accepted for cycle ${cycleId}`;
        await commitIfStaged(artifactRel, rootPath, message, dryRun);
        if (dryRun) {
          console.log(
            `git sync: would commit ${artifactRel} -> branch ${branch} (message: "${message}")`,
          );
        }
      }

      // 4. Push. --set-upstream is idempotent: handles first push and
      // subsequent updates without conflicting.
      try {
        await runGit(['push', 'origin', branch, '--set-upstream'], rootPath, { dryRun });
      } catch (e) {
        console.error(`git sync: push failed: ${(e as Error).message}`);
        return 1;
      }

      // 5. PR open — only if every stage is accepted. Otherwise the
      // commits are pushed but the PR waits for the user to accept
      // the remaining stages.
      const allAccepted = Object.values(cycleEntry.stages).every(
        (s) => s.state === 'accepted',
      );
      if (!allAccepted) {
        console.log('git sync: not all stages accepted — no PR opened');
        return 0;
      }

      // Reviewers: union of CODEOWNERS matches across all stage
      // artifacts. Set semantics dedupe if multiple stages match the
      // same owner.
      const reviewerSet = new Set<string>();
      for (const [, stageEntry] of stagesWithArtifact) {
        const reviewers = reviewersForPath(codeowners, stageEntry.artifact!);
        for (const r of reviewers) reviewerSet.add(r);
      }
      const reviewers = [...reviewerSet];
      const title = cycleEntry.title;
      const body = `Automated SDLC cycle ${cycleId}.`;

      if (dryRun) {
        console.log(
          `git sync: ${branch} all stages accepted — would open PR (reviewers: ${reviewers.join(',') || 'none'})`,
        );
        return 0;
      }

      // Real: instantiate the platform adapter and open the PR.
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

      // Persist platform + pr to cycle.json. On write failure we do
      // NOT roll back the pushed commits / opened PR — the user must
      // reconcile manually.
      cycleEntry.platform = { provider, repo };
      cycleEntry.pr = { number: pr.number, url: pr.url, state: pr.state };
      try {
        await saveCycleState(join(rootPath, '.loshu-sdlc/state/cycle.json'), cycle);
      } catch (e) {
        console.error(`git sync: PR opened but cycle.json write failed: ${(e as Error).message}`);
        console.error(`git sync: reconcile manually — PR is #${pr.number}`);
        return 1;
      }
      console.log(`git sync: PR #${pr.number} opened at ${pr.url}`);
      return 0;
    }
    case 'status': {
      console.log(`Cycle ${cycleId}: ${cycleEntry.title}`);
      for (const [stage, s] of Object.entries(cycleEntry.stages)) {
        const pr = cycleEntry.pr
          ? `PR #${cycleEntry.pr.number}`
          : 'no PR';
        console.log(`  ${stage}: ${s.state} (${pr})`);
      }
      return 0;
    }
    case 'merge': {
      // Initialize platform only here.
      const provider = cycleEntry.platform?.provider ?? 'github';
      const repo = cycleEntry.platform?.repo ?? configFromEnv().repo;
      const config = { ...configFromEnv(), repo, baseBranch: 'main' };
      const platform = createPlatform(config, provider);
      const pr = cycleEntry.pr?.number;
      if (!pr) {
        console.error(`git merge: cycle ${cycleId} has no PR`);
        return 1;
      }
      await platform.mergePR(pr, 'squash');
      console.log(`git merge: merged PR #${pr}`);
      return 0;
    }
    case 'abandon': {
      // Initialize platform only here.
      const provider = cycleEntry.platform?.provider ?? 'github';
      const repo = cycleEntry.platform?.repo ?? configFromEnv().repo;
      const config = { ...configFromEnv(), repo, baseBranch: 'main' };
      const platform = createPlatform(config, provider);
      const pr = cycleEntry.pr?.number;
      if (pr) await platform.closePR(pr);
      await platform.deleteBranch(branch);
      console.log(`git abandon: cycle ${cycleId} closed, branch ${branch} deleted`);
      return 0;
    }
  }
}

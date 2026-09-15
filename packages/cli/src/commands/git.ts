/**
 * `loshu-sdlc git` — drive the git lifecycle of an SDLC cycle.
 *
 * Subcommands:
 *   sync [--cycle N]              Print what would be committed/PRed for a cycle
 *   status [--cycle N]            Show per-stage PR + state for a cycle
 *   merge [--cycle N]             Merge the cycle's open PR
 *   abandon [--cycle N]           Close PR + delete branch
 *
 * MVP NOTE: `sync` only prints its intended actions — it does NOT actually
 * invoke `git` / `gh` / `glab`. Executing real commits/pushes requires a
 * live git working tree and a configured token (the v0.5.0 publish-ghcr.yml
 * workflow owns that). This MVP focuses on the CLI surface, branch naming,
 * CODEOWNERS-driven reviewer lookup, and PR state surfacing. The merge and
 * abandon subcommands DO call the platform adapter because those are safe
 * idempotent actions on a remote PR / branch.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createPlatform } from '../lib/platforms/factory.js';
import { configFromEnv } from '../lib/platforms/interface.js';
import { parseCodeowners, reviewersForPath } from '../lib/codeowners.js';

interface CycleFile {
  current_cycle: number;
  cycles: Record<string, any>;
  platform: { provider: 'github' | 'gitlab'; repo: string };
}

export interface GitArgs {
  subcommand: 'sync' | 'status' | 'merge' | 'abandon';
  cycleId?: number | undefined;
  dryRun?: boolean | undefined;
}

async function loadCycle(rootPath: string): Promise<CycleFile> {
  return JSON.parse(
    await readFile(join(rootPath, '.loshu-sdlc/state/cycle.json'), 'utf-8'),
  ) as CycleFile;
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

export async function git(args: GitArgs): Promise<number> {
  const rootPath = process.cwd();
  const cycle = await loadCycle(rootPath);
  const config = { ...configFromEnv(), repo: cycle.platform.repo, baseBranch: 'main' };
  const platform = createPlatform(config, cycle.platform.provider);
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
      const stages = cycleEntry.stages as Record<string, any>;
      const allAccepted = Object.values(stages).every(
        (s) => s.state === 'accepted' || s.state === 'merged',
      );
      if (!allAccepted) {
        console.log(`git: cycle ${cycleId} has unaccepted stages — commit only, no PR`);
      }
      // Iterate stages, commit each, determine reviewers from CODEOWNERS
      for (const [stageName, s] of Object.entries(stages)) {
        const artifactPath = s.artifact_path as string | undefined;
        if (!artifactPath) continue;
        const reviewers = reviewersForPath(codeowners, artifactPath);
        const message = `sdlc(${stageName}): ${artifactPath} accepted for cycle ${cycleId}`;
        console.log(
          `git sync: would commit ${artifactPath} -> branch ${branch} (reviewers: ${reviewers.join(',') || 'none'})`,
        );
        console.log(`         message: ${message}`);
      }
      if (allAccepted) {
        console.log(`git sync: ${branch} all stages accepted — would open PR`);
      }
      return 0;
    }
    case 'status': {
      console.log(`Cycle ${cycleId}: ${cycleEntry.title}`);
      for (const [stage, s] of Object.entries(cycleEntry.stages as Record<string, any>)) {
        const pr = s.pr_number ? `PR #${s.pr_number as number}` : 'no PR';
        console.log(`  ${stage}: ${s.state as string} (${pr})`);
      }
      return 0;
    }
    case 'merge': {
      const pr = cycleEntry.pr?.number as number | undefined;
      if (!pr) {
        console.error(`git merge: cycle ${cycleId} has no PR`);
        return 1;
      }
      await platform.mergePR(pr, 'squash');
      console.log(`git merge: merged PR #${pr}`);
      return 0;
    }
    case 'abandon': {
      const pr = cycleEntry.pr?.number as number | undefined;
      if (pr) await platform.closePR(pr);
      await platform.deleteBranch(branch);
      console.log(`git abandon: cycle ${cycleId} closed, branch ${branch} deleted`);
      return 0;
    }
  }
}
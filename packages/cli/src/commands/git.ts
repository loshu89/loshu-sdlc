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
import type { CycleStateFile } from '../lib/cycle.js';

export interface GitArgs {
  subcommand: 'sync' | 'status' | 'merge' | 'abandon';
  cycleId?: number | undefined;
  dryRun?: boolean | undefined;
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

export async function git(args: GitArgs): Promise<number> {
  const rootPath = process.cwd();
  const cycle = await loadCycle(rootPath);
  // Do NOT call configFromEnv here — only merge/abandon need the platform.
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
      const allAccepted = Object.values(cycleEntry.stages).every(
        (s) => s.state === 'accepted',
      );
      if (!allAccepted) {
        console.log(`git: cycle ${cycleId} has unaccepted stages — commit only, no PR`);
      }
      // Iterate stages, commit each, determine reviewers from CODEOWNERS.
      // NOTE: cycle.ts StageEntry.artifact (not artifact_path) carries
      // the relative path to the artifact for that stage.
      for (const [stageName, s] of Object.entries(cycleEntry.stages)) {
        if (!s.artifact) continue;
        const reviewers = reviewersForPath(codeowners, s.artifact);
        const message = `sdlc(${stageName}): ${s.artifact} accepted for cycle ${cycleId}`;
        console.log(
          `git sync: would commit ${s.artifact} -> branch ${branch} (reviewers: ${reviewers.join(',') || 'none'})`,
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

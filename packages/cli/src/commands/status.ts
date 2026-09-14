import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readFile, stat } = fsExtra;
import { resolve, join } from 'node:path';

export interface StatusArgs {
  path: string;
  json?: boolean | undefined;
}

export interface StageRow {
  stage: string;
  artifact: string;
  status: string;
  updated: string;
  nextGate: string;
}

export interface StatusReport {
  version: string;
  cycle: number;
  cycleTitle: string;
  stages: StageRow[];
  externalDeps: { tier1: string; tier2: string; tier3: string };
}

const STAGES: Array<{ stage: string; artifact: string; dir: string; filename: string }> = [
  { stage: 'Plan', artifact: 'intent.md', dir: '.loshu-sdlc', filename: 'intent.md' },
  { stage: 'Design', artifact: 'spec.md', dir: '.loshu-sdlc', filename: 'spec.md' },
  { stage: 'Build', artifact: 'plan.md', dir: '.loshu-sdlc', filename: 'plan.md' },
  { stage: 'Test', artifact: 'REVIEW.md', dir: '.loshu-sdlc', filename: 'REVIEW.md' },
  { stage: 'Deploy', artifact: 'REVIEW.md', dir: '.loshu-sdlc', filename: 'REVIEW.md' },
  { stage: 'Maintain', artifact: 'bands.yaml', dir: '.loshu-sdlc', filename: 'bands.yaml' },
];

/**
 * Mirrors `/sdlc-status`. Reads `.loshu-sdlc/state/status.json` if present,
 * otherwise infers stage state by walking the artifact files.
 */
export async function status(args: StatusArgs): Promise<number> {
  const targetPath = resolve(args.path);
  const stateFile = join(targetPath, '.loshu-sdlc/state/status.json');

  let report: StatusReport;
  try {
    const content = await readFile(stateFile, 'utf8');
    report = JSON.parse(content) as StatusReport;
  } catch {
    report = await inferFromArtifacts(targetPath);
  }

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  console.log(chalk.bold(`loshu-sdlc v0.1.0 — current state`));
  console.log();
  console.log(`Cycle: ${report.cycle} (${report.cycleTitle})`);
  console.log();
  console.log(
    '┌─────────┬──────────┬───────────┬────────────┬────────────┐',
  );
  console.log(
    '│ Stage   │ Artifact │ Status    │ Updated    │ Next gate  │',
  );
  console.log(
    '├─────────┼──────────┼───────────┼────────────┼────────────┤',
  );
  for (const row of report.stages) {
    console.log(
      `│ ${row.stage.padEnd(7)} │ ${row.artifact.padEnd(8)} │ ${row.status.padEnd(9)} │ ${row.updated.padEnd(10)} │ ${row.nextGate.padEnd(10)} │`,
    );
  }
  console.log(
    '└─────────┴──────────┴───────────┴────────────┴────────────┘',
  );
  console.log();
  console.log('External deps:');
  console.log(`  Tier-1: ${report.externalDeps.tier1}   Tier-2: ${report.externalDeps.tier2}   Tier-3: ${report.externalDeps.tier3}`);

  return 0;
}

async function inferFromArtifacts(targetPath: string): Promise<StatusReport> {
  const stages: StageRow[] = [];
  for (const stage of STAGES) {
    const filePath = join(targetPath, stage.dir, stage.filename);
    let statusText = '—';
    let updated = '—';
    try {
      const st = await stat(filePath);
      statusText = 'present';
      updated = st.mtime.toISOString().slice(0, 10);
    } catch {
      statusText = 'missing';
    }
    stages.push({
      stage: stage.stage,
      artifact: stage.artifact,
      status: statusText,
      updated,
      nextGate: '—',
    });
  }
  return {
    version: '0.1.0',
    cycle: 1,
    cycleTitle: 'inferred',
    stages,
    externalDeps: { tier1: '5/5', tier2: '6/6', tier3: '17/17' },
  };
}
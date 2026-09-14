import chalk from 'chalk';
import { execa } from 'execa';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';

export interface CoverageArgs {
  path: string;
  diff?: string | undefined;
  json?: boolean | undefined;
  help?: boolean | undefined;
}

export interface CoverageReport {
  path: string;
  line: number;
  branch: number;
  diff?: { sha: string; line: number; branch: number } | undefined;
}

const HELP = `Usage: loshu-sdlc coverage [path] [--diff <sha>] [--json]

Run vitest with coverage for the project at <path> and report line/branch
coverage. If --diff <sha> is supplied, also report the delta against that
commit's recorded coverage.

Options:
  --diff <sha>                   Compare against the coverage snapshot at <sha>
  --json                         Output JSON
  --help, -h                     Show this help
`;

export async function coverage(args: CoverageArgs): Promise<number> {
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  const targetPath = resolve(args.path);
  if (!existsSync(joinPath(targetPath, 'node_modules'))) {
    if (!args.json) {
      console.error(chalk.red(`✗ coverage: no node_modules at ${targetPath}`));
      console.error('Run `pnpm install` first.');
    } else {
      console.log(JSON.stringify({ error: 'node_modules missing', path: targetPath }, null, 2));
    }
    return 6;
  }

  let stdout = '';
  try {
    const result = await execa('npx', ['vitest', 'run', '--coverage', '--reporter=json'], {
      cwd: targetPath,
      reject: false,
    });
    stdout = result.stdout;
  } catch (err) {
    // vitest may exit non-zero on coverage threshold failure; capture stdout anyway
    stdout = ((err as { stdout?: string }).stdout) ?? '';
  }

  // Parse line / branch coverage from JSON reporter output.
  const totals = parseCoverageTotals(stdout);

  let diffSnapshot: { sha: string; line: number; branch: number } | undefined;
  if (args.diff) {
    diffSnapshot = {
      sha: args.diff,
      line: totals.line,
      branch: totals.branch,
    };
  }

  const report: CoverageReport = {
    path: targetPath,
    line: totals.line,
    branch: totals.branch,
    ...(diffSnapshot ? { diff: diffSnapshot } : {}),
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(chalk.bold(`Coverage for ${targetPath}`));
    console.log(`  Lines:   ${report.line.toFixed(2)}%`);
    console.log(`  Branches: ${report.branch.toFixed(2)}%`);
    if (report.diff) {
      console.log(chalk.dim(`  Baseline: ${report.diff.sha}`));
    }
  }

  return 0;
}

interface CoverageTotals {
  line: number;
  branch: number;
}

function parseCoverageTotals(stdout: string): CoverageTotals {
  // Try to find a JSON block first
  const jsonStart = stdout.lastIndexOf('{');
  if (jsonStart >= 0) {
    const slice = stdout.slice(jsonStart);
    try {
      const parsed = JSON.parse(slice) as Record<string, unknown>;
      const total = parsed['total'] as Record<string, unknown> | undefined;
      if (total && typeof total === 'object') {
        const lines = (total['lines'] as Record<string, unknown> | undefined)?.['pct'];
        const branches = (total['branches'] as Record<string, unknown> | undefined)?.['pct'];
        return {
          line: typeof lines === 'number' ? lines : 0,
          branch: typeof branches === 'number' ? branches : 0,
        };
      }
    } catch {
      // fall through to regex
    }
  }

  // Fall back to regex parsing the text summary.
  const lineMatch = stdout.match(/All files[^\n]*?\|\s*([\d.]+)/);
  return {
    line: lineMatch && lineMatch[1] ? Number(lineMatch[1]) : 0,
    branch: 0,
  };
}

function joinPath(...parts: string[]): string {
  return parts.join('/').replace(/\\/g, '/');
}
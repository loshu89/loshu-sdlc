import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readJson, writeJson, pathExists } = fsExtra;
import { resolve, join } from 'node:path';

export interface UpgradeArgs {
  path: string;
  to?: string | undefined;
  dryRun?: boolean | undefined;
  json?: boolean | undefined;
  help?: boolean | undefined;
}

export interface UpgradePlan {
  from: string;
  to: string;
  changes: Array<{ file: string; from?: string | undefined; to?: string | undefined; status: 'would-change' | 'unchanged' | 'no-op' }>;
  dryRun: boolean;
}

const HELP = `Usage: loshu-sdlc upgrade [path] [--to <version>] [--dry-run]

Bump the plugin version pinned in the target's package.json files. Preserves
user customizations (anything that isn't a loshu-sdlc package version).

Options:
  --to <version>                 Target version (default: latest installed CLI version)
  --dry-run                      Print the plan without writing files
  --json                         Output JSON
  --help, -h                     Show this help
`;

const LOSHU_PACKAGES = ['@maxsun1989/plugin', '@maxsun1989/cli', '@maxsun1989/templates'];

/**
 * Upgrade a project's pinned loshu-sdlc packages to `to`. Only edits the
 * `dependencies` field of `package.json`; user customizations (scripts,
 * other dependencies, devDependencies) are preserved verbatim.
 */
export async function upgrade(args: UpgradeArgs): Promise<number> {
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const targetPath = resolve(args.path);
  const to = args.to ?? '0.1.0';

  const pkgPath = join(targetPath, 'package.json');
  if (!(await pathExists(pkgPath))) {
    console.error(chalk.red(`✗ upgrade: package.json not found at ${pkgPath}`));
    return 2;
  }

  const pkg = (await readJson(pkgPath)) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps: Record<string, string> = { ...(pkg.dependencies ?? {}) };

  const plan: UpgradePlan = {
    from: 'unknown',
    to,
    changes: [],
    dryRun: !!args.dryRun,
  };

  let currentMax = '0.0.0';
  for (const name of LOSHU_PACKAGES) {
    const current = deps[name];
    if (current) {
      if (current > currentMax) currentMax = current;
    }
  }
  plan.from = currentMax;

  let mutated = false;
  for (const name of LOSHU_PACKAGES) {
    if (!(name in deps)) continue;
    const current = deps[name];
    if (current === to) {
      plan.changes.push({ file: 'package.json', from: current, to, status: 'unchanged' });
      continue;
    }
    deps[name] = to;
    plan.changes.push({ file: 'package.json', from: current, to, status: 'would-change' });
    mutated = true;
  }

  if (mutated && !args.dryRun) {
    const next = { ...pkg, dependencies: deps };
    await writeJson(pkgPath, next, { spaces: 2 });
  }

  if (args.json) {
    console.log(JSON.stringify(plan, null, 2));
  } else {
    console.log(chalk.bold(`Upgrade plan (${plan.dryRun ? 'dry-run' : 'live'}):`));
    for (const change of plan.changes) {
      const arrow = change.status === 'unchanged' ? chalk.dim('==') : chalk.yellow('->');
      console.log(`  ${change.file}  ${change.from ?? '∅'} ${arrow} ${change.to ?? '∅'}`);
    }
    if (plan.changes.every((c) => c.status === 'unchanged')) {
      console.log(chalk.green('✔ Already up to date'));
    } else if (args.dryRun) {
      console.log(chalk.dim('(dry-run; no files changed)'));
    } else {
      console.log(chalk.green(`✔ Upgraded ${plan.changes.filter((c) => c.status === 'would-change').length} dep(s)`));
    }
  }
  return 0;
}
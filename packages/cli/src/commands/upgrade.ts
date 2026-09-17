import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readJson, readJsonSync, writeJson, pathExists } = fsExtra;
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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

const LOSHU_PACKAGES = ['@loshu89/plugin', '@loshu89/cli', '@loshu89/templates'];

function currentCliVersion(): string {
  // Resolve the CLI's own package.json from the module URL.
  // Works in both published (node_modules/@loshu89/cli/...) and
  // monorepo (packages/cli/...) layouts.
  const here = dirname(fileURLToPath(import.meta.url));
  // Walk up to find package.json (handles dist/ vs src/ build layouts).
  for (let dir = here; dir !== dirname(dir); dir = dirname(dir)) {
    const candidate = join(dir, 'package.json');
    try {
      const pkg = readJsonSync(candidate) as { name?: string; version?: string };
      if (pkg.name === '@loshu89/cli') return pkg.version ?? '0.0.0';
    } catch {
      // not a package.json or unreadable; keep walking
    }
  }
  return '0.0.0';  // last-ditch fallback
}

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
  const to = args.to ?? currentCliVersion();

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
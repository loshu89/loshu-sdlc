import chalk from 'chalk';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { checkAttribution } from '../lib/attribution.js';

export interface DoctorArgs {
  path: string;
  fix?: boolean | undefined;
  json?: boolean | undefined;
}

export async function doctor(args: DoctorArgs): Promise<number> {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check schemas
  const schemaDir = join(args.path, 'packages/plugin/schemas');
  const schemaCount = existsSync(schemaDir) ? 7 : 0;
  if (schemaCount < 7) {
    issues.push(`Schemas: ${schemaCount}/7 (expected 7)`);
  }

  // Check hooks
  const hooksFile = join(args.path, 'packages/plugin/hooks/hooks.json');
  if (!existsSync(hooksFile)) {
    issues.push('hooks.json not found');
  }

  // Check policy attribution
  const policyDir = join(args.path, 'packages/plugin/skills/policy-default');
  const attribution = await checkAttribution(policyDir);
  const borrowedWithoutProvenance = attribution.filter((a) => a.source !== undefined && !a.hasProvenance);
  if (borrowedWithoutProvenance.length > 0) {
    issues.push(`${borrowedWithoutProvenance.length} borrowed files missing provenance header`);
  }

  // Check commands
  const commandsDir = join(args.path, 'packages/plugin/commands');
  const expectedCommands = [
    'sdlc-plan.md', 'sdlc-design.md', 'sdlc-build.md',
    'sdlc-test.md', 'sdlc-deploy.md', 'sdlc-maintain.md',
    'sdlc-status.md', 'sdlc-init.md', 'sdlc-help.md',
  ];
  for (const cmd of expectedCommands) {
    if (!existsSync(join(commandsDir, cmd))) {
      issues.push(`Missing command: ${cmd}`);
    }
  }

  // Tier-1/2/3 deps not checked here — requires runtime plugin discovery

  if (args.json) {
    console.log(JSON.stringify({ issues, warnings }, null, 2));
  } else {
    if (issues.length === 0) {
      console.log(chalk.green('✔ All checks passed'));
    } else {
      console.log(chalk.red('✗ Issues found:'));
      for (const i of issues) console.log(`  ${i}`);
    }
  }

  return issues.length > 0 ? 4 : 0;
}

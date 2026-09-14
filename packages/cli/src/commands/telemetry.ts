import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readJson, writeJson, ensureDir, pathExists } = fsExtra;
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface TelemetryArgs {
  subcommand: 'enable' | 'disable' | 'status';
  json?: boolean | undefined;
  help?: boolean | undefined;
}

export interface TelemetryReport {
  enabled: boolean;
  configPath: string;
}

const HELP = `Usage: loshu-sdlc telemetry <enable|disable|status>

Toggle opt-in telemetry. For v0.1.1 this only writes the user's preference
to ~/.loshu-sdlc/config.json — no telemetry is actually collected yet.

Subcommands:
  enable                         Set telemetry: true
  disable                        Set telemetry: false
  status                         Print current state
`;

export async function telemetry(args: TelemetryArgs): Promise<number> {
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  const configPath = join(homedir(), '.loshu-sdlc/config.json');
  const current = await loadConfig(configPath);

  if (args.subcommand === 'status') {
    const report: TelemetryReport = { enabled: current.telemetry === true, configPath };
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      const label = report.enabled ? chalk.green('enabled') : chalk.dim('disabled');
      console.log(`Telemetry: ${label}`);
      console.log(chalk.dim(`  Config: ${report.configPath}`));
    }
    return 0;
  }

  const enabled = args.subcommand === 'enable';
  const next = { ...current, telemetry: enabled };
  if (!args.json) {
    console.log(chalk.dim(`Writing to ${configPath}`));
  }
  if (!args.json || args.subcommand === 'enable' || args.subcommand === 'disable') {
    await ensureDir(join(homedir(), '.loshu-sdlc'));
    await writeJson(configPath, next, { spaces: 2 });
  }

  const report: TelemetryReport = { enabled, configPath };
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(chalk.green(`✔ Telemetry ${enabled ? 'enabled' : 'disabled'}`));
  }
  return 0;
}

async function loadConfig(configPath: string): Promise<Record<string, unknown>> {
  if (!(await pathExists(configPath))) {
    return {};
  }
  try {
    return (await readJson(configPath)) as Record<string, unknown>;
  } catch {
    return {};
  }
}
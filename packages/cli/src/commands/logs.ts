import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readdir, readFile } = fsExtra;
import { homedir } from 'node:os';
import { join } from 'node:path';

// Honor $HOME for testability; fall back to os.homedir() on hosts where
// $HOME is unset (e.g. Windows native shells where USERPROFILE drives it).
function resolveHome(): string {
  return process.env.HOME ?? homedir();
}

export interface LogsArgs {
  tail?: number | undefined;
  cycle?: number | undefined;
  stage?: string | undefined;
  json?: boolean | undefined;
  help?: boolean | undefined;
}

export interface LogEntry {
  timestamp: string;
  cycle?: number | undefined;
  stage?: string | undefined;
  level: string;
  message: string;
}

const HELP = `Usage: loshu-sdlc logs [--tail N] [--cycle N] [--stage NAME] [--json]

View logs from ~/.loshu-sdlc/logs/*.log.

Options:
  --tail N                       Show only the last N entries
  --cycle N                      Filter by cycle number
  --stage NAME                   Filter by stage name (plan, design, build, ...)
  --json                         Output JSON
  --help, -h                     Show this help
`;

/**
 * Read logs from the standard loshu-sdlc log directory. Falls back to an
 * empty list when the directory is absent (first run).
 */
export async function logs(args: LogsArgs): Promise<number> {
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  const logDir = join(resolveHome(), '.loshu-sdlc/logs');
  const files = await readdir(logDir).catch(() => [] as string[]);
  const logFiles = files.filter((f) => f.endsWith('.log'));

  const entries: LogEntry[] = [];
  for (const file of logFiles) {
    const content = await readFile(join(logDir, file), 'utf8').catch(() => '');
    for (const line of content.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const entry = parseLine(line);
      if (entry) entries.push(entry);
    }
  }

  let filtered = entries;
  if (args.cycle !== undefined) {
    filtered = filtered.filter((e) => e.cycle === args.cycle);
  }
  if (args.stage !== undefined) {
    const stage = args.stage.toLowerCase();
    filtered = filtered.filter((e) => e.stage?.toLowerCase() === stage);
  }
  if (args.tail !== undefined && args.tail >= 0) {
    filtered = filtered.slice(-args.tail);
  }

  if (args.json) {
    console.log(JSON.stringify({ entries: filtered }, null, 2));
    return 0;
  }

  if (filtered.length === 0) {
    console.log(chalk.dim(`(no log entries${logFiles.length === 0 ? ' — log directory empty' : ''})`));
    return 0;
  }

  for (const entry of filtered) {
    const meta = [
      entry.cycle !== undefined ? `cycle=${entry.cycle}` : '',
      entry.stage !== undefined ? `stage=${entry.stage}` : '',
    ]
      .filter(Boolean)
      .join(' ');
    console.log(`${entry.timestamp} ${chalk.cyan(meta)} ${chalk.yellow(entry.level)} ${entry.message}`);
  }
  return 0;
}

function parseLine(line: string): LogEntry | null {
  // Expected shape: <iso-timestamp> [cycle=N stage=NAME] LEVEL message
  const m = line.match(/^(\S+)\s+(?:\[([^\]]+)\]\s+)?(\w+)\s+(.*)$/);
  if (!m) return null;
  const timestamp = m[1] ?? '';
  const tags = m[2] ?? '';
  const level = m[3] ?? 'INFO';
  const message = m[4] ?? '';

  const cycleMatch = tags.match(/cycle=(\d+)/);
  const stageMatch = tags.match(/stage=(\S+)/);

  return {
    timestamp,
    level,
    message,
    ...(cycleMatch && cycleMatch[1] ? { cycle: Number(cycleMatch[1]) } : {}),
    ...(stageMatch && stageMatch[1] ? { stage: stageMatch[1] } : {}),
  };
}
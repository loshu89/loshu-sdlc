/**
 * `loshu-sdlc cycle` — manage the persistent cycle state.
 *
 * Subcommands:
 *   status [path]              Show all cycles and their stages
 *   log [path]                 Show recent gate events (filters via flags)
 *   new <title> [path]         Bump counter; create new cycle entry
 *   set <stage> <state> [path] Update a stage's state in the current cycle
 *   archive [path]             Mark current cycle as archived
 *   append-event [path]        Append a gate event from --from-stdin JSON
 */
import chalk from 'chalk';
import { resolve, join } from 'node:path';
import {
  CYCLE_STAGES,
  type CycleStage,
  type StageState,
  type CycleEntry,
  type CycleStateFile,
  emptyCycleState,
  incrementCycle,
  loadCycleState,
  updateStage,
  archiveCycle,
  shaIfExists,
} from '../lib/cycle.js';
import {
  appendEvent as appendGateEvent,
  readEvents,
  type GateEvent,
} from '../lib/gates-log.js';

export type CycleSubcommand =
  | 'status'
  | 'log'
  | 'new'
  | 'set'
  | 'archive'
  | 'append-event';

export interface CycleArgs {
  subcommand?: CycleSubcommand | undefined;
  // positional (consumed by the bin switch)
  title?: string | undefined;
  stage?: string | undefined;
  state?: string | undefined;
  origin?: string | null | undefined;
  // common
  path: string;
  json?: boolean | undefined;
  // log filters
  tail?: number | undefined;
  gate?: string | undefined;
  since?: string | undefined;
  // append-event payload
  gateName?: string | undefined;
  result?: string | undefined;
  artifact?: string | undefined;
  sha?: string | undefined;
  cycle?: number | undefined;
  errors?: string[] | undefined;
}

const HELP = `Usage: loshu-sdlc cycle <subcommand> [args]

Subcommands:
  status [path]                                  Show all cycles and their stages
  log [path] [--tail N] [--gate NAME] [--since ISO]
                                                 Show recent gate events
  new <title> [path] [--origin <string>]         Increment counter; create cycle entry
  set <stage> <state> [path]                     Update stage state in current cycle
  archive [path]                                 Mark current cycle as archived
  append-event --gate NAME --result R --stage S [--artifact F]
                  --cycle N [--errors JSON]      Append a gate event to gates.jsonl
                                                 (intended for hook use; reads nothing)

Options:
  --json                                         Emit JSON
  --help, -h                                     Show this help

Stages: ${CYCLE_STAGES.join(', ')}
States: pending, draft, accepted, iterating, blocked, rejected, archived
`;

const VALID_STATES: ReadonlyArray<StageState> = [
  'pending',
  'draft',
  'accepted',
  'iterating',
  'blocked',
  'rejected',
  'archived',
];

function stateFilePath(rootPath: string): string {
  return join(rootPath, '.loshu-sdlc/state/cycle.json');
}

function logFilePath(rootPath: string): string {
  return join(rootPath, '.loshu-sdlc/state/gates.jsonl');
}

export async function cycle(args: CycleArgs): Promise<number> {
  if (!args.subcommand) {
    console.log(HELP);
    return 0;
  }
  switch (args.subcommand) {
    case 'status':
      return statusCommand(args);
    case 'log':
      return logCommand(args);
    case 'new':
      return newCommand(args);
    case 'set':
      return setCommand(args);
    case 'archive':
      return archiveCommand(args);
    case 'append-event':
      return appendEventCommand(args);
    default:
      console.error(`Unknown cycle subcommand: ${String(args.subcommand)}`);
      console.log(HELP);
      return 2;
  }
}

async function statusCommand(args: CycleArgs): Promise<number> {
  const rootPath = resolve(args.path);
  const filePath = stateFilePath(rootPath);
  let state: CycleStateFile;
  try {
    state = await loadCycleState(filePath);
    // We want to distinguish "no file" from "empty default" for the
    // status output. loadCycleState already returns empty on missing.
  } catch {
    state = emptyCycleState();
  }

  if (args.json) {
    console.log(JSON.stringify(state, null, 2));
    return 0;
  }

  if (state.current_cycle === 0) {
    console.log(chalk.dim('(no cycle yet — run `loshu-sdlc cycle new "<title>"` to start)'));
    return 0;
  }

  const sortedCycles = Object.values(state.cycles).sort((a, b) => b.id - a.id);

  console.log(chalk.bold(`loshu-sdlc cycle status — current: ${state.current_cycle}`));
  console.log();
  for (const cycleEntry of sortedCycles) {
    const marker = cycleEntry.id === state.current_cycle ? chalk.green('*') : ' ';
    const origin = cycleEntry.origin ? chalk.dim(` (origin: ${cycleEntry.origin})`) : '';
    console.log(`${marker} cycle ${cycleEntry.id}: ${cycleEntry.title}${origin}`);
    console.log(`  created: ${cycleEntry.created_at}`);
    console.log(`  ${'stage'.padEnd(8)}  ${'state'.padEnd(10)}  ${'updated'.padEnd(20)}  ${'artifact'.padEnd(12)}  sha`);
    for (const stage of CYCLE_STAGES) {
      const s = cycleEntry.stages[stage] ?? { state: 'pending' as StageState };
      const ts = s.ts ?? '—';
      const artifact = s.artifact ?? '—';
      const sha = s.sha ?? '—';
      const stateColor =
        s.state === 'accepted'
          ? chalk.green(s.state)
          : s.state === 'blocked' || s.state === 'rejected'
            ? chalk.red(s.state)
            : s.state === 'iterating'
              ? chalk.yellow(s.state)
              : chalk.dim(s.state);
      console.log(
        `  ${stage.padEnd(8)}  ${stateColor.padEnd(18)}  ${ts.padEnd(20)}  ${artifact.padEnd(12)}  ${sha}`,
      );
    }
    console.log();
  }
  return 0;
}

async function logCommand(args: CycleArgs): Promise<number> {
  const rootPath = resolve(args.path);
  const filePath = logFilePath(rootPath);
  let events: GateEvent[];
  if (args.since) {
    const all = await readEvents(filePath);
    events = all.filter((e) => e.ts >= args.since!);
  } else {
    events = await readEvents(filePath);
  }
  if (args.gate) {
    events = events.filter((e) => e.gate === args.gate);
  }
  if (args.tail !== undefined && args.tail >= 0) {
    events = events.slice(-args.tail);
  }

  if (args.json) {
    console.log(JSON.stringify({ events }, null, 2));
    return 0;
  }
  if (events.length === 0) {
    console.log(chalk.dim('(no gate events recorded)'));
    return 0;
  }
  for (const e of events) {
    const resultColor =
      e.result === 'accept'
        ? chalk.green(e.result)
        : e.result === 'block' || e.result === 'reject'
          ? chalk.red(e.result)
          : chalk.yellow(e.result);
    const cycleTag = `cycle=${e.cycle}`;
    const gateTag = `gate=${e.gate}`;
    const stageTag = `stage=${e.stage}`;
    const artifactTag = e.artifact ? `artifact=${e.artifact}` : '';
    const shaTag = e.sha ? `sha=${e.sha}` : '';
    console.log(
      `${e.ts}  ${cycleTag} ${gateTag} ${stageTag} ${resultColor} ${artifactTag} ${shaTag}`.trim(),
    );
    if (e.errors && e.errors.length > 0) {
      for (const err of e.errors) {
        console.log(`    ${chalk.red('-')} ${err}`);
      }
    }
  }
  return 0;
}

async function newCommand(args: CycleArgs): Promise<number> {
  const rootPath = resolve(args.path);
  const filePath = stateFilePath(rootPath);
  const title = args.title ?? '';
  if (!title) {
    console.error('Usage: loshu-sdlc cycle new <title> [path]');
    return 2;
  }
  const id = await incrementCycle(filePath, title, args.origin ?? null);
  if (args.json) {
    console.log(JSON.stringify({ cycle: id, title }, null, 2));
    return 0;
  }
  console.log(chalk.green(`✔ cycle ${id} created: ${title}`));
  return 0;
}

async function setCommand(args: CycleArgs): Promise<number> {
  const rootPath = resolve(args.path);
  const filePath = stateFilePath(rootPath);
  const stage = args.stage;
  const state = args.state;
  if (!stage || !state) {
    console.error('Usage: loshu-sdlc cycle set <stage> <state> [path]');
    return 2;
  }
  if (!(CYCLE_STAGES as readonly string[]).includes(stage)) {
    console.error(
      `Unknown stage: ${stage}. Valid: ${CYCLE_STAGES.join(', ')}`,
    );
    return 2;
  }
  if (!(VALID_STATES as readonly string[]).includes(state)) {
    console.error(
      `Unknown state: ${state}. Valid: ${VALID_STATES.join(', ')}`,
    );
    return 2;
  }

  const stateData = await loadCycleState(filePath);
  if (stateData.current_cycle === 0) {
    console.error(
      'No active cycle. Run `loshu-sdlc cycle new "<title>"` first.',
    );
    return 6;
  }
  const cycleId = stateData.current_cycle;
  const artifactPath = join(rootPath, artifactForStage(stage));
  const sha = await shaIfExists(artifactPath);
  const merged = await updateStage(filePath, cycleId, stage as CycleStage, {
    state: state as StageState,
    ts: new Date().toISOString(),
    ...(sha ? { sha } : {}),
    artifact: artifactForStage(stage),
  });

  if (args.json) {
    console.log(
      JSON.stringify({ cycle: cycleId, stage, ...merged }, null, 2),
    );
    return 0;
  }
  console.log(
    chalk.green(
      `✔ cycle ${cycleId} stage ${stage} -> ${state}${sha ? ` (sha ${sha})` : ''}`,
    ),
  );
  return 0;
}

async function archiveCommand(args: CycleArgs): Promise<number> {
  const rootPath = resolve(args.path);
  const filePath = stateFilePath(rootPath);
  const id = await archiveCycle(filePath);
  if (id === null) {
    console.error('No active cycle to archive.');
    return 6;
  }
  if (args.json) {
    console.log(JSON.stringify({ cycle: id, archived: true }, null, 2));
    return 0;
  }
  console.log(chalk.green(`✔ cycle ${id} archived`));
  return 0;
}

async function appendEventCommand(args: CycleArgs): Promise<number> {
  const rootPath = resolve(args.path);
  const filePath = logFilePath(rootPath);
  if (!args.gateName || !args.result || !args.stage) {
    console.error(
      'Usage: loshu-sdlc cycle append-event --gate <name> --stage <s> --result <r> [--cycle N] [--artifact F] [--sha S]',
    );
    return 2;
  }
  const event = await appendGateEvent(filePath, {
    ts: new Date().toISOString(),
    gate: args.gateName,
    stage: args.stage,
    result: args.result,
    cycle: args.cycle ?? 0,
    ...(args.artifact ? { artifact: args.artifact } : {}),
    ...(args.sha ? { sha: args.sha } : {}),
    ...(args.errors && args.errors.length > 0 ? { errors: args.errors } : {}),
  });
  if (args.json) {
    console.log(JSON.stringify(event, null, 2));
    return 0;
  }
  console.log(
    chalk.green(`✔ logged gate event: ${event.gate} ${event.result}`),
  );
  return 0;
}

function artifactForStage(stage: string): string {
  switch (stage) {
    case 'plan':
      return 'intent.md';
    case 'design':
      return 'spec.md';
    case 'build':
      return 'plan.md';
    case 'test':
      return 'REVIEW.md';
    case 'deploy':
      return 'REVIEW.md';
    case 'maintain':
      return 'bands.yaml';
    default:
      return '';
  }
}

/**
 * Helper exported for the bin switch — used when callers want to verify
 * the file path without going through subcommand dispatch.
 */
export function statePath(rootPath: string): string {
  return stateFilePath(rootPath);
}

export function eventLogPath(rootPath: string): string {
  return logFilePath(rootPath);
}

/**
 * Helper: build a CycleEntry stub (for tests or programmatic creation).
 * Not used by the command itself — kept here as a re-export.
 */
export { type CycleEntry, type CycleStateFile };

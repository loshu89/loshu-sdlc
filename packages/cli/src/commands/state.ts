import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readFile, writeFile, stat } = fsExtra;
import { resolve, join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import {
  ARTIFACT_STATES,
  canTransition,
  nextStates,
  previousStage,
  stageArtifact,
  transitionEvent,
  validateCrossStage,
  type ArtifactState,
} from '../lib/state-machine.js';
import { validateArtifact } from '../lib/validate.js';

export interface StateArgs {
  subcommand?: 'show' | undefined;
  stage?: string | undefined;
  filePath?: string | undefined;
  to?: ArtifactState | undefined;
  validate?: boolean | undefined;
  path?: string | undefined;
  json?: boolean | undefined;
}

export interface StageStateRow {
  stage: string;
  artifact: string;
  state: ArtifactState | 'pending' | 'missing';
  fileExists: boolean;
  updated: string;
}

export interface StateShowReport {
  cycle: number;
  cycleTitle: string;
  stages: StageStateRow[];
}

const ARTIFACT_FOR_STAGE: Record<string, { artifact: string; schema: string }> = {
  plan: { artifact: 'intent.md', schema: 'intent' },
  design: { artifact: 'spec.md', schema: 'spec' },
  build: { artifact: 'plan.md', schema: 'plan' },
  test: { artifact: 'REVIEW.md', schema: 'review' },
  deploy: { artifact: 'REVIEW.md', schema: 'review' },
  maintain: { artifact: 'bands.yaml', schema: 'bands' },
};

const HELP = `Usage: loshu-sdlc state <subcommand> [args]

Subcommands:
  show [path]                          Print artifact states for all 6 stages
  <stage> <file>                       Read file's current state
  <stage> <file> --transition <state>  Attempt transition (reject if not in DAG)
  <stage> <file> --validate            Check whether the file can transition to
                                       'accepted' (schema + cross-stage rule)

Options:
  --json                               Emit JSON
  --help, -h                           Show this help

Stages: plan, design, build, test, deploy, maintain
States: ${ARTIFACT_STATES.join(', ')}
`;

function readFrontmatter(content: string): Record<string, unknown> {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return {};
  const raw = (fmMatch[1] ?? '').replace(/<%=[^%]+%>/g, '');
  return (parseYaml(raw) ?? {}) as Record<string, unknown>;
}

function serializeFrontmatter(
  fm: Record<string, unknown>,
  body: string,
): string {
  // Stable YAML serialization for the simple scalar frontmatter we manage.
  const lines: string[] = ['---'];
  for (const [key, value] of Object.entries(fm)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      lines.push(`${key}: ${value}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      lines.push(`${key}: ${String(value)}`);
    } else if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const v of value) {
        if (typeof v === 'string') {
          lines.push(`  - ${v}`);
        } else {
          lines.push(`  - ${JSON.stringify(v)}`);
        }
      }
    } else {
      // For nested objects, fall back to JSON-in-form — uncommon in our scope.
      lines.push(`${key}: ${JSON.stringify(value)}`);
    }
  }
  lines.push('---');
  return `${lines.join('\n')}\n${body}`;
}

function splitFrontmatterAndBody(content: string): {
  fm: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
} {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!fmMatch) return { fm: {}, body: content, hasFrontmatter: false };
  const fm = readFrontmatter(content);
  const body = content.slice(fmMatch[0].length);
  return { fm, body, hasFrontmatter: true };
}

async function readArtifactState(
  filePath: string,
): Promise<{ state: ArtifactState | 'pending' | 'missing'; mtime: string | null }> {
  try {
    const st = await stat(filePath);
    const content = await readFile(filePath, 'utf8');
    const fm = readFrontmatter(content);
    const raw = fm.state ?? fm.status;
    if (typeof raw === 'string' && (ARTIFACT_STATES as readonly string[]).includes(raw)) {
      return {
        state: raw as ArtifactState,
        mtime: st.mtime.toISOString().slice(0, 10),
      };
    }
    return { state: 'pending', mtime: st.mtime.toISOString().slice(0, 10) };
  } catch {
    return { state: 'missing', mtime: null };
  }
}

async function loadCycle(targetPath: string): Promise<{
  cycle: number;
  cycleTitle: string;
}> {
  const cycleFile = join(targetPath, '.loshu-sdlc/state/cycle.json');
  try {
    const content = await readFile(cycleFile, 'utf8');
    const parsed = JSON.parse(content) as { current_cycle?: number; title?: string };
    return {
      cycle: parsed.current_cycle ?? 1,
      cycleTitle: parsed.title ?? 'unknown',
    };
  } catch {
    return { cycle: 1, cycleTitle: 'inferred' };
  }
}

export async function state(args: StateArgs): Promise<number> {
  if (args.subcommand === 'show') {
    return showCommand(args);
  }
  if (!args.stage || !args.filePath) {
    console.log(HELP);
    return args.stage === undefined && args.filePath === undefined ? 0 : 2;
  }
  if (args.to !== undefined) {
    return transitionCommand(args);
  }
  if (args.validate) {
    return validateCommand(args);
  }
  return readStateCommand(args);
}

async function showCommand(args: StateArgs): Promise<number> {
  const targetPath = resolve(args.path ?? '.');
  const cycle = await loadCycle(targetPath);
  const stages: StageStateRow[] = [];

  for (const [stage, info] of Object.entries(ARTIFACT_FOR_STAGE)) {
    const filePath = join(targetPath, info.artifact);
    const { state: st, mtime } = await readArtifactState(filePath);
    stages.push({
      stage,
      artifact: info.artifact,
      state: st,
      fileExists: st !== 'missing',
      updated: mtime ?? '—',
    });
  }

  if (args.json) {
    const report: StateShowReport = { cycle: cycle.cycle, cycleTitle: cycle.cycleTitle, stages };
    console.log(JSON.stringify(report, null, 2));
    return 0;
  }

  console.log(chalk.bold(`loshu-sdlc state — cycle ${cycle.cycle} (${cycle.cycleTitle})`));
  console.log();
  console.log(
    '┌──────────┬────────────┬───────────┬────────────┬────────────┐',
  );
  console.log(
    '│ Stage    │ Artifact   │ State     │ Updated    │ Allowed →  │',
  );
  console.log(
    '├──────────┼────────────┼───────────┼────────────┼────────────┤',
  );
  for (const row of stages) {
    const allowed =
      row.state === 'missing' || row.state === 'pending'
        ? 'draft'
        : nextStates(row.state as ArtifactState).join(',');
    console.log(
      `│ ${row.stage.padEnd(8)} │ ${row.artifact.padEnd(10)} │ ${row.state.padEnd(9)} │ ${row.updated.padEnd(10)} │ ${allowed.padEnd(10)} │`,
    );
  }
  console.log(
    '└──────────┴────────────┴───────────┴────────────┴────────────┘',
  );
  return 0;
}

async function readStateCommand(args: StateArgs): Promise<number> {
  const stage = args.stage!;
  const filePath = resolve(args.filePath!);
  if (!(stage in ARTIFACT_FOR_STAGE)) {
    console.error(`Unknown stage: ${stage}`);
    console.error(`Valid stages: ${Object.keys(ARTIFACT_FOR_STAGE).join(', ')}`);
    return 2;
  }
  const { state: st, mtime } = await readArtifactState(filePath);
  if (args.json) {
    console.log(
      JSON.stringify({ stage, filePath, state: st, updated: mtime }, null, 2),
    );
    return 0;
  }
  console.log(`${chalk.cyan(stage)} ${filePath}`);
  console.log(`  state:   ${st}`);
  console.log(`  updated: ${mtime ?? '—'}`);
  if (st !== 'missing' && st !== 'pending') {
    console.log(`  allowed transitions: ${nextStates(st as ArtifactState).join(', ')}`);
  }
  return 0;
}

async function transitionCommand(args: StateArgs): Promise<number> {
  const stage = args.stage!;
  const filePath = resolve(args.filePath!);
  const to = args.to!;

  if (!(stage in ARTIFACT_FOR_STAGE)) {
    console.error(`Unknown stage: ${stage}`);
    return 2;
  }
  if (!(ARTIFACT_STATES as readonly string[]).includes(to)) {
    console.error(`Unknown target state: ${to}`);
    console.error(`Valid states: ${ARTIFACT_STATES.join(', ')}`);
    return 2;
  }

  let content: string;
  try {
    content = await readFile(filePath, 'utf8');
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Cannot read ${filePath}: ${message}`);
    return 2;
  }
  const { fm, body } = splitFrontmatterAndBody(content);
  const from = (fm.state ?? fm.status) as ArtifactState | string | undefined;
  const fromState: ArtifactState | 'pending' =
    typeof from === 'string' && (ARTIFACT_STATES as readonly string[]).includes(from)
      ? (from as ArtifactState)
      : 'pending';

  if (fromState !== 'pending' && !canTransition(fromState, to)) {
    console.error(
      `✗ Illegal transition: ${fromState} → ${to} (no DAG edge; allowed: ${nextStates(fromState).join(', ')})`,
    );
    return 6;
  }

  // Cross-stage gate: only matters for transitions into 'accepted'.
  if (to === 'accepted') {
    const prev = previousStage(stage);
    if (prev !== null) {
      const prevArtifact = stageArtifact(prev);
      const prevPath = join(resolve('.', args.path ?? '.'), prevArtifact ?? '');
      const { state: prevState } = await readArtifactState(prevPath);
      const result = validateCrossStage(stage, prevState);
      if (!result.ok) {
        console.error(
          `✗ Cross-stage constraint blocked: ${result.reason ?? 'previous stage not accepted'}`,
        );
        return 7;
      }
    }
  }

  // Apply transition: update frontmatter `state` field.
  fm.state = to;
  if (to === 'draft' || to === 'accepted') {
    // Keep `status` aligned with legacy field for downstream consumers.
    fm.status = to;
  }
  const newContent = serializeFrontmatter(fm, body);
  await writeFile(filePath, newContent, 'utf8');
  const event = transitionEvent(fromState === 'pending' ? 'draft' : fromState, to);
  console.log(
    chalk.green(
      `✔ ${filePath}: ${fromState} → ${to} (event: ${event ?? 'noop'})`,
    ),
  );
  return 0;
}

async function validateCommand(args: StateArgs): Promise<number> {
  const stage = args.stage!;
  const filePath = resolve(args.filePath!);
  const info = ARTIFACT_FOR_STAGE[stage];
  if (!info) {
    console.error(`Unknown stage: ${stage}`);
    return 2;
  }
  const targetPath = resolve(args.path ?? '.');
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];

  // 1) schema validity
  try {
    const result = await validateArtifact(info.schema, filePath);
    checks.push({
      name: 'schema',
      ok: result.valid,
      detail: result.valid ? `${info.schema} schema ok` : result.errors.join('; '),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.push({ name: 'schema', ok: false, detail: message });
  }

  // 2) cross-stage rule
  const prev = previousStage(stage);
  if (prev === null) {
    checks.push({
      name: 'cross-stage',
      ok: true,
      detail: 'first stage (no previous constraint)',
    });
  } else {
    const prevArtifact = stageArtifact(prev);
    const prevPath = join(targetPath, prevArtifact ?? '');
    const { state: prevState } = await readArtifactState(prevPath);
    const result = validateCrossStage(stage, prevState);
    checks.push({
      name: 'cross-stage',
      ok: result.ok,
      detail: result.ok
        ? `previous stage '${prev}' is '${prevState}'`
        : (result.reason ?? 'previous stage not accepted'),
    });
  }

  const allOk = checks.every((c) => c.ok);
  if (args.json) {
    console.log(JSON.stringify({ stage, filePath, canAccept: allOk, checks }, null, 2));
    return allOk ? 0 : 8;
  }
  for (const c of checks) {
    console.log(`${c.ok ? chalk.green('✔') : chalk.red('✗')} ${c.name}: ${c.detail}`);
  }
  console.log(
    allOk
      ? chalk.green(`✔ ${stage} can transition to 'accepted'`)
      : chalk.red(`✗ ${stage} cannot transition to 'accepted'`),
  );
  return allOk ? 0 : 8;
}
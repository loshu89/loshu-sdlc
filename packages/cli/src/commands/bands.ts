import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { loadBands, evaluate, type Observation } from '../lib/bands.js';

export interface MetricObservation {
  name: string;
  value: number;
}

export interface BandsRecordArgs {
  path: string;                      // project root (sidecar lives at <path>/.sdlc/metrics.json)
  metrics: MetricObservation[];
}

export interface BandsArgs {
  subcommand: 'evaluate' | 'record';
  filePath: string;
  metric?: string;
  value?: number;
  observations?: Observation[];
  observationsJson?: string;
  json?: boolean;
  help?: boolean;
  recordPath?: string;
  metrics?: MetricObservation[];
}

const HELP = `Usage: loshu-sdlc bands <subcommand> [args]

Subcommands:
  evaluate <file> [--metric=NAME --value=N]   Evaluate a bands file against an observation
  evaluate <file> --observations-json=JSON     Evaluate using a JSON map of {name: value}
  record [path] --metric=NAME --value=N    Record a metric observation into <path>/.sdlc/metrics.json
                                           (repeat --metric/--value for multiple; merges with existing)

Options:
  --json                                       Output JSON (default: true)
  --help, -h                                   Show this help
`;

export async function bandsRecord(args: BandsRecordArgs): Promise<number> {
  if (args.metrics.length === 0) {
    console.error('bands record: at least one --metric/--value pair required');
    return 2;
  }
  const root = resolve(args.path);
  const sidecarDir = join(root, '.sdlc');
  const sidecarFile = join(sidecarDir, 'metrics.json');
  await mkdir(sidecarDir, { recursive: true });
  let current: Record<string, number> = {};
  try {
    current = JSON.parse(await readFile(sidecarFile, 'utf-8')) as Record<string, number>;
  } catch {
    current = {}; // missing or corrupt — start fresh (corrupt file is replaced, not merged)
  }
  for (const m of args.metrics) {
    current[m.name] = m.value;
  }
  await writeFile(sidecarFile, JSON.stringify(current, null, 2) + '\n', 'utf-8');
  console.log(`bands record: wrote ${args.metrics.length} observation(s) to ${sidecarFile}`);
  return 0;
}

export async function bands(args: BandsArgs): Promise<number> {
  if (args.help || (args.subcommand !== 'evaluate' && args.subcommand !== 'record')) {
    console.log(HELP);
    return 0;
  }

  if (args.subcommand === 'record') {
    return bandsRecord({ path: args.recordPath ?? '.', metrics: args.metrics ?? [] });
  }

  const filePath = resolve(args.filePath);
  let bandsFile;
  try {
    bandsFile = await loadBands(filePath);
  } catch (err) {
    console.error(`bands: failed to load ${filePath}: ${(err as Error).message}`);
    return 2;
  }

  let observations: Observation[] = [];
  if (args.observations && args.observations.length > 0) {
    observations = args.observations;
  } else if (args.observationsJson) {
    try {
      const parsed: unknown = JSON.parse(args.observationsJson);
      if (Array.isArray(parsed)) {
        observations = parsed.filter(
          (x): x is Observation =>
            typeof x === 'object' &&
            x !== null &&
            typeof (x as { name?: unknown }).name === 'string' &&
            typeof (x as { value?: unknown }).value === 'number',
        );
      } else if (parsed && typeof parsed === 'object') {
        const obj = parsed as Record<string, unknown>;
        observations = Object.entries(obj)
          .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
          .map(([name, value]) => ({ name, value }));
      }
    } catch (err) {
      console.error(`bands: invalid --observations-json: ${(err as Error).message}`);
      return 2;
    }
  } else if (args.metric !== undefined && args.value !== undefined) {
    observations = [{ name: args.metric, value: args.value }];
  } else {
    // No observation supplied: emit an empty incidents list (valid JSON).
    console.log(JSON.stringify({ incidents: [] }, null, 2));
    return 0;
  }

  const result = evaluate(bandsFile, observations);
  console.log(JSON.stringify(result, null, 2));
  return 0;
}

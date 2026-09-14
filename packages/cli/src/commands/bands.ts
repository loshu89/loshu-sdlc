import { resolve } from 'node:path';
import { loadBands, evaluate, type Observation } from '../lib/bands.js';

export interface BandsArgs {
  subcommand: 'evaluate';
  filePath: string;
  metric?: string;
  value?: number;
  observations?: Observation[];
  observationsJson?: string;
  json?: boolean;
  help?: boolean;
}

const HELP = `Usage: loshu-sdlc bands <subcommand> [args]

Subcommands:
  evaluate <file> [--metric=NAME --value=N]   Evaluate a bands file against an observation
  evaluate <file> --observations-json=JSON     Evaluate using a JSON map of {name: value}

Options:
  --json                                       Output JSON (default: true)
  --help, -h                                   Show this help
`;

export async function bands(args: BandsArgs): Promise<number> {
  if (args.help || args.subcommand !== 'evaluate') {
    console.log(HELP);
    return 0;
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

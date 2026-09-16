import type { Stage } from './identity.js';

export interface RegistryVersion {
  schema_file?: string;
  deprecated?: boolean;
  migrate_to: string | null;
  current?: boolean;
}
export type Registry = Record<string, RegistryVersion>;
export type ArtifactTypeRegistry = Registry;

// Migration transforms operate on arbitrary JSON-shaped artifacts
// (intent.md, spec.md, …) with heterogeneous schemas. The input and
// output are typed as `unknown` — transforms must narrow to their
// expected shape, consumers must re-narrow after chainMigrate.
// This is type-safer than `any` because it forces explicit narrowing.
export type TransformFn = (artifact: unknown) => unknown;

export interface MigrationEvent {
  ts: string;
  from: string;
  to: string;
  artifact_path: string;
}

// Registry shapes accepted by findMigrationPath:
//   1. Flat — `{ "0.1.0": {…}, "0.2.0": {…} }` (legacy).
//   2. Wrapper — `{ current?: string, versions: {…} }` (current v0.6
//      registry.json layout).
type RegistryShape = Registry | { current?: string; versions: Registry };

export function findMigrationPath(
  fromVer: string,
  toVer: string,
  registry: RegistryShape,
): string[] {
  if (fromVer === toVer) throw new Error('no migration path: from equals to');
  const versions: Registry =
    'versions' in registry ? registry.versions : registry;
  if (!versions[fromVer]) throw new Error(`unknown from version: ${fromVer}`);

  const path: string[] = [fromVer];
  let current = fromVer;
  while (current !== toVer) {
    const entry = versions[current];
    if (!entry?.migrate_to) throw new Error(`no migration path from ${fromVer} to ${toVer}`);
    if (path.includes(entry.migrate_to)) throw new Error(`cycle in migration path: ${path.join(' → ')}`);
    path.push(entry.migrate_to);
    current = entry.migrate_to;
  }
  return path;
}

export interface ChainMigrateResult {
  artifact: unknown;
  events: MigrationEvent[];
}

export function chainMigrate(
  artifact: unknown,
  fromVer: string,
  toVer: string,
  _stage: Stage,
  registry: ArtifactTypeRegistry,
  transforms: Record<string, TransformFn>,
  artifactPath: string = '<unknown>',
): ChainMigrateResult {
  const path = findMigrationPath(fromVer, toVer, registry);
  const events: MigrationEvent[] = [];
  let current: unknown = artifact;
  for (let i = 0; i < path.length - 1; i++) {
    const from = path[i]!;
    const to = path[i + 1]!;
    const key = `${from}->${to}`;
    const transform = transforms[key];
    if (!transform) throw new Error(`missing transform: ${key}`);
    current = transform(current);
    events.push({
      ts: new Date().toISOString(),
      from,
      to,
      artifact_path: artifactPath,
    });
  }
  return { artifact: current, events };
}

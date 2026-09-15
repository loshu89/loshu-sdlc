import type { Stage } from './identity.js';

export interface RegistryVersion {
  schema_file?: string;
  deprecated?: boolean;
  migrate_to: string | null;
  current?: boolean;
}
export type Registry = Record<string, RegistryVersion>;
export type ArtifactTypeRegistry = Registry;

export interface MigrationEvent {
  ts: string;
  from: string;
  to: string;
  artifact_path: string;
}

export function findMigrationPath(
  fromVer: string,
  toVer: string,
  registry: ArtifactTypeRegistry,
): string[] {
  if (fromVer === toVer) throw new Error('no migration path: from equals to');
  // Accept both wrapper {current, versions} and flat {version: ...} shapes.
  const versions: Record<string, RegistryVersion | undefined> =
    (registry as any).versions ?? (registry as any);
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

export type TransformFn = (artifact: any) => any;

export interface ChainMigrateResult {
  artifact: any;
  events: MigrationEvent[];
}

export async function chainMigrate(
  artifact: any,
  fromVer: string,
  toVer: string,
  _stage: Stage,
  registry: ArtifactTypeRegistry,
  transforms: Record<string, TransformFn>,
  artifactPath: string = '<unknown>',
): Promise<ChainMigrateResult> {
  const path = findMigrationPath(fromVer, toVer, registry);
  const events: MigrationEvent[] = [];
  let current = artifact;
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

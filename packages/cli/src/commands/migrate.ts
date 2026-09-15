import { readFile, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { loadRegistry, getArtifactTypeRegistry } from '../lib/registry.js';
import { chainMigrate } from '../lib/migrate.js';
import { generateId, type Stage } from '../lib/identity.js';
import { loadTransforms } from '../lib/migrate-load.js';

export interface MigrateArgs {
  file: string;
  from?: string | undefined;
  to?: string | undefined;
  check?: boolean | undefined;
  dryRun?: boolean | undefined;
}

// Map filename stem to { registryType, stage }.
// Filenames and registry types map 1-1; stages follow the SDLC pipeline:
//   intent.md   → intent    (plan stage)
//   spec.md     → spec      (design stage)
//   plan.md     → plan      (build stage)
//   CLAUDE.md   → claude-md (test stage)
//   REVIEW.md   → review    (deploy stage)
//   bands.yaml  → bands     (maintain stage)
interface ArtifactInfo {
  type: string;
  stage: Stage;
}

function artifactInfoFromFilename(filename: string): ArtifactInfo {
  const base = basename(filename);
  const stem = base.replace(/\.(md|yaml|yml)$/i, '');
  switch (stem) {
    case 'CLAUDE':
      return { type: 'claude-md', stage: 'test' };
    case 'REVIEW':
      return { type: 'review', stage: 'deploy' };
    case 'intent':
      return { type: 'intent', stage: 'plan' };
    case 'spec':
      return { type: 'spec', stage: 'design' };
    case 'plan':
      return { type: 'plan', stage: 'build' };
    case 'bands':
      return { type: 'bands', stage: 'maintain' };
    default:
      return { type: stem, stage: stem as Stage };
  }
}

function findCurrentVersion(typeReg: Record<string, unknown>): string | undefined {
  // Registry flattened wrapper may store `current` as a string at the top.
  if (typeof typeReg.current === 'string') return typeReg.current;
  // Otherwise scan versions for one marked `current: true` or `current: "true"`.
  for (const [version, entry] of Object.entries(typeReg)) {
    if (
      entry &&
      typeof entry === 'object' &&
      ((entry as { current?: unknown }).current === true ||
        (entry as { current?: unknown }).current === 'true')
    ) {
      return version;
    }
  }
  return undefined;
}

export async function migrate(args: MigrateArgs): Promise<number> {
  const registry = await loadRegistry();
  const content = await readFile(args.file, 'utf-8');
  const fmMatch = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!fmMatch) {
    console.error(`migrate: no frontmatter found in ${args.file}`);
    return 2;
  }
  const fm = parseYaml(fmMatch[1]!) as Record<string, unknown>;
  const { type, stage } = artifactInfoFromFilename(args.file);
  const typeReg = getArtifactTypeRegistry(registry, type);

  const fromVer = args.from ?? String(fm.schema_version ?? '0.0.0');

  let toVer = args.to;
  if (!toVer) {
    toVer = findCurrentVersion(typeReg as Record<string, unknown>);
  }
  if (!toVer) {
    console.error(`migrate: cannot determine target version for ${type}`);
    return 2;
  }

  if (args.check) {
    if (fromVer !== toVer) {
      console.error(`migrate: ${args.file} is ${fromVer}, latest is ${toVer}`);
      return 1;
    }
    console.log(`migrate: ${args.file} is current`);
    return 0;
  }

  if (fromVer === toVer) {
    console.log(`migrate: ${args.file} already at ${toVer}; nothing to do`);
    return 0;
  }

  try {
    const transforms = await loadTransforms(type);
    const result = await chainMigrate(
      fm,
      fromVer,
      toVer,
      stage,
      typeReg as Parameters<typeof chainMigrate>[4],
      transforms,
      args.file,
    );

    // Fill in Identity fields that need actual values.
    const cycleId = Number(fm.cycle_id ?? fm.cycle ?? 1);
    const slug = String(
      fm.title ?? basename(args.file).replace(/\.(md|yaml|yml)$/i, ''),
    )
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 30);
    result.artifact.id = generateId({ stage, cycle: cycleId, slug });
    result.artifact.cycle_id = cycleId;
    result.artifact.stage = stage;
    result.artifact.schema_version = toVer;
    result.artifact.state = 'iterating';
    result.artifact.migrated_from = fromVer;
    result.artifact.migrated_at = new Date().toISOString();

    const newContent = `---\n${stringifyYaml(result.artifact)}---\n${content.slice(fmMatch[0].length)}`;
    if (!args.dryRun) {
      await writeFile(args.file, newContent, 'utf-8');
      console.log(`migrate: ${args.file} ${fromVer} → ${toVer} (state: iterating)`);
    } else {
      console.log(`migrate: would update ${args.file} ${fromVer} → ${toVer}`);
    }
    return 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`migrate: ${message}`);
    return 2;
  }
}

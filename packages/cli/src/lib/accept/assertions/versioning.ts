import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Assertion, AssertionResult } from '../types.js';
import { loadRegistry, getArtifactTypeRegistry } from '../../registry.js';
import type { RegistryVersion } from '../../migrate.js';
import type { CycleStateFile } from '../../cycle.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

async function readFrontmatter(path: string): Promise<Record<string, unknown>> {
  const content = await readFile(path, 'utf-8');
  const m = FRONTMATTER_RE.exec(content);
  if (!m) return {};
  return parseYaml(m[1]!) as Record<string, unknown>;
}

function pass(rule: string): AssertionResult {
  return { pass: true, rule };
}
function fail(rule: string, message: string, fix?: string): AssertionResult {
  return { pass: false, rule, message, ...(fix ? { fix } : {}) };
}

/**
 * Build a map from artifact id (frontmatter `id` field) to its cycle id
 * + file path by reading every registered artifact's frontmatter.
 *
 * Uses synchronous IO: assertions are already async and each artifact
 * frontmatter is small. The map is cached per cycle state but rebuilt
 * each assertion invocation (cheap, bounded by # cycles × # stages).
 *
 * Returns an empty map on any IO/parse failure (graceful no-op).
 */
function buildParentIndex(
  cycle: CycleStateFile,
  rootPath: string,
): Map<string, { cycleId: number; filePath: string }> {
  const idx = new Map<string, { cycleId: number; filePath: string }>();
  for (const [idStr, entry] of Object.entries(cycle.cycles)) {
    const cycleId = Number(idStr);
    for (const stageEntry of Object.values(entry.stages)) {
      if (!stageEntry.artifact) continue;
      const filePath = join(rootPath, stageEntry.artifact);
      let fmId: string | undefined;
      try {
        const content = readFileSync(filePath, 'utf-8');
        const m = FRONTMATTER_RE.exec(content);
        if (m) {
          const fm = parseYaml(m[1]!) as Record<string, unknown>;
          fmId = typeof fm.id === 'string' ? fm.id : undefined;
        }
      } catch {
        continue;
      }
      if (fmId) idx.set(fmId, { cycleId, filePath });
    }
  }
  return idx;
}

/** Synchronously read the `schema_version` frontmatter field of a file. */
function readSchemaVersionSync(filePath: string): string | undefined {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const m = FRONTMATTER_RE.exec(content);
    if (!m) return undefined;
    const fm = parseYaml(m[1]!) as Record<string, unknown>;
    return fm.schema_version ? String(fm.schema_version) : undefined;
  } catch {
    return undefined;
  }
}

export const versioningAssertions: Assertion[] = [
  {
    rule: 'V1',
    layer: 1,
    description: 'schema_version exists',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      if (!fm.schema_version) return fail('V1', 'missing schema_version');
      return pass('V1');
    },
  },
  {
    rule: 'V2',
    layer: 2,
    description: 'schema_version exists in registry',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const ver = String(fm.schema_version);
      const reg = await loadRegistry();
      const typeReg = getArtifactTypeRegistry(reg, a.stage);
      if (!typeReg[ver]) return fail('V2', `version ${ver} not in registry for ${a.stage}`);
      return pass('V2');
    },
  },
  {
    rule: 'V3',
    layer: 2,
    description: 'version is not deprecated',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const ver = String(fm.schema_version);
      const reg = await loadRegistry();
      const typeReg = getArtifactTypeRegistry(reg, a.stage);
      const entry = typeReg[ver] as RegistryVersion | undefined;
      if (entry?.deprecated)
        return fail('V3', `version ${ver} is deprecated`, 'loshu-sdlc migrate <file>');
      return pass('V3');
    },
  },
  {
    rule: 'V4',
    layer: 2,
    description: 'cross-cycle parent schema is consistent (no deprecated/unknown versions)',
    run: async (a) => {
      let fm: Record<string, unknown>;
      try {
        fm = await readFrontmatter(a.filePath);
      } catch {
        return pass('V4');
      }
      const parents = (fm.parent_ids as string[] | undefined) ?? [];
      if (parents.length === 0) return pass('V4');

      const cyclePath = `${a.rootPath}/.loshu-sdlc/state/cycle.json`;
      let cycle: CycleStateFile;
      try {
        cycle = JSON.parse(await readFile(cyclePath, 'utf-8')) as CycleStateFile;
      } catch {
        return pass('V4');
      }

      const reg = await loadRegistry();
      const typeReg = getArtifactTypeRegistry(reg, a.stage);

      const currentCycleId = Number(fm.cycle_id ?? 0);
      const parentIndex = buildParentIndex(cycle, a.rootPath);
      const warnings: string[] = [];
      for (const parentId of parents) {
        const parentRef = parentIndex.get(parentId);
        if (!parentRef || parentRef.cycleId === currentCycleId) continue;
        // Cross-cycle parent — look up its schema_version.
        const parentVersion = readSchemaVersionSync(parentRef.filePath);
        if (!parentVersion) {
          warnings.push(`parent ${parentId}: cannot read schema_version`);
          continue;
        }
        const entry = typeReg[parentVersion] as RegistryVersion | undefined;
        if (!entry) {
          warnings.push(
            `parent ${parentId} (cycle ${parentRef.cycleId}): schema_version ${parentVersion} not in registry`,
          );
        } else if (entry.deprecated) {
          warnings.push(
            `parent ${parentId} (cycle ${parentRef.cycleId}): schema_version ${parentVersion} is deprecated`,
          );
        }
      }

      if (warnings.length === 0) return pass('V4');
      return fail(
        'V4',
        `${warnings.length} cross-cycle parent schema inconsistency: ${warnings.join('; ')}`,
        'loshu-sdlc migrate <parent-file>',
      );
    },
  },
];
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Assertion, AssertionResult } from '../types.js';
import { loadRegistry, getArtifactTypeRegistry } from '../../registry.js';

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
      if ((typeReg[ver] as any)?.deprecated)
        return fail('V3', `version ${ver} is deprecated`, 'loshu-sdlc migrate <file>');
      return pass('V3');
    },
  },
  {
    rule: 'V4',
    layer: 2,
    description: 'version is registered',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const ver = String(fm.schema_version);
      const reg = await loadRegistry();
      const typeReg = getArtifactTypeRegistry(reg, a.stage);
      if (!typeReg[ver]) return fail('V4', `version ${ver} not in registry`);
      return pass('V4');
    },
  },
];
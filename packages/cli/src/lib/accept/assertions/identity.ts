import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Assertion, Artifact, AssertionResult } from '../types.js';
import { ID_REGEX } from '../../identity.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

async function readFrontmatter(
  artifact: Artifact,
): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(artifact.filePath, 'utf-8');
    const m = FRONTMATTER_RE.exec(content);
    if (!m) return null;
    return parseYaml(m[1]!) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pass(rule: string): AssertionResult {
  return { pass: true, rule };
}
function fail(rule: string, message: string, fix?: string): AssertionResult {
  return { pass: false, rule, message, ...(fix ? { fix } : {}) };
}

export const identityAssertions: Assertion[] = [
  {
    rule: 'A1',
    layer: 1,
    description: 'frontmatter has id field',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      if (!fm) return fail('A1', 'no frontmatter found');
      if (!fm.id) return fail('A1', 'frontmatter missing id field', 'loshu-sdlc repair <file>');
      return pass('A1');
    },
  },
  {
    rule: 'A2',
    layer: 1,
    description: 'id matches ULID slug regex',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      if (!fm?.id || typeof fm.id !== 'string') return fail('A2', 'no id field');
      if (!ID_REGEX.test(fm.id)) return fail('A2', `id "${fm.id}" doesn't match format`);
      return pass('A2');
    },
  },
  {
    rule: 'A4',
    layer: 1,
    description: 'schema_version is semver',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      if (!fm?.schema_version) return fail('A4', 'schema_version missing');
      if (!/^\d+\.\d+\.\d+$/.test(String(fm.schema_version)))
        return fail('A4', `not semver: ${String(fm.schema_version)}`);
      return pass('A4');
    },
  },
  {
    rule: 'A5',
    layer: 1,
    description: 'cycle_id is a positive integer',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      if (typeof fm?.cycle_id !== 'number' || fm.cycle_id < 1)
        return fail('A5', `bad cycle_id: ${String(fm?.cycle_id)}`);
      return pass('A5');
    },
  },
  {
    rule: 'A6',
    layer: 1,
    description: 'state is in enum',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      const allowed = ['draft', 'accepted', 'iterating', 'blocked', 'rejected', 'merged', 'archived'];
      if (!allowed.includes(String(fm?.state)))
        return fail('A6', `state "${String(fm?.state)}" not in enum`);
      return pass('A6');
    },
  },
  {
    rule: 'A7',
    layer: 1,
    description: 'created_at is ISO 8601',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      const v = String(fm?.created_at ?? '');
      if (!v || isNaN(Date.parse(v))) return fail('A7', `bad created_at: ${v}`);
      return pass('A7');
    },
  },
  {
    rule: 'A8',
    layer: 1,
    description: 'stage matches file context',
    run: async (a) => {
      const fm = await readFrontmatter(a);
      if (fm?.stage !== a.stage)
        return fail('A8', `stage mismatch: file=${a.stage} frontmatter=${String(fm?.stage)}`);
      return pass('A8');
    },
  },
];
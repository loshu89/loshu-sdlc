import type { Assertion, AssertionResult } from '../types.js';
import { discoverArtifacts } from '../discover.js';
import { ID_REGEX } from '../../identity.js';
import { readFrontmatterFile as readFrontmatter } from '../frontmatter.js';

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
      const fm = await readFrontmatter(a.filePath);
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
      const fm = await readFrontmatter(a.filePath);
      if (!fm?.id || typeof fm.id !== 'string') return fail('A2', 'no id field');
      if (!ID_REGEX.test(fm.id)) return fail('A2', `id "${fm.id}" doesn't match format`);
      return pass('A2');
    },
  },
  {
    rule: 'A3',
    layer: 1,
    description: 'id is globally unique across the project',
    run: async (a) => {
      const all = await discoverArtifacts(a.rootPath);
      const seen = new Map<string, string[]>();
      for (const art of all) {
        const paths = seen.get(art.id) ?? [];
        paths.push(art.filePath);
        seen.set(art.id, paths);
      }
      const dupes = [...seen.entries()].filter(([, paths]) => paths.length > 1);
      if (dupes.length === 0) return pass('A3');
      const detail = dupes
        .map(([id, paths]) => `${id} (in ${paths.join(', ')})`)
        .join('; ');
      return fail(
        'A3',
        `${dupes.length} duplicate id(s) found: ${detail}`,
        'loshu-sdlc repair <file>',
      );
    },
  },
  {
    rule: 'A4',
    layer: 1,
    description: 'schema_version is semver',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
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
      const fm = await readFrontmatter(a.filePath);
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
      const fm = await readFrontmatter(a.filePath);
      const allowed = ['draft', 'accepted', 'iterating', 'blocked', 'rejected', 'archived'];
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
      const fm = await readFrontmatter(a.filePath);
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
      const fm = await readFrontmatter(a.filePath);
      if (fm?.stage !== a.stage)
        return fail('A8', `stage mismatch: file=${a.stage} frontmatter=${String(fm?.stage)}`);
      return pass('A8');
    },
  },
];
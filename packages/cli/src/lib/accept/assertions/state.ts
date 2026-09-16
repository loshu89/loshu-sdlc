import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Assertion, AssertionResult } from '../types.js';
import type { Stage } from '../../identity.js';
import type { CycleStateFile } from '../../cycle.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

const STAGES: Stage[] = ['plan', 'design', 'build', 'test', 'deploy', 'maintain'];

async function readFrontmatter(path: string): Promise<Record<string, unknown>> {
  const content = await readFile(path, 'utf-8');
  const m = FRONTMATTER_RE.exec(content);
  if (!m) return {};
  return parseYaml(m[1]!) as Record<string, unknown>;
}

function pass(rule: string): AssertionResult {
  return { pass: true, rule };
}
function fail(rule: string, message: string): AssertionResult {
  return { pass: false, rule, message };
}

export const stateAssertions: Assertion[] = [
  {
    rule: 'C1',
    layer: 2,
    description: 'state is in enum',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const allowed = ['draft', 'accepted', 'iterating', 'blocked', 'rejected', 'merged', 'archived'];
      if (!allowed.includes(String(fm?.state)))
        return fail('C1', `state "${String(fm?.state)}" not in enum`);
      return pass('C1');
    },
  },
  {
    rule: 'C2',
    layer: 2,
    description: 'cross-stage guard: previous stage is accepted',
    run: async (a) => {
      const cyclePath = `${process.cwd()}/.loshu-sdlc/state/cycle.json`;
      let cycle: CycleStateFile | undefined;
      try {
        cycle = JSON.parse(await readFile(cyclePath, 'utf-8')) as CycleStateFile;
      } catch {
        return pass('C2');
      }
      const idx = STAGES.indexOf(a.stage);
      if (idx <= 0) return pass('C2');
      const prevStage = STAGES[idx - 1]!;
      const myCycleId = (await readFrontmatter(a.filePath)).cycle_id;
      const myCycle = cycle.cycles?.[String(myCycleId)];
      if (!myCycle) return pass('C2');
      const prevState = myCycle.stages?.[prevStage]?.state;
      if (prevState !== 'accepted' && prevState !== 'merged') {
        return fail('C2', `previous stage ${prevStage} is ${String(prevState)}, must be accepted`);
      }
      return pass('C2');
    },
  },
  {
    rule: 'C4',
    layer: 3,
    description: 'parent_ids are well-formed',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const parents = (fm.parent_ids as string[] | undefined) ?? [];
      for (const p of parents) {
        if (!/^.{20,}$/.test(p)) return fail('C4', `invalid parent_id: ${p}`);
      }
      return pass('C4');
    },
  },
];

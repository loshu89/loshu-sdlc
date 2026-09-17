import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Assertion, AssertionResult } from '../types.js';
import type { Stage } from '../../identity.js';
import type { CycleStateFile } from '../../cycle.js';
import { STAGE_TO_SCHEMA } from '../../stage-schema.js';
import { discoverArtifacts } from '../discover.js';
import { validateArtifact } from '../../validate.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

const STAGES: Stage[] = ['plan', 'design', 'build', 'test', 'deploy', 'maintain'];

// State-machine DAG transitions per spec §3.1 + §3.2.
// This is a permissive superset of valid moves — it admits every legal
// transition but is intentionally strict about which target states are
// reachable from each source state (no skipping ahead).
//
// Summary:
//   pending    → draft | archived
//   draft      → accepted | iterating | blocked | rejected | archived
//   iterating  → accepted | blocked | rejected | archived
//   accepted   → iterating | blocked | rejected | archived
//   blocked    → draft | archived
//   rejected   → draft | archived
//   archived   → draft               (unarchive — conservative allow)
// Note: 'merged' is intentionally absent — it's a PRRef['state'], not a
// StageState; recording 'merged' at stage level would conflict with
// cycle.ts:48-55's type. The PR-level state lives in cycleEntry.pr.state.
const TRANSITIONS: Record<string, string[]> = {
  pending: ['draft', 'archived'],
  draft: ['accepted', 'iterating', 'blocked', 'rejected', 'archived'],
  iterating: ['accepted', 'blocked', 'rejected', 'archived'],
  accepted: ['iterating', 'blocked', 'rejected', 'archived'],
  blocked: ['draft', 'archived'],
  rejected: ['draft', 'archived'],
  archived: ['draft'],
};

// Stage → schema artifact name (used by C2 schema validate). The map
// itself lives in `lib/stage-schema.ts` and is also reused by versioning
// assertions V2/V3/V4 — see that module for the canonical definition.

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
    description: 'state transition in DAG (spec §3.1)',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const current = String(fm?.state);
      // Current state must be a known state in the DAG (enum check
      // subsumed — see identity.ts A6 for the same constraint).
      if (!(current in TRANSITIONS)) {
        return fail('C1', `state "${current}" is not in the state DAG`);
      }
      // If a previous state is recorded, the current must be a legal
      // successor. If no prev_state is recorded, the DAG check is
      // satisfied by the current state being a known state.
      const prevState =
        typeof fm?.prev_state === 'string' ? fm.prev_state : undefined;
      if (prevState !== undefined) {
        const allowed = TRANSITIONS[prevState];
        if (!allowed) {
          return fail('C1', `previous state "${prevState}" is not in the state DAG`);
        }
        if (!allowed.includes(current)) {
          return fail(
            'C1',
            `illegal transition: ${prevState} → ${current}; allowed from ${prevState}: ${allowed.join(', ')}`,
          );
        }
      }
      return pass('C1');
    },
  },
  {
    rule: 'C2',
    layer: 2,
    description: 'schema validate pass',
    run: async (a) => {
      const schemaName = STAGE_TO_SCHEMA[a.stage];
      try {
        const result = await validateArtifact(schemaName, a.filePath);
        if (result.valid) return pass('C2');
        const detail = result.errors.slice(0, 3).join('; ');
        return fail('C2', `schema validation failed: ${detail}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return fail('C2', `schema validation error: ${message}`);
      }
    },
  },
  {
    rule: 'C3',
    layer: 2,
    description: 'cross-stage guard: previous stage is accepted',
    run: async (a) => {
      const cyclePath = `${a.rootPath}/.loshu-sdlc/state/cycle.json`;
      let cycle: CycleStateFile | undefined;
      try {
        cycle = JSON.parse(await readFile(cyclePath, 'utf-8')) as CycleStateFile;
      } catch {
        return pass('C3');
      }
      const idx = STAGES.indexOf(a.stage);
      if (idx <= 0) return pass('C3');
      const prevStage = STAGES[idx - 1]!;
      const myCycleId = (await readFrontmatter(a.filePath)).cycle_id;
      const myCycle = cycle.cycles?.[String(myCycleId)];
      if (!myCycle) return pass('C3');
      const prevState = myCycle.stages?.[prevStage]?.state;
      if (prevState !== 'accepted') {
        return fail('C3', `previous stage ${prevStage} is ${String(prevState)}, must be accepted`);
      }
      return pass('C3');
    },
  },
  {
    rule: 'C4',
    layer: 3,
    description: 'parent_ids are well-formed and refer to existing artifacts',
    run: async (a) => {
      const fm = await readFrontmatter(a.filePath);
      const parents = (fm.parent_ids as string[] | undefined) ?? [];
      // Format check first (cheap fast-fail).
      for (const p of parents) {
        if (!/^.{20,}$/.test(p)) return fail('C4', `invalid parent_id format: ${p}`);
      }
      // Existence check: each parent_id must match some artifact's id
      // somewhere in the project's cycle set.
      if (parents.length === 0) return pass('C4');
      const allArtifacts = await discoverArtifacts(a.rootPath);
      const knownIds = new Set(allArtifacts.map((art) => art.id));
      for (const p of parents) {
        if (!knownIds.has(p)) return fail('C4', `parent_id not found in any artifact: ${p}`);
      }
      return pass('C4');
    },
  },
];

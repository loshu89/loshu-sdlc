import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve the state-machine definition relative to this file's location
// so it works regardless of cwd (mirrors lib/validate.ts pattern).
const STATE_MACHINE_PATH = resolve(
  __dirname,
  '../../../plugin/state-machines/artifact.json',
);

export const ARTIFACT_STATES = [
  'draft',
  'accepted',
  'iterating',
  'blocked',
  'rejected',
  'archived',
] as const;

export type ArtifactState = (typeof ARTIFACT_STATES)[number];

export interface ArtifactTransition {
  from: ArtifactState;
  to: ArtifactState;
  event: string;
}

export interface ArtifactStateMachine {
  states: ArtifactState[];
  initial: ArtifactState;
  transitions: ArtifactTransition[];
  stage_order: string[];
  stage_artifacts: Record<string, string>;
  cross_stage_rule: string;
}

// Cached loader — the definition is static for the process lifetime.
let _machine: ArtifactStateMachine | null = null;

function loadDefinition(): ArtifactStateMachine {
  if (_machine) return _machine;
  const raw = readFileSync(STATE_MACHINE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as ArtifactStateMachine;
  _machine = parsed;
  return parsed;
}

/**
 * Returns the full list of artifact state transitions defined in
 * packages/plugin/state-machines/artifact.json.
 *
 * The argument is accepted for forward compatibility (per-artifact
 * state machines may be added in a future release) but is currently
 * ignored — all artifact types share the same DAG.
 */
export function loadTransitions(_artifactType?: string): ArtifactTransition[] {
  return loadDefinition().transitions;
}

/**
 * Returns true iff a transition `from → to` exists in the artifact
 * state DAG. `to` may equal `from` (a no-op is always allowed).
 */
export function canTransition(
  from: ArtifactState,
  to: ArtifactState,
): boolean {
  if (from === to) return true;
  const transitions = loadTransitions();
  return transitions.some((t) => t.from === from && t.to === to);
}

/**
 * Returns the set of target states reachable from `from` via a single
 * DAG edge. Does NOT include `from` itself.
 */
export function nextStates(from: ArtifactState): ArtifactState[] {
  const transitions = loadTransitions();
  const out = new Set<ArtifactState>();
  for (const t of transitions) {
    if (t.from === from) out.add(t.to);
  }
  return [...out];
}

/**
 * Returns the event name that triggers the `from → to` transition,
 * or `null` if the transition is not allowed.
 */
export function transitionEvent(
  from: ArtifactState,
  to: ArtifactState,
): string | null {
  if (from === to) return 'noop';
  const transitions = loadTransitions();
  const found = transitions.find((t) => t.from === from && t.to === to);
  return found ? found.event : null;
}

export interface CrossStageResult {
  ok: boolean;
  reason?: string;
}

/**
 * Checks whether `targetStage` may transition to `accepted` given the
 * already-collected states of the other stages in the same cycle.
 *
 * - targetStage == 'plan': always ok (no previous constraint)
 * - previous stage not 'accepted': not ok
 *
 * The caller supplies `previousStageState` (e.g. the state read from
 * the artifact file for the stage that comes before targetStage in
 * `stage_order`). Pass `'accepted'` for cycle restarts where the
 * previous constraint does not apply.
 */
export function validateCrossStage(
  targetStage: string,
  previousStageState: ArtifactState | 'pending' | 'missing' | null,
): CrossStageResult {
  const def = loadDefinition();
  if (!def.stage_order.includes(targetStage)) {
    return { ok: false, reason: `unknown stage: ${targetStage}` };
  }
  if (targetStage === 'plan') {
    // First stage has no previous constraint (also applies to cycle restart).
    return { ok: true };
  }
  if (previousStageState === 'accepted') {
    return { ok: true };
  }
  return {
    ok: false,
    reason: `previous stage is '${previousStageState ?? 'pending'}'; must be 'accepted' to advance`,
  };
}

/**
 * Returns the stage that comes immediately before `stage` in
 * `stage_order`, or `null` if `stage` is the first one (plan).
 */
export function previousStage(stage: string): string | null {
  const def = loadDefinition();
  const idx = def.stage_order.indexOf(stage);
  if (idx <= 0) return null;
  return def.stage_order[idx - 1] ?? null;
}

/**
 * Returns the artifact filename associated with `stage` (e.g.
 * 'plan' → 'intent.md'). Returns `null` for unknown stages.
 */
export function stageArtifact(stage: string): string | null {
  const def = loadDefinition();
  return def.stage_artifacts[stage] ?? null;
}
/**
 * Cycle state infrastructure for loshu-sdlc.
 *
 * Complements the DAG state machine (artifact-level `state` field) with
 * persistent project-level state:
 *
 *   .loshu-sdlc/state/cycle.json
 *
 *   {
 *     "version": 1,
 *     "current_cycle": 3,
 *     "cycles": {
 *       "3": {
 *         "id": 3,
 *         "title": "OAuth authentication",
 *         "created_at": "2026-09-14T10:00:00Z",
 *         "origin": null,
 *         "stages": {
 *           "plan":     { "state": "accepted",  "ts": "...", "sha": "...", "artifact": "intent.md" },
 *           ...
 *         }
 *       },
 *       "2": { ... }
 *     }
 *   }
 *
 * Concurrency: writes are serialized through a mkdir-based lock on the
 * target path. POSIX `fs.rename` is atomic on the same filesystem, so
 * the temp-file rename pattern provides crash-safe persistence even when
 * multiple Claude sessions (or hooks) race.
 */
import fsExtra from 'fs-extra';
const { readFile, writeFile, ensureDir, mkdir, rename, stat, rm } = fsExtra;
import { dirname } from 'node:path';
import { createHash } from 'node:crypto';

export const CYCLE_STAGES = [
  'plan',
  'design',
  'build',
  'test',
  'deploy',
  'maintain',
] as const;

export type CycleStage = (typeof CYCLE_STAGES)[number];

export type StageState =
  | 'pending'
  | 'draft'
  | 'accepted'
  | 'iterating'
  | 'blocked'
  | 'rejected'
  | 'archived';

export interface StageEntry {
  state: StageState;
  ts?: string;
  sha?: string;
  artifact?: string;
}

export interface CycleEntry {
  id: number;
  title: string;
  created_at: string;
  origin: string | null;
  stages: Partial<Record<CycleStage, StageEntry>>;
}

export interface CycleStateFile {
  version: 1;
  current_cycle: number;
  cycles: Record<string, CycleEntry>;
}

export const CYCLE_FILE_VERSION = 1;

/**
 * Empty default — used when no cycle.json exists yet (first run).
 * `current_cycle: 0` means "no cycle active yet"; `incrementCycle`
 * will bump it to 1.
 */
export function emptyCycleState(): CycleStateFile {
  return {
    version: CYCLE_FILE_VERSION,
    current_cycle: 0,
    cycles: {},
  };
}

const LOCK_RETRY_MS = 25;
const LOCK_MAX_WAIT_MS = 5_000;

/**
 * Compute a short sha256 fingerprint for an artifact file path. Used
 * to record which revision of a file was last accepted into a cycle.
 * Falls back to hashing the path string when the file is missing.
 */
export async function shaForFile(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath);
    return createHash('sha256').update(content).digest('hex').slice(0, 12);
  } catch {
    return createHash('sha256').update(filePath).digest('hex').slice(0, 12);
  }
}

async function acquireLock(lockPath: string): Promise<void> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await mkdir(lockPath);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== 'EEXIST') throw err;
      if (Date.now() - start > LOCK_MAX_WAIT_MS) {
        throw new Error(
          `cycle.ts: timed out waiting for lock ${lockPath} after ${LOCK_MAX_WAIT_MS}ms`,
        );
      }
      await new Promise((r) => setTimeout(r, LOCK_RETRY_MS));
    }
  }
}

async function releaseLock(lockPath: string): Promise<void> {
  await rm(lockPath, { recursive: true, force: true });
}

/**
 * Reads `.loshu-sdlc/state/cycle.json`. Returns the empty default when
 * the file is missing or unparseable; never throws.
 */
export async function loadCycleState(path: string): Promise<CycleStateFile> {
  try {
    const content = await readFile(path, 'utf8');
    const parsed = JSON.parse(content) as Partial<CycleStateFile>;
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed.version === CYCLE_FILE_VERSION &&
      typeof parsed.current_cycle === 'number' &&
      parsed.cycles &&
      typeof parsed.cycles === 'object'
    ) {
      return parsed as CycleStateFile;
    }
    return emptyCycleState();
  } catch {
    return emptyCycleState();
  }
}

/**
 * Atomic write of the cycle state file. Writes to `<path>.tmp`, then
 * renames into place. POSIX `rename` is atomic on the same filesystem,
 * so partial-write corruption cannot be observed by readers.
 *
 * A mkdir-based lock at `<path>.lock` serializes concurrent writers.
 */
export async function saveCycleState(
  path: string,
  state: CycleStateFile,
): Promise<void> {
  const lockPath = `${path}.lock`;
  const tmpPath = `${path}.tmp`;
  await ensureDir(dirname(path));
  await acquireLock(lockPath);
  try {
    await writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmpPath, path);
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Bump `current_cycle` to the next integer, append a new entry, and
 * persist. Returns the new cycle id. Uses a mkdir lock so concurrent
 * incrementCycle calls produce unique IDs (no lost increments).
 */
export async function incrementCycle(
  path: string,
  title: string,
  origin?: string | null,
): Promise<number> {
  const lockPath = `${path}.lock`;
  await ensureDir(dirname(path));
  await acquireLock(lockPath);
  try {
    const state = await loadCycleState(path);
    const next = state.current_cycle + 1;
    const entry: CycleEntry = {
      id: next,
      title,
      created_at: new Date().toISOString(),
      origin: origin ?? null,
      stages: {
        plan: { state: 'pending' },
        design: { state: 'pending' },
        build: { state: 'pending' },
        test: { state: 'pending' },
        deploy: { state: 'pending' },
        maintain: { state: 'pending' },
      },
    };
    state.current_cycle = next;
    state.cycles[String(next)] = entry;
    const tmpPath = `${path}.tmp`;
    await writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmpPath, path);
    return next;
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Merge a stage update into a cycle entry. Existing stage fields not
 * present in `stateData` are preserved. The merged result is persisted
 * atomically.
 *
 * Returns the merged stage entry.
 */
export async function updateStage(
  path: string,
  cycleId: number,
  stage: CycleStage,
  stateData: StageEntry,
): Promise<StageEntry> {
  const lockPath = `${path}.lock`;
  await ensureDir(dirname(path));
  await acquireLock(lockPath);
  try {
    const state = await loadCycleState(path);
    const entry = state.cycles[String(cycleId)];
    if (!entry) {
      throw new Error(
        `updateStage: cycle ${cycleId} not found in ${path}`,
      );
    }
    const prev = entry.stages[stage] ?? { state: 'pending' };
    const merged: StageEntry = { ...prev, ...stateData };
    entry.stages = { ...entry.stages, [stage]: merged };
    state.cycles[String(cycleId)] = entry;
    const tmpPath = `${path}.tmp`;
    await writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmpPath, path);
    return merged;
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Returns the id of the currently active cycle, or `null` when no
 * cycle has been started yet.
 */
export async function getCurrentCycleId(path: string): Promise<number | null> {
  const state = await loadCycleState(path);
  return state.current_cycle > 0 ? state.current_cycle : null;
}

/**
 * Returns the stage entry for `(cycleId, stage)`, or `null` if either
 * does not exist.
 */
export async function getStage(
  path: string,
  cycleId: number,
  stage: CycleStage,
): Promise<StageEntry | null> {
  const state = await loadCycleState(path);
  const entry = state.cycles[String(cycleId)];
  if (!entry) return null;
  return entry.stages[stage] ?? null;
}

/**
 * Marks the current cycle as archived — every stage that has been
 * touched gets set to `archived`. Stages that were never started
 * (`pending`) stay as `pending`. The cycle id is preserved.
 */
export async function archiveCycle(path: string): Promise<number | null> {
  const lockPath = `${path}.lock`;
  await ensureDir(dirname(path));
  await acquireLock(lockPath);
  try {
    const state = await loadCycleState(path);
    const id = state.current_cycle;
    if (id <= 0) return null;
    const entry = state.cycles[String(id)];
    if (!entry) return null;
    const stages: Partial<Record<CycleStage, StageEntry>> = {};
    for (const stage of CYCLE_STAGES) {
      const prev = entry.stages[stage] ?? { state: 'pending' };
      stages[stage] = {
        ...prev,
        state: prev.state === 'pending' ? 'pending' : 'archived',
        ts: new Date().toISOString(),
      };
    }
    entry.stages = stages;
    state.cycles[String(id)] = entry;
    const tmpPath = `${path}.tmp`;
    await writeFile(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    await rename(tmpPath, path);
    return id;
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Helper: derive a `sha` fingerprint for `filePath` if it exists.
 * Returns `undefined` when the file is missing (callers should still
 * proceed — sha is optional metadata).
 */
export async function shaIfExists(
  filePath: string,
): Promise<string | undefined> {
  try {
    await stat(filePath);
    return shaForFile(filePath);
  } catch {
    return undefined;
  }
}

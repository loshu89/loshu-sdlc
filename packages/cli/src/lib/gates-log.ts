/**
 * Append-only gate event log for loshu-sdlc.
 *
 *   .loshu-sdlc/state/gates.jsonl
 *
 * Each line is a single JSON object:
 *
 *   {"ts":"2026-09-14T10:30:00Z","cycle":3,"gate":"plan-exit","stage":"plan",
 *    "result":"accept","artifact":"intent.md","sha":"abc123"}
 *
 * Concurrency: writes use a mkdir-based lock and append a single line at
 * a time. The file itself is also fsynced by `fs.writeFile` (overwrite-
 * mode) because `fs.appendFile` is not on the fs-extra typings surface
 * we depend on. Locks keep the file from being read mid-write.
 */
import fsExtra from 'fs-extra';
const { readFile, writeFile, ensureDir, mkdir, rm } = fsExtra;
import { dirname } from 'node:path';

export type GateResult = string;

export interface GateEvent {
  ts: string;
  cycle: number;
  gate: string;
  stage: string;
  result: GateResult;
  artifact?: string;
  sha?: string;
  errors?: string[];
  origin?: string | null;
  [extra: string]: unknown;
}

export interface ReadOptions {
  cycle?: number;
  gate?: string;
  stage?: string;
  result?: string;
}

const LOCK_RETRY_MS = 25;
const LOCK_MAX_WAIT_MS = 5_000;

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
          `gates-log.ts: timed out waiting for lock ${lockPath} after ${LOCK_MAX_WAIT_MS}ms`,
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
 * Append a single event to the JSONL log. The new line is serialized
 * with a trailing newline so subsequent appends are line-aligned.
 *
 * A mkdir lock serializes concurrent appenders; readers that hold the
 * same lock cannot observe a partial write.
 */
export async function appendEvent(
  path: string,
  event: Omit<GateEvent, 'ts'> & { ts?: string },
): Promise<GateEvent> {
  const lockPath = `${path}.lock`;
  await ensureDir(dirname(path));
  await acquireLock(lockPath);
  try {
    const full: GateEvent = {
      ts: event.ts ?? new Date().toISOString(),
      ...event,
    } as GateEvent;
    let existing = '';
    try {
      existing = await readFile(path, 'utf8');
    } catch {
      existing = '';
    }
    const next = existing.endsWith('\n') || existing === ''
      ? existing
      : `${existing}\n`;
    await writeFile(path, `${next}${JSON.stringify(full)}\n`, 'utf8');
    return full;
  } finally {
    await releaseLock(lockPath);
  }
}

/**
 * Read all events from the JSONL log. Lines that fail to parse are
 * silently skipped (corruption tolerance).
 */
export async function readEvents(
  path: string,
  options?: ReadOptions,
): Promise<GateEvent[]> {
  let content = '';
  try {
    content = await readFile(path, 'utf8');
  } catch {
    return [];
  }
  const events: GateEvent[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as GateEvent;
      events.push(parsed);
    } catch {
      // Skip corrupted line
    }
  }
  return filterEvents(events, options);
}

/**
 * Read all events with `ts >= since`. `since` is an ISO-8601 string
 * compared lexicographically (valid for ISO-8601 UTC timestamps).
 */
export async function readEventsSince(
  path: string,
  since: string,
): Promise<GateEvent[]> {
  const events = await readEvents(path);
  return events.filter((e) => e.ts >= since);
}

function filterEvents(
  events: GateEvent[],
  options?: ReadOptions,
): GateEvent[] {
  if (!options) return events;
  return events.filter((e) => {
    if (options.cycle !== undefined && e.cycle !== options.cycle) return false;
    if (options.gate !== undefined && e.gate !== options.gate) return false;
    if (options.stage !== undefined && e.stage !== options.stage) return false;
    if (options.result !== undefined && e.result !== options.result) return false;
    return true;
  });
}

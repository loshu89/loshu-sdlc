# Task 10: Logs polish + tests

**Goal:** Logs command already mostly works. Polish the parseLine regex to match the actual hook log format (read `lib/event-emit.sh` to confirm), and add the missing tests.

**Spec:** v0.7.0-design §3.

**Files:**
- Modify: `packages/cli/src/commands/logs.ts` (if regex needs fixing after comparison with event-emit.sh).
- Create: `packages/cli/tests/commands/logs.test.ts`

- [ ] **Step 1: Read `packages/cli/src/commands/logs.ts` end-to-end and `packages/plugin/hooks/lib/event-emit.sh` (the log producer)**

Confirm the format emitted by event-emit.sh matches what `parseLine` expects. The current regex (logs.ts:95):
```ts
const m = line.match(/^(\S+)\s+(?:\[([^\]]+)\]\s+)?(\w+)\s+(.*)$/);
```
Expects `<timestamp> [tags] LEVEL message`. If event-emit.sh emits a different format (e.g., `<timestamp> LEVEL message` with no tags), tighten or loosen the regex.

- [ ] **Step 2: If the regex needs adjustment, edit it**

Skip this step if the existing regex already matches event-emit's output.

- [ ] **Step 3: Create `tests/commands/logs.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { logs } from '../../src/commands/logs.js';

describe('loshu-sdlc logs', () => {
  let logDir: string;
  let origHome: string | undefined;

  beforeEach(async () => {
    origHome = process.env.HOME;
    process.env.HOME = await mkdtemp(join(tmpdir(), 'loshu-logs-home-'));
    logDir = join(process.env.HOME, '.loshu-sdlc/logs');
    await import('fs-extra').then((m) => m.ensureDir(logDir));
  });

  afterEach(async () => {
    if (origHome === undefined) delete process.env.HOME;
    else process.env.HOME = origHome;
    await rm(process.env.HOME!, { recursive: true, force: true });
  });

  it('reads and prints log entries', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      [
        '2026-01-01T00:00:00Z [cycle=1 stage=plan] INFO plan-exit: accepted intent',
        '2026-01-01T00:00:01Z [cycle=1 stage=design] ERROR design-exit: failed',
      ].join('\n'),
      'utf-8',
    );
    const rc = await logs({});
    expect(rc).toBe(0);
    // Can't easily capture console output here; the rc=0 + no-throw is the
    // primary signal. Add an explicit JSON-output variant below for
    // shape verification.
  });

  it('JSON output shape', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      '2026-01-01T00:00:00Z [cycle=1 stage=plan] INFO msg',
      'utf-8',
    );
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await logs({ json: true });
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(captured);
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]).toMatchObject({ cycle: 1, stage: 'plan', level: 'INFO' });
  });

  it('filters by --cycle', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      '2026-01-01T00:00:00Z [cycle=1 stage=plan] INFO c1\n2026-01-01T00:00:01Z [cycle=2 stage=design] INFO c2',
      'utf-8',
    );
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await logs({ json: true, cycle: 1 });
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(captured);
    expect(parsed.entries.every((e: any) => e.cycle === 1)).toBe(true);
  });

  it('--tail N returns the last N entries', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      ['2026-01-01T00:00:00Z INFO 1', '2026-01-01T00:00:01Z INFO 2', '2026-01-01T00:00:02Z INFO 3'].join('\n'),
      'utf-8',
    );
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await logs({ json: true, tail: 2 });
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(captured);
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0].message).toBe('2');
    expect(parsed.entries[1].message).toBe('3');
  });

  it('returns no entries when log dir is empty (exit 0)', async () => {
    const rc = await logs({});
    expect(rc).toBe(0);
  });
});
```

- [ ] **Step 4: Run the test file**

Run: `npx pnpm@9.0.0 test -- tests/commands/logs.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/logs.ts \
        packages/cli/tests/commands/logs.test.ts
git commit -m "test(logs): coverage for filter, tail, JSON output + dir empty

5 new tests:
  - reads and prints log entries (text output)
  - JSON output shape: { entries: [{ cycle, stage, level, message, timestamp }] }
  - --cycle N filter
  - --tail N returns last N entries
  - empty log dir → exit 0 with no output

Also (if needed) tightens parseLine regex to match the actual
format emitted by hooks/lib/event-emit.sh."
```
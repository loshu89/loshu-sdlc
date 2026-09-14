import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cycle } from '../../src/commands/cycle.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loshu-cycle-cmd-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

function captureLogs(): { logs: string[]; restore: () => void } {
  const logs: string[] = [];
  const original = console.log;
  console.log = (msg: string) => logs.push(msg);
  return { logs, restore: () => (console.log = original) };
}

function captureErrors(): { errors: string[]; restore: () => void } {
  const errors: string[] = [];
  const original = console.error;
  console.error = (msg: string) => errors.push(msg);
  return { errors, restore: () => (console.error = original) };
}

describe('cycle command — help', () => {
  it('prints help with no subcommand and exits 0', async () => {
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: undefined, path: tmp });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    expect(logs.join('\n')).toMatch(/Usage/);
  });
});

describe('cycle status', () => {
  it('shows "(no cycle yet)" hint when state is empty', async () => {
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: 'status', path: tmp });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    expect(logs.join('\n')).toMatch(/no cycle yet/);
  });

  it('emits JSON with the cycle state', async () => {
    const { restore } = captureLogs();
    try {
      await cycle({ subcommand: 'new', title: 'demo', path: tmp });
      const code = await cycle({ subcommand: 'status', path: tmp, json: true });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    // Read the cycle.json file directly to assert the persisted state.
    const filePath = join(tmp, '.loshu-sdlc/state/cycle.json');
    const persisted = JSON.parse(await readFile(filePath, 'utf8')) as {
      current_cycle: number;
      cycles: Record<string, { title: string }>;
    };
    expect(persisted.current_cycle).toBe(1);
    expect(persisted.cycles['1']?.title).toBe('demo');
  });

  it('renders a table for cycles with multiple stages set', async () => {
    const { logs, restore } = captureLogs();
    try {
      await cycle({ subcommand: 'new', title: 'OAuth authentication', path: tmp });
      await cycle({ subcommand: 'set', stage: 'plan', state: 'accepted', path: tmp });
      const code = await cycle({ subcommand: 'status', path: tmp });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const out = logs.join('\n');
    expect(out).toContain('OAuth authentication');
    expect(out).toContain('plan');
    expect(out).toContain('accepted');
  });
});

describe('cycle new', () => {
  it('rejects without a title', async () => {
    const { errors, restore } = captureErrors();
    try {
      const code = await cycle({ subcommand: 'new', path: tmp });
      expect(code).toBe(2);
    } finally {
      restore();
    }
    expect(errors.join('\n')).toMatch(/Usage/);
  });

  it('increments counter and creates entry on each call', async () => {
    const { restore } = captureLogs();
    try {
      await cycle({ subcommand: 'new', title: 'first', path: tmp });
      await cycle({ subcommand: 'new', title: 'second', path: tmp, origin: 'maintain/3sigma:error_rate' });
      const code = await cycle({ subcommand: 'status', path: tmp, json: true });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const filePath = join(tmp, '.loshu-sdlc/state/cycle.json');
    const persisted = JSON.parse(await readFile(filePath, 'utf8')) as {
      current_cycle: number;
      cycles: Record<string, { title: string; origin: string | null }>;
    };
    expect(persisted.current_cycle).toBe(2);
    expect(persisted.cycles['1']?.title).toBe('first');
    expect(persisted.cycles['1']?.origin).toBeNull();
    expect(persisted.cycles['2']?.title).toBe('second');
    expect(persisted.cycles['2']?.origin).toBe('maintain/3sigma:error_rate');
  });
});

describe('cycle set', () => {
  it('rejects unknown stage', async () => {
    const { errors, restore } = captureErrors();
    try {
      await cycle({ subcommand: 'new', title: 'demo', path: tmp });
      const code = await cycle({ subcommand: 'set', stage: 'banana', state: 'accepted', path: tmp });
      expect(code).toBe(2);
    } finally {
      restore();
    }
    expect(errors.join('\n')).toMatch(/Unknown stage/);
  });

  it('rejects unknown state', async () => {
    const { errors, restore } = captureErrors();
    try {
      await cycle({ subcommand: 'new', title: 'demo', path: tmp });
      const code = await cycle({ subcommand: 'set', stage: 'plan', state: 'purple', path: tmp });
      expect(code).toBe(2);
    } finally {
      restore();
    }
    expect(errors.join('\n')).toMatch(/Unknown state/);
  });

  it('refuses to set stage when no active cycle exists', async () => {
    const { errors, restore } = captureErrors();
    try {
      const code = await cycle({ subcommand: 'set', stage: 'plan', state: 'accepted', path: tmp });
      expect(code).toBe(6);
    } finally {
      restore();
    }
    expect(errors.join('\n')).toMatch(/No active cycle/);
  });

  it('updates a stage entry and persists sha when the artifact exists', async () => {
    const intent = join(tmp, 'intent.md');
    await writeFile(intent, '# Demo intent\n', 'utf8');
    const { logs, restore } = captureLogs();
    try {
      await cycle({ subcommand: 'new', title: 'demo', path: tmp });
      const code = await cycle({ subcommand: 'set', stage: 'plan', state: 'accepted', path: tmp, json: true });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const out = logs.join('\n');
    const jsonStart = out.lastIndexOf('{');
    const parsed = JSON.parse(out.slice(jsonStart)) as {
      stage: string;
      state: string;
      artifact: string;
      sha?: string;
    };
    expect(parsed.stage).toBe('plan');
    expect(parsed.state).toBe('accepted');
    expect(parsed.artifact).toBe('intent.md');
    expect(parsed.sha).toMatch(/^[0-9a-f]{12}$/);
  });
});

describe('cycle log', () => {
  it('shows empty hint when no events have been recorded', async () => {
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: 'log', path: tmp });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    expect(logs.join('\n')).toMatch(/no gate events/);
  });

  it('lists events that have been written by append-event', async () => {
    // Suppress append-event success messages by capturing and discarding.
    const setup = captureLogs();
    try {
      await cycle({
        subcommand: 'append-event',
        path: tmp,
        gateName: 'plan-exit',
        stage: 'plan',
        result: 'accept',
        artifact: 'intent.md',
        cycle: 3,
        sha: 'abc123',
      });
      await cycle({
        subcommand: 'append-event',
        path: tmp,
        gateName: 'design-exit',
        stage: 'design',
        result: 'block',
        cycle: 3,
        errors: ['architecture required'],
      });
    } finally {
      setup.restore();
    }
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: 'log', path: tmp });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const out = logs.join('\n');
    expect(out).toContain('plan-exit');
    expect(out).toContain('design-exit');
    expect(out).toContain('architecture required');
  });

  it('filters by --gate', async () => {
    const setup = captureLogs();
    try {
      await cycle({ subcommand: 'append-event', path: tmp, gateName: 'plan-exit', stage: 'plan', result: 'accept', cycle: 1 });
      await cycle({ subcommand: 'append-event', path: tmp, gateName: 'design-exit', stage: 'design', result: 'accept', cycle: 1 });
    } finally {
      setup.restore();
    }
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: 'log', path: tmp, gate: 'plan-exit' });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const out = logs.join('\n');
    expect(out).toContain('plan-exit');
    expect(out).not.toContain('design-exit');
  });

  it('honors --tail', async () => {
    const setup = captureLogs();
    try {
      for (let i = 0; i < 5; i++) {
        await cycle({ subcommand: 'append-event', path: tmp, gateName: `g${i}`, stage: 'plan', result: 'accept', cycle: 1 });
      }
    } finally {
      setup.restore();
    }
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: 'log', path: tmp, tail: 2 });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const out = logs.join('\n');
    expect(out).toContain('g3');
    expect(out).toContain('g4');
    expect(out).not.toContain('g0');
  });

  it('emits JSON when --json is set', async () => {
    const setup = captureLogs();
    try {
      await cycle({ subcommand: 'append-event', path: tmp, gateName: 'plan-exit', stage: 'plan', result: 'accept', cycle: 1 });
    } finally {
      setup.restore();
    }
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({ subcommand: 'log', path: tmp, json: true });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const parsed = JSON.parse(logs.join('\n')) as { events: unknown[] };
    expect(Array.isArray(parsed.events)).toBe(true);
    expect(parsed.events.length).toBe(1);
  });
});

describe('cycle archive', () => {
  it('refuses to archive when no cycle exists', async () => {
    const { errors, restore } = captureErrors();
    try {
      const code = await cycle({ subcommand: 'archive', path: tmp });
      expect(code).toBe(6);
    } finally {
      restore();
    }
    expect(errors.join('\n')).toMatch(/No active cycle/);
  });

  it('marks the current cycle as archived', async () => {
    const { restore } = captureLogs();
    try {
      await cycle({ subcommand: 'new', title: 'demo', path: tmp });
      await cycle({ subcommand: 'set', stage: 'plan', state: 'accepted', path: tmp });
      const code = await cycle({ subcommand: 'archive', path: tmp });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const filePath = join(tmp, '.loshu-sdlc/state/cycle.json');
    const persisted = JSON.parse(await readFile(filePath, 'utf8')) as {
      cycles: Record<string, { stages: Record<string, { state: string }> }>;
    };
    expect(persisted.cycles['1']?.stages.plan?.state).toBe('archived');
  });
});

describe('cycle append-event', () => {
  it('requires --gate, --stage, and --result', async () => {
    const { errors, restore } = captureErrors();
    try {
      const code = await cycle({ subcommand: 'append-event', path: tmp });
      expect(code).toBe(2);
    } finally {
      restore();
    }
    expect(errors.join('\n')).toMatch(/Usage/);
  });

  it('writes a line to gates.jsonl', async () => {
    const { logs, restore } = captureLogs();
    try {
      const code = await cycle({
        subcommand: 'append-event',
        path: tmp,
        gateName: 'plan-exit',
        stage: 'plan',
        result: 'accept',
        artifact: 'intent.md',
        cycle: 1,
        sha: 'abc',
        json: true,
      });
      expect(code).toBe(0);
    } finally {
      restore();
    }
    const parsed = JSON.parse(logs.join('\n')) as { gate: string; result: string; cycle: number };
    expect(parsed.gate).toBe('plan-exit');
    expect(parsed.result).toBe('accept');
    expect(parsed.cycle).toBe(1);
    // Confirm the file was actually written
    const content = await readFile(join(tmp, '.loshu-sdlc/state/gates.jsonl'), 'utf8');
    expect(content).toContain('plan-exit');
  });
});

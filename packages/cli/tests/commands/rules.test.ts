import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execa } from 'execa';
import { rules, RULES } from '../../src/commands/rules.js';

// Auto-mock `execa` (no factory). The schema-runner tests don't call
// execa; the eslint tests do, and they install their own resolved /
// rejected value per test. The borrowed-stub path also doesn't call
// execa.
vi.mock('execa');

describe('rules command', () => {
  it('list prints all rules', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await rules({ subcommand: 'list' });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    const out = logs.join('\n');
    for (const r of RULES) {
      expect(out).toContain(r.name);
    }
  });

  it('list --json emits JSON object', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await rules({ subcommand: 'list', json: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    const parsed = JSON.parse(logs.join('\n')) as { rules: typeof RULES };
    expect(parsed.rules.length).toBe(RULES.length);
  });

  it('check <name> returns 0 for a known rule', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await rules({ subcommand: 'check', name: 'attribution-provenance', path: '.' });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
  });

  it('check returns 2 for an unknown rule', async () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (msg: string) => errors.push(msg);
    try {
      const code = await rules({ subcommand: 'check', name: 'nonexistent-rule' });
      expect(code).toBe(2);
    } finally {
      console.error = original;
    }
    expect(errors.join('\n')).toMatch(/Unknown rule/);
  });

  it('check requires a name', async () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (msg: string) => errors.push(msg);
    try {
      const code = await rules({ subcommand: 'check' });
      expect(code).toBe(2);
    } finally {
      console.error = original;
    }
  });
});

// v0.7.0: real runners for the md-schema rules. We point `path` at
// the markdown file itself (the runner only validates when the path's
// basename ends with `.md` — passing a directory would short-circuit
// to pass and never exercise the schema).
describe('rules check <schema-rule>', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-rule-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  // v0.6.0 Identity: stage-c##-slug-####(hex)-ULID(26 chars Crockford
  // Base32, no I/L/O/U).
  const INTENT_ID = 'plan-c01-rule-0001-01H00000000000000000000000';
  const SPEC_ID = 'design-c01-rule-0001-01H00000000000000000000000';
  const PLAN_ID = 'build-c01-rule-0001-01H00000000000000000000000';
  const CREATED_AT = '2026-01-01T00:00:00Z';

  function captureLog(): { logs: string[]; restore: () => void } {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    return { logs, restore: () => (console.log = original) };
  }

  it('intent-md-schema: passes for a valid intent.md', async () => {
    const intent = join(tmp, 'intent.md');
    await writeFile(
      intent,
      [
        '---',
        `id: ${INTENT_ID}`,
        'schema_version: 0.5.0',
        'cycle_id: 1',
        'stage: plan',
        'state: draft',
        'created_by: human:test',
        `created_at: ${CREATED_AT}`,
        'title: Test intent',
        'problem: p',
        'proposedOutcome: o',
        'affectedUsersAndSystems:',
        '  - users',
        'openQuestions: []',
        '---',
        'body',
      ].join('\n'),
    );

    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'intent-md-schema', path: intent });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);
  });

  it('intent-md-schema: fails for an invalid intent.md', async () => {
    const intent = join(tmp, 'intent.md');
    await writeFile(intent, '---\nfoo: bar\n---\nbody'); // missing required fields

    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'intent-md-schema', path: intent });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(1);
  });

  it('spec-md-schema: passes for a valid spec.md', async () => {
    const spec = join(tmp, 'spec.md');
    await writeFile(
      spec,
      [
        '---',
        `id: ${SPEC_ID}`,
        'schema_version: 0.5.0',
        'cycle_id: 1',
        'stage: design',
        'state: draft',
        'created_by: human:test',
        `created_at: ${CREATED_AT}`,
        'title: Test spec',
        'intent: intent.md',
        'architecture: Single-page app',
        'verificationCriteria:',
        '  - Build passes',
        '---',
        'body',
      ].join('\n'),
    );

    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'spec-md-schema', path: spec });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);
  });

  it('plan-md-schema: passes for a valid plan.md', async () => {
    const plan = join(tmp, 'plan.md');
    await writeFile(
      plan,
      [
        '---',
        `id: ${PLAN_ID}`,
        'schema_version: 0.5.0',
        'cycle_id: 1',
        'stage: build',
        'state: draft',
        'created_by: human:test',
        `created_at: ${CREATED_AT}`,
        'title: Test plan',
        'spec: spec.md',
        'tasks:',
        '  - id: "1"',
        '    title: Task one',
        'verification:',
        '  build: echo build',
        '  test: echo test',
        '  lint: echo lint',
        '---',
        'body',
      ].join('\n'),
    );

    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'plan-md-schema', path: plan });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);
  });
});

// v0.7.0: eslint runner with execa mocked. In real execa, a non-zero
// exit code rejects the returned promise; the mock mirrors that with
// `mockRejectedValue` so the runner's catch branch runs and surfaces
// stderr.
describe('rules check eslint', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-rule-'));
    vi.mocked(execa).mockReset();
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  function captureLog(): { logs: string[]; restore: () => void } {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    return { logs, restore: () => (console.log = original) };
  }

  it('passes when eslint exits 0', async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as never);

    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'eslint', path: tmp });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);
  });

  it('fails when eslint exits non-zero (output surfaced)', async () => {
    // execa rejects on non-zero exit. Put the lint output in stdout
    // (real eslint writes lint errors there); the runner surfaces
    // stdout when set, with stderr as a fallback.
    vi.mocked(execa).mockRejectedValue({
      stdout: 'foo.ts\n  1:5  error  no-unused-vars  no-unused-vars\n  2:7  warning  semi',
      stderr: '',
      exitCode: 1,
    } as never);

    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'eslint', path: tmp });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(1);
    // At least one error line should appear in the human-readable output.
    expect(cap.logs.join('\n')).toMatch(/no-unused-vars/);
  });
});

// Borrowed-skill stub fallback (no runner field on the rule) and the
// unknown-rule branch.
describe('rules check (borrowed / unknown)', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-rule-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  function captureLog(): { logs: string[]; restore: () => void } {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    return { logs, restore: () => (console.log = original) };
  }

  function captureError(): { errors: string[]; restore: () => void } {
    const errors: string[] = [];
    const original = console.error;
    console.error = (msg: string) => errors.push(msg);
    return { errors, restore: () => (console.error = original) };
  }

  it('returns the stub pass for borrowed rules (e.g. tdd)', async () => {
    const cap = captureLog();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'tdd', path: tmp });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);
  });

  it('exits 2 for unknown rule names', async () => {
    const cap = captureError();
    let rc = -1;
    try {
      rc = await rules({ subcommand: 'check', name: 'no-such-rule', path: tmp });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(2);
  });
});
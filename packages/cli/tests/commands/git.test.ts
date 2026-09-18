/**
 * Integration tests for `git sync`.
 *
 * Pattern: follow `tests/lib/platforms/github.test.ts` — auto-mock
 * `execa` and dispatch on `(cmd, args)` to return canned output. The
 * sync flow is fs-aware (cycle.json + CODEOWNERS) so each test uses
 * mkdtemp + chdir rather than mocking the filesystem.
 *
 * Why real `git init` in beforeEach: the brief calls out that we need
 * a real git repo on disk for the `ensureGitRepo` preflight to see a
 * `--git-dir` output. We let the unmocked `execa` make that call, then
 * swap in the mock for the actual sync run.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, ensureDir } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { git } from '../../src/commands/git.js';
import { execa } from 'execa';

// Auto-mock 'execa' (no factory) — vitest preserves the module's
// export types so vi.mocked(execa) is typed as the real signature.
vi.mock('execa');

// Minimal execa return shape: stdout / stderr / exitCode. Cast through
// unknown because vi.mocked() expects the generic ExecaReturnBase type
// which is impractical to construct field-for-field here.
type ExecaReturn = Awaited<ReturnType<typeof execa>>;
function mockExeca(stdout = '', stderr = '', exitCode = 0): ExecaReturn {
  return { stdout, stderr, exitCode } as unknown as ExecaReturn;
}

// Capture console.log + console.error + console.warn so tests can
// assert on the printed intended commands without polluting test
// output.
function captureConsole(): { logs: string[]; errors: string[]; warns: string[]; restore: () => void } {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  console.log = (msg: string) => logs.push(msg);
  console.error = (msg: string) => errors.push(msg);
  console.warn = (msg: string) => warns.push(msg);
  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
    },
  };
}

// Save / restore process.cwd() around each test. `git()` reads the
// project root from process.cwd() (single-arg signature), so the test
// must chdir into the mkdtemp sandbox.
const ORIG_CWD = process.cwd();

function makeCycle(extraStages: Record<string, { state: string; artifact: string }> = {}) {
  return {
    version: 1,
    current_cycle: 1,
    cycles: {
      '1': {
        id: 1,
        title: 'demo cycle',
        created_at: new Date().toISOString(),
        origin: null,
        stages: {
          plan: { state: 'accepted', artifact: 'intent.md' },
          ...extraStages,
        },
      },
    },
  };
}

async function writeCycle(cwd: string, cycle: ReturnType<typeof makeCycle>): Promise<void> {
  await ensureDir(join(cwd, '.loshu-sdlc/state'));
  await writeFile(join(cwd, '.loshu-sdlc/state/cycle.json'), JSON.stringify(cycle));
}

describe('git sync --dry-run (default)', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-git-'));
    // Unmock execa for the git init step. vitest's auto-mock factory
    // does not block direct imports — but since we mocked at the top
    // of this file, all execa() calls route through vi.mocked(execa).
    // Temporarily swap in a pass-through that returns the basic shape.
    vi.mocked(execa).mockImplementation(() => Promise.resolve(mockExeca('')));
    await execa('git', ['init', '-b', 'main'], { cwd: tmp });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: tmp });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: tmp });
    process.env.GHCR_TOKEN = 'ghp_test';
    process.env.LOSHU_REPO = 'foo/bar';
    vi.mocked(execa).mockClear();
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(ORIG_CWD);
    await rm(tmp, { recursive: true, force: true });
    delete process.env.GHCR_TOKEN;
    delete process.env.LOSHU_REPO;
  });

  it('prints the intended git commands without mutating anything', async () => {
    await writeCycle(tmp, makeCycle());
    await writeFile(join(tmp, 'intent.md'), '---\nid: x\n---\nbody');

    vi.mocked(execa).mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') {
        return Promise.resolve(mockExeca('.git'));
      }
      if (cmd === 'git' && args[0] === 'rev-parse') {
        return Promise.resolve(mockExeca('abc123'));
      }
      return Promise.resolve(mockExeca(''));
    });

    const cap = captureConsole();
    let rc = -1;
    try {
      rc = await git({ subcommand: 'sync', cycleId: 1, dryRun: true });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);

    // runGit() prints "$ git <args>" to stdout for every command, so we
    // can read what was intended (and crucially: NOT executed) from
    // the captured log lines.
    const printed = cap.logs.join('\n');
    expect(printed).toMatch(/checkout/);
    expect(printed).toMatch(/add intent\.md/);
    expect(printed).toMatch(/commit/);
    expect(printed).toMatch(/push origin sdlc\/cycle-01-demo-cycle/);
  });
});

describe('git sync preflight', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-git-'));
    process.chdir(tmp);
  });

  afterEach(async () => {
    process.chdir(ORIG_CWD);
    await rm(tmp, { recursive: true, force: true });
    delete process.env.GHCR_TOKEN;
    delete process.env.GITLAB_TOKEN;
    delete process.env.GITHUB_TOKEN;
  });

  it('exits 2 when not in a git repo', async () => {
    // No git init — every execa call throws so ensureGitRepo fails.
    vi.mocked(execa).mockImplementation(() => {
      throw new Error('not a git repository');
    });

    await writeCycle(tmp, makeCycle());
    const cap = captureConsole();
    let rc = -1;
    try {
      rc = await git({ subcommand: 'sync', cycleId: 1 });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(2);
    expect(cap.errors.join('\n')).toMatch(/not in a git working tree/);
  });

  it('exits 2 when no token configured', async () => {
    // Preflight git rev-parse passes, but configFromEnv() throws
    // because no token env var is set.
    delete process.env.GHCR_TOKEN;
    delete process.env.GITLAB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    vi.mocked(execa).mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') {
        return Promise.resolve(mockExeca('.git'));
      }
      if (cmd === 'git' && args[0] === 'rev-parse') {
        return Promise.resolve(mockExeca('abc123'));
      }
      return Promise.resolve(mockExeca(''));
    });

    await writeCycle(tmp, makeCycle());
    const cap = captureConsole();
    let rc = -1;
    try {
      rc = await git({ subcommand: 'sync', cycleId: 1, execute: true });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(2);
    expect(cap.errors.join('\n')).toMatch(/no platform token in env/);
  });
});

describe('git sync --execute', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-git-'));
    // Initialize a real repo so the mocked `git rev-parse --git-dir`
    // could plausibly match if we ever stopped mocking.
    vi.mocked(execa).mockImplementation(() => Promise.resolve(mockExeca('')));
    await execa('git', ['init', '-b', 'main'], { cwd: tmp });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: tmp });
    await execa('git', ['config', 'user.name', 'Test'], { cwd: tmp });
    vi.mocked(execa).mockClear();
    process.chdir(tmp);
    process.env.GHCR_TOKEN = 'ghp_test';
    process.env.LOSHU_REPO = 'foo/bar';
  });

  afterEach(async () => {
    process.chdir(ORIG_CWD);
    await rm(tmp, { recursive: true, force: true });
    delete process.env.GHCR_TOKEN;
    delete process.env.LOSHU_REPO;
  });

  it('opens a PR and writes cycleEntry.pr to cycle.json when all stages accepted', async () => {
    vi.mocked(execa).mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') {
        return Promise.resolve(mockExeca('.git'));
      }
      if (cmd === 'git' && args[0] === 'rev-parse') {
        return Promise.resolve(mockExeca('abc123'));
      }
      if (cmd === 'git' && args[0] === 'diff' && args[1] === '--cached') {
        // exitCode 0 = nothing staged; non-zero = staged. Commit path
        // wants staged, so return non-zero.
        return Promise.resolve(mockExeca('', '', 1));
      }
      if (cmd === 'gh') {
        return Promise.resolve(mockExeca('https://github.com/foo/bar/pull/42\n'));
      }
      return Promise.resolve(mockExeca(''));
    });

    await writeCycle(tmp, makeCycle());
    await writeFile(join(tmp, 'intent.md'), '---\nid: x\n---\nbody');

    const cap = captureConsole();
    let rc = -1;
    try {
      rc = await git({ subcommand: 'sync', cycleId: 1, execute: true });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);

    const updated = JSON.parse(
      await readFile(join(tmp, '.loshu-sdlc/state/cycle.json'), 'utf8'),
    ) as {
      cycles: Record<
        string,
        {
          pr?: { number: number; url: string; state: string };
          platform?: { provider: string; repo: string };
        }
      >;
    };
    expect(updated.cycles['1']?.pr).toEqual({
      number: 42,
      url: 'https://github.com/foo/bar/pull/42',
      state: 'open',
    });
    expect(updated.cycles['1']?.platform).toEqual({ provider: 'github', repo: 'foo/bar' });
  });

  it('does NOT open a PR when some stages are not accepted', async () => {
    vi.mocked(execa).mockImplementation((cmd: string, args: string[]) => {
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') {
        return Promise.resolve(mockExeca('.git'));
      }
      if (cmd === 'git' && args[0] === 'rev-parse') {
        return Promise.resolve(mockExeca('abc123'));
      }
      if (cmd === 'git' && args[0] === 'diff' && args[1] === '--cached') {
        return Promise.resolve(mockExeca('', '', 1));
      }
      return Promise.resolve(mockExeca(''));
    });

    // plan = accepted (would commit) ; design = draft (NOT accepted) =>
    // all-stages-accepted gate fails, no PR open.
    await writeCycle(
      tmp,
      makeCycle({ design: { state: 'draft', artifact: 'spec.md' } }),
    );
    await writeFile(join(tmp, 'intent.md'), '---\nid: x\n---\nbody');
    await writeFile(join(tmp, 'spec.md'), '---\nid: y\n---\nbody');

    const cap = captureConsole();
    let rc = -1;
    try {
      rc = await git({ subcommand: 'sync', cycleId: 1, execute: true });
    } finally {
      cap.restore();
    }
    expect(rc).toBe(0);

    const updated = JSON.parse(
      await readFile(join(tmp, '.loshu-sdlc/state/cycle.json'), 'utf8'),
    ) as {
      cycles: Record<string, { pr?: unknown }>;
    };
    expect(updated.cycles['1']?.pr).toBeUndefined();

    // `gh` must NOT have been called.
    const ghCalls = vi.mocked(execa).mock.calls.filter(([cmd]) => cmd === 'gh');
    expect(ghCalls.length).toBe(0);
    expect(cap.logs.join('\n')).toMatch(/not all stages accepted/);
  });
});

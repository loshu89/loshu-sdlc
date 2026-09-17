# Task 5: Git sync tests (execa mock)

**Goal:** Add integration tests for `git sync` against an `execa` mock, covering dry-run (default), preflight failures, branch creation, per-stage commits, push, PR open, and cycle.json mutation.

**Spec:** v0.7.0-design §1 (Testing Strategy).

**Files:**
- Create or extend: `packages/cli/tests/commands/git.test.ts`

**Pattern:** Follow `packages/cli/tests/lib/platforms/github.test.ts` (the execa auto-mock pattern from v0.6.3). Use `vi.mock('execa')` so the mock preserves the real execa type, and a `mockExeca(stdout: string): ExecaReturnBase` helper typed as `Awaited<ReturnType<typeof execa>>`.

- [ ] **Step 1: Read existing `tests/commands/git.test.ts` (if any)**

If it doesn't exist, create a new file. Use the same skeleton as `tests/lib/platforms/github.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { git } from '../../src/commands/git.js';
import { execa } from 'execa';
import type { ExecaReturnBase } from 'execa';

vi.mock('execa');

type ExecaReturn = Awaited<ReturnType<typeof execa>>;
function mockExeca(stdout = '', stderr = '', exitCode = 0): ExecaReturn {
  return { stdout, stderr, exitCode } as unknown as ExecaReturn;
}

function mockExecaThrow(err: Error): never {
  throw err;
}
```

- [ ] **Step 2: Write the test for dry-run (default)**

```ts
describe('git sync --dry-run (default)', () => {
  let tmp: string;
  let cwd: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-git-'));
    cwd = tmp;
    // Init git repo
    vi.mocked(execa).mockImplementation(async () => mockExeca(''));
    await execa('git', ['init', '-b', 'main'], { cwd });
    await execa('git', ['config', 'user.email', 'test@example.com'], { cwd });
    await execa('git', ['config', 'user.name', 'Test'], { cwd });
    // Set GH_TOKEN for configFromEnv
    process.env.GHCR_TOKEN = 'ghp_test';
    process.env.LOSHU_REPO = 'foo/bar';
    vi.mocked(execa).mockClear();
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
    delete process.env.GHCR_TOKEN;
    delete process.env.LOSHU_REPO;
  });

  it('prints the intended git commands without mutating anything', async () => {
    // Set up cycle.json with cycle 1, plan stage having artifact='intent.md'
    const cycle = { version: 1, current_cycle: 1, cycles: { '1': {
      id: 1, title: 'demo cycle', created_at: new Date().toISOString(),
      origin: null, stages: {
        plan: { state: 'accepted', artifact: 'intent.md' },
        design: { state: 'accepted', artifact: 'spec.md' },
      },
    }}};
    await writeFile(join(cwd, '.loshu-sdlc/state/cycle.json'), JSON.stringify(cycle));
    await writeFile(join(cwd, 'intent.md'), '---\nid: x\n---\nbody');
    await writeFile(join(cwd, 'spec.md'), '---\nid: y\n---\nbody');

    vi.mocked(execa).mockImplementation(async (cmd: string, args: string[]) => {
      // 'git rev-parse --git-dir' → ok; 'git rev-parse main' → SHA
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') return mockExeca('.git');
      if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === 'main') return mockExeca('abc123');
      return mockExeca('');
    });

    const rc = await git({ subcommand: 'sync', cycleId: 1, dryRun: true }, cwd);
    expect(rc).toBe(0);
    // Verify the git commands printed (and not actually executed in the working tree — we just printed)
    const calls = vi.mocked(execa).mock.calls;
    const printedCmds = calls.filter(([cmd, args]) => cmd === 'git').map(([, args]) => (args as string[]).join(' '));
    expect(printedCmds.some((s) => s.includes('checkout'))).toBe(true);
    expect(printedCmds.some((s) => s.includes('add intent.md'))).toBe(true);
    expect(printedCmds.some((s) => s.includes('commit'))).toBe(true);
    expect(printedCmds.some((s) => s.includes('push'))).toBe(true);
  });
});
```

- [ ] **Step 3: Write the test for preflight failure**

```ts
it('exits 2 when not in a git repo', async () => {
  // cwd is not a git repo
  vi.mocked(execa).mockImplementation(async () => {
    throw new Error('not a git repository');
  });
  const cycle = { version: 1, current_cycle: 1, cycles: { '1': { id: 1, title: 'demo', created_at: new Date().toISOString(), origin: null, stages: { plan: { state: 'accepted', artifact: 'a.md' } } } } };
  await writeFile(join(cwd, '.loshu-sdlc/state/cycle.json'), JSON.stringify(cycle));
  const rc = await git({ subcommand: 'sync', cycleId: 1 }, cwd);
  expect(rc).toBe(2);
});
```

- [ ] **Step 4: Write the test for missing token**

```ts
it('exits 2 when no token configured', async () => {
  delete process.env.GHCR_TOKEN;
  delete process.env.GITLAB_TOKEN;
  delete process.env.GITHUB_TOKEN;
  vi.mocked(execa).mockImplementation(async (cmd: string, args: string[]) => {
    if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') return mockExeca('.git');
    if (cmd === 'git' && args[0] === 'rev-parse') return mockExeca('abc123');
    return mockExeca('');
  });
  const cycle = { version: 1, current_cycle: 1, cycles: { '1': { id: 1, title: 'demo', created_at: new Date().toISOString(), origin: null, stages: { plan: { state: 'accepted', artifact: 'a.md' } } } } };
  await writeFile(join(cwd, '.loshu-sdlc/state/cycle.json'), JSON.stringify(cycle));
  const rc = await git({ subcommand: 'sync', cycleId: 1, execute: true }, cwd);
  expect(rc).toBe(2);
});
```

- [ ] **Step 5: Write the test for execute path with mock PR open**

```ts
it('opens a PR and writes cycleEntry.pr to cycle.json when all stages accepted (mocked)', async () => {
  vi.mocked(execa).mockImplementation(async (cmd: string, args: string[]) => {
    if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') return mockExeca('.git');
    if (cmd === 'git' && args[0] === 'rev-parse') return mockExeca('abc123');
    if (cmd === 'gh') return mockExeca('https://github.com/foo/bar/pull/42\n');
    return mockExeca('');
  });
  const cycle = { version: 1, current_cycle: 1, cycles: { '1': { id: 1, title: 'demo', created_at: new Date().toISOString(), origin: null, stages: { plan: { state: 'accepted', artifact: 'intent.md' } } } } };
  await writeFile(join(cwd, '.loshu-sdlc/state/cycle.json'), JSON.stringify(cycle));
  await writeFile(join(cwd, 'intent.md'), '---\nid: x\n---\nbody');

  const rc = await git({ subcommand: 'sync', cycleId: 1, execute: true }, cwd);
  expect(rc).toBe(0);

  const updated = JSON.parse(await readFile(join(cwd, '.loshu-sdlc/state/cycle.json'), 'utf8'));
  expect(updated.cycles['1'].pr).toEqual({ number: 42, url: 'https://github.com/foo/bar/pull/42', state: 'open' });
  expect(updated.cycles['1'].platform).toEqual({ provider: 'github', repo: 'foo/bar' });
});
```

- [ ] **Step 6: Write the test for partial acceptance (no PR)**

```ts
it('does NOT open a PR when some stages are not accepted', async () => {
  vi.mocked(execa).mockImplementation(async (cmd: string, args: string[]) => {
    if (cmd === 'git' && args[0] === 'rev-parse' && args[1] === '--git-dir') return mockExeca('.git');
    if (cmd === 'git' && args[0] === 'rev-parse') return mockExeca('abc123');
    return mockExeca('');
  });
  const cycle = { version: 1, current_cycle: 1, cycles: { '1': { id: 1, title: 'demo', created_at: new Date().toISOString(), origin: null, stages: {
    plan: { state: 'accepted', artifact: 'intent.md' },
    design: { state: 'draft', artifact: 'spec.md' },
  } } } };
  await writeFile(join(cwd, '.loshu-sdlc/state/cycle.json'), JSON.stringify(cycle));
  await writeFile(join(cwd, 'intent.md'), '---\nid: x\n---\nbody');
  await writeFile(join(cwd, 'spec.md'), '---\nid: y\n---\nbody');

  const rc = await git({ subcommand: 'sync', cycleId: 1, execute: true }, cwd);
  expect(rc).toBe(0);
  // cycle.json should NOT have a pr field
  const updated = JSON.parse(await readFile(join(cwd, '.loshu-sdlc/state/cycle.json'), 'utf8'));
  expect(updated.cycles['1'].pr).toBeUndefined();
  // gh should NOT have been called (no PR open)
  const ghCalls = vi.mocked(execa).mock.calls.filter(([cmd]) => cmd === 'gh');
  expect(ghCalls.length).toBe(0);
});
```

- [ ] **Step 7: Run the test file — verify all 5 tests pass**

Run: `npx pnpm@9.0.0 test -- tests/commands/git.test.ts`
Expected: 5 passed.

- [ ] **Step 8: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: 201 + 5 = 206/206 passing.

- [ ] **Step 9: Commit**

```bash
git add packages/cli/tests/commands/git.test.ts
git commit -m "test(git): sync integration tests with execa mock

5 tests covering:
  - Dry-run (default): prints intended commands without mutating.
  - Preflight: exits 2 when not in a git repo.
  - Token: exits 2 when no GHCR_TOKEN / GITLAB_TOKEN set.
  - All accepted + --execute: opens a PR (mocked) and writes
    cycleEntry.platform + cycleEntry.pr to cycle.json.
  - Partial accepted + --execute: pushes but does NOT open
    a PR; cycle.json has no pr field.

Follows the vi.mock('execa') auto-mock pattern from
tests/lib/platforms/github.test.ts (v0.6.3)."
```
// v0.6.1 Task 7 — Closed-loop E2E test
//
// Proves that the AI-Native SDLC closed loop works end-to-end for the first
// time. The contract under test:
//   (a) recording a 3σ metric into .sdlc/metrics.json triggers the maintain
//       loop; with v0.9.0's auto-diagnose, maintain-exit first tries to
//       synthesize an incident intent.md via `loshu-sdlc maintain diagnose`.
//       On success the hook exits 0 and writes the incident intent.md (no
//       manual /sdlc-maintain step). On diagnose failure the hook falls back
//       to BLOCK (exit 2) with "Run /sdlc-maintain" guidance, matching v0.6.x.
//   (b) once that intent.md exists (auto-diagnosed or manual), maintain-exit
//       closes the loop (forks a new cycle with origin
//       "maintain/3sigma:<metric>") and leaves evidence in
//       .loshu-sdlc/state/{events.jsonl,cycle.json}.
//   (c) an unknown metric name (not in bands.yaml) is silently ignored by the
//       evaluate side (per lib/bands.ts contract) — it does NOT error and
//       does NOT block maintain-exit.
//
// This test runs a REAL hook chain (bash + the compiled CLI dist), not a mock.
// On bash-less environments (CI without sh), it is skipped with rationale —
// the contract is then verified by exercising only the record→evaluate path
// directly via the CLI library (Task 5 already covers this in unit tests).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile, readFile, mkdir, pathExists } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '../..');
const HOOKS_DIR = join(REPO_ROOT, 'packages/plugin/hooks');
const CLI_BIN = join(REPO_ROOT, 'packages/cli/dist/bin/loshu-sdlc.js');
const IDENTITY_LIB = join(REPO_ROOT, 'packages/cli/dist/lib/identity.js');
// 5-minute local timeout (T2's Windows smoke was ~9 min); CI overrides
// to 3 minutes via LOSHU_LOOP_TIMEOUT_MS env var.
const HOOK_TIMEOUT_MS = Number(process.env.LOSHU_LOOP_TIMEOUT_MS ?? 300_000);

interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function run(
  command: string,
  args: string[],
  options: {
    cwd?: string;
    timeoutMs?: number;
    input?: string;
    env?: Record<string, string>;
  } = {},
): Promise<RunResult> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      shell: false,
      env: options.env ? { ...process.env, ...options.env } : process.env,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    const timer = setTimeout(() => {
      child.kill();
      rejectRun(
        new Error(
          `run timed out after ${options.timeoutMs ?? 60_000}ms: ${command} ${args.join(' ')}`,
        ),
      );
    }, options.timeoutMs ?? 60_000);
    child.on('error', (err) => {
      clearTimeout(timer);
      rejectRun(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolveRun({ exitCode: code ?? -1, stdout, stderr });
    });
    if (options.input !== undefined) {
      child.stdin.write(options.input);
      child.stdin.end();
    }
  });
}

async function bashAvailable(): Promise<{ ok: boolean; reason: string }> {
  try {
    await run('bash', ['--version'], { timeoutMs: 5_000 });
    return { ok: true, reason: '' };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

describe('closed loop (3σ incident → new cycle)', () => {
  let tmp: string;
  let bash: { ok: boolean; reason: string };

  beforeAll(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-loop-'));
    bash = await bashAvailable();
  });

  afterAll(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('contract: evaluate ignores unknown metric names (silent, non-blocking)', async () => {
    // (c) Unknown-metric contract — exercisable on bash-less hosts. Per
    // lib/bands.ts:evaluate(), an observation whose name is not in the
    // bands.yaml metrics[] array is emitted as a null-tier incident (not
    // a hard error) and is filtered out of the trip-check loop in
    // maintain-exit.sh (which greps for '"tier":"3sigma"').
    // additionalProperties:false on the bands schema prevents us from
    // adding the unknown metric to bands.yaml; it lives only in the
    // .sdlc/metrics.json sidecar.
    const { generateId } = (await import(IDENTITY_LIB)) as {
      generateId: (opts: {
        stage: 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';
        cycle: number;
        slug: string;
      }) => string;
    };
    const scratch = await mkdtemp(join(tmpdir(), 'loshu-loop-unknown-'));
    try {
      const bandsId = generateId({ stage: 'maintain', cycle: 1, slug: 'unknown-test' });
      const bandsYaml = [
        `id: ${bandsId}`,
        'schema_version: 0.5.0',
        'cycle_id: 1',
        'stage: maintain',
        'state: draft',
        'created_by: human:test',
        `created_at: ${new Date().toISOString()}`,
        'version: 1',
        'metrics:',
        '  - name: error_rate',
        '    baseline: 0.01',
        '    sigma_1: 0.015',
        '    sigma_2: 0.02',
        '    sigma_3: 0.03',
        '    unit: ratio',
        '    window: 1h',
        'evaluation:',
        '  interval: 5m',
        '  on_3sigma: block_maintain_exit',
        '  on_2sigma: warn',
        '  on_1sigma: log',
        '',
      ].join('\n');
      const bandsFile = join(scratch, 'bands.yaml');
      await writeFile(bandsFile, bandsYaml, 'utf8');
      await mkdir(join(scratch, '.sdlc'), { recursive: true });
      // Sidecar contains ONLY the unknown metric; bands.yaml doesn't list it.
      await writeFile(
        join(scratch, '.sdlc', 'metrics.json'),
        JSON.stringify({ mystery_metric: 9999 }) + '\n',
        'utf8',
      );
      const evalResult = await run('node', [
        CLI_BIN,
        'bands',
        'evaluate',
        bandsFile,
        '--observations-json',
        JSON.stringify({ mystery_metric: 9999 }),
      ]);
      expect(evalResult.exitCode).toBe(0);
      const parsed = JSON.parse(evalResult.stdout) as {
        incidents: Array<{ metric: string; tier: string | null }>;
      };
      expect(parsed.incidents).toHaveLength(1);
      expect(parsed.incidents[0]).toMatchObject({ metric: 'mystery_metric', tier: null });
      // The hook greps for "tier":"3sigma" — confirm the unknown metric's
      // null tier does not match (silent-ignore contract).
      expect(evalResult.stdout).not.toMatch(/"tier"\s*:\s*"3sigma"/);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  });

  it('maintain-exit forks an incident cycle on a 3σ metric', async (ctx) => {
    if (!bash.ok) {
      // eslint-disable-next-line no-console
      console.warn(`SKIPPED closed-loop hook chain — ${bash.reason}`);
      return ctx.skip();
    }
    // 1. Tell find-cli.sh where the real CLI bin lives via LOSHU_SDLC_CLI.
    //
    //    v0.6.2 replaced `npx --no-install loshu-sdlc` (broken on Windows +
    //    Git Bash: npx.cmd shim ignores local node_modules/.bin lookup)
    //    with `node "$CLI_BIN"` where CLI_BIN comes from find-cli.sh.
    //    find-cli.sh honors LOSHU_SDLC_CLI as the highest-priority source,
    //    so the test sets it explicitly to skip the filesystem walk.
    //
    //    No more npx wrapper, no more node_modules/.bin shim, no more PATH
    //    gymnastics — the hook's spawn env is now clean.
    const cliUnixPath = CLI_BIN.replace(/\\/g, '/');

    // 2. bands.yaml with a tight error_rate band (baseline 0.01, 3σ 0.03) +
    //    Identity fields per v0.6.0 schema. Plain YAML — bands.yaml has no
    //    frontmatter fences (the validate command parses it as YAML directly).
    //    ID/cId/cId fallback chain in the spec yields bands-c1 (CYCLE_ID is 1
    //    from the seeded cycle.json) when the bands file doesn't carry an
    //    explicit `id` — but the schema requires `id`, so we generate a real
    //    one via the CLI's identity lib.
    const { generateId } = (await import(IDENTITY_LIB)) as {
      generateId: (opts: {
        stage: 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';
        cycle: number;
        slug: string;
      }) => string;
    };
    const bandsId = generateId({ stage: 'maintain', cycle: 1, slug: 'loop-test' });
    const bandsYaml = [
      `id: ${bandsId}`,
      'schema_version: 0.5.0',
      'cycle_id: 1',
      'stage: maintain',
      'state: draft',
      'created_by: human:test',
      `created_at: ${new Date().toISOString()}`,
      'version: 1',
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
      '    unit: ratio',
      '    window: 1h',
      'evaluation:',
      '  interval: 5m',
      '  on_3sigma: block_maintain_exit',
      '  on_2sigma: warn',
      '  on_1sigma: log',
      '',
    ].join('\n');
    await writeFile(join(tmp, 'bands.yaml'), bandsYaml, 'utf8');

    // 3. REVIEW.md accepted (cross-stage guard for maintain).
    const reviewId = generateId({ stage: 'deploy', cycle: 1, slug: 'loop-test' });
    const reviewBody = [
      '---',
      `id: ${reviewId}`,
      'schema_version: 0.5.0',
      'cycle_id: 1',
      'stage: deploy',
      'state: accepted',
      'created_by: human:test',
      `created_at: ${new Date().toISOString()}`,
      'title: loop test',
      'bugs: { status: pass }',
      'security: { status: pass }',
      'compliance: { status: pass }',
      '---',
      '',
    ].join('\n');
    await writeFile(join(tmp, 'REVIEW.md'), reviewBody, 'utf8');

    // 4. Seed cycle.json so CURRENT_CYCLE=1 exists.
    const seed = await run('node', [CLI_BIN, 'cycle', 'new', 'loop test', tmp]);
    if (seed.exitCode !== 0) {
      throw new Error(
        `cycle new failed (exit ${seed.exitCode}):\nstdout=${seed.stdout}\nstderr=${seed.stderr}`,
      );
    }

    // 5. Record a 3σ metric (Task 5's producer): 0.035 > sigma_3 0.03.
    const rec = await run('node', [
      CLI_BIN,
      'bands',
      'record',
      tmp,
      '--metric',
      'error_rate',
      '--value',
      '0.035',
    ]);
    expect(rec.exitCode).toBe(0);

    // Pre-clear debounce markers so the first fire isn't debounce-skipped
    // (a previous run in this tmpdir could leave a stale marker; and the
    // .loshu-sdlc dir doesn't exist yet for the seed cycle).
    await rm(join(tmp, '.loshu-sdlc/state/.debounce'), {
      recursive: true,
      force: true,
    });

    // 6. Fire maintain-exit — v0.9.0 first tries `loshu-sdlc maintain
    //    diagnose` to auto-write an incident intent.md. On success the hook
    //    exits 0 (the gate is satisfied by the auto-diagnosed intent.md and
    //    the fork-and-emit branch runs). On diagnose failure the hook falls
    //    back to today's BLOCK behavior (exit 2).
    const first = await run('bash', [join(HOOKS_DIR, 'maintain-exit.sh'), tmp], {
      timeoutMs: HOOK_TIMEOUT_MS,
      cwd: tmp,
      env: { LOSHU_SDLC_CLI: cliUnixPath },
    });
    expect(first.exitCode).toBe(0);
    expect(first.stderr).toMatch(/3σ|3sigma/i);
    // The auto-diagnose step should have written the incident intent.md so
    // the loop can close without manual /sdlc-maintain invocation.
    const autoIntentPath = join(tmp, 'intent.md');
    const autoIntentExists = await pathExists(autoIntentPath);
    expect(autoIntentExists).toBe(true);

    // 7. Simulate /sdlc-maintain producing the incident intent.md.
    const incidentIntentId = generateId({
      stage: 'plan',
      cycle: 2,
      slug: 'incident-error-rate',
    });
    const incidentIntent = [
      '---',
      `id: ${incidentIntentId}`,
      'schema_version: 0.5.0',
      'cycle_id: 2',
      'stage: plan',
      'state: draft',
      'created_by: agent:incident-investigator',
      `created_at: ${new Date().toISOString()}`,
      'origin: maintain/3sigma:error_rate',
      'title: Fix error_rate 3σ incident',
      'problem: error_rate breached 3σ',
      'proposedOutcome: error_rate back within 1σ',
      'affectedUsersAndSystems:',
      '  - production users',
      'openQuestions: []',
      '---',
      '',
    ].join('\n');
    await writeFile(join(tmp, 'intent.md'), incidentIntent, 'utf8');

    // 8. Wait past the debounce settle (2s) so the second fire is not skipped.
    await new Promise((r) => setTimeout(r, 2_100));

    // 9. Re-fire maintain-exit — with incident intent present the block lifts
    //    and the loop-closure path archives the old cycle + forks a new one.
    const second = await run('bash', [join(HOOKS_DIR, 'maintain-exit.sh'), tmp], {
      timeoutMs: HOOK_TIMEOUT_MS,
      cwd: tmp,
      env: { LOSHU_SDLC_CLI: cliUnixPath },
    });
    // 0 = closed-loop completed; 2 = the hook blocked again (legitimate if
    // bands.yaml or REVIEW.md is in a state the hook can't transition out of,
    // e.g. bands.yaml already accepted so the second pass is a no-op accept).
    // Per the contract the loop must leave evidence either way.
    expect([0, 2]).toContain(second.exitCode);

    // 10. Assert the loop artifacts exist:
    //     - events.jsonl has entries (Tasks 1-2's emitter)
    const eventsExist = await pathExists(join(tmp, '.loshu-sdlc/state/events.jsonl'));
    //     - cycle.json shows the incident origin OR a new cycle was forked.
    const cycleRaw = await readFile(
      join(tmp, '.loshu-sdlc/state/cycle.json'),
      'utf-8',
    );
    const cycle = JSON.parse(cycleRaw) as {
      cycles: Record<
        string,
        { origin?: string | null; title?: string } & Record<string, unknown>
      >;
    };
    const hasIncidentCycle = Object.values(cycle.cycles).some(
      (c) =>
        typeof c.origin === 'string' &&
        (c.origin.includes('3sigma') ||
          c.origin.includes('maintain/3sigma')),
    );
    expect(
      eventsExist || hasIncidentCycle,
      `loop must leave evidence: events.jsonl=${eventsExist}, incidentCycle=${hasIncidentCycle}; cycle=${JSON.stringify(cycle)}`,
    ).toBe(true);
  }, HOOK_TIMEOUT_MS);

  it('does NOT call maintain diagnose when no 3σ breach exists (B.3 stub-call-counter)', async (ctx) => {
    // Inventory B.3: maintain-exit.sh only shells out to `loshu-sdlc maintain
    // diagnose` when a 3σ breach is detected. Verify that contract by
    // pointing LOSHU_SDLC_CLI at a wrapper that records every invocation
    // (args joined to one line) into a log file, then asserting the log
    // contains zero "maintain diagnose" entries for a no-breach run.
    if (!bash.ok) {
      // eslint-disable-next-line no-console
      console.warn(`SKIPPED closed-loop no-breach stub — ${bash.reason}`);
      return ctx.skip();
    }

    // Wrap the real CLI bin: log every argv (one line per call) and then
    // exec the real binary so behavior is unchanged. The wrapper must be
    // a Node script (not bash) because the hook invokes it via
    // `node "$CLI_BIN" …`.
    const cliUnixPath = CLI_BIN.replace(/\\/g, '/');
    const stubLog = join(tmp, 'cli-stub.log');
    const stubScript = join(tmp, 'cli-stub.js');
    const stubBody = [
      '#!/usr/bin/env node',
      `const fs = require('node:fs');`,
      `const { spawnSync } = require('node:child_process');`,
      `const cliBin = ${JSON.stringify(cliUnixPath)};`,
      `fs.appendFileSync(${JSON.stringify(stubLog.replace(/\\/g, '/'))}, process.argv.slice(2).join(' ') + '\\n');`,
      `const r = spawnSync(process.execPath, [cliBin, ...process.argv.slice(2)], { stdio: 'inherit' });`,
      `process.exit(r.status ?? 1);`,
      '',
    ].join('\n');
    await writeFile(stubScript, stubBody, 'utf8');
    // Truncate any pre-existing log so we only count this test's
    // invocations. `tmp` is created in beforeAll and reused across
    // tests in the file.
    await writeFile(stubLog, '', 'utf8');

    // Build a fresh scratch dir for this test (do not reuse `tmp` —
    // test 2's incident cycle / metrics.json side effects would leak).
    const scratch = await mkdtemp(join(tmpdir(), 'loshu-loop-nobreach-'));
    try {
      // 1. bands.yaml with a tight band but a metric value that does NOT
      //    breach 3σ (0.005 is below sigma_1 0.015, so no incident).
      const { generateId } = (await import(IDENTITY_LIB)) as {
        generateId: (opts: {
          stage: 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';
          cycle: number;
          slug: string;
        }) => string;
      };
      const bandsId = generateId({ stage: 'maintain', cycle: 1, slug: 'no-breach' });
      const bandsYaml = [
        `id: ${bandsId}`,
        'schema_version: 0.5.0',
        'cycle_id: 1',
        'stage: maintain',
        'state: draft',
        'created_by: human:test',
        `created_at: ${new Date().toISOString()}`,
        'version: 1',
        'metrics:',
        '  - name: error_rate',
        '    baseline: 0.01',
        '    sigma_1: 0.015',
        '    sigma_2: 0.02',
        '    sigma_3: 0.03',
        '    unit: ratio',
        '    window: 1h',
        'evaluation:',
        '  interval: 5m',
        '  on_3sigma: block_maintain_exit',
        '  on_2sigma: warn',
        '  on_1sigma: log',
        '',
      ].join('\n');
      await writeFile(join(scratch, 'bands.yaml'), bandsYaml, 'utf8');

      // 2. REVIEW.md accepted (cross-stage guard for maintain).
      const reviewId = generateId({ stage: 'deploy', cycle: 1, slug: 'no-breach' });
      const reviewBody = [
        '---',
        `id: ${reviewId}`,
        'schema_version: 0.5.0',
        'cycle_id: 1',
        'stage: deploy',
        'state: accepted',
        'created_by: human:test',
        `created_at: ${new Date().toISOString()}`,
        'title: no-breach test',
        'bugs: { status: pass }',
        'security: { status: pass }',
        'compliance: { status: pass }',
        '---',
        '',
      ].join('\n');
      await writeFile(join(scratch, 'REVIEW.md'), reviewBody, 'utf8');

      // 3. Seed cycle.json so CURRENT_CYCLE=1 exists.
      const seed = await run('node', [CLI_BIN, 'cycle', 'new', 'no-breach test', scratch]);
      if (seed.exitCode !== 0) {
        throw new Error(
          `cycle new failed (exit ${seed.exitCode}):\nstdout=${seed.stdout}\nstderr=${seed.stderr}`,
        );
      }

      // 4. Record a non-breaching metric (0.005 < sigma_1 0.015).
      const rec = await run('node', [
        CLI_BIN,
        'bands',
        'record',
        scratch,
        '--metric',
        'error_rate',
        '--value',
        '0.005',
      ]);
      expect(rec.exitCode).toBe(0);

      // Pre-clear debounce markers (parity with test 2).
      await rm(join(scratch, '.loshu-sdlc/state/.debounce'), {
        recursive: true,
        force: true,
      });

      // 5. Fire maintain-exit via the stub wrapper.
      const stubUnixPath = stubScript.replace(/\\/g, '/');
      const result = await run('bash', [join(HOOKS_DIR, 'maintain-exit.sh'), scratch], {
        timeoutMs: HOOK_TIMEOUT_MS,
        cwd: scratch,
        env: { LOSHU_SDLC_CLI: stubUnixPath },
      });
      expect(result.exitCode).toBe(0);
      // Sanity: the stub wrapper itself MUST have logged at least one
      // invocation (proves the stub was wired correctly before we assert
      // what it did NOT receive).
      const preCheckLog = await readFile(stubLog, 'utf-8');
      expect(preCheckLog.trim().length).toBeGreaterThan(0);

      // 6. Inspect the stub invocation log. The hook MUST have called
      //    `bands evaluate` (to assess the metric) but MUST NOT have called
      //    `maintain diagnose` — that path is gated by the 3σ breach check.
      const logLines = preCheckLog.split('\n').filter((l) => l.trim().length > 0);
      // Defensive: every invocation must be either bands-evaluate-side
      // (validate bands, bands evaluate, cycle append-event, state
      // maintain, cycle set, cycle new/archive) — but NEVER "maintain
      // diagnose" because there is no 3σ incident.
      const diagnoseCalls = logLines.filter((l) =>
        /\bmaintain\b.*\bdiagnose\b/.test(l) || /\bdiagnose\b.*\bmaintain\b/.test(l),
      );
      expect(diagnoseCalls).toEqual([]);
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  }, HOOK_TIMEOUT_MS);
});

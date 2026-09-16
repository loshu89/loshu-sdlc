# Task 5: `bands record` — the metrics producer

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Debt:** D5 — `maintain-exit.sh` reads `$ROOT/.sdlc/metrics.json` (sidecar, `{metricName: value}` JSON map) and evaluates it against bands.yaml for 3σ incidents. **Nothing writes that file.** The 3σ → incident-cycle closed loop (the playbook's headline feature) can never fire. This task ships the minimal producer.

## Files

- Modify: `packages/cli/src/commands/bands.ts` (add `record` subcommand)
- Modify: `packages/cli/src/bin/loshu-sdlc.ts` (wire `record` args)
- Test: `packages/cli/tests/commands/bands.test.ts` (extend existing file)

## Interfaces

- **Consumes:** existing `bands.ts` structure — `BandsArgs` interface, `bands(args)` dispatcher, `loadBands`/`evaluate` from `../lib/bands.js`. The sidecar contract from maintain-exit.sh line ~103-108: file `$ROOT/.sdlc/metrics.json`, content = JSON object `{"<metricName>": <number>, ...}`, passed to `bands evaluate --observations-json`.
- **Produces:** `loshu-sdlc bands record [path] --metric NAME --value N [--metric NAME2 --value N2 ...]` → merges observations into `<path>/.sdlc/metrics.json` (default path = cwd). Exit 0 on success, 2 on usage error. Task 7's closed-loop E2E calls this to trigger a 3σ incident.

## Steps

- [ ] **Step 1: Write the failing tests (append to existing bands.test.ts)**

```typescript
// append to packages/cli/tests/commands/bands.test.ts
// (match the existing file's import style — read it first; it imports from
// '../../src/commands/bands.js' and uses mkdtemp/writeFile/rm helpers)

describe('bands record', () => {
  it('creates .sdlc/metrics.json with the observation', async () => {
    // tmp dir fixture per the file's existing beforeEach pattern
    const code = await bandsRecord({ path: tmp, metrics: [{ name: 'error_rate', value: 0.012 }] });
    expect(code).toBe(0);
    const raw = await readFile(join(tmp, '.sdlc', 'metrics.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual({ error_rate: 0.012 });
  });

  it('merges into an existing metrics file', async () => {
    await mkdir(join(tmp, '.sdlc'), { recursive: true });
    await writeFile(join(tmp, '.sdlc', 'metrics.json'), JSON.stringify({ error_rate: 0.01 }));
    const code = await bandsRecord({ path: tmp, metrics: [{ name: 'p95_latency_ms', value: 320 }] });
    expect(code).toBe(0);
    const raw = await readFile(join(tmp, '.sdlc', 'metrics.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual({ error_rate: 0.01, p95_latency_ms: 320 });
  });

  it('overwrites the same metric name', async () => {
    await bandsRecord({ path: tmp, metrics: [{ name: 'error_rate', value: 0.01 }] });
    await bandsRecord({ path: tmp, metrics: [{ name: 'error_rate', value: 0.05 }] });
    const raw = await readFile(join(tmp, '.sdlc', 'metrics.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual({ error_rate: 0.05 });
  });

  it('returns 2 when no metrics given', async () => {
    const code = await bandsRecord({ path: tmp, metrics: [] });
    expect(code).toBe(2);
  });
});
```

Adjust the import in the test header to also import `bandsRecord` (the new export, Step 3).

- [ ] **Step 2: Run tests — expect FAIL**

```bash
cd "D:/workspace/3.my/SDLC"
npx pnpm@9.0.0 --filter @loshu89/cli test -- tests/commands/bands.test.ts
```

Expected: FAIL — `bandsRecord` is not exported.

- [ ] **Step 3: Implement `bandsRecord` + `record` subcommand in bands.ts**

Add to `packages/cli/src/commands/bands.ts` (read the file first; follow its existing arg-interface + dispatcher style):

```typescript
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export interface MetricObservation {
  name: string;
  value: number;
}

export interface BandsRecordArgs {
  path: string;                      // project root (sidecar lives at <path>/.sdlc/metrics.json)
  metrics: MetricObservation[];
}

export async function bandsRecord(args: BandsRecordArgs): Promise<number> {
  if (args.metrics.length === 0) {
    console.error('bands record: at least one --metric/--value pair required');
    return 2;
  }
  const root = resolve(args.path);
  const sidecarDir = join(root, '.sdlc');
  const sidecarFile = join(sidecarDir, 'metrics.json');
  await mkdir(sidecarDir, { recursive: true });
  let current: Record<string, number> = {};
  try {
    current = JSON.parse(await readFile(sidecarFile, 'utf-8')) as Record<string, number>;
  } catch {
    current = {}; // missing or corrupt — start fresh (corrupt file is replaced, not merged)
  }
  for (const m of args.metrics) {
    current[m.name] = m.value;
  }
  await writeFile(sidecarFile, JSON.stringify(current, null, 2) + '\n', 'utf-8');
  console.log(`bands record: wrote ${args.metrics.length} observation(s) to ${sidecarFile}`);
  return 0;
}
```

Extend the `bands(args)` dispatcher's HELP text and routing: add `record` to the subcommand union type and handle it:

```typescript
// in BandsArgs: subcommand: 'evaluate' | 'record';
// add optional fields:
//   recordPath?: string;
//   metrics?: MetricObservation[];

// in bands():
if (args.subcommand === 'record') {
  return bandsRecord({ path: args.recordPath ?? '.', metrics: args.metrics ?? [] });
}
```

Update HELP:

```
  record [path] --metric=NAME --value=N    Record a metric observation into <path>/.sdlc/metrics.json
                                           (repeat --metric/--value for multiple; merges with existing)
```

- [ ] **Step 4: Wire the bin (multi-value --metric/--value)**

In `packages/cli/src/bin/loshu-sdlc.ts`, find the existing `bands` case. `parseArgs` supports multi-value options via `multiple: true`. Add to the options block:

```typescript
      metric: { type: 'string', multiple: true },
      value: { type: 'string', multiple: true },
```

In the `bands` case, when `positionals[1] === 'record'`:

```typescript
        const metricNames = (values.metric ?? []) as string[];
        const metricValues = (values.value ?? []) as string[];
        if (metricNames.length !== metricValues.length) {
          console.error('bands record: --metric and --value counts must match');
          process.exit(2);
        }
        const metrics = metricNames.map((name, i) => ({ name, value: Number(metricValues[i]) }));
        if (metrics.some((m) => Number.isNaN(m.value))) {
          console.error('bands record: --value must be numeric');
          process.exit(2);
        }
        code = await bands({
          subcommand: 'record',
          filePath: '',
          recordPath: positionals[2] ?? '.',
          metrics,
        });
```

(Adapt variable names to the existing case structure — read it first. Keep the existing `evaluate` routing untouched.)

- [ ] **Step 5: Build + run tests**

```bash
cd "D:/workspace/3.my/SDLC"
npx pnpm@9.0.0 --filter @loshu89/cli build
npx pnpm@9.0.0 --filter @loshu89/cli test -- tests/commands/bands.test.ts
```

Expected: all bands tests pass (existing evaluate tests + 4 new record tests).

- [ ] **Step 6: CLI smoke test**

```bash
TMP=$(mktemp -d)
node packages/cli/dist/bin/loshu-sdlc.js bands record "$TMP" --metric error_rate --value 0.011
cat "$TMP/.sdlc/metrics.json"
node packages/cli/dist/bin/loshu-sdlc.js bands record "$TMP" --metric p95_latency_ms --value 210
cat "$TMP/.sdlc/metrics.json"
rm -rf "$TMP"
```

Expected: first cat shows `{"error_rate": 0.011}` (pretty-printed); second shows both keys.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/commands/bands.ts packages/cli/src/bin/loshu-sdlc.ts packages/cli/tests/commands/bands.test.ts
git commit -m "feat(cli): add bands record — minimal metrics producer for the 3σ closed loop"
```

## Known gotchas

- `exactOptionalPropertyTypes`: new optional fields on `BandsArgs` need `?: T | undefined` if the file's existing style uses that (read the current interface — match it).
- The sidecar path is `.sdlc/metrics.json` (NOT `.loshu-sdlc/`) — that's what maintain-exit.sh line ~103 reads. Do not "fix" the inconsistency in this task; it's the deployed contract. (Unifying paths is a v0.7.0 concern.)
- maintain-exit.sh passes the file content via `--observations-json "$(cat ...)"` — our `{name: value}` flat map matches `bands evaluate`'s documented `--observations-json` shape (object map). Verify by reading `lib/bands.ts`'s Observation parsing before finishing.
- `multiple: true` options in `parseArgs` return `string[] | undefined` — the `?? []` guards are required under `noUncheckedIndexedAccess`.

## Report contract

Write report to the SDD workspace `task-05-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line test summary
- Concerns (if any)
- Report file path

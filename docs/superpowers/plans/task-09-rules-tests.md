# Task 9: Rules tests

**Goal:** Add tests covering both the real runner paths (eslint + intent/spec/plan md-schema) and the borrowed-skill stub fallback (e.g., `tdd`, `verification-before-completion`).

**Spec:** v0.7.0-design §2 (Testing Strategy).

**Files:**
- Create or extend: `packages/cli/tests/commands/rules.test.ts`

- [ ] **Step 1: Read existing `tests/commands/rules.test.ts`**

- [ ] **Step 2: Add tests for the schema runners**

```ts
describe('rules check <schema-rule>', () => {
  let tmp: string;
  beforeEach(async () => { tmp = await mkdtemp(join(tmpdir(), 'loshu-rule-')); });
  afterEach(async () => { await rm(tmp, { recursive: true, force: true }); });

  it('intent-md-schema: passes for a valid intent.md', async () => {
    const intent = join(tmp, 'intent.md');
    await writeFile(intent, '---\nid: plan-c01-foo-0001-01HXYZAAAAAA\nschema_version: 0.5.0\ncycle_id: 1\nstage: plan\nstate: draft\ncreated_at: 2026-01-01T00:00:00Z\ntitle: t\nproblem: p\nproposedOutcome: o\nopenQuestions: []\n---\nbody');
    const rc = await rules({ subcommand: 'check', name: 'intent-md-schema', path: tmp });
    expect(rc).toBe(0);
  });

  it('intent-md-schema: fails for an invalid intent.md', async () => {
    const intent = join(tmp, 'intent.md');
    await writeFile(intent, '---\nfoo: bar\n---\nbody');  // missing required fields
    const rc = await rules({ subcommand: 'check', name: 'intent-md-schema', path: tmp });
    expect(rc).toBe(1);
  });

  it('spec-md-schema: passes for valid spec.md', async () => { /* same pattern */ });
  it('plan-md-schema: passes for valid plan.md', async () => { /* same pattern */ });
});
```

(Use `mkdtemp` / `writeFile` from `fs-extra`, `join` from `node:path`.)

- [ ] **Step 3: Add tests for the eslint runner (with execa mock)**

```ts
describe('rules check eslint', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-rule-'));
    vi.mocked(execa).mockReset();
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('passes when eslint exits 0', async () => {
    vi.mocked(execa).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 } as never);
    const rc = await rules({ subcommand: 'check', name: 'eslint', path: tmp });
    expect(rc).toBe(0);
  });

  it('fails with stderr surfaced when eslint exits non-zero', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'foo.ts\n  1:5  error  no-unused-vars  ...',
      exitCode: 1,
    } as never);
    const rc = await rules({ subcommand: 'check', name: 'eslint', path: tmp });
    expect(rc).toBe(1);
  });
});
```

- [ ] **Step 4: Add a test for the borrowed-skill stub fallback**

```ts
it('returns the stub pass for borrowed rules (e.g. tdd)', async () => {
  const rc = await rules({ subcommand: 'check', name: 'tdd', path: tmp });
  expect(rc).toBe(0);
});
```

- [ ] **Step 5: Add a test for unknown rule**

```ts
it('exits 2 for unknown rule names', async () => {
  const rc = await rules({ subcommand: 'check', name: 'no-such-rule', path: tmp });
  expect(rc).toBe(2);
});
```

- [ ] **Step 6: Run the test file**

Run: `npx pnpm@9.0.0 test -- tests/commands/rules.test.ts`
Expected: ≥6 passed.

- [ ] **Step 7: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: 201 + (rules new) + (other new from 4,5,10,11) = ≥215 passing.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/tests/commands/rules.test.ts
git commit -m "test(rules): coverage for real runners + borrowed stub fallback

Adds tests for:
  - intent-md-schema / spec-md-schema / plan-md-schema: pass
    (valid frontmatter) and fail (missing required fields).
  - eslint: pass (exit 0) and fail (exit non-zero, stderr
    surfaced) — uses the execa mock pattern.
  - Borrowed rule (tdd): stub pass path.
  - Unknown rule name: exit 2.

Total ≥6 new rule tests."
```
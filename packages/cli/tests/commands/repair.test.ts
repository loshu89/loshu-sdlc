import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(__dirname, '../../dist/bin/loshu-sdlc.js');

describe('repair command', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'repair-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('regenerates missing id', async () => {
    await writeFile(
      join(tmp, 'intent.md'),
      `---
title: test
schema_version: 0.5.0
cycle_id: 1
---
content`,
    );
    await execa('node', [CLI_BIN, 'repair', join(tmp, 'intent.md')], { cwd: tmp });
    const after = await readFile(join(tmp, 'intent.md'), 'utf-8');
    expect(after).toMatch(/^id: plan-c01-/m);
  });

  it('--dry-run does not modify file', async () => {
    const before = `---
title: test
---
content`;
    await writeFile(join(tmp, 'intent.md'), before);
    await execa('node', [CLI_BIN, 'repair', join(tmp, 'intent.md'), '--dry-run'], {
      cwd: tmp,
    });
    const after = await readFile(join(tmp, 'intent.md'), 'utf-8');
    expect(after).toBe(before);
  });

  it('reports when file is already valid', async () => {
    await writeFile(
      join(tmp, 'intent.md'),
      `---
id: plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTWXY
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: draft
created_by: human:test
created_at: 2026-09-15T10:00:00Z
---
content`,
    );
    const r = await execa('node', [CLI_BIN, 'repair', join(tmp, 'intent.md')], {
      cwd: tmp,
      reject: false,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toMatch(/already valid/);
  });
});

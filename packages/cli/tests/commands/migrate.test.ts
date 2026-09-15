import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_BIN = resolve(__dirname, '../../dist/bin/loshu-sdlc.js');

describe('migrate command', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'migrate-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('detects outdated schema_version with --check', async () => {
    await writeFile(
      join(tmp, 'intent.md'),
      `---
title: test
schema_version: 0.1.0
---
content`,
    );
    await expect(
      execa('node', [CLI_BIN, 'migrate', join(tmp, 'intent.md'), '--check'], {
        cwd: tmp,
        reject: false,
      }),
    ).resolves.toMatchObject({ exitCode: 1 });
  });

  it('migrates from 0.1.0 to 0.5.0 and sets state to iterating', async () => {
    await writeFile(
      join(tmp, 'intent.md'),
      `---
title: test
schema_version: 0.1.0
state: draft
---
content`,
    );
    await execa('node', [CLI_BIN, 'migrate', join(tmp, 'intent.md')], { cwd: tmp });
    const after = await readFile(join(tmp, 'intent.md'), 'utf-8');
    expect(after).toMatch(/schema_version: 0\.5\.0/);
    expect(after).toMatch(/state: iterating/);
    expect(after).toMatch(/^id: plan-/m);
  });

  it('--dry-run does not modify file', async () => {
    const before = `---
title: test
schema_version: 0.1.0
---
content`;
    await writeFile(join(tmp, 'intent.md'), before);
    await execa('node', [CLI_BIN, 'migrate', join(tmp, 'intent.md'), '--dry-run'], {
      cwd: tmp,
    });
    const after = await readFile(join(tmp, 'intent.md'), 'utf-8');
    expect(after).toBe(before);
  });

  it('rejects migration to unknown version', async () => {
    await writeFile(
      join(tmp, 'intent.md'),
      `---
title: test
schema_version: 0.5.0
---
content`,
    );
    await expect(
      execa(
        'node',
        [CLI_BIN, 'migrate', join(tmp, 'intent.md'), '--to', '9.9.9'],
        { cwd: tmp, reject: false },
      ),
    ).resolves.toMatchObject({ exitCode: 2 });
  });
});

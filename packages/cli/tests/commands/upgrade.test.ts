import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeJson, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { upgrade } from '../../src/commands/upgrade.js';

describe('loshu-sdlc upgrade', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-upgrade-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('uses --to when provided', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '0.5.0', '@loshu89/cli': '0.5.0', '@loshu89/templates': '0.5.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    const rc = await upgrade({ path: tmp, to: '9.9.9', dryRun: true });
    expect(rc).toBe(0);
    // dry-run didn't change anything
    const after = await readFile(join(tmp, 'package.json'), 'utf8');
    expect(after).toContain('0.5.0');
  });

  it('dry-run reports plan but does not write', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '0.5.0', '@loshu89/cli': '0.5.0', '@loshu89/templates': '0.5.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await upgrade({ path: tmp, to: '1.0.0', dryRun: true });
    } finally {
      console.log = origLog;
    }
    expect(captured).toContain('Upgrade plan');
    expect(captured).toContain('1.0.0');
    // Verify no write
    const after = JSON.parse(await readFile(join(tmp, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(after.dependencies['@loshu89/cli']).toBe('0.5.0');
  });

  it('live upgrade writes the new versions', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '0.5.0', '@loshu89/cli': '0.5.0', '@loshu89/templates': '0.5.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    const rc = await upgrade({ path: tmp, to: '1.0.0' });
    expect(rc).toBe(0);
    const after = JSON.parse(await readFile(join(tmp, 'package.json'), 'utf8')) as {
      dependencies: Record<string, string>;
    };
    expect(after.dependencies['@loshu89/cli']).toBe('1.0.0');
    expect(after.dependencies['@loshu89/plugin']).toBe('1.0.0');
    expect(after.dependencies['@loshu89/templates']).toBe('1.0.0');
  });

  it('exits 2 when package.json is missing', async () => {
    const rc = await upgrade({ path: tmp, to: '1.0.0' });
    expect(rc).toBe(2);
  });

  it('reports "Already up to date" when all deps match --to', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '1.0.0', '@loshu89/cli': '1.0.0', '@loshu89/templates': '1.0.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await upgrade({ path: tmp, to: '1.0.0' });
    } finally {
      console.log = origLog;
    }
    expect(captured).toContain('Already up to date');
  });
});

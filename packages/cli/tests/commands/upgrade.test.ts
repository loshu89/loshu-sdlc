import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readJson, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { upgrade } from '../../src/commands/upgrade.js';

async function makeProject(deps: Record<string, string>): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), 'loshu-upgrade-'));
  await writeFile(
    join(tmp, 'package.json'),
    JSON.stringify({
      name: 'demo',
      scripts: { test: 'echo' },
      dependencies: deps,
      devDependencies: { vitest: '^1.0.0' },
    }),
  );
  return tmp;
}

describe('upgrade command', () => {
  it('bumps loshu-sdlc deps and preserves user customizations', async () => {
    const tmp = await makeProject({
      '@loshu89/plugin': '0.0.9',
      '@loshu89/cli': '0.0.9',
      '@loshu89/templates': '0.0.9',
      lodash: '^4.0.0',
    });
    try {
      const code = await upgrade({ path: tmp, to: '0.2.0' });
      expect(code).toBe(0);
      const pkg = (await readJson(join(tmp, 'package.json'))) as {
        dependencies: Record<string, string>;
        devDependencies: Record<string, string>;
        scripts: Record<string, string>;
      };
      expect(pkg.dependencies['@loshu89/plugin']).toBe('0.2.0');
      expect(pkg.dependencies['@loshu89/cli']).toBe('0.2.0');
      expect(pkg.dependencies['@loshu89/templates']).toBe('0.2.0');
      expect(pkg.dependencies['lodash']).toBe('^4.0.0');
      expect(pkg.devDependencies['vitest']).toBe('^1.0.0');
      expect(pkg.scripts['test']).toBe('echo');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('does not write files with --dry-run', async () => {
    const tmp = await makeProject({ '@loshu89/plugin': '0.0.9' });
    try {
      const code = await upgrade({ path: tmp, to: '0.2.0', dryRun: true });
      expect(code).toBe(0);
      const pkg = (await readJson(join(tmp, 'package.json'))) as {
        dependencies: Record<string, string>;
      };
      expect(pkg.dependencies['@loshu89/plugin']).toBe('0.0.9');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns 2 when package.json is missing', async () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (msg: string) => errors.push(msg);
    try {
      const code = await upgrade({ path: '/tmp/definitely-not-real-xyz-upgrade' });
      expect(code).toBe(2);
    } finally {
      console.error = original;
    }
  });
});
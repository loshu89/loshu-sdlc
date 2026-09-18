import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { readJsonSync } from 'fs-extra';
import { join } from 'node:path';

describe('loshu-sdlc --version', () => {
  it('prints the CLI package.json version (not a hardcoded literal)', async () => {
    const cliRoot = join(import.meta.dirname, '..', '..');
    const pkg = readJsonSync(join(cliRoot, 'package.json')) as { version: string };
    const cliBin = join(cliRoot, 'dist', 'bin', 'loshu-sdlc.js');
    const result = await execa('node', [cliBin, '--version']);
    expect(result.stdout.trim()).toBe(`loshu-sdlc ${pkg.version}`);
  });
});

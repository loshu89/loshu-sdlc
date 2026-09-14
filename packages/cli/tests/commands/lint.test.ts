import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, ensureDir } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lint } from '../../src/commands/lint.js';

async function makeProject(files: Record<string, string>): Promise<string> {
  const tmp = await mkdtemp(join(tmpdir(), 'loshu-lint-'));
  const dir = join(tmp, 'packages/plugin/skills/policy-default');
  await ensureDir(dir);
  for (const [name, content] of Object.entries(files)) {
    await writeFile(join(dir, name), content);
  }
  return tmp;
}

describe('lint command', () => {
  it('returns 0 when all borrowed files have provenance headers', async () => {
    const tmp = await makeProject({
      'borrowed.md': '---\nprovenance:\n  source: ui-ux-pro-max\n  license: MIT\n---\n\n# Borrowed',
      'owned.md': '---\nprovenance: loshu-sdlc owns\n---\n\n# Owned',
    });
    try {
      const code = await lint({ path: tmp });
      expect(code).toBe(0);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('returns 5 when a borrowed file declares a source without full provenance', async () => {
    const tmp = await makeProject({
      // declares source but no proper provenance+source frontmatter block
      'borrowed.md': 'source: ui-ux-pro-max\n\n# Borrowed content\n',
      'owned.md': '# Owned (no frontmatter)\n',
    });
    try {
      const code = await lint({ path: tmp });
      expect(code).toBe(5);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('with --fix adds a provenance header to the offending file', async () => {
    const tmp = await makeProject({
      'borrowed.md': 'source: ui-ux-pro-max\n\n# Borrowed content\n',
      'owned.md': '# Owned (no frontmatter)\n',
    });
    try {
      const code = await lint({ path: tmp, fix: true });
      expect(code).toBe(0);
      const content = await readFile(join(tmp, 'packages/plugin/skills/policy-default/borrowed.md'), 'utf8');
      expect(content).toMatch(/^---/);
      expect(content).toMatch(/provenance:/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('emits structured JSON when --json is set', async () => {
    const tmp = await makeProject({
      'borrowed.md': '---\nprovenance:\n  source: ui-ux-pro-max\n  license: MIT\n---\n\n# Borrowed',
      'owned.md': '---\nprovenance: loshu-sdlc owns\n---\n\n# Owned',
    });
    const out: string[] = [];
    const original = console.log;
    console.log = (msg: string) => out.push(msg);
    try {
      await lint({ path: tmp, json: true });
    } finally {
      console.log = original;
      await rm(tmp, { recursive: true, force: true });
    }
    const text = out.join('\n');
    expect(text).toMatch(/"scanned"/);
    expect(text).toMatch(/"borrowed"/);
  });
});
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, outputFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create } from '../../src/commands/create.js';

describe('create command', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loshu-sdlc-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('scaffolds a minimal project into a new directory', async () => {
    const target = join(tmpDir, 'my-app');
    await create({
      path: target,
      template: 'minimal',
      noGit: true,
      yes: true,
      coverage: 80,
      branch: 75,
    });

    const intent = await readFile(join(target, 'intent.md'), 'utf8');
    expect(intent).toContain('my-app');

    const config = await readFile(join(target, '.loshu-sdlc', 'config.yaml'), 'utf8');
    expect(config).toContain('projectName: my-app');
  });

  it('renders README.md via EJS (projectName substitution, no template-syntax leak)', async () => {
    // Both README templates (minimal + full) carry `# <%= projectName %>`
    // at the top. v0.6.0–v0.6.1's scaffolder omitted README.md from the
    // artifactTemplates render list, so the literal `<%= … %>` leaked
    // into every scaffolded project. Fix: add 'README.md' to that list.
    const target = join(tmpDir, 'rendered-readme');
    await create({
      path: target,
      template: 'minimal',
      noGit: true,
      yes: true,
      coverage: 80,
      branch: 75,
    });

    const readme = await readFile(join(target, 'README.md'), 'utf8');
    expect(readme).not.toMatch(/<%=/);
    expect(readme).toContain('rendered-readme');
  });

  it('refuses to scaffold into existing repo without --existing', async () => {
    const target = join(tmpDir, 'existing');
    await outputFile(join(target, 'README.md'), '# existing');

    // Manually init git
    const { execa } = await import('execa');
    await execa('git', ['init', '-b', 'main'], { cwd: target });

    await expect(
      create({ path: target, template: 'minimal', noGit: true, yes: true }),
    ).rejects.toThrow();
  });
});
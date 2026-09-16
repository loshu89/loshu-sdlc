import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, existsSync } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { create } from '../../packages/cli/src/commands/create.js';
import { validateArtifact } from '../../packages/cli/src/lib/validate.js';

describe('end-to-end scaffold', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loshu-e2e-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('scaffolds a project where all artifacts validate', async () => {
    const target = join(tmpDir, 'app');
    await create({ path: target, template: 'full', noGit: true, yes: true });

    // Validate each artifact
    const artifacts = [
      { type: 'intent', path: join(target, 'intent.md') },
      { type: 'spec', path: join(target, 'spec.md') },
      { type: 'plan', path: join(target, 'plan.md') },
      { type: 'claude-md', path: join(target, 'CLAUDE.md') },
      { type: 'review', path: join(target, 'REVIEW.md') },
      { type: 'bands', path: join(target, 'bands.yaml') },
    ];

    for (const { type, path } of artifacts) {
      expect(existsSync(path)).toBe(true);
      // v0.6.0: the scaffolder renders Identity-complete artifacts with real
      // generated IDs, so every artifact must actually pass schema validation.
      const result = await validateArtifact(type, path);
      if (!result.valid) {
        console.error(`${type} errors:`, result.errors);
      }
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });
});

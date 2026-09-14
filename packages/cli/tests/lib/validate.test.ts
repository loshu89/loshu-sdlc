import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateArtifact } from '../../src/lib/validate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, '../../../templates/minimal/intent.md');

describe('validateArtifact', () => {
  it('validates a correct intent.md', async () => {
    const result = await validateArtifact(
      'intent',
      templatePath,
    );
    expect(result.valid).toBe(true);
  });

  it('rejects an intent.md missing required fields', async () => {
    // Create a fixture with missing fields
    const { writeFile, mkdtemp, rm } = await import('fs-extra');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const bad = join(tmp, 'bad-intent.md');
    await writeFile(bad, '---\ntitle: Bad\n---\n');
    const result = await validateArtifact('intent', bad);
    await rm(tmp, { recursive: true, force: true });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

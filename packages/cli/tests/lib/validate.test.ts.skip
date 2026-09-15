import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { writeFile, mkdtemp, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
    if (!result.valid) {
      // Print errors for debugging when regression detected
      console.error('errors:', result.errors);
    }
  });

  it('rejects an intent.md missing required fields', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const bad = join(tmp, 'bad-intent.md');
    await writeFile(bad, '---\ntitle: Bad\n---\n');
    const result = await validateArtifact('intent', bad);
    await rm(tmp, { recursive: true, force: true });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('parses markdown body sections for intent.md (no frontmatter)', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'intent.md');
    await writeFile(
      f,
      `---
title: Test intent
---

# Intent: Test

## Problem
Something is broken.

## Proposed outcome
It works.

## Affected users and systems
- Users
- Admins

## Open questions
- None
`,
    );
    const result = await validateArtifact('intent', f);
    await rm(tmp, { recursive: true, force: true });
    expect(result.valid).toBe(true);
  });

  it('parses markdown body sections for spec.md', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'spec.md');
    await writeFile(
      f,
      `---
title: Test spec
intent: intent.md
---

# Spec

## Architecture
Single-page React app.

## Verification criteria
- Build passes
- Tests pass
`,
    );
    const result = await validateArtifact('spec', f);
    await rm(tmp, { recursive: true, force: true });
    expect(result.valid).toBe(true);
  });
});

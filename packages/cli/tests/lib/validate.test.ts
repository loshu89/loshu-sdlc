import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readFile, writeFile, mkdtemp, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateArtifact } from '../../src/lib/validate.js';
import { renderEjs } from '../../src/lib/render.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = resolve(__dirname, '../../../templates/minimal/intent.md');

// v0.6.0 Identity fixtures. IDs must match ID_REGEX:
// stage-c##-slug-####(hex)-ULID(26 chars Crockford Base32, no I/L/O/U).
const INTENT_ID = 'plan-c01-demo-0000-01J00000000000000000000000';
const SPEC_ID = 'design-c01-demo-0000-01J00000000000000000000001';
const CREATED_AT = '2026-09-16T00:00:00Z';

// Minimal Identity frontmatter shared by the body-parsing fixtures.
const identityFrontmatter = (id: string, stage: string): string =>
  [
    '---',
    `id: ${id}`,
    'schema_version: 0.5.0',
    'cycle_id: 1',
    `stage: ${stage}`,
    'state: draft',
    'created_by: human:test',
    `created_at: ${CREATED_AT}`,
  ].join('\n');

describe('validateArtifact', () => {
  it('validates a correct intent.md', async () => {
    // The template ships EJS placeholders; render it with valid static
    // Identity vars (same values create.ts generates at scaffold time),
    // then validate the rendered artifact.
    const template = await readFile(templatePath, 'utf8');
    const rendered = renderEjs(template, {
      projectName: 'demo',
      date: '2026-09-16',
      intentId: INTENT_ID,
      createdBy: 'human:demo',
      today: CREATED_AT,
    });
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'intent.md');
    try {
      await writeFile(f, rendered);
      const result = await validateArtifact('intent', f);
      if (!result.valid) {
        // Print errors for debugging when regression detected
        console.error('errors:', result.errors);
      }
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
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

  it('parses markdown body sections for intent.md', async () => {
    // v0.6.0 contract: body sections still fill problem/proposedOutcome/etc.,
    // but the artifact is only valid when Identity fields are in frontmatter.
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'intent.md');
    try {
      await writeFile(
        f,
        `${identityFrontmatter(INTENT_ID, 'plan')}
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
      if (!result.valid) {
        console.error('errors:', result.errors);
      }
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects intent.md body sections without Identity frontmatter', async () => {
    // Second half of the v0.6.0 contract: body-only artifacts can no longer
    // validate — Identity fields are required and can only come from
    // frontmatter.
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'intent.md');
    try {
      await writeFile(
        f,
        `# Intent: Test

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
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(/\bid\b/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('parses markdown body sections for spec.md', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'spec.md');
    try {
      await writeFile(
        f,
        `${identityFrontmatter(SPEC_ID, 'design')}
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
      if (!result.valid) {
        console.error('errors:', result.errors);
      }
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('rejects spec.md body sections without Identity frontmatter', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-validate-'));
    const f = join(tmp, 'spec.md');
    try {
      await writeFile(
        f,
        `# Spec

## Architecture
Single-page React app.

## Verification criteria
- Build passes
- Tests pass
`,
      );
      const result = await validateArtifact('spec', f);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(/\bid\b/);
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });
});

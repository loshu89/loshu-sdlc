import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readFrontmatterFile,
  readFrontmatterFileOrEmpty,
} from '../../../src/lib/accept/frontmatter.js';

describe('readFrontmatterFile', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-fm-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('returns parsed frontmatter for valid markdown', async () => {
    const p = join(tmp, 'a.md');
    await writeFile(p, '---\nid: foo\nstate: draft\n---\nbody', 'utf-8');
    const fm = await readFrontmatterFile(p);
    expect(fm).toEqual({ id: 'foo', state: 'draft' });
  });

  it('returns null when no frontmatter fences', async () => {
    const p = join(tmp, 'a.md');
    await writeFile(p, 'just a body, no fences', 'utf-8');
    expect(await readFrontmatterFile(p)).toBeNull();
  });

  it('returns null when file missing', async () => {
    expect(await readFrontmatterFile(join(tmp, 'nope.md'))).toBeNull();
  });

  it('returns empty object for readFrontmatterFileOrEmpty on missing file', async () => {
    expect(await readFrontmatterFileOrEmpty(join(tmp, 'nope.md'))).toEqual({});
  });
});
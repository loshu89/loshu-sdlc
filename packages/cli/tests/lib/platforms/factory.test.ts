// packages/cli/tests/lib/platforms/factory.test.ts
import { describe, it, expect } from 'vitest';
import { createPlatform } from '../../../src/lib/platforms/factory.js';
import { GitHubPlatform } from '../../../src/lib/platforms/github.js';
import { GitLabPlatform } from '../../../src/lib/platforms/gitlab.js';

describe('createPlatform', () => {
  it('returns GitHubPlatform for github', () => {
    const p = createPlatform({ repo: 'foo/bar', token: 'x' }, 'github');
    expect(p).toBeInstanceOf(GitHubPlatform);
  });
  it('returns GitLabPlatform for gitlab', () => {
    const p = createPlatform({ repo: 'foo/bar', token: 'x' }, 'gitlab');
    expect(p).toBeInstanceOf(GitLabPlatform);
  });
  it('throws on unknown provider', () => {
    expect(() =>
      createPlatform(
        { repo: 'foo/bar', token: 'x' },
        'bitbucket' as unknown as 'github' | 'gitlab',
      ),
    ).toThrow(/unknown provider/i);
  });
});

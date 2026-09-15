import { describe, it, expect, vi } from 'vitest';
import { GitHubPlatform } from '../../../src/lib/platforms/github.js';

vi.mock('execa', () => ({ execa: vi.fn() }));

describe('GitHubPlatform', () => {
  it('createBranch returns branch name on success', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue({ stdout: '{}' } as any);
    const platform = new GitHubPlatform({ repo: 'foo/bar', token: 'ghp_test' });
    const name = await platform.createBranch('feature-x', 'abc123');
    expect(name).toBe('feature-x');
    expect(execa).toHaveBeenCalledWith(
      'gh', ['api', '-X', 'POST', '/repos/foo/bar/git/refs', '-f', 'ref=refs/heads/feature-x', '-f', 'sha=abc123'],
      expect.objectContaining({ env: expect.objectContaining({ GH_TOKEN: 'ghp_test' }) }),
    );
  });

  it('openPR constructs PR body with reviewers', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue({ stdout: 'https://github.com/foo/bar/pull/42\n' } as any);
    const platform = new GitHubPlatform({ repo: 'foo/bar', token: 'ghp_test' });
    const pr = await platform.openPR('main', 'feature-x', 'My PR', 'body', ['alice', 'bob']);
    expect(pr.number).toBe(42);
    expect(pr.url).toBe('https://github.com/foo/bar/pull/42');
  });

  it('deleteBranch calls gh api DELETE', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as any);
    const platform = new GitHubPlatform({ repo: 'foo/bar', token: 'ghp_test' });
    await platform.deleteBranch('feature-x');
    expect(execa).toHaveBeenCalledWith(
      'gh', ['api', '-X', 'DELETE', '/repos/foo/bar/git/refs/heads/feature-x'],
      expect.anything(),
    );
  });
});

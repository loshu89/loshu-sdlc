import { describe, it, expect, vi } from 'vitest';
import { GitLabPlatform } from '../../../src/lib/platforms/gitlab.js';

vi.mock('execa', () => ({ execa: vi.fn() }));

describe('GitLabPlatform', () => {
  it('createBranch uses glab', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as any);
    const p = new GitLabPlatform({ repo: 'group/proj', token: 'glpat_test', host: 'gitlab.com' });
    await p.createBranch('feat-x', 'abc123');
    expect(execa).toHaveBeenCalledWith(
      'glab', expect.arrayContaining(['api', '-X', 'POST']),
      expect.objectContaining({ env: expect.objectContaining({ GITLAB_TOKEN: 'glpat_test' }) }),
    );
  });

  it('openPR constructs MR URL', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue({ stdout: 'https://gitlab.com/group/proj/-/merge_requests/42' } as any);
    const p = new GitLabPlatform({ repo: 'group/proj', token: 'glpat_test' });
    const mr = await p.openPR('main', 'feat-x', 'My MR', 'body', ['alice']);
    expect(mr.number).toBe(42);
    expect(mr.url).toContain('merge_requests');
  });

  it('mergePR uses glab mr merge', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue({ stdout: '' } as any);
    const p = new GitLabPlatform({ repo: 'group/proj', token: 'glpat_test' });
    await p.mergePR(42, 'squash');
    expect(execa).toHaveBeenCalledWith('glab', expect.arrayContaining(['mr', 'merge', '42', '--squash', '--remove-source-branch']), expect.anything());
  });
});

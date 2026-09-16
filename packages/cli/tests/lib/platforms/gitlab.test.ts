import { describe, it, expect, vi } from 'vitest';
import { execa } from 'execa';
import { GitLabPlatform } from '../../../src/lib/platforms/gitlab.js';

vi.mock('execa');

type ExecaReturn = Awaited<ReturnType<typeof execa>>;
function mockExeca(stdout: string): ExecaReturn {
  return { stdout } as unknown as ExecaReturn;
}

describe('GitLabPlatform', () => {
  it('createBranch uses glab', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue(mockExeca(''));
    const p = new GitLabPlatform({ repo: 'group/proj', token: 'glpat_test', host: 'gitlab.com' });
    await p.createBranch('feat-x', 'abc123');
    expect(execa).toHaveBeenCalledWith(
      'glab', expect.arrayContaining(['api', '-X', 'POST']),
      { env: expect.objectContaining({ GITLAB_TOKEN: 'glpat_test' }) as unknown as NodeJS.ProcessEnv },
    );
  });

  it('openPR constructs MR URL', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue(mockExeca('https://gitlab.com/group/proj/-/merge_requests/42'));
    const p = new GitLabPlatform({ repo: 'group/proj', token: 'glpat_test' });
    const mr = await p.openPR('main', 'feat-x', 'My MR', 'body', ['alice']);
    expect(mr.number).toBe(42);
    expect(mr.url).toContain('merge_requests');
  });

  it('mergePR uses glab mr merge', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue(mockExeca(''));
    const p = new GitLabPlatform({ repo: 'group/proj', token: 'glpat_test' });
    await p.mergePR(42, 'squash');
    expect(execa).toHaveBeenCalledWith('glab', expect.arrayContaining(['mr', 'merge', '42', '--squash', '--remove-source-branch']), expect.anything());
  });
});

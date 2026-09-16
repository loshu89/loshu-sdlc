import { describe, it, expect, vi } from 'vitest';
import { execa } from 'execa';
import { GitHubPlatform } from '../../../src/lib/platforms/github.js';

// Auto-mock 'execa' (no factory) — vitest preserves the module's
// export types, so vi.mocked(execa) is typed as the real execa
// signature and downstream mocks are type-checked.
vi.mock('execa');

// Helper: build the minimal execa return shape that the platform
// adapters actually consume (just `stdout`). Use `Awaited<ReturnType<…>>`
// so we match the exact generic instantiation vi.mocked expects (it
// infers a Buffer-typed StdoutStderrType parameter from the unparameterized
// execa import).
type ExecaReturn = Awaited<ReturnType<typeof execa>>;
function mockExeca(stdout: string): ExecaReturn {
  return { stdout } as unknown as ExecaReturn;
}

describe('GitHubPlatform', () => {
  it('createBranch returns branch name on success', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue(mockExeca('{}'));
    const platform = new GitHubPlatform({ repo: 'foo/bar', token: 'ghp_test' });
    const name = await platform.createBranch('feature-x', 'abc123');
    expect(name).toBe('feature-x');
    expect(execa).toHaveBeenCalledWith(
      'gh', ['api', '-X', 'POST', '/repos/foo/bar/git/refs', '-f', 'ref=refs/heads/feature-x', '-f', 'sha=abc123'],
      { env: expect.objectContaining({ GH_TOKEN: 'ghp_test' }) as unknown as NodeJS.ProcessEnv },
    );
  });

  it('openPR constructs PR body with reviewers', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue(mockExeca('https://github.com/foo/bar/pull/42\n'));
    const platform = new GitHubPlatform({ repo: 'foo/bar', token: 'ghp_test' });
    const pr = await platform.openPR('main', 'feature-x', 'My PR', 'body', ['alice', 'bob']);
    expect(pr.number).toBe(42);
    expect(pr.url).toBe('https://github.com/foo/bar/pull/42');
  });

  it('deleteBranch calls gh api DELETE', async () => {
    const { execa } = await import('execa');
    vi.mocked(execa).mockResolvedValue(mockExeca(''));
    const platform = new GitHubPlatform({ repo: 'foo/bar', token: 'ghp_test' });
    await platform.deleteBranch('feature-x');
    expect(execa).toHaveBeenCalledWith(
      'gh', ['api', '-X', 'DELETE', '/repos/foo/bar/git/refs/heads/feature-x'],
      expect.anything(),
    );
  });
});

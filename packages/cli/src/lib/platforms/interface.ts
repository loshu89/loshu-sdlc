export interface PRRef {
  number: number;
  url: string;
  state: 'draft' | 'open' | 'merged' | 'closed';
}

export interface PlatformConfig {
  repo: string;          // 'owner/name'
  token: string;          // gh/glab token
  baseBranch?: string;    // default 'main'
  host?: string;          // for self-hosted
}

export interface Platform {
  createBranch(name: string, fromSha: string): Promise<string>;
  commitFile(branch: string, filePath: string, content: string, message: string): Promise<string>;
  openPR(base: string, head: string, title: string, body: string, reviewers: string[]): Promise<PRRef>;
  mergePR(number: number, method: 'merge' | 'squash' | 'rebase'): Promise<void>;
  closePR(number: number): Promise<void>;
  getPR(number: number): Promise<{state: PRRef['state']; merged: boolean; sha: string}>;
  deleteBranch(name: string): Promise<void>;
  getMainBranchSha(): Promise<string>;
  requestReviewers(prNumber: number, reviewers: string[]): Promise<void>;
}

export function configFromEnv(): PlatformConfig {
  const token = process.env.GHCR_TOKEN ?? process.env.GITLAB_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) throw new Error('no platform token in env (set GHCR_TOKEN or GITLAB_TOKEN)');
  const repo = process.env.LOSHU_REPO ?? '';
  if (!repo) throw new Error('LOSHU_REPO env var not set (e.g. "loshu89/loshu-sdlc")');
  return { repo, token };
}

import { execa } from 'execa';
import type { Platform, PlatformConfig, PRRef } from './interface.js';

export class GitLabPlatform implements Platform {
  constructor(private readonly config: PlatformConfig) {}

  private env() {
    return {
      ...process.env,
      GITLAB_TOKEN: this.config.token,
      GITLAB_HOST: this.config.host ?? 'gitlab.com',
    };
  }

  async createBranch(name: string, fromSha: string): Promise<string> {
    const projectPath = encodeURIComponent(this.config.repo);
    await execa('glab', [
      'api',
      '-X', 'POST',
      `/projects/${projectPath}/repository/branches`,
      '-f', `branch=${name}`,
      '-f', `ref=${fromSha}`,
    ], { env: this.env() });
    return name;
  }

  async commitFile(branch: string, filePath: string, content: string, message: string): Promise<string> {
    await execa('git', ['checkout', '-B', branch], { env: this.env() });
    await execa('git', ['add', filePath], { env: this.env() });
    await execa('git', ['commit', '-m', message], { env: this.env() });
    await execa('git', ['push', 'origin', branch], { env: this.env() });
    const { stdout } = await execa('git', ['rev-parse', 'HEAD'], { env: this.env() });
    return stdout.trim();
  }

  async openPR(base: string, head: string, title: string, body: string, reviewers: string[]): Promise<PRRef> {
    const projectPath = encodeURIComponent(this.config.repo);
    const { stdout } = await execa('glab', [
      'mr', 'create',
      '--source-branch', head,
      '--target-branch', base,
      '--title', title,
      '--description', body,
      '--yes',
      ...(reviewers.length > 0 ? ['--reviewer', reviewers.join(',')] : []),
    ], { env: this.env() });
    const m = stdout.match(/merge_requests\/(\d+)/);
    const number = m ? Number(m[1]) : 0;
    return { number, url: stdout.trim(), state: 'open' };
  }

  async mergePR(number: number, method: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<void> {
    await execa('glab', ['mr', 'merge', String(number), `--${method}`, '--remove-source-branch', '--yes'], { env: this.env() });
  }

  async closePR(number: number): Promise<void> {
    await execa('glab', ['mr', 'close', String(number), '--yes'], { env: this.env() });
  }

  async getPR(number: number): Promise<{state: PRRef['state']; merged: boolean; sha: string}> {
    const { stdout } = await execa('glab', ['mr', 'view', String(number), '--output', 'json'], { env: this.env() });
    const data = JSON.parse(stdout);
    return {
      state: (data.state ?? 'opened').toLowerCase() as PRRef['state'],
      merged: data.merged_at ? true : false,
      sha: data.sha ?? '',
    };
  }

  async deleteBranch(name: string): Promise<void> {
    const projectPath = encodeURIComponent(this.config.repo);
    await execa('glab', ['api', '-X', 'DELETE', `/projects/${projectPath}/repository/branches/${encodeURIComponent(name)}`], { env: this.env() });
  }

  async getMainBranchSha(): Promise<string> {
    const projectPath = encodeURIComponent(this.config.repo);
    const { stdout } = await execa('glab', ['api', `/projects/${projectPath}/repository/branches/${this.config.baseBranch ?? 'main'}`], { env: this.env() });
    return JSON.parse(stdout).commit.id;
  }

  async requestReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    if (reviewers.length === 0) return;
    const projectPath = encodeURIComponent(this.config.repo);
    await execa('glab', ['api', '-X', 'PUT', `/projects/${projectPath}/merge_requests/${prNumber}`, '-f', `reviewer_ids[]=${reviewers.join('&reviewer_ids[]=')}`], { env: this.env() });
  }
}

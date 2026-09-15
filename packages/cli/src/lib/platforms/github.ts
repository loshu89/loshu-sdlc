import { execa } from 'execa';
import type { Platform, PlatformConfig, PRRef } from './interface.js';

export class GitHubPlatform implements Platform {
  constructor(private readonly config: PlatformConfig) {}

  private env() {
    return {
      ...process.env,
      GH_TOKEN: this.config.token,
    };
  }

  private args(extra: string[]): string[] {
    return ['api', ...extra];
  }

  async createBranch(name: string, fromSha: string): Promise<string> {
    await execa(
      'gh',
      this.args(['-X', 'POST', `/repos/${this.config.repo}/git/refs`,
        '-f', `ref=refs/heads/${name}`,
        '-f', `sha=${fromSha}`]),
      { env: this.env() },
    );
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
    const args = ['pr', 'create',
      '--base', base,
      '--head', head,
      '--title', title,
      '--body', body];
    if (reviewers.length > 0) {
      args.push('--reviewer', reviewers.join(','));
    }
    const { stdout } = await execa('gh', args, { env: this.env() });
    const m = stdout.match(/\/pull\/(\d+)/);
    const number = m ? Number(m[1]) : 0;
    return { number, url: stdout.trim(), state: 'open' };
  }

  async mergePR(number: number, method: 'merge' | 'squash' | 'rebase' = 'squash'): Promise<void> {
    await execa('gh', ['pr', 'merge', String(number), '--' + method, '--delete-branch'], { env: this.env() });
  }

  async closePR(number: number): Promise<void> {
    await execa('gh', ['pr', 'close', String(number)], { env: this.env() });
  }

  async getPR(number: number): Promise<{state: PRRef['state']; merged: boolean; sha: string}> {
    const { stdout } = await execa('gh', ['pr', 'view', String(number), '--json', 'state,mergedAt,sha'], { env: this.env() });
    const data = JSON.parse(stdout);
    return {
      state: (data.state ?? 'open').toLowerCase() as PRRef['state'],
      merged: Boolean(data.mergedAt),
      sha: data.sha ?? '',
    };
  }

  async deleteBranch(name: string): Promise<void> {
    await execa('gh', ['api', '-X', 'DELETE', `/repos/${this.config.repo}/git/refs/heads/${name}`], { env: this.env() });
  }

  async getMainBranchSha(): Promise<string> {
    const { stdout } = await execa('gh', ['api', `/repos/${this.config.repo}/git/refs/heads/${this.config.baseBranch ?? 'main'}`], { env: this.env() });
    return JSON.parse(stdout).object.sha;
  }

  async requestReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    if (reviewers.length === 0) return;
    await execa('gh', ['pr', 'edit', String(prNumber), '--add-reviewer', reviewers.join(',')], { env: this.env() });
  }
}

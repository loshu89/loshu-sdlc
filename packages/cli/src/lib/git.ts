import { execa } from 'execa';

export async function initGit(dir: string, message: string): Promise<void> {
  await execa('git', ['init', '-b', 'main'], { cwd: dir });
  await execa('git', ['add', '.'], { cwd: dir });
  await execa('git', ['commit', '-m', message], { cwd: dir });
}

export async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: dir });
    return true;
  } catch {
    return false;
  }
}
import fsExtra from 'fs-extra';
const { copy, ensureDir } = fsExtra;
import { join } from 'node:path';

export async function bundlePlugin(srcPlugin: string, destDir: string): Promise<void> {
  // Copy entire plugin/ into <dest>/.claude/plugins/loshu-sdlc/
  const target = join(destDir, '.claude', 'plugins', 'loshu-sdlc');
  await ensureDir(target);
  await copy(srcPlugin, target, {
    filter: (src) => !src.includes('node_modules') && !src.includes('.git'),
  });
}
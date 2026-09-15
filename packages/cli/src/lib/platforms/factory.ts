// packages/cli/src/lib/platforms/factory.ts
import type { Platform, PlatformConfig } from './interface.js';
import { GitHubPlatform } from './github.js';
import { GitLabPlatform } from './gitlab.js';

export function createPlatform(config: PlatformConfig, provider: 'github' | 'gitlab'): Platform {
  switch (provider) {
    case 'github': return new GitHubPlatform(config);
    case 'gitlab': return new GitLabPlatform(config);
    default: throw new Error(`unknown provider: ${(provider as string)}`);
  }
}

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use fork pool so tests can call process.chdir() (e.g.
    // packages/cli/tests/commands/git.test.ts). Threads (the default
    // in vitest 1.6) run inside worker_threads where process.chdir
    // is unsupported.
    pool: 'forks',
    projects: [
      'packages/cli',
      'packages/plugin',
      'tests/integration',
    ],
  },
});

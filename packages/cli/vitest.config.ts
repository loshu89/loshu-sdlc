import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**'],
    // Use fork pool so tests can call process.chdir() (e.g. tests/commands/git.test.ts).
    // Threads (the default in vitest 1.6) run inside worker_threads where
    // process.chdir is unsupported.
    pool: 'forks',
  },
});

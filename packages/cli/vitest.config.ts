import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/lib/validate.test.ts', 'tests/commands/state.test.ts'],
  },
});

// packages/cli/tests/lib/codeowners.test.ts
import { describe, it, expect } from 'vitest';
import { parseCodeowners, reviewersForPath } from '../../src/lib/codeowners.js';

describe('CODEOWNERS', () => {
  it('parses simple entries', () => {
    const result = parseCodeowners('/spec.md @alice @bob\n');
    expect(result).toEqual([{ pattern: '/spec.md', owners: ['@alice', '@bob'] }]);
  });

  it('ignores comments and blank lines', () => {
    const content = `# comment\n\n/spec.md @alice\n# another\n/plan.md @bob\n`;
    const result = parseCodeowners(content);
    expect(result).toHaveLength(2);
  });

  it('reviewersForPath returns owners for exact match', () => {
    const cos = parseCodeowners('/spec.md @alice\n/plan.md @bob\n');
    expect(reviewersForPath(cos, '/spec.md')).toEqual(['@alice']);
  });

  it('reviewersForPath falls back to wildcard', () => {
    const cos = parseCodeowners('/spec.md @alice\n/* @fallback\n');
    expect(reviewersForPath(cos, '/plan.md')).toEqual(['@fallback']);
  });
});

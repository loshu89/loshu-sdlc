import { describe, it, expect } from 'vitest';
import { generateId, parseId, validateId, ID_REGEX } from '../../src/lib/identity.js';

describe('identity', () => {
  describe('generateId', () => {
    it('returns string matching ID_REGEX', () => {
      const id = generateId({ stage: 'design', cycle: 3, slug: 'oauth' });
      expect(id).toMatch(ID_REGEX);
    });

    it('uses zero-padded cycle', () => {
      const id = generateId({ stage: 'plan', cycle: 7, slug: 'test' });
      const parsed = parseId(id);
      expect(parsed?.cycle).toBe(7);
      expect(id).toContain('-c07-');
    });

    it('slugifies non-kebab input', () => {
      const id = generateId({ stage: 'plan', cycle: 1, slug: 'OAuth Auth!!!' });
      expect(id).toMatch(/oauth-auth/);
    });

    it('truncates slug to 30 chars', () => {
      const longSlug = 'a'.repeat(50);
      const id = generateId({ stage: 'plan', cycle: 1, slug: longSlug });
      const parsed = parseId(id);
      expect(parsed?.slug.length).toBeLessThanOrEqual(30);
    });

    it('returns different ids across calls', () => {
      const a = generateId({ stage: 'plan', cycle: 1, slug: 'x' });
      const b = generateId({ stage: 'plan', cycle: 1, slug: 'x' });
      expect(a).not.toBe(b);
    });
  });

  describe('validateId', () => {
    it('accepts well-formed IDs', () => {
      expect(validateId('design-c03-oauth-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX')).toBe(true);
    });
    it('rejects malformed IDs', () => {
      expect(validateId('not-an-id')).toBe(false);
      expect(validateId('plan-c3-foo-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX')).toBe(false);
      expect(validateId('plan-c03-foo-ZZZZ-01HXYZABCDEFGHJKMNPQRSTVWX')).toBe(false);
    });
  });

  describe('parseId', () => {
    it('round-trips', () => {
      const original = 'design-c03-oauth-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX';
      const parsed = parseId(original);
      expect(parsed).toEqual({
        stage: 'design',
        cycle: 3,
        slug: 'oauth',
        hex: '7f3a',
        ulid: '01HXYZABCDEFGHJKMNPQRSTVWX',
      });
    });
    it('returns null for malformed', () => {
      expect(parseId('bad')).toBeNull();
    });
  });
});
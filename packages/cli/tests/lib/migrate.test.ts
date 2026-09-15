import { describe, it, expect } from 'vitest';
import { findMigrationPath, chainMigrate } from '../../src/lib/migrate.js';

const REGISTRY = {
  intent: {
    current: '0.5.0',
    versions: {
      '0.1.0': { migrate_to: '0.2.0' },
      '0.2.0': { migrate_to: '0.5.0' },
      '0.5.0': { migrate_to: null, current: true },
    },
  },
};

describe('findMigrationPath', () => {
  it('returns single-hop path when adjacent', () => {
    expect(findMigrationPath('0.2.0', '0.5.0', REGISTRY.intent)).toEqual(['0.2.0', '0.5.0']);
  });
  it('returns multi-hop path when gap exists', () => {
    expect(findMigrationPath('0.1.0', '0.5.0', REGISTRY.intent)).toEqual([
      '0.1.0',
      '0.2.0',
      '0.5.0',
    ]);
  });
  it('throws on unknown from version', () => {
    expect(() => findMigrationPath('9.9.9', '0.5.0', REGISTRY.intent)).toThrow(/unknown/i);
  });
  it('throws when no migration path', () => {
    expect(() => findMigrationPath('0.5.0', '0.5.0', REGISTRY.intent)).toThrow(
      /no migration path/i,
    );
  });
});

describe('chainMigrate', () => {
  it('applies transforms in order', async () => {
    const result = await chainMigrate(
      { title: 'foo' },
      '0.1.0',
      '0.5.0',
      'plan',
      REGISTRY.intent,
      {
        '0.1.0->0.2.0': (x: any) => ({ ...x, state: 'draft' }),
        '0.2.0->0.5.0': (x: any) => ({ ...x, id: 'plan-c01-foo-0001-01HXYZ' }),
      },
    );
    expect(result.artifact).toMatchObject({
      title: 'foo',
      state: 'draft',
      id: expect.stringMatching(/^plan-c\d+-/),
    });
    expect(result.events).toHaveLength(2);
  });
});

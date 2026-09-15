import { describe, it, expect } from 'vitest';
import { loadRegistry, getArtifactTypeRegistry } from '../../src/lib/registry.js';

describe('registry', () => {
  it('loadRegistry returns all 6 artifact types', async () => {
    const reg = await loadRegistry();
    expect(Object.keys(reg).sort()).toEqual(['bands', 'claude-md', 'intent', 'plan', 'review', 'spec']);
  });

  it('each type has a current version', async () => {
    const reg = await loadRegistry();
    for (const [type, versions] of Object.entries(reg)) {
      const current = Object.entries(versions).find(([, v]) => v.current);
      expect(current, `${type} should have a current version`).toBeDefined();
    }
  });

  it('getArtifactTypeRegistry returns specific type', async () => {
    const reg = await loadRegistry();
    const intent = getArtifactTypeRegistry(reg, 'intent');
    expect(intent.current).toBe('0.5.0');
  });

  it('throws on unknown type', async () => {
    const reg = await loadRegistry();
    expect(() => getArtifactTypeRegistry(reg, 'nonexistent')).toThrow(/unknown artifact type/i);
  });
});

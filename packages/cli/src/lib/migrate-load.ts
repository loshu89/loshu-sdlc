import type { TransformFn } from './migrate.js';

// Stub: returns identity transforms. Task 17 will wire the real disk loader.
export async function loadTransforms(_artifactType: string): Promise<Record<string, TransformFn>> {
  return {
    '0.1.0->0.2.0': (x) => x,
    '0.2.0->0.5.0': (x) => x,
  };
}

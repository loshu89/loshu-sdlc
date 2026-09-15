import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REGISTRY_PATH = resolve(__dirname, '../../../plugin/schemas/registry.json');

export interface RegistryVersion {
  schema_file?: string;
  deprecated?: boolean;
  migrate_to: string | null;
  current?: string | boolean;
}

export type ArtifactTypeRegistry = Record<string, RegistryVersion | string>;
export type FullRegistry = Record<string, ArtifactTypeRegistry>;

let cached: Promise<FullRegistry> | null = null;

export function loadRegistry(): Promise<FullRegistry> {
  if (cached) return cached;
  cached = (async () => {
    const raw = await readFile(REGISTRY_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const reg: FullRegistry = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (!value || typeof value !== 'object') continue;
      const wrapper = value as { current?: string; versions?: Record<string, RegistryVersion> };
      const flat: ArtifactTypeRegistry = {};
      if (wrapper.current) flat.current = wrapper.current;
      if (wrapper.versions) Object.assign(flat, wrapper.versions);
      reg[key] = flat;
    }
    return reg;
  })();
  return cached;
}

export function getArtifactTypeRegistry(reg: FullRegistry, artifactType: string): ArtifactTypeRegistry {
  const r = reg[artifactType];
  if (!r) throw new Error(`unknown artifact type: ${artifactType}`);
  return r;
}

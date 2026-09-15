// packages/cli/src/lib/migrate-load.ts
import { readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TransformFn } from './migrate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(__dirname, '../../../plugin/migrations');

export async function loadTransforms(artifactType: string): Promise<Record<string, TransformFn>> {
  // Convention: {artifactType}-{from}->{to}.ts exports `transform(artifact)`
  // The plugin package ships .ts source (no build step), so we import .ts
  // directly via a file:// URL — Node 22+ strips types at load time.
  let files: string[];
  try {
    files = await readdir(MIGRATIONS_DIR);
  } catch {
    return {};
  }
  const transforms: Record<string, TransformFn> = {};
  for (const f of files) {
    if (!f.startsWith(`${artifactType}-`) || !f.endsWith('.ts')) continue;
    const key = f.slice(artifactType.length + 1, -3).replace(/-to-/, '->'); // strip prefix and .ts; filenames use `-to-`, lookups use `->`
    const filePath = join(MIGRATIONS_DIR, f);
    let mod: any = null;
    try {
      mod = await import(pathToFileURL(filePath).href);
    } catch {
      // If .ts load fails, try .js (in case plugin is later compiled)
      try {
        mod = await import(pathToFileURL(filePath.replace(/\.ts$/, '.js')).href);
      } catch {
        continue;
      }
    }
    if (mod && typeof mod.transform === 'function') {
      transforms[key] = mod.transform;
    }
  }
  return transforms;
}
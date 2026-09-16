// packages/cli/src/lib/migrate-load.ts
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { TransformFn } from './migrate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Plugin asset resolution follows create.ts's "try both" convention:
// - `../../plugin/migrations` — the bundled copy inside @loshu89/cli
//   (`packages/cli/plugin/` in the monorepo after build; `<pkg>/plugin/` in the
//   published tarball via `files: ["plugin/"]`). Contains the .ts sources AND
//   the .js compiled by scripts/compile-migrations.mjs, so transforms load on
//   every supported Node version (>=20).
// - `../../../plugin/migrations` — monorepo plugin source (`packages/plugin/`).
//   Only .ts; usable pre-build on Node >=22.6 (native type stripping).
const CANDIDATE_DIRS = [
  join(__dirname, '../../plugin/migrations'),
  join(__dirname, '../../../plugin/migrations'),
];

function migrationsDir(): string {
  return CANDIDATE_DIRS.find((d) => existsSync(d)) ?? CANDIDATE_DIRS[0]!;
}

// Shape of a dynamic-imported migration transform module: exports
// a `transform(artifact)` function (and nothing else we use).
interface TransformModule {
  transform?: unknown;
}

export async function loadTransforms(artifactType: string): Promise<Record<string, TransformFn>> {
  // Convention: {artifactType}-{from}-to-{to}.ts/.js exports `transform(artifact)`.
  // Filenames use `-to-`; lookup keys use `->`.
  const dir = migrationsDir();
  let files: string[];
  try {
    files = await readdir(dir);
  } catch {
    console.warn(
      `migrate: no migrations dir found at ${dir} — run \`pnpm build\` to copy and ` +
        `compile plugin migrations. Migrations for "${artifactType}" will be INCOMPLETE.`,
    );
    return {};
  }
  const transforms: Record<string, TransformFn> = {};
  for (const f of files) {
    const isTs = f.endsWith('.ts');
    const isJs = f.endsWith('.js');
    if (!f.startsWith(`${artifactType}-`) || (!isTs && !isJs)) continue;
    // Strip the `{artifactType}-` prefix and the extension; normalize `-to-` → `->`.
    const key = f.slice(artifactType.length + 1, -3).replace(/-to-/, '->');
    if (transforms[key]) continue; // dedupe: each key loaded at most once (.js preferred below)
    const filePath = join(dir, f);
    const jsPath = filePath.replace(/\.ts$/, '.js');
    let mod: TransformModule | null = null;
    // Prefer compiled .js (works on all supported Node versions);
    // fall back to .ts (dev repo on Node >=22.6 with type stripping).
    try {
      mod = (await import(pathToFileURL(jsPath).href)) as TransformModule;
    } catch {
      try {
        mod = (await import(pathToFileURL(filePath).href)) as TransformModule;
      } catch {
        console.warn(
          `migrate: failed to load transform "${f}" — run \`pnpm build\` to compile migrations, ` +
            `or use Node >=22.6. Migrations for "${artifactType}" will be INCOMPLETE.`,
        );
        continue;
      }
    }
    if (mod && typeof mod.transform === 'function') {
      transforms[key] = mod.transform as TransformFn;
    }
  }
  return transforms;
}

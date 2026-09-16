// scripts/compile-migrations.mjs
// Compiles packages/plugin/migrations/*.ts to .js IN PLACE inside the
// bundled copy (packages/cli/plugin/migrations/), so the published CLI
// works on Node 20 (no native type stripping).
// Runs after copy-plugin.mjs in the build chain.
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundledMigrations = join(root, 'packages', 'cli', 'plugin', 'migrations');

if (!existsSync(bundledMigrations)) {
  console.error(`compile-migrations: ${bundledMigrations} not found — run copy-plugin first`);
  process.exit(1);
}

const tsFiles = readdirSync(bundledMigrations).filter((f) => f.endsWith('.ts'));
if (tsFiles.length === 0) {
  console.log('compile-migrations: no .ts files to compile');
  process.exit(0);
}

// Invoke tsc's JS entry through node itself instead of node_modules/.bin/tsc.cmd:
// since the CVE-2024-27980 hardening (Node >=18.20), execFileSync on a .cmd shim
// throws EINVAL on Windows unless shell:true. process.execPath is shell-free and
// cross-platform.
const tscJs = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
execFileSync(
  process.execPath,
  [
    tscJs,
    ...tsFiles.map((f) => join(bundledMigrations, f)),
    '--module', 'nodenext',
    '--target', 'es2022',
    '--moduleResolution', 'nodenext',
    '--outDir', bundledMigrations,
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);
console.log(`compile-migrations: compiled ${tsFiles.length} file(s) to ${bundledMigrations}`);

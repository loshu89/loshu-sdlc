#!/usr/bin/env node
/* eslint-env node */
// Copies packages/plugin/ into packages/cli/plugin/ so the published
// @loshu-sdlc/cli npm package contains the plugin source at dist/../plugin/.
// Used as a post-build step. Idempotent: removes the destination first.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, 'packages', 'plugin');
const dest = path.join(root, 'packages', 'cli', 'plugin');

async function main() {
  if (!(await fs.pathExists(src))) {
    console.error(`copy-plugin: source not found at ${src}`);
    process.exit(1);
  }
  await fs.remove(dest);
  await fs.copy(src, dest, {
    filter: (p) => !p.includes('node_modules') && !p.includes('.git'),
  });
  console.log(`copy-plugin: ${src} -> ${dest}`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`copy-plugin failed: ${message}`);
  process.exit(1);
});

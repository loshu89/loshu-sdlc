#!/usr/bin/env node
/* eslint-env node */
// Local release helper for loshu-sdlc.
//
// Usage: node scripts/release.mjs <version>
//
// What it does:
//   1. Verifies the working tree is clean (no uncommitted changes).
//   2. Runs the full CI gauntlet (typecheck + test + build + lint + eval strict).
//      Aborts on any failure.
//   3. Bumps `version` in all three workspace packages:
//        - packages/plugin/package.json  (@loshu89/plugin)
//        - packages/cli/package.json     (@loshu89/cli)
//        - packages/templates/package.json (@loshu89/templates)
//   4. Runs `pnpm install --lockfile-only` so the workspace lockfile tracks the
//      new version pins.
//   5. Creates a commit:  chore: release v<version>
//
// The script does NOT push, tag, or publish. Tagging + publishing happens via
// the GitHub Actions release workflow (.github/workflows/release.yml) when the
// tag is pushed.

import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'fs-extra';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PACKAGES = [
  { name: '@loshu89/plugin', file: 'packages/plugin/package.json' },
  { name: '@loshu89/cli', file: 'packages/cli/package.json' },
  { name: '@loshu89/templates', file: 'packages/templates/package.json' },
];

const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;

function fail(msg, code = 1) {
  console.error(`\nrelease.mjs: ${msg}\n`);
  process.exit(code);
}

function info(msg) {
  console.log(`release.mjs: ${msg}`);
}

function run(cmd, opts = {}) {
  info(`$ ${cmd}`);
  try {
    return execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
  } catch (err) {
    fail(`command failed: ${cmd}`, err.status ?? 1);
  }
}

function checkCleanTree() {
  const status = execSync('git status --porcelain', {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  if (status.length > 0) {
    fail(
      `working tree is not clean. Commit or stash changes first:\n${status}`,
    );
  }
  info('working tree clean');
}

function bumpPackages(version) {
  for (const pkg of PACKAGES) {
    const filePath = path.join(root, pkg.file);
    if (!fs.existsSync(filePath)) {
      fail(`missing package.json for ${pkg.name} at ${pkg.file}`);
    }
    const pkgJson = fs.readJsonSync(filePath);
    const previous = pkgJson.version;
    pkgJson.version = version;
    fs.writeJsonSync(filePath, pkgJson, { spaces: 2, EOL: '\n' });
    info(`bumped ${pkg.name}: ${previous} -> ${version}`);
  }
}

function refreshLockfile() {
  run('pnpm install --lockfile-only', { stdio: 'inherit' });
}

function runCiGauntlet() {
  info('running CI gauntlet (typecheck + test + build + lint + eval:strict)');
  run('pnpm typecheck');
  run('pnpm test');
  run('pnpm build');
  run('pnpm lint');
  run('pnpm test:eval:strict');
  info('CI gauntlet passed');
}

function commitRelease(version) {
  run('git add -A', { stdio: 'inherit' });
  run(`git commit -m "chore: release v${version}"`, { stdio: 'inherit' });
  info(`committed release v${version}`);
}

async function main() {
  const version = process.argv[2];
  if (!version) {
    fail('missing version argument. Usage: node scripts/release.mjs <version>');
  }
  if (!SEMVER_RE.test(version)) {
    fail(
      `version "${version}" is not a valid semver (expected x.y.z or x.y.z-tag)`,
    );
  }

  info(`releasing v${version}`);
  checkCleanTree();
  runCiGauntlet();
  bumpPackages(version);
  refreshLockfile();
  commitRelease(version);

  info(`done. Next steps:`);
  info(`  git tag v${version}`);
  info(`  git push origin main v${version}`);
  info(`The release workflow will then publish to npm and create a GitHub Release.`);
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  fail(message, 1);
});

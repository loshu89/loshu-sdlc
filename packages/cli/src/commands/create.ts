import { resolve, basename, join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fsExtra from 'fs-extra';
import chalk from 'chalk';
import process from 'node:process';
import { renderFile } from '../lib/render.js';
import { generateId } from '../lib/identity.js';
import { initGit, isGitRepo } from '../lib/git.js';
import { bundlePlugin } from '../lib/plugin-bundler.js';
import { runPrompts, type ScaffoldOptions } from '../lib/prompts.js';

// fs-extra is CJS — default-import interop per repo convention (named imports
// of CJS deps break at runtime on modern Node's ESM linker, e.g. writeFile).
const { ensureDir, ensureSymlink, copy, writeFile } = fsExtra;

export interface CreateArgs {
  path: string;
  withUx?: boolean | undefined;
  withEcc?: boolean | undefined;
  withAll?: boolean | undefined;
  existing?: boolean | undefined;
  template?: 'minimal' | 'full' | undefined;
  coverage?: number | undefined;
  branch?: number | undefined;
  noGit?: boolean | undefined;
  yes?: boolean | undefined;
  strict?: boolean | undefined;
}

export async function create(args: CreateArgs): Promise<void> {
  const targetPath = resolve(args.path);
  const projectName = basename(targetPath) || 'loshu-sdlc-app';
  const date = new Date().toISOString().slice(0, 10);

  // Detect existing repo
  const existingRepo = await isGitRepo(targetPath).catch(() => false);
  void existsSync(join(targetPath, 'package.json'));

  if (existingRepo && !args.existing) {
    const msg = 'Error: target is an existing git repo. Use --existing to install into it.';
    console.error(chalk.red(msg));
    throw new Error(msg);
  }

  // Get options (interactive or from flags)
  let options: ScaffoldOptions;
  if (args.yes) {
    options = {
      projectName,
      template: args.template ?? 'minimal',
      installUx: args.withUx ?? args.withAll ?? false,
      installEcc: args.withEcc ?? args.withAll ?? false,
      coverageLine: args.coverage ?? 80,
      coverageBranch: args.branch ?? 75,
      initGit: !args.noGit,
      strict: false,
    };
  } else {
    options = await runPrompts(projectName);
  }

  console.log(chalk.blue(`Scaffolding loshu-sdlc project: ${projectName}`));

  // Create directory if needed
  if (!existsSync(targetPath)) {
    await ensureDir(targetPath);
  }

  // Copy template
  const templateDir = join(
    fileURLToPath(new URL('../../../templates/', import.meta.url)),
    options.template,
  );
  await copy(templateDir, targetPath, {
    // Exact basename matches only. A substring check like src.includes('.git')
    // also catches '.github' and '.gitignore', which silently dropped the
    // template's CI workflow stubs and dotfiles since v0.1.0.
    filter: (src) => {
      const base = basename(src);
      return base !== '.git' && base !== 'node_modules';
    },
  });

  // Render EJS placeholders. v0.6.0 schemas require Identity fields on every
  // artifact, so the scaffolder generates real IDs (stage-c##-slug-####-ULID)
  // and provides them on every render path.
  const slug = projectName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 30) || 'app';
  const idVars = {
    intentId: generateId({ stage: 'plan', cycle: 1, slug }),
    specId: generateId({ stage: 'design', cycle: 1, slug }),
    planId: generateId({ stage: 'build', cycle: 1, slug }),
    claudeId: generateId({ stage: 'test', cycle: 1, slug }),
    reviewId: generateId({ stage: 'deploy', cycle: 1, slug }),
    bandsId: generateId({ stage: 'maintain', cycle: 1, slug }),
    createdBy: `human:${
      process.env.GITHUB_USER ?? process.env.USERNAME ?? process.env.USER ?? 'unknown'
    }`,
    today: new Date().toISOString(),
  };
  const renderVars = {
    projectName,
    date,
    coverageLine: String(options.coverageLine),
    coverageBranch: String(options.coverageBranch),
    ...idVars,
  };

  // Render every artifact template present in the target (the minimal template
  // ships intent.md only; the full template ships all six).
  const artifactTemplates = [
    'intent.md',
    'spec.md',
    'plan.md',
    'CLAUDE.md',
    'REVIEW.md',
    'bands.yaml',
  ];
  for (const rel of artifactTemplates) {
    const artifactPath = join(targetPath, rel);
    if (existsSync(artifactPath)) {
      const rendered = await renderFile(artifactPath, renderVars);
      await writeFile(artifactPath, rendered);
    }
  }

  const configPath = join(targetPath, '.loshu-sdlc', 'config.yaml');
  if (existsSync(configPath)) {
    const rendered = await renderFile(configPath, renderVars);
    await writeFile(configPath, rendered);
  }

  // Bundle plugin. In the published npm package, `plugin/` sits at the same
  // level as `dist/`. In the monorepo, the plugin source lives at
  // `../../../plugin/` relative to `dist/commands/create.js`. We try both.
  const candidates = [
    fileURLToPath(new URL('../../plugin/', import.meta.url)),
    fileURLToPath(new URL('../../../plugin/', import.meta.url)),
  ];
  const pluginSrc = candidates.find((p) => existsSync(p));
  if (!pluginSrc) {
    throw new Error(
      `Plugin source not found at ${candidates.join(' or ')}. ` +
        `Install via /plugin marketplace add loshu89/loshu-sdlc && /plugin install loshu-sdlc@loshu-sdlc`,
    );
  }
  await bundlePlugin(pluginSrc, targetPath);

  // hooks.json references scripts as `bash .claude/hooks/<script>.sh`. That is
  // the canonical path used by marketplace installs (where hooks live directly
  // under `.claude/hooks/`). For bundled plugin installs, the real files live
  // under `.claude/plugins/loshu-sdlc/hooks/`. Create a symlink from the
  // canonical path to the bundled location so the existing hooks.json
  // references resolve unchanged. Idempotent: a no-op if already linked.
  const canonicalHooksDir = join(targetPath, '.claude', 'hooks');
  const bundledHooksDir = join(targetPath, '.claude', 'plugins', 'loshu-sdlc', 'hooks');
  if (existsSync(bundledHooksDir)) {
    try {
      // Use 'junction' on Windows so it works without admin privileges
      // (real symlinks require SeCreateSymbolicLinkPrivilege). 'dir' is the
      // POSIX equivalent. Both behave like a directory at canonicalHooksDir.
      const symlinkType: 'junction' | 'dir' = process.platform === 'win32' ? 'junction' : 'dir';
      await ensureSymlink(bundledHooksDir, canonicalHooksDir, symlinkType);
    } catch (err) {
      console.log(
        chalk.yellow(
          `  Warning: could not create symlink ${canonicalHooksDir} -> ${bundledHooksDir}: ${
            (err as Error).message
          }`,
        ),
      );
    }
  }

  // Install plugins if requested
  if (options.installUx) {
    console.log(chalk.gray('  Installing ui-ux-pro-max...'));
    // Real implementation would shell out to `claude plugin install`
    // For v0.1.0, log the intent
  }
  if (options.installEcc) {
    console.log(chalk.gray('  Installing ECC...'));
  }

  // Init git
  if (options.initGit && !existingRepo) {
    await initGit(targetPath, 'chore: scaffold loshu-sdlc');
    console.log(chalk.green('  Initialized git, made first commit'));
  }

  console.log(chalk.green(`✔ Created ${targetPath}`));
  console.log(chalk.blue('Next steps:'));
  console.log(`  cd ${targetPath}`);
  console.log('  /sdlc-plan');
  console.log('  loshu-sdlc doctor');
}
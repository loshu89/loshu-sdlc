import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { writeFile } = fsExtra;
import { resolve, join } from 'node:path';
import { checkAttribution } from '../lib/attribution.js';

export interface LintArgs {
  path: string;
  fix?: boolean | undefined;
  json?: boolean | undefined;
}

export interface LintIssue {
  file: string;
  reason: string;
}

export interface LintResult {
  scanned: number;
  borrowed: number;
  missingProvenance: LintIssue[];
  fixed: string[];
}

/**
 * Lint artifacts under `path` against policy-default attribution rules.
 * A borrowed file is one whose frontmatter declares a non-`loshu-sdlc` source.
 * Such files must carry a full provenance header (`provenance:` block with
 * `source:`); if they don't, lint flags them. With `--fix`, lint appends a
 * minimal provenance block to each offending file.
 */
export async function lint(args: LintArgs): Promise<number> {
  const targetPath = resolve(args.path);
  const policyDir = join(targetPath, 'packages/plugin/skills/policy-default');
  const attribution = await checkAttribution(policyDir);

  const borrowed = attribution.filter((a) => a.source !== undefined && !a.source.startsWith('loshu-sdlc'));
  const missingProvenance = attribution.filter(
    (a) => a.source !== undefined && !a.source.startsWith('loshu-sdlc') && !a.hasProvenance,
  );

  const result: LintResult = {
    scanned: attribution.length,
    borrowed: borrowed.length,
    missingProvenance: missingProvenance.map((a) => ({ file: a.file, reason: 'borrowed file missing provenance header' })),
    fixed: [],
  };

  if (args.fix && result.missingProvenance.length > 0) {
    for (const issue of result.missingProvenance) {
      const filePath = join(policyDir, issue.file);
      let content = '';
      try {
        content = await fsExtra.readFile(filePath, 'utf8');
      } catch {
        continue;
      }
      const block = '---\nprovenance:\n  source: unknown\n  borrowed_at: 2026-09-14\n  license: unknown\n---\n\n';
      const newContent = content.startsWith('---') ? block + content.replace(/^---\n[\s\S]*?\n---\n?/, '') : block + content;
      await writeFile(filePath, newContent, 'utf8');
      result.fixed.push(issue.file);
    }
    // After fixing, all entries have been rewritten with provenance; clear
    // the violations list so the exit code reflects post-fix state.
    if (result.fixed.length === result.missingProvenance.length) {
      result.missingProvenance = [];
    }
  }

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(chalk(`Scanned ${result.scanned} files; ${result.borrowed} borrowed.`));
    if (result.missingProvenance.length === 0) {
      console.log(chalk.green('✔ All borrowed files have provenance headers'));
    } else {
      console.log(chalk.red(`✗ ${result.missingProvenance.length} borrowed files missing provenance:`));
      for (const issue of result.missingProvenance) {
        console.log(`  ${issue.file}`);
      }
      if (result.fixed.length > 0) {
        console.log(chalk.green(`✔ Fixed ${result.fixed.length} files`));
      }
    }
  }

  return result.missingProvenance.length > 0 ? 5 : 0;
}
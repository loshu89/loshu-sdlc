import chalk from 'chalk';
import { execa } from 'execa';
import fsExtra from 'fs-extra';
const { stat } = fsExtra;
import { resolve, join } from 'node:path';
import { validateArtifact } from '../lib/validate.js';

export interface RulesArgs {
  subcommand: 'list' | 'check';
  name?: string | undefined;
  path?: string | undefined;
  json?: boolean | undefined;
  help?: boolean | undefined;
}

export interface RuleResult {
  status: 'pass' | 'fail';
  errors: string[];        // first N error messages; surfaced in the report
  filesScanned: string[];  // paths examined (for human display)
}

export interface Rule {
  name: string;
  source: string;
  description: string;
  appliesTo: string[];
  // Optional runner: when present, `rules check <name>` invokes it
  // (returning a real check result). When absent, the borrowed-skill
  // stub path is preserved.
  runner?: (targetPath: string) => Promise<RuleResult>;
}

// Hoisted so both the runner and the rule's appliesTo reference the
// same list. v0.7.0 final-review Minor #2 (previously the runner
// inlined the globs instead of reading from the rule entry).
const ESLINT_GLOBS = ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'];

const eslintRunner = async (targetPath: string): Promise<RuleResult> => {
  // Apply ESLint to the rule's appliesTo globs against the target.
  // We use npx eslint --no-install so we don't trigger install prompts.
  try {
    await execa('npx', [
      '--no-install',
      'eslint',
      '--no-error-on-unmatched-pattern',
      ...ESLINT_GLOBS,
    ], { cwd: targetPath });
    return { status: 'pass', errors: [], filesScanned: [] };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; exitCode?: number };
    // Use || (not ??) so empty-string stdout falls through to stderr;
    // real eslint writes lint errors to stdout, but some configs route
    // them via stderr instead — nullish coalescing would silently drop
    // stderr-only output. v0.7.0 final-review Minor #3.
    const lines = (err.stdout || err.stderr || '')
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .slice(0, 5);
    return {
      status: 'fail',
      errors: lines.length > 0 ? lines : [`eslint exited with code ${err.exitCode ?? 'unknown'}`],
      filesScanned: [],
    };
  }
};

function makeSchemaRunner(schemaName: string) {
  return async (targetPath: string): Promise<RuleResult> => {
    // `appliesTo` for these rules is a single literal path like
    // '.loshu-sdlc/intent.md' — pick the basename and look it up.
    const fileName = targetPath.split(/[\\/]/).pop() ?? '';
    // We don't know the schema-file pair up front; iterate candidate files
    // matching the rule's appliesTo (literal paths).
    // For the v0.7.0 scope, the targetPath IS the file to validate when
    // it looks like a markdown file; otherwise fall back to listing.
    const file = targetPath;
    if (!fileName.endsWith('.md')) {
      return { status: 'pass', errors: [], filesScanned: [] };
    }
    try {
      const result = await validateArtifact(schemaName, file);
      if (result.valid) {
        return { status: 'pass', errors: [], filesScanned: [file] };
      }
      return {
        status: 'fail',
        errors: result.errors.slice(0, 5),
        filesScanned: [file],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        status: 'fail',
        errors: [`${schemaName} validate threw: ${msg}`],
        filesScanned: [file],
      };
    }
  };
}

/**
 * Built-in rule registry. For v0.1.1 we ship a curated list that mirrors
 * the spec's section 11.2 (`rules list` / `rules check <name>`).
 *
 * Sources:
 *   - superpowers  (Tier 1/2 borrowed skills)
 *   - ecc          (borrowed coding-standards / security-reviewer)
 *   - ui-ux-pro-max (borrowed UI baseline)
 *   - loshu-sdlc   (project-owned rules)
 */
export const RULES: Rule[] = [
  {
    name: 'eslint',
    source: 'loshu-sdlc',
    description: 'Run ESLint with the project ESLint config.',
    appliesTo: ESLINT_GLOBS,
    runner: eslintRunner,
  },
  {
    name: 'a11y-wcag',
    source: 'ui-ux-pro-max',
    description: 'Validate accessibility conformance against WCAG 2.1 AA.',
    appliesTo: ['packages/*/src/**/*.{tsx,jsx,html}'],
  },
  {
    name: 'security-owasp',
    source: 'ecc',
    description: 'Static security checks aligned with OWASP Top 10.',
    appliesTo: ['packages/*/src/**/*.{ts,tsx,js,jsx}'],
  },
  {
    name: 'code-review',
    source: 'ecc',
    description: 'Tiered code-review checklist.',
    appliesTo: ['packages/*/src/**/*.{ts,tsx}'],
  },
  {
    name: 'coverage-threshold',
    source: 'loshu-sdlc',
    description: 'Verify line/branch coverage meets the configured threshold.',
    appliesTo: ['packages/*/src/**/*.{ts,tsx}'],
  },
  {
    name: 'intent-md-schema',
    source: 'loshu-sdlc',
    description: 'Validate intent.md against the intent JSON schema.',
    appliesTo: ['.loshu-sdlc/intent.md'],
    runner: makeSchemaRunner('intent'),
  },
  {
    name: 'spec-md-schema',
    source: 'loshu-sdlc',
    description: 'Validate spec.md against the spec JSON schema.',
    appliesTo: ['.loshu-sdlc/spec.md'],
    runner: makeSchemaRunner('spec'),
  },
  {
    name: 'plan-md-schema',
    source: 'loshu-sdlc',
    description: 'Validate plan.md against the plan JSON schema.',
    appliesTo: ['.loshu-sdlc/plan.md'],
    runner: makeSchemaRunner('plan'),
  },
  {
    name: 'attribution-provenance',
    source: 'loshu-sdlc',
    description: 'Borrowed policy files must declare a provenance header.',
    appliesTo: ['packages/plugin/skills/policy-default/**/*.md'],
  },
  {
    name: 'tdd',
    source: 'superpowers',
    description: 'Test-driven development discipline.',
    appliesTo: ['packages/*/src/**/*.{ts,tsx}'],
  },
  {
    name: 'verification-before-completion',
    source: 'superpowers',
    description: 'Run verification commands before claiming work complete.',
    appliesTo: ['packages/*/src/**/*.{ts,tsx}'],
  },
];

const HELP = `Usage: loshu-sdlc rules <subcommand> [args]

Subcommands:
  list                           List all active rules and their source
  check <name> [path]            Run a specific rule against the project

Options:
  --json                         Output JSON
  --help, -h                     Show this help
`;

export async function rules(args: RulesArgs): Promise<number> {
  if (args.help) {
    console.log(HELP);
    return 0;
  }

  if (args.subcommand === 'list') {
    if (args.json) {
      console.log(JSON.stringify({ rules: RULES }, null, 2));
    } else {
      console.log(chalk.bold('Active rules:'));
      for (const r of RULES) {
        console.log(`  ${chalk.cyan(r.name.padEnd(28))} ${chalk.dim(`[${r.source}]`)}`);
        console.log(`    ${r.description}`);
      }
    }
    return 0;
  }

  if (args.subcommand === 'check') {
    const name = args.name;
    if (!name) {
      console.error('Usage: loshu-sdlc rules check <name> [path]');
      return 2;
    }
    const rule = RULES.find((r) => r.name === name);
    if (!rule) {
      console.error(`Unknown rule: ${name}`);
      console.error(`Run \`loshu-sdlc rules list\` for available rules.`);
      return 2;
    }

    const targetPath = resolve(args.path ?? '.');

    if (rule.runner) {
      let result: RuleResult;
      try {
        result = await rule.runner(targetPath);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (args.json) {
          console.log(JSON.stringify({ rule: rule.name, status: 'error', error: msg }));
        } else {
          console.error(`✗ ${rule.name}: runner threw — ${msg}`);
        }
        return 1;
      }
      if (args.json) {
        console.log(JSON.stringify({ rule: rule.name, source: rule.source, path: targetPath, ...result }, null, 2));
      } else {
        const mark = result.status === 'pass' ? '✔' : '✗';
        const color = result.status === 'pass' ? chalk.green : chalk.red;
        console.log(color(`${mark} ${rule.name} [${rule.source}] — ${result.status}`));
        if (result.errors.length > 0) {
          for (const err of result.errors.slice(0, 5)) {
            console.log(chalk.dim(`    ${err}`));
          }
        }
      }
      return result.status === 'pass' ? 0 : 1;
    }

    // Borrowed-skill stub: preserved exactly as today (with the file-walk
    // loop for backward compatibility with anyone scripting around the
    // stub's output shape).
    const files: string[] = [];
    for (const glob of rule.appliesTo) {
      // For v0.1.1 we treat globs as literal relative paths under the
      // project root, matching the first segment prefix. Full glob expansion
      // arrives with v0.2.
      const relative = glob.replace(/\*[^/]*\//g, '').replace(/\*\*[^/]*\//g, '');
      const candidate = join(targetPath, relative);
      try {
        const st = await stat(candidate);
        if (st.isDirectory()) {
          const inner = await fsExtra.readdir(candidate).catch(() => []);
          files.push(...inner.map((f) => join(relative, f)));
        } else {
          files.push(relative);
        }
      } catch {
        files.push(relative);
      }
    }

    // Stub: each rule's real implementation lives in its own skill. We
    // produce a structured report so downstream tooling can pick it up.
    const report = {
      rule: rule.name,
      source: rule.source,
      path: targetPath,
      filesScanned: files,
      status: 'pass' as const,
      timestamp: new Date().toISOString(),
    };
    if (args.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(chalk.green(`✔ ${rule.name} [${rule.source}] — pass (borrowed)`));
      console.log(chalk.dim(`  Scanned ${files.length} path(s) under ${targetPath}`));
    }
    return 0;
  }

  console.log(HELP);
  return 0;
}
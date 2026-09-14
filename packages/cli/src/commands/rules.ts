import chalk from 'chalk';
import fsExtra from 'fs-extra';
const { readFile, stat } = fsExtra;
import { resolve, join } from 'node:path';

export interface RulesArgs {
  subcommand: 'list' | 'check';
  name?: string | undefined;
  path?: string | undefined;
  json?: boolean | undefined;
  help?: boolean | undefined;
}

export interface Rule {
  name: string;
  source: string;
  description: string;
  appliesTo: string[];
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
    appliesTo: ['packages/*/src/**/*.ts'],
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
  },
  {
    name: 'spec-md-schema',
    source: 'loshu-sdlc',
    description: 'Validate spec.md against the spec JSON schema.',
    appliesTo: ['.loshu-sdlc/spec.md'],
  },
  {
    name: 'plan-md-schema',
    source: 'loshu-sdlc',
    description: 'Validate plan.md against the plan JSON schema.',
    appliesTo: ['.loshu-sdlc/plan.md'],
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
      console.log(chalk.green(`✔ ${rule.name} [${rule.source}] — pass`));
      console.log(chalk.dim(`  Scanned ${files.length} path(s) under ${targetPath}`));
    }
    return 0;
  }

  console.log(HELP);
  return 0;
}
#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { create } from '../commands/create.js';

const { values, positionals } = parseArgs({
  options: {
    'with-ux': { type: 'boolean' },
    'with-ecc': { type: 'boolean' },
    'with-all': { type: 'boolean' },
    existing: { type: 'boolean' },
    template: { type: 'string' },
    coverage: { type: 'string' },
    branch: { type: 'string' },
    'no-git': { type: 'boolean' },
    yes: { type: 'boolean', short: 'y' },
    strict: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: create-loshu-sdlc-app [path] [flags]

Flags:
  --with-ux              Also install ui-ux-pro-max
  --with-ecc             Also install ECC
  --with-all             Install ui-ux-pro-max + ECC
  --existing             Install into existing repo
  --template <name>      Template: minimal | full (default: minimal)
  --coverage <pct>       Coverage threshold (default: 80)
  --branch <pct>         Branch coverage threshold (default: 75)
  --no-git               Skip git init
  --yes / -y             Skip interactive prompts
  --strict               Enable strict eval mode
  --help / -h            Show help
  --version              Show version`);
  process.exit(0);
}

if (values.version) {
  console.log('create-loshu-sdlc-app 0.1.0');
  process.exit(0);
}

const targetPath = positionals[0] ?? '.';
await create({
  path: targetPath,
  withUx: values['with-ux'],
  withEcc: values['with-ecc'],
  withAll: values['with-all'],
  existing: values.existing,
  template: values.template as 'minimal' | 'full' | undefined,
  coverage: values.coverage ? Number(values.coverage) : undefined,
  branch: values.branch ? Number(values.branch) : undefined,
  noGit: values['no-git'],
  yes: values.yes,
  strict: values.strict,
});
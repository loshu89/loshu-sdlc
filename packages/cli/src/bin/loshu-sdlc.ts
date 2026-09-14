#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { validate } from '../commands/validate.js';
import { doctor } from '../commands/doctor.js';

const { values, positionals } = parseArgs({
  options: {
    json: { type: 'boolean' },
    verbose: { type: 'boolean' },
    strict: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: loshu-sdlc <command> [args]

Commands:
  doctor [path] [--fix] [--json]        Diagnose project health
  validate <artifact> [path] [--strict]  Run JSON schema validator
  status [path] [--json]                 Show current cycle state
  help [command]                         Show help for a command
  version                                Show version`);
  process.exit(0);
}

if (values.version) {
  console.log('loshu-sdlc 0.1.0');
  process.exit(0);
}

const command = positionals[0];
switch (command) {
  case 'validate': {
    const [artifact, filePath] = positionals.slice(1);
    if (!artifact || !filePath) {
      console.error('Usage: loshu-sdlc validate <artifact> <file>');
      process.exit(2);
    }
    const code = await validate({
      artifact,
      filePath,
      strict: values.strict,
      verbose: values.verbose,
    });
    process.exit(code);
  }
  case 'doctor': {
    const targetPath = positionals[1] ?? '.';
    const code = await doctor({ path: resolve(targetPath), fix: false, json: values.json });
    process.exit(code);
  }
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(2);
}

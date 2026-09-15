#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { resolve } from 'node:path';
import { validate } from '../commands/validate.js';
import { doctor } from '../commands/doctor.js';
import { bands } from '../commands/bands.js';
import { lint } from '../commands/lint.js';
import { rules } from '../commands/rules.js';
import { status } from '../commands/status.js';
import { state as stateCmd } from '../commands/state.js';
import { coverage } from '../commands/coverage.js';
import { logs } from '../commands/logs.js';
import { upgrade } from '../commands/upgrade.js';
import { telemetry } from '../commands/telemetry.js';
import { cycle as cycleCmd } from '../commands/cycle.js';

const { values, positionals } = parseArgs({
  options: {
    json: { type: 'boolean' },
    verbose: { type: 'boolean' },
    strict: { type: 'boolean' },
    help: { type: 'boolean', short: 'h' },
    version: { type: 'boolean' },
    fix: { type: 'boolean' },
    tail: { type: 'string' },
    cycle: { type: 'string' },
    stage: { type: 'string' },
    diff: { type: 'string' },
    to: { type: 'string' },
    transition: { type: 'string' },
    validate: { type: 'boolean' },
    path: { type: 'string' },
    'dry-run': { type: 'boolean' },
    metric: { type: 'string' },
    value: { type: 'string' },
    'observations-json': { type: 'string' },
    title: { type: 'string' },
    state: { type: 'string' },
    gate: { type: 'string' },
    since: { type: 'string' },
    origin: { type: 'string' },
    sha: { type: 'string' },
    artifact: { type: 'string' },
    'append-event': { type: 'boolean' },
    from: { type: 'string' },
    check: { type: 'boolean' },
    layer: { type: 'string' },
    reporter: { type: 'string' },
  },
  allowPositionals: true,
});

if (values.help) {
  console.log(`Usage: loshu-sdlc <command> [args]

Commands:
  doctor [path] [--fix] [--json]        Diagnose project health
  validate <artifact> [path] [--strict]  Run JSON schema validator
  state show [path]                     Print artifact states for all 6 stages
  state <stage> <file>                  Read file's current state
  state <stage> <file> --transition <s> Attempt state transition (reject if not in DAG)
  state <stage> <file> --validate       Check whether file can transition to 'accepted'
  bands evaluate <file> [--metric=NAME --value=N]  Evaluate bands against an observation
  lint [path] [--fix]                    Lint artifacts against policy-default
  rules list                             List all active rules
  rules check <name> [path]              Run a specific rule
  status [path] [--json]                 Show current cycle state
  coverage [path] [--diff <sha>]         Run coverage tests
  logs [--tail] [--cycle N] [--stage N]  View logs
  upgrade [path] [--to <version>]        Bump plugin version
  telemetry enable|disable|status        Opt-in telemetry toggle
  cycle status [path]                    Show cycle state (cycle.json)
  cycle log [path] [--tail N]            Show recent gate events (gates.jsonl)
  cycle new <title> [path]               Start a new cycle
  cycle set <stage> <state> [path]      Update a stage's state
  cycle archive [path]                   Archive current cycle
  cycle append-event --gate ...          Append a gate event (for hooks)
  migrate <file> [--from V] [--to V]     Migrate artifact to a schema version
       [--check] [--dry-run]
  git <sync|status|merge|abandon> [--cycle N] [--dry-run]
                                       Drive git lifecycle for a cycle
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
    // falls through
  }
  case 'doctor': {
    const targetPath = positionals[1] ?? '.';
    const code = await doctor({ path: resolve(targetPath), fix: false, json: values.json });
    process.exit(code);
    // falls through
  }
  case 'bands': {
    const sub = positionals[1];
    if (!sub) {
      console.error('Usage: loshu-sdlc bands evaluate <file> [--metric=NAME --value=N]');
      process.exit(2);
    }
    const filePath = positionals[2];
    if (sub === 'evaluate' && !filePath) {
      console.error('Usage: loshu-sdlc bands evaluate <file> [--metric=NAME --value=N]');
      process.exit(2);
    }
    const code = await bands({
      subcommand: sub as 'evaluate',
      filePath: filePath ?? '',
      ...(values.metric !== undefined ? { metric: values.metric } : {}),
      ...(values.value !== undefined ? { value: Number(values.value) } : {}),
      ...(values['observations-json'] !== undefined
        ? { observationsJson: values['observations-json'] }
        : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'lint': {
    const targetPath = positionals[1] ?? '.';
    const code = await lint({
      path: resolve(targetPath),
      ...(values.fix !== undefined ? { fix: values.fix } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'rules': {
    const sub = positionals[1];
    if (!sub) {
      console.error('Usage: loshu-sdlc rules <list|check> [args]');
      process.exit(2);
    }
    if (sub !== 'list' && sub !== 'check') {
      console.error(`Unknown rules subcommand: ${sub}`);
      process.exit(2);
    }
    const code = await rules({
      subcommand: sub,
      ...(sub === 'check' ? { name: positionals[2] } : {}),
      ...(positionals[3] !== undefined ? { path: resolve(positionals[3]) } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'status': {
    const targetPath = positionals[1] ?? '.';
    const code = await status({
      path: resolve(targetPath),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'state': {
    const sub = positionals[1];
    if (!sub) {
      console.error('Usage: loshu-sdlc state <show|<stage> <file>> [--transition <s>] [--validate]');
      process.exit(2);
    }
    if (sub === 'show') {
      const targetPath = positionals[2] ?? '.';
      const code = await stateCmd({
        subcommand: 'show',
        path: resolve(targetPath),
        ...(values.json !== undefined ? { json: values.json } : {}),
      });
      process.exit(code);
      // falls through
    }
    // <stage> <file> form
    const stage = sub;
    const file = positionals[2];
    if (!file) {
      console.error('Usage: loshu-sdlc state <stage> <file> [--transition <state>] [--validate]');
      process.exit(2);
    }
    const code = await stateCmd({
      stage,
      filePath: resolve(file),
      ...(values.transition !== undefined
        ? {
            to: values.transition as
              | 'draft'
              | 'accepted'
              | 'iterating'
              | 'blocked'
              | 'rejected'
              | 'archived',
          }
        : {}),
      ...(values.validate !== undefined ? { validate: values.validate } : {}),
      ...(values.path !== undefined ? { path: values.path } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'coverage': {
    const targetPath = positionals[1] ?? '.';
    const code = await coverage({
      path: resolve(targetPath),
      ...(values.diff !== undefined ? { diff: values.diff } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'logs': {
    const code = await logs({
      ...(values.tail !== undefined ? { tail: Number(values.tail) } : {}),
      ...(values.cycle !== undefined ? { cycle: Number(values.cycle) } : {}),
      ...(values.stage !== undefined ? { stage: values.stage } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'upgrade': {
    const targetPath = positionals[1] ?? '.';
    const code = await upgrade({
      path: resolve(targetPath),
      ...(values.to !== undefined ? { to: values.to } : {}),
      ...(values['dry-run'] !== undefined ? { dryRun: values['dry-run'] } : {}),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'telemetry': {
    const sub = positionals[1];
    if (!sub || (sub !== 'enable' && sub !== 'disable' && sub !== 'status')) {
      console.error('Usage: loshu-sdlc telemetry <enable|disable|status>');
      process.exit(2);
    }
    const code = await telemetry({
      subcommand: sub,
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'migrate': {
    const filePath = positionals[1];
    if (!filePath) {
      console.error(
        'Usage: loshu-sdlc migrate <file> [--from <ver>] [--to <ver>] [--check] [--dry-run]',
      );
      process.exit(2);
    }
    const { migrate } = await import('../commands/migrate.js');
    const code = await migrate({
      file: filePath,
      ...(values.from !== undefined ? { from: values.from } : {}),
      ...(values.to !== undefined ? { to: values.to } : {}),
      ...(values.check !== undefined ? { check: values.check } : {}),
      ...(values['dry-run'] !== undefined ? { dryRun: values['dry-run'] } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'test': {
    const { test } = await import('../commands/test.js');
    const code = await test({
      ...(positionals[1] !== undefined ? { file: positionals[1] } : {}),
      ...(values.layer !== undefined
        ? { layer: Number(values.layer) as 1 | 2 | 3 | 4 }
        : {}),
      ...(values.strict !== undefined ? { strict: values.strict } : {}),
      ...(values.fix !== undefined ? { fix: values.fix } : {}),
      reporter: ((values.reporter ?? 'text') as 'text' | 'json' | 'junit'),
    });
    process.exit(code);
    // falls through
  }
  case 'cycle': {
    const sub = positionals[1];
    if (!sub) {
      console.error(
        'Usage: loshu-sdlc cycle <status|log|new|set|archive|append-event> [args]',
      );
      process.exit(2);
    }
    if (
      sub !== 'status' &&
      sub !== 'log' &&
      sub !== 'new' &&
      sub !== 'set' &&
      sub !== 'archive' &&
      sub !== 'append-event'
    ) {
      console.error(`Unknown cycle subcommand: ${sub}`);
      process.exit(2);
    }
    if (sub === 'new') {
      const title = positionals[2];
      const targetPath = positionals[3] ?? '.';
      if (!title) {
        console.error('Usage: loshu-sdlc cycle new <title> [path]');
        process.exit(2);
      }
      const code = await cycleCmd({
        subcommand: 'new',
        title,
        path: resolve(targetPath),
        ...(values.origin !== undefined ? { origin: values.origin } : {}),
        ...(values.json !== undefined ? { json: values.json } : {}),
      });
      process.exit(code);
      // falls through
    }
    if (sub === 'set') {
      const stage = positionals[2];
      const stateVal = positionals[3];
      const targetPath = positionals[4] ?? '.';
      if (!stage || !stateVal) {
        console.error('Usage: loshu-sdlc cycle set <stage> <state> [path]');
        process.exit(2);
      }
      const code = await cycleCmd({
        subcommand: 'set',
        stage,
        state: stateVal,
        path: resolve(targetPath),
        ...(values.json !== undefined ? { json: values.json } : {}),
      });
      process.exit(code);
      // falls through
    }
    if (sub === 'append-event') {
      const targetPath = positionals[2] ?? '.';
      const code = await cycleCmd({
        subcommand: 'append-event',
        path: resolve(targetPath),
        ...(values.gate !== undefined ? { gateName: values.gate } : {}),
        ...(values.stage !== undefined ? { stage: values.stage } : {}),
        ...(values.transition !== undefined ? { result: values.transition } : {}),
        ...(values.cycle !== undefined ? { cycle: Number(values.cycle) } : {}),
        ...(values.artifact !== undefined ? { artifact: values.artifact } : {}),
        ...(values.sha !== undefined ? { sha: values.sha } : {}),
        ...(values.json !== undefined ? { json: values.json } : {}),
      });
      process.exit(code);
      // falls through
    }
    if (sub === 'status') {
      const targetPath = positionals[2] ?? '.';
      const code = await cycleCmd({
        subcommand: 'status',
        path: resolve(targetPath),
        ...(values.json !== undefined ? { json: values.json } : {}),
      });
      process.exit(code);
      // falls through
    }
    if (sub === 'log') {
      const targetPath = positionals[2] ?? '.';
      const code = await cycleCmd({
        subcommand: 'log',
        path: resolve(targetPath),
        ...(values.tail !== undefined ? { tail: Number(values.tail) } : {}),
        ...(values.gate !== undefined ? { gate: values.gate } : {}),
        ...(values.since !== undefined ? { since: values.since } : {}),
        ...(values.json !== undefined ? { json: values.json } : {}),
      });
      process.exit(code);
      // falls through
    }
    // archive
    const targetPath = positionals[2] ?? '.';
    const code = await cycleCmd({
      subcommand: 'archive',
      path: resolve(targetPath),
      ...(values.json !== undefined ? { json: values.json } : {}),
    });
    process.exit(code);
    // falls through
  }
  case 'git': {
    const sub = positionals[1];
    if (!sub || !['sync', 'status', 'merge', 'abandon'].includes(sub)) {
      console.error('Usage: loshu-sdlc git <sync|status|merge|abandon>');
      process.exit(2);
    }
    const { git } = await import('../commands/git.js');
    const code = await git({
      subcommand: sub as 'sync' | 'status' | 'merge' | 'abandon',
      ...(values.cycle !== undefined ? { cycleId: Number(values.cycle) } : {}),
      ...(values['dry-run'] !== undefined ? { dryRun: values['dry-run'] } : {}),
    });
    process.exit(code);
    // falls through
  }
  default:
    console.error(`Unknown command: ${command}`);
    process.exit(2);
}

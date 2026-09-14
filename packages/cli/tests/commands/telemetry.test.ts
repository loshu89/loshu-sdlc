import { describe, it, expect } from 'vitest';
import { telemetry } from '../../src/commands/telemetry.js';

describe('telemetry command', () => {
  it('prints help with --help', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await telemetry({ subcommand: 'enable', help: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    expect(logs.join('\n')).toMatch(/Usage/);
  });

  it('reports status without writing', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await telemetry({ subcommand: 'status' });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    expect(logs.join('\n')).toMatch(/Telemetry:/);
  });

  it('emits JSON with --json', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await telemetry({ subcommand: 'status', json: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    const parsed = JSON.parse(logs.join('\n')) as { enabled: boolean; configPath: string };
    expect(typeof parsed.enabled).toBe('boolean');
    expect(parsed.configPath).toMatch(/\.loshu-sdlc[\\/]config\.json$/);
  });
});
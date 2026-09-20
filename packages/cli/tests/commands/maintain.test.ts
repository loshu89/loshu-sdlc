import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, writeJson, rm, readFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maintainDiagnose } from '../../src/commands/maintain.js';

describe('maintainDiagnose', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-maintain-diag-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('writes a stub intent.md with structured fields when 3σ breach detected', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');
    const outputPath = join(tmp, 'intent.md');

    await writeFile(bandsPath, [
      'id: bands-c01-test-0001-01HXYZBANDS',
      'schema_version: 0.5.0',
      'cycle_id: 1',
      'stage: maintain',
      'state: draft',
      'created_at: 2026-01-01T00:00:00Z',
      'created_by: human:test',
      'version: 1',
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
      '    unit: ratio',
      '    window: 1h',
      'evaluation:',
      '  interval: 5m',
      '  on_3sigma: block_maintain_exit',
      '  on_2sigma: warn',
      '  on_1sigma: log',
      '',
    ].join('\n'));
    await mkdir(join(tmp, '.sdlc'), { recursive: true });
    await writeJson(metricsPath, { error_rate: 0.045 });
    await mkdir(join(tmp, '.loshu-sdlc', 'state'), { recursive: true });
    await writeJson(cyclePath, {
      version: 1, current_cycle: 1,
      cycles: { '1': { id: 1, title: 'demo cycle', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} } },
    });

    const start = Date.now();
    const result = await maintainDiagnose({
      bandsPath, outputPath, rootPath: tmp, metricsPath,
    });

    expect(result.status).toBe('written');
    expect(result.intentPath).toBe(outputPath);
    expect(result.breachedMetric).toBe('error_rate');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeLessThan(Date.now() - start + 100);  // sanity

    const written = await readFile(outputPath, 'utf-8');
    expect(written).toMatch(/^---/);
    expect(written).toMatch(/id: plan-c02-error-rate/);
    expect(written).toMatch(/origin: maintain\/3sigma:error_rate/);
    // YAML quotes values containing ':' or '('; allow optional opening quote.
    expect(written).toMatch(/problem: "?TODO/);
    expect(written).toMatch(/proposedOutcome: "?TODO/);
    expect(written).toMatch(/affectedUsersAndSystems:/);
  });

  it('returns status: failed when no breached metrics', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');
    const outputPath = join(tmp, 'intent.md');

    await writeFile(bandsPath, [
      'id: bands-c01-test-0001-01HXYZBANDS',
      'schema_version: 0.5.0',
      'cycle_id: 1',
      'stage: maintain',
      'state: draft',
      'created_at: 2026-01-01T00:00:00Z',
      'created_by: human:test',
      'version: 1',
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
      '    unit: ratio',
      '    window: 1h',
      'evaluation:',
      '  interval: 5m',
      '  on_3sigma: block_maintain_exit',
      '  on_2sigma: warn',
      '  on_1sigma: log',
      '',
    ].join('\n'));
    await mkdir(join(tmp, '.sdlc'), { recursive: true });
    await writeJson(metricsPath, { error_rate: 0.011 });  // below sigma_1
    await mkdir(join(tmp, '.loshu-sdlc', 'state'), { recursive: true });
    await writeJson(cyclePath, {
      version: 1, current_cycle: 1,
      cycles: { '1': { id: 1, title: 'demo cycle', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} } },
    });

    const result = await maintainDiagnose({
      bandsPath, outputPath, rootPath: tmp, metricsPath,
    });
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/no breached metrics/i);
  });
});
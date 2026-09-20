import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, writeJson, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bandsDiagnose } from '../../src/commands/bands-diagnose.js';

describe('bandsDiagnose', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-bands-diag-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('emits one BandBreach for a 3σ metric (auto-3sigma)', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');

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
      version: 1,
      current_cycle: 1,
      cycles: {
        '1': { id: 1, title: 'demo cycle', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} },
      },
    });

    const proposal = await bandsDiagnose({ bandsPath, metricsPath, rootPath: tmp });
    expect(proposal.breachedMetrics).toHaveLength(1);
    const breach = proposal.breachedMetrics[0]!;
    expect(breach.metric).toBe('error_rate');
    expect(breach.baseline).toBe(0.01);
    expect(breach.current).toBe(0.045);
    // (0.045 - 0.01) / (0.03 - 0.01) = 1.75
    expect(Math.abs(breach.sigmaMagnitude - 1.75)).toBeLessThan(0.01);
    expect(breach.evaluation).toBe('auto-3sigma');
    expect(proposal.evaluationContext.cycleId).toBe(1);
    expect(proposal.evaluationContext.cycleTitle).toBe('demo cycle');
    expect(proposal.suggestedIntentId).toMatch(/^plan-c02-/);
  });

  it('emits empty breachedMetrics when no metric is in breach', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');

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
    await writeJson(metricsPath, { error_rate: 0.012 });  // below sigma_1
    await mkdir(join(tmp, '.loshu-sdlc', 'state'), { recursive: true });
    await writeJson(cyclePath, {
      version: 1, current_cycle: 1,
      cycles: { '1': { id: 1, title: 'demo', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} } },
    });

    const proposal = await bandsDiagnose({ bandsPath, metricsPath, rootPath: tmp });
    expect(proposal.breachedMetrics).toEqual([]);
    expect(proposal.evaluationContext.cycleId).toBe(1);
  });

  it('throws on missing bands.yaml', async () => {
    await expect(
      bandsDiagnose({ bandsPath: join(tmp, 'nonexistent.yaml'), rootPath: tmp }),
    ).rejects.toThrow();
  });
});
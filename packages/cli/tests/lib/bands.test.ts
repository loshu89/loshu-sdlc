import { describe, it, expect } from 'vitest';
import { classify, evaluate, inferDirection, type BandsFile, type Metric } from '../../src/lib/bands.js';

const sampleMetric: Metric = {
  name: 'error_rate',
  baseline: 0.01,
  sigma_1: 0.015,
  sigma_2: 0.02,
  sigma_3: 0.03,
  unit: 'ratio',
  window: '1h',
};

const sampleBands: BandsFile = {
  version: 1,
  metrics: [sampleMetric],
};

describe('classify', () => {
  it('returns null tier when value equals baseline', () => {
    expect(classify(sampleMetric, 0.01).tier).toBeNull();
  });

  it('returns null tier when value is below sigma_1', () => {
    expect(classify(sampleMetric, 0.012).tier).toBeNull();
  });

  it('returns 1sigma when value crosses sigma_1 but not sigma_2', () => {
    expect(classify(sampleMetric, 0.017).tier).toBe('1sigma');
  });

  it('returns 2sigma when value crosses sigma_2 but not sigma_3', () => {
    expect(classify(sampleMetric, 0.025).tier).toBe('2sigma');
  });

  it('returns 3sigma when value crosses sigma_3', () => {
    expect(classify(sampleMetric, 0.04).tier).toBe('3sigma');
  });

  it('treats lower direction correctly (value below threshold trips)', () => {
    const m2: Metric = { name: 'uptime', baseline: 0.99, sigma_1: 0.985, sigma_2: 0.97, sigma_3: 0.95 };
    expect(classify(m2, 0.94, 'lower').tier).toBe('3sigma');
    expect(classify(m2, 0.985, 'lower').tier).toBe('1sigma');
  });
});

describe('inferDirection', () => {
  it('classifies latency as upper', () => {
    expect(inferDirection('p95_latency_ms')).toBe('upper');
  });
  it('classifies deploy_frequency as lower', () => {
    expect(inferDirection('deploy_frequency')).toBe('lower');
  });
  it('defaults to upper for unknown names', () => {
    expect(inferDirection('mystery_metric')).toBe('upper');
  });
});

describe('evaluate', () => {
  it('returns no incidents when value is at baseline', () => {
    const result = evaluate(sampleBands, [{ name: 'error_rate', value: 0.01 }]);
    expect(result.incidents).toEqual([]);
  });

  it('returns a 3sigma incident for high error rate', () => {
    const result = evaluate(sampleBands, [{ name: 'error_rate', value: 0.05 }]);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]).toMatchObject({
      metric: 'error_rate',
      tier: '3sigma',
    });
  });

  it('returns 1sigma incident when mildly elevated', () => {
    const result = evaluate(sampleBands, [{ name: 'error_rate', value: 0.016 }]);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]?.tier).toBe('1sigma');
  });

  it('reports unknown metric with null tier', () => {
    const result = evaluate(sampleBands, [{ name: 'unknown_metric', value: 1.0 }]);
    expect(result.incidents).toHaveLength(1);
    expect(result.incidents[0]).toMatchObject({
      metric: 'unknown_metric',
      tier: null,
      value: 1.0,
    });
  });
});

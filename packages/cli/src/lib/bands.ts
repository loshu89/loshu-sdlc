import fsExtra from 'fs-extra';
const { readFile } = fsExtra;
import { parse as parseYaml } from 'yaml';

export interface Metric {
  name: string;
  baseline: number;
  sigma_1: number;
  sigma_2: number;
  sigma_3: number;
  unit?: string;
  window?: string;
}

export interface BandsFile {
  version: number;
  project?: string;
  generated?: string;
  metrics: Metric[];
  evaluation?: {
    interval?: string;
    on_3sigma?: string;
    on_2sigma?: string;
    on_1sigma?: string;
  };
}

export interface Incident {
  metric: string;
  tier: '1sigma' | '2sigma' | '3sigma' | null;
  baseline: number;
  value: number;
  unit?: string;
  window?: string;
}

export interface EvaluationResult {
  incidents: Incident[];
}

export type MetricDirection = 'upper' | 'lower' | 'two-sided';

/**
 * Determine which sigma tier (if any) a value falls into for a given metric.
 * - upper: only values above baseline count as excursions (default for "rate", "latency", "count")
 * - lower: only values below baseline count (e.g., "deploy_frequency" drops)
 * - two-sided: both above and below
 */
export function classify(
  metric: Metric,
  value: number,
  direction: MetricDirection = 'upper',
): Incident {
  const baseline = metric.baseline;
  const deltas = [
    Math.abs(value - baseline),
    Math.abs(metric.sigma_1 - baseline),
    Math.abs(metric.sigma_2 - baseline),
    Math.abs(metric.sigma_3 - baseline),
  ];
  const deltaValue = deltas[0]!;
  const d1 = deltas[1]!;
  const d2 = deltas[2]!;
  const d3 = deltas[3]!;

  const exceeds = (v: number, threshold: number): boolean => {
    if (direction === 'lower') return v < threshold;
    if (direction === 'two-sided') return Math.abs(v - baseline) >= Math.abs(threshold - baseline);
    return v > threshold;
  };

  let tier: Incident['tier'] = null;
  if (exceeds(value, metric.sigma_3) || deltaValue >= d3) {
    tier = '3sigma';
  } else if (exceeds(value, metric.sigma_2) || deltaValue >= d2) {
    tier = '2sigma';
  } else if (exceeds(value, metric.sigma_1) || deltaValue >= d1) {
    tier = '1sigma';
  }

  return {
    metric: metric.name,
    tier,
    baseline,
    value,
    ...(metric.unit !== undefined ? { unit: metric.unit } : {}),
    ...(metric.window !== undefined ? { window: metric.window } : {}),
  };
}

export function inferDirection(name: string): MetricDirection {
  const lower = name.toLowerCase();
  if (/(latency|error|fail|rate|count|usage|load)/.test(lower)) return 'upper';
  if (/(frequency|throughput|qps|rps|deploy|uptime|availability)/.test(lower)) return 'lower';
  return 'upper';
}

export async function loadBands(filePath: string): Promise<BandsFile> {
  const content = await readFile(filePath, 'utf8');
  return parseYaml(content) as BandsFile;
}

/**
 * Evaluate a single metric against the bands file. Returns an evaluation result
 * containing one incident per metric evaluated. Multiple metrics can be evaluated
 * in one call via `observations`.
 */
export interface Observation {
  name: string;
  value: number;
}

export function evaluate(
  bands: BandsFile,
  observations: Observation[],
): EvaluationResult {
  const incidents: Incident[] = [];
  for (const obs of observations) {
    const metric = bands.metrics.find((m) => m.name === obs.name);
    if (!metric) {
      incidents.push({
        metric: obs.name,
        tier: null,
        baseline: 0,
        value: obs.value,
      });
      continue;
    }
    const direction = inferDirection(metric.name);
    const incident = classify(metric, obs.value, direction);
    // Skip non-tripped metrics to keep output small
    if (incident.tier !== null) {
      incidents.push(incident);
    }
  }
  return { incidents };
}

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { generateId } from '../lib/identity.js';

export interface BandBreach {
  metric: string;
  baseline: number;
  sigma_1: number;
  sigma_2: number;
  sigma_3: number;
  current: number;
  sigmaMagnitude: number;
  evaluation: 'auto-3sigma' | 'auto-2sigma' | 'auto-1sigma';
  evaluationTimestamp: string;
}

export interface MaintainDiagnosisProposal {
  breachedMetrics: BandBreach[];
  evaluationContext: {
    cycleId: number;
    cycleTitle: string;
    previousCycleTitle?: string;
  };
  suggestedIntentId: string;
}

export interface BandsDiagnoseArgs {
  bandsPath: string;
  metricsPath?: string;
  rootPath: string;
}

const SIGMA_THRESHOLDS = {
  'auto-3sigma': 1.0,
  'auto-2sigma': 0.66,
  'auto-1sigma': 0.33,
} as const;

export async function bandsDiagnose(args: BandsDiagnoseArgs): Promise<MaintainDiagnosisProposal> {
  const fmRaw = await readFile(args.bandsPath, 'utf-8');
  const fm = parseYaml(fmRaw) as { metrics?: unknown } | null;
  if (!fm || !Array.isArray(fm.metrics)) {
    throw new Error(`bands file at ${args.bandsPath} has no metrics array`);
  }
  const metricsPath = args.metricsPath ?? join(args.rootPath, '.sdlc', 'metrics.json');
  let observations: Record<string, number> = {};
  try {
    const raw = await readFile(metricsPath, 'utf-8');
    observations = JSON.parse(raw) as Record<string, number>;
  } catch {
    // No metrics yet — no breaches.
    observations = {};
  }

  const cycleRaw = await readFile(join(args.rootPath, '.loshu-sdlc/state/cycle.json'), 'utf-8');
  const cycle = JSON.parse(cycleRaw) as {
    current_cycle: number;
    cycles: Record<string, { id: number; title: string }>;
  };
  const currentCycle = cycle.cycles[String(cycle.current_cycle)];
  const nextCycleId = cycle.current_cycle + 1;
  const timestamp = new Date().toISOString();

  const breachedMetrics: BandBreach[] = [];
  for (const m of fm.metrics as Array<{
    name: string; baseline: number; sigma_1: number; sigma_2: number; sigma_3: number;
  }>) {
    const current = observations[m.name];
    if (current === undefined) continue;
    const span = m.sigma_3 - m.baseline;
    if (span <= 0) continue;
    const magnitude = (current - m.baseline) / span;
    const absMag = Math.abs(magnitude);
    if (absMag < SIGMA_THRESHOLDS['auto-1sigma']) continue;
    let evaluation: BandBreach['evaluation'];
    if (absMag >= SIGMA_THRESHOLDS['auto-3sigma']) evaluation = 'auto-3sigma';
    else if (absMag >= SIGMA_THRESHOLDS['auto-2sigma']) evaluation = 'auto-2sigma';
    else evaluation = 'auto-1sigma';
    breachedMetrics.push({
      metric: m.name,
      baseline: m.baseline,
      sigma_1: m.sigma_1,
      sigma_2: m.sigma_2,
      sigma_3: m.sigma_3,
      current,
      sigmaMagnitude: magnitude,
      evaluation,
      evaluationTimestamp: timestamp,
    });
  }

  const suggestedIntentId = generateId({
    stage: 'plan',
    cycle: nextCycleId,
    slug: breachedMetrics[0]?.metric ?? 'incident',
  });

  return {
    breachedMetrics,
    evaluationContext: {
      cycleId: cycle.current_cycle,
      cycleTitle: currentCycle?.title ?? '(unknown)',
    },
    suggestedIntentId,
  };
}
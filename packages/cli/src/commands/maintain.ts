import { writeFile } from 'node:fs/promises';
import { stringify as stringifyYaml } from 'yaml';
import { bandsDiagnose } from './bands-diagnose.js';
import { validateArtifact } from '../lib/validate.js';
import { generateId } from '../lib/identity.js';

export interface MaintainDiagnoseArgs {
  bandsPath: string;
  outputPath: string;        // where to write intent.md
  rootPath: string;          // for cycle.json lookup + metrics.json fallback
  metricsPath?: string;      // optional override; default <rootPath>/.sdlc/metrics.json
}

export interface MaintainDiagnoseResult {
  status: 'written' | 'failed';
  intentPath: string;
  error?: string;
  durationMs: number;
  breachedMetric?: string;    // first breached metric, if any
}

const MAX_VALIDATION_RETRIES = 2;

export async function maintainDiagnose(args: MaintainDiagnoseArgs): Promise<MaintainDiagnoseResult> {
  const start = Date.now();
  const proposal = await bandsDiagnose({
    bandsPath: args.bandsPath,
    ...(args.metricsPath ? { metricsPath: args.metricsPath } : {}),
    rootPath: args.rootPath,
  });

  if (proposal.breachedMetrics.length === 0) {
    return {
      status: 'failed',
      intentPath: args.outputPath,
      error: 'no breached metrics; nothing to diagnose',
      durationMs: Date.now() - start,
    };
  }

  const first = proposal.breachedMetrics[0]!;
  const timestamp = new Date().toISOString();
  const slug = first.metric.replace(/[^a-z0-9-]+/g, '-');
  const intentId = generateId({
    stage: 'plan',
    cycle: proposal.evaluationContext.cycleId + 1,
    slug,
  });

  const composeIntent = (): string => {
    const frontmatter: Record<string, unknown> = {
      id: intentId,
      schema_version: '0.5.0',
      cycle_id: proposal.evaluationContext.cycleId + 1,
      stage: 'plan',
      state: 'draft',
      created_at: timestamp,
      created_by: 'system:loshu-sdlc/maintain-diagnose',
      origin: `maintain/3sigma:${first.metric}`,
      title: `Incident: ${first.metric} (${timestamp})`,
      problem: 'TODO: agent must describe the problem (auto-stub from v0.9.0 maintain-diagnose)',
      proposedOutcome: 'TODO: agent must describe the proposed outcome',
      affectedUsersAndSystems: ['TODO: identify affected components'],
      openQuestions: [],
    };
    const yaml = stringifyYaml(frontmatter);
    return `---\n${yaml}---\n\n<!-- TODO: agent must fill in problem / proposedOutcome / affectedUsersAndSystems fields before committing this incident intent.md -->\n`;
  };

  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const intent = composeIntent();
    await writeFile(args.outputPath, intent, 'utf-8');
    const result = await validateArtifact('intent', args.outputPath);
    if (result.valid) {
      return {
        status: 'written',
        intentPath: args.outputPath,
        durationMs: Date.now() - start,
        breachedMetric: first.metric,
      };
    }
    lastError = result.errors.slice(0, 3).join('; ');
  }

  return {
    status: 'failed',
    intentPath: args.outputPath,
    error: `schema validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts: ${lastError ?? 'unknown'}`,
    durationMs: Date.now() - start,
  };
}
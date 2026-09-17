import type { Stage } from './identity.js';

/**
 * Canonical Stage → schema-name mapping. The acceptance C2 assertion and
 * the `validate *` subcommand both use this; reusing it from V2/V3/V4 in
 * `lib/accept/assertions/versioning.ts` fixes a latent bug where the
 * registry was looked up by stage name (e.g. `design`) instead of the
 * schema name (e.g. `spec`) and threw for 4 of 6 stages.
 */
export const STAGE_TO_SCHEMA: Record<Stage, string> = {
  plan: 'intent',
  design: 'spec',
  build: 'plan',
  test: 'claude-md',
  deploy: 'review',
  maintain: 'bands',
};
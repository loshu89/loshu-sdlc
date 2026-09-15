import { discoverArtifacts } from './discover.js';
import { identityAssertions } from './assertions/identity.js';
import { versioningAssertions } from './assertions/versioning.js';
import { stateAssertions } from './assertions/state.js';
import { bandsAssertions } from './assertions/bands.js';
import type { Artifact, AssertionResult } from './types.js';

const ALL = [
  ...identityAssertions,
  ...versioningAssertions,
  ...stateAssertions,
  ...bandsAssertions,
];

export interface RunOptions {
  layer?: 1 | 2 | 3 | 4;
  file?: string;
}

export interface RunResult {
  total: number;
  passed: number;
  failed: number;
  results: Array<{ artifact: Artifact; assertion: AssertionResult }>;
}

export async function runProject(rootPath: string, opts: RunOptions): Promise<RunResult> {
  const artifacts = await discoverArtifacts(rootPath);
  const filtered = opts.file
    ? artifacts.filter(
        (a) =>
          a.filePath === opts.file ||
          (opts.file !== undefined && a.filePath.endsWith(opts.file)),
      )
    : artifacts;
  const results: RunResult['results'] = [];
  let passed = 0;
  let failed = 0;
  for (const artifact of filtered) {
    // Layer-4 (bands) assertions only apply to maintain-stage artifacts.
    const applicable = ALL.filter((a) => {
      if (opts.layer && a.layer !== opts.layer) return false;
      if (a.layer === 4 && artifact.stage !== 'maintain') return false;
      return true;
    });
    for (const assertion of applicable) {
      const r = await assertion.run(artifact);
      results.push({ artifact, assertion: r });
      if (r.pass) passed++;
      else failed++;
    }
  }
  return { total: results.length, passed, failed, results };
}

export async function runAcceptance(
  artifact: Artifact,
  layer?: 1 | 2 | 3 | 4,
): Promise<AssertionResult[]> {
  const applicable = ALL.filter((a) => {
    if (layer && a.layer !== layer) return false;
    if (a.layer === 4 && artifact.stage !== 'maintain') return false;
    return true;
  });
  return Promise.all(applicable.map((a) => a.run(artifact)));
}
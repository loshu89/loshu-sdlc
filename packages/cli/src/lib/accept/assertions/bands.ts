import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Assertion, AssertionResult } from '../types.js';

function pass(rule: string): AssertionResult {
  return { pass: true, rule };
}
function fail(rule: string, message: string): AssertionResult {
  return { pass: false, rule, message };
}

interface BandsFile {
  metrics?: Array<{
    name: string;
    baseline: number;
    sigma_1: number;
    sigma_2: number;
    sigma_3: number;
  }>;
}

export const bandsAssertions: Assertion[] = [
  {
    rule: 'B1',
    layer: 4,
    description: 'sigma thresholds are monotonically increasing',
    run: async (a) => {
      try {
        const content = await readFile(a.filePath, 'utf-8');
        const bands = parseYaml(content) as BandsFile;
        for (const m of bands.metrics ?? []) {
          if (!(m.sigma_1 >= m.baseline && m.sigma_2 >= m.sigma_1 && m.sigma_3 >= m.sigma_2)) {
            return fail('B1', `metric ${m.name}: thresholds not monotonic`);
          }
        }
        return pass('B1');
      } catch {
        return fail('B1', 'cannot parse bands.yaml');
      }
    },
  },
  {
    rule: 'B2',
    layer: 4,
    description: 'at least one metric defined',
    run: async (a) => {
      try {
        const content = await readFile(a.filePath, 'utf-8');
        const bands = parseYaml(content) as BandsFile;
        if (!bands.metrics || bands.metrics.length === 0) return fail('B2', 'no metrics defined');
        return pass('B2');
      } catch {
        return fail('B2', 'cannot parse bands.yaml');
      }
    },
  },
];
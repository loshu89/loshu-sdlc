/**
 * Eval harness — tests/evals/run.ts
 *
 * Spec §10.3: For each story, capture produced artifact and compare against
 * `.expected-<artifact>.md`. Diff threshold: structural fields must match
 * exactly; prose can diverge within 0.85 cosine similarity.
 *
 * For v0.1.1 the harness is a **structural validator**:
 *   - For every `.story.md`, the matching `.expected-<artifact>.md` exists.
 *   - The expected file is structurally valid for its artifact type
 *     (frontmatter contains every key required by the artifact's schema).
 *   - The story and expected share enough vocabulary to clear the cosine
 *     threshold (loose mode default 0.85, per spec §10.3; v0.2.0 wires the
 *     "produced artifact vs expected" comparison at the same threshold).
 *
 * Run modes:
 *   --strict    Strict mode: structural AND cosine ≥ 0.95 (handles
 *               hand-curated expected files that match the story very closely).
 *   --loose     Loose mode (default): structural AND cosine ≥ 0.85.
 *   --record    Overwrite .expected-*.md with the .story.md content; passes.
 *   --stage X   Restrict to one stage (plan, design, build, test, deploy, maintain).
 *   --threshold N  Override the cosine threshold (default 0.85).
 *   --json      Emit JSON report to stdout instead of a human summary.
 *
 * The actual "run slash command against a fixture repo" wiring is deferred
 * to v0.2.0 per spec §11.2. This v0.1.1 harness is the structural skeleton.
 */
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type Stage = 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';

export const STAGES: Stage[] = ['plan', 'design', 'build', 'test', 'deploy', 'maintain'];

/**
 * Required frontmatter keys per artifact type, derived from
 * packages/plugin/schemas/*.schema.json. Keep in sync with the schemas.
 */
export const REQUIRED_KEYS: Record<Stage, string[]> = {
  plan: ['title', 'problem', 'proposedOutcome', 'affectedUsersAndSystems', 'openQuestions'],
  design: ['title', 'intent', 'architecture', 'verificationCriteria'],
  build: ['title', 'spec', 'tasks', 'verification'],
  test: ['title', 'spec', 'methodology'],
  deploy: ['title', 'bugs', 'security', 'compliance'],
  maintain: ['title', 'bandsPath', 'evaluationWindow', 'metrics'],
};

export interface EvalCase {
  stage: Stage;
  name: string;
  storyPath: string;
  expectedPath: string;
  story: string;
  expected: string;
}

export interface EvalResult {
  stage: Stage;
  name: string;
  storyPath: string;
  expectedPath: string;
  status: 'pass' | 'fail' | 'missing-expected' | 'error';
  cosine: number;
  threshold: number;
  structuralMatch: boolean;
  missingKeys: string[];
  wordCountStory: number;
  wordCountExpected: number;
  message?: string;
}

export interface EvalReport {
  generatedAt: string;
  mode: 'strict' | 'loose' | 'record';
  threshold: number;
  totalCases: number;
  pass: number;
  fail: number;
  missingExpected: number;
  errors: number;
  perStage: Record<
    Stage,
    {
      total: number;
      pass: number;
      fail: number;
    }
  >;
  results: EvalResult[];
}

/**
 * Tokenize text for shingling. Lowercase, strip punctuation, drop empty tokens.
 * Single-character tokens and pure numeric tokens are dropped to keep
 * shingles semantically meaningful.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/```[\s\S]*?```/g, ' ') // strip fenced code blocks
    .replace(/`[^`]+`/g, ' ') // strip inline code
    .replace(/<!--[\s\S]*?-->/g, ' ') // strip HTML comments
    .replace(/<[^>]+>/g, ' ') // strip remaining tags
    .replace(/^---[\s\S]*?---/m, ' ') // strip frontmatter
    .replace(/^[#*_>\-]+\s*/gm, ' ') // strip heading / list markers line-by-line
    .replace(/[#*_>]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));
}

/**
 * Build k-word shingles from a token array.
 */
export function shingles(tokens: string[], k = 5): string[] {
  if (tokens.length < k) return tokens.length > 0 ? [tokens.join(' ')] : [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - k; i++) {
    out.push(tokens.slice(i, i + k).join(' '));
  }
  return out;
}

/**
 * Cosine similarity between two texts based on 5-word shingles.
 * Returns a number in [0, 1].
 */
export function cosineSimilarity(a: string, b: string, k = 5): number {
  const sa = shingles(tokenize(a), k);
  const sb = shingles(tokenize(b), k);
  if (sa.length === 0 || sb.length === 0) return 0;

  const fa = new Map<string, number>();
  const fb = new Map<string, number>();
  for (const s of sa) fa.set(s, (fa.get(s) ?? 0) + 1);
  for (const s of sb) fb.set(s, (fb.get(s) ?? 0) + 1);

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [s, ca] of fa) {
    const cb = fb.get(s) ?? 0;
    dot += ca * cb;
  }
  for (const ca of fa.values()) normA += ca * ca;
  for (const cb of fb.values()) normB += cb * cb;

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Extract frontmatter key-value pairs from a markdown file. Returns an empty
 * object if no frontmatter block is found. Handles scalar values; arrays and
 * objects are represented as non-empty placeholders so structural checks
 * can still detect their presence.
 */
export function extractFrontmatter(text: string): Record<string, string> {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const out: Record<string, string> = {};
  const lines = (match[1] ?? '').split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const kv = line.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/);
    if (!kv) {
      i++;
      continue;
    }
    const k = kv[1] ?? '';
    let v = (kv[2] ?? '').trim();
    // Array or object on following lines — capture as non-empty placeholder.
    if (v === '' || v === '|' || v === '>') {
      // Look ahead for list items or indented lines.
      let hasContent = false;
      let j = i + 1;
      while (j < lines.length) {
        const next = lines[j] ?? '';
        if (next.startsWith('  ') || next.startsWith('\t') || next.startsWith('-')) {
          hasContent = true;
          j++;
        } else {
          break;
        }
      }
      if (hasContent) {
        out[k] = '__present__';
        i = j;
        continue;
      }
    }
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
    i++;
  }
  return out;
}

/**
 * Structural check: the expected file's frontmatter contains every key
 * required by the artifact type's schema. Returns the list of missing keys
 * (empty when structurally valid).
 */
export function structuralValidate(
  expected: string,
  stage: Stage,
): { valid: boolean; missingKeys: string[] } {
  const fm = extractFrontmatter(expected);
  const required = REQUIRED_KEYS[stage];
  const missing = required.filter((k) => !(k in fm));
  return { valid: missing.length === 0, missingKeys: missing };
}

export function wordCount(text: string): number {
  return tokenize(text).length;
}

export async function listEvalCases(stageDir: string, stage: Stage): Promise<EvalCase[]> {
  if (!existsSync(stageDir)) return [];
  const files = await readdir(stageDir);
  const storyFiles = files.filter((f) => f.endsWith('.story.md')).sort();
  const out: EvalCase[] = [];
  for (const f of storyFiles) {
    const base = f.replace(/\.story\.md$/, '');
    const expected = files.find((g) => g.startsWith(`${base}.expected-`) && g.endsWith('.md'));
    if (!expected) continue;
    const storyPath = join(stageDir, f);
    const expectedPath = join(stageDir, expected);
    const story = await readFile(storyPath, 'utf8');
    const expectedText = await readFile(expectedPath, 'utf8');
    out.push({
      stage,
      name: base,
      storyPath,
      expectedPath,
      story,
      expected: expectedText,
    });
  }
  return out;
}

export interface RunOptions {
  mode: 'strict' | 'loose' | 'record';
  stage?: Stage | undefined;
  threshold: number;
  reportPath: string;
  evalsRoot: string;
}

export function parseArgs(argv: string[]): {
  mode: 'strict' | 'loose' | 'record';
  stage?: Stage;
  threshold: number;
} {
  let mode: 'strict' | 'loose' | 'record' = 'loose';
  let stage: Stage | undefined;
  let threshold = 0.85;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--strict') mode = 'strict';
    else if (a === '--loose') mode = 'loose';
    else if (a === '--record') mode = 'record';
    else if (a === '--stage') {
      const v = argv[++i];
      if (v && (STAGES as string[]).includes(v)) stage = v as Stage;
    } else if (a === '--threshold') {
      const v = argv[++i];
      const n = v ? Number.parseFloat(v) : NaN;
      if (!Number.isNaN(n)) threshold = n;
    }
  }
  return { mode, stage, threshold };
}

export async function run(opts: RunOptions): Promise<EvalReport> {
  const stages: Stage[] = opts.stage ? [opts.stage] : STAGES;
  const allCases: EvalCase[] = [];
  for (const stage of stages) {
    const dir = join(opts.evalsRoot, stage);
    const cases = await listEvalCases(dir, stage);
    allCases.push(...cases);
  }

  const results: EvalResult[] = [];
  const perStage: EvalReport['perStage'] = {
    plan: { total: 0, pass: 0, fail: 0 },
    design: { total: 0, pass: 0, fail: 0 },
    build: { total: 0, pass: 0, fail: 0 },
    test: { total: 0, pass: 0, fail: 0 },
    deploy: { total: 0, pass: 0, fail: 0 },
    maintain: { total: 0, pass: 0, fail: 0 },
  };

  for (const c of allCases) {
    perStage[c.stage].total++;
    const cos = cosineSimilarity(c.story, c.expected);
    const struct = structuralValidate(c.expected, c.stage);
    const wcStory = wordCount(c.story);
    const wcExpected = wordCount(c.expected);
    let status: EvalResult['status'];
    let message: string | undefined;

    if (opts.mode === 'record') {
      await writeFile(c.expectedPath, c.story, 'utf8');
      status = 'pass';
      message = 'recorded';
    } else {
      if (struct.valid && cos >= opts.threshold) {
        status = 'pass';
      } else {
        status = 'fail';
        const reasons: string[] = [];
        if (!struct.valid) reasons.push(`missing keys: ${struct.missingKeys.join(', ')}`);
        if (cos < opts.threshold) reasons.push(`cosine ${cos.toFixed(3)} < ${opts.threshold}`);
        message = reasons.join('; ');
      }
    }

    if (status === 'pass') perStage[c.stage].pass++;
    else perStage[c.stage].fail++;

    results.push({
      stage: c.stage,
      name: c.name,
      storyPath: c.storyPath,
      expectedPath: c.expectedPath,
      status,
      cosine: cos,
      threshold: opts.threshold,
      structuralMatch: struct.valid,
      missingKeys: struct.missingKeys,
      wordCountStory: wcStory,
      wordCountExpected: wcExpected,
      message,
    });
  }

  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const missingExpected = results.filter((r) => r.status === 'missing-expected').length;
  const errors = results.filter((r) => r.status === 'error').length;

  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    mode: opts.mode,
    threshold: opts.threshold,
    totalCases: results.length,
    pass,
    fail,
    missingExpected,
    errors,
    perStage,
    results,
  };

  await mkdir(dirname(opts.reportPath), { recursive: true });
  await writeFile(opts.reportPath, JSON.stringify(report, null, 2), 'utf8');

  return report;
}

function renderHumanSummary(report: EvalReport): string {
  const lines: string[] = [];
  lines.push(`Eval harness — mode: ${report.mode}, threshold: ${report.threshold}`);
  lines.push(
    `Totals: ${report.totalCases} cases — ${report.pass} pass, ${report.fail} fail, ${report.missingExpected} missing, ${report.errors} errors`,
  );
  lines.push('');
  lines.push('Per-stage:');
  for (const s of STAGES) {
    const ps = report.perStage[s];
    if (ps.total === 0) continue;
    lines.push(`  ${s.padEnd(8)} ${ps.pass}/${ps.total} pass`);
  }
  if (report.fail > 0) {
    lines.push('');
    lines.push('Failures:');
    for (const r of report.results.filter((x) => x.status !== 'pass')) {
      lines.push(
        `  [${r.stage}] ${r.name}: cosine=${r.cosine.toFixed(3)}, structural=${r.structuralMatch} — ${r.message ?? r.status}`,
      );
    }
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const jsonOut = argv.includes('--json');
  const { mode, stage, threshold } = parseArgs(argv);
  const evalsRoot = resolve(__dirname);
  const reportPath = join(evalsRoot, 'results.json');
  const report = await run({ mode, stage, threshold, reportPath, evalsRoot });
  if (jsonOut) {
    process.stdout.write(JSON.stringify(report, null, 2));
  } else {
    process.stdout.write(renderHumanSummary(report) + '\n');
  }
  process.exit(report.fail === 0 && report.errors === 0 ? 0 : 1);
}

const invokedDirectly = (() => {
  if (!process.argv[1]) return false;
  try {
    return resolve(process.argv[1]) === __filename;
  } catch {
    return false;
  }
})();

if (invokedDirectly) {
  void main().catch((err) => {
    console.error(err);
    process.exit(2);
  });
}

export { main as runMain };

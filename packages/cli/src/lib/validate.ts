import { Ajv2020 } from 'ajv/dist/2020.js';
// ajv-formats is a CJS module; its default export is the formatsPlugin function.
// Cast through unknown to satisfy TS's NodeNext namespace typing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import addFormatsImport from 'ajv-formats';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const addFormats = (addFormatsImport as any).default ?? addFormatsImport;
import fsExtra from 'fs-extra';
const { readFile } = fsExtra;
import { parse as parseYaml } from 'yaml';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve schema paths relative to this file's location so they work
// regardless of cwd (works in monorepo from both project root and packages/cli).
const SCHEMAS: Record<string, string> = {
  intent: resolve(__dirname, '../../../plugin/schemas/intent.schema.json'),
  spec: resolve(__dirname, '../../../plugin/schemas/spec.schema.json'),
  plan: resolve(__dirname, '../../../plugin/schemas/plan.schema.json'),
  'claude-md': resolve(__dirname, '../../../plugin/schemas/claude-md.schema.json'),
  review: resolve(__dirname, '../../../plugin/schemas/review.schema.json'),
  bands: resolve(__dirname, '../../../plugin/schemas/bands.schema.json'),
  policy: resolve(__dirname, '../../../plugin/schemas/policy.schema.json'),
};

export async function validateArtifact(
  artifact: string,
  filePath: string,
): Promise<{ valid: boolean; errors: string[] }> {
  const schemaPath = SCHEMAS[artifact];
  if (!schemaPath) {
    throw new Error(`Unknown artifact: ${artifact}. Valid: ${Object.keys(SCHEMAS).join(', ')}`);
  }

  const schema = JSON.parse(await readFile(schemaPath, 'utf8'));
  const content = await readFile(filePath, 'utf8');

  // Parse content (markdown frontmatter or yaml)
  let data: unknown;
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    // Templates may contain unrendered EJS tags; replace with safe placeholder
    // values so format validators (e.g. date) pass on freshly-rendered files.
    data = parseYaml(content.replace(/<%=[^%]+%>/g, '1970-01-01'));
  } else {
    data = parseMarkdownFrontmatter(content);
  }

  // Create a fresh Ajv instance per call to avoid schema-id collisions
  // when validating multiple files against the same schema in one process.
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  const valid = validate(data);
  return {
    valid,
    errors: validate.errors?.map((e: { instancePath: string; message?: string }) => `${e.instancePath} ${e.message ?? ''}`) ?? [],
  };
}

// Maps markdown H2 section headers to canonical schema field names.
// Keys are lower-cased headers (without the leading "## "). We intentionally
// map only scalar / string-array fields — complex shapes (object, array of
// objects) should remain in frontmatter so they pass schema validation.
const SECTION_MAP: Record<string, string> = {
  // spec.md
  'architecture': 'architecture',
  'verification criteria': 'verificationCriteria',
  'compliance': 'compliance',
  // intent.md
  'problem': 'problem',
  'proposed outcome': 'proposedOutcome',
  'affected users and systems': 'affectedUsersAndSystems',
  'constraints': 'constraints',
  'open questions': 'openQuestions',
};

function parseMarkdownBody(content: string): Record<string, unknown> {
  // Find body after the YAML frontmatter block, if any
  const fmMatch = content.match(/^---\n[\s\S]*?\n---\n?/);
  const body = fmMatch ? content.slice(fmMatch[0].length) : content;

  const result: Record<string, unknown> = {};
  // Split body on H2 lines. Each section's content runs to the next H2 (or EOF).
  const sectionRegex = /^##\s+(.+?)\s*$/gm;
  const matches: { name: string; start: number; bodyStart: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = sectionRegex.exec(body)) !== null) {
    matches.push({ name: m[1] ?? '', start: m.index, bodyStart: sectionRegex.lastIndex });
  }
  for (let i = 0; i < matches.length; i++) {
    const sectionName = matches[i]!.name.toLowerCase();
    const fieldName = SECTION_MAP[sectionName];
    if (!fieldName) continue;
    const start = matches[i]!.bodyStart;
    const end = i + 1 < matches.length ? matches[i + 1]!.start : body.length;
    const sectionBody = body.slice(start, end).trim();
    if (!sectionBody) continue;
    result[fieldName] = coerceSection(fieldName, sectionBody);
  }
  return result;
}

function coerceSection(fieldName: string, body: string): unknown {
  // Arrays of strings (one per line)
  if (
    fieldName === 'affectedUsersAndSystems' ||
    fieldName === 'constraints' ||
    fieldName === 'openQuestions' ||
    fieldName === 'verificationCriteria' ||
    fieldName === 'compliance'
  ) {
    return body
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-*]\s+/, '').trim())
      .filter((l) => l.length > 0 && !l.startsWith('['));
  }
  // Default: return as a single string (truncated placeholder content)
  return body;
}

function parseMarkdownFrontmatter(content: string): Record<string, unknown> {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  // Templates contain unrendered EJS tags like `<%= date %>`. Replace these
  // with safe placeholder values so JSON-schema format validators (date,
  // date-time) can run on freshly-rendered artifacts.
  const rawFm = fmMatch ? (fmMatch[1] ?? '').replace(/<%=[^%]+%>/g, '1970-01-01') : '';
  const fm = rawFm ? ((parseYaml(rawFm) ?? {}) as Record<string, unknown>) : {};
  const body = parseMarkdownBody(content);
  // Body sections fill in fields missing from frontmatter. Frontmatter wins
  // when both define a field (preserves frontmatter-only fields like `date`).
  for (const [key, value] of Object.entries(body)) {
    if (!(key in fm) || fm[key] === undefined || fm[key] === null || fm[key] === '') {
      fm[key] = value;
    }
  }
  return fm;
}

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
    data = parseYaml(content);
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

function parseMarkdownFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = parseYaml(match[1] ?? '');
  // Merge with body sections
  return (yaml ?? {}) as Record<string, unknown>;
}

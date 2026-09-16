import { readFile, writeFile } from 'node:fs/promises';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { generateId, validateId, type Stage } from '../lib/identity.js';

export interface RepairArgs {
  file: string;
  dryRun?: boolean | undefined;
}

function inferStage(file: string): Stage {
  const lower = file.toLowerCase();
  if (lower.includes('plan') || lower.includes('intent')) return 'plan';
  if (lower.includes('design') || lower.includes('spec')) return 'design';
  if (lower.includes('build') || /\.plan\.md$/.test(lower)) return 'build';
  if (lower.includes('claude')) return 'test';
  if (lower.includes('review')) return 'deploy';
  if (lower.includes('bands') || lower.includes('maintain')) return 'maintain';
  return 'plan';
}

export async function repair(args: RepairArgs): Promise<number> {
  const content = await readFile(args.file, 'utf-8');
  const m = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!m) {
    console.error(`repair: no frontmatter in ${args.file}`);
    return 2;
  }
  const fm = parseYaml(m[1]!) as Record<string, unknown>;
  const changes: string[] = [];
  if (!fm.id || !validateId(String(fm.id))) {
    const slug = String(fm.title ?? 'repaired')
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .slice(0, 30);
    const stage = inferStage(args.file);
    const cycleId = Number(fm.cycle_id ?? 1);
    fm.id = generateId({ stage, cycle: cycleId, slug });
    changes.push(`regenerated id → ${String(fm.id)}`);
  }
  if (!fm.schema_version) {
    fm.schema_version = '0.5.0';
    changes.push(`set schema_version → 0.5.0`);
  }
  if (!fm.state) {
    fm.state = 'draft';
    changes.push(`set state → draft`);
  }
  if (!fm.created_at) {
    fm.created_at = new Date().toISOString();
    changes.push(`set created_at`);
  }
  if (changes.length === 0) {
    console.log(`repair: ${args.file} already valid`);
    return 0;
  }
  const newContent = `---\n${stringifyYaml(fm)}---\n${content.slice(m[0].length)}`;
  if (!args.dryRun) await writeFile(args.file, newContent, 'utf-8');
  for (const c of changes) console.log(`repair: ${c}`);
  return 0;
}

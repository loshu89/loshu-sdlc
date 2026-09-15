import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { Artifact } from './types.js';
import type { Stage } from '../identity.js';

interface CycleFile {
  current_cycle: number;
  cycles: Record<
    string,
    {
      stages: Partial<Record<Stage, { artifact_id?: string; artifact_path?: string }>>;
    }
  >;
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

function parseFrontmatter(content: string): Record<string, unknown> {
  const m = FRONTMATTER_RE.exec(content);
  if (!m) return {};
  const lines = m[1]!.split('\n');
  const obj: Record<string, unknown> = {};
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) obj[kv[1]!] = kv[2];
  }
  return obj;
}

export async function discoverArtifacts(rootPath: string): Promise<Artifact[]> {
  const cyclePath = join(rootPath, '.loshu-sdlc/state/cycle.json');
  try {
    await stat(cyclePath);
  } catch {
    return [];
  }
  const cycleRaw = await readFile(cyclePath, 'utf-8');
  const cycle = JSON.parse(cycleRaw) as CycleFile;
  const artifacts: Artifact[] = [];
  for (const cycleEntry of Object.values(cycle.cycles)) {
    for (const [stage, stageEntry] of Object.entries(cycleEntry.stages)) {
      if (!stageEntry.artifact_path || !stageEntry.artifact_id) continue;
      const filePath = join(rootPath, stageEntry.artifact_path);
      const fm = parseFrontmatter(await readFile(filePath, 'utf-8').catch(() => ''));
      artifacts.push({
        stage: stage as Stage,
        filePath,
        id: String(fm.id ?? stageEntry.artifact_id),
      });
    }
  }
  return artifacts;
}
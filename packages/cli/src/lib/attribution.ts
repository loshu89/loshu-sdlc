import fsExtra from 'fs-extra';
import { join } from 'node:path';

export interface AttributionResult {
  file: string;
  hasProvenance: boolean;
  source?: string | undefined;
}

export async function checkAttribution(dir: string): Promise<AttributionResult[]> {
  const results: AttributionResult[] = [];
  const files = await fsExtra.readdir(dir).catch(() => []);
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    const content = await fsExtra.readFile(join(dir, file), 'utf8').catch(() => '');
    const hasProvenance = /^---\n[\s\S]*?provenance:[\s\S]*?source:/m.test(content);
    const sourceMatch = content.match(/source:\s*(\S+)/);
    results.push({
      file,
      hasProvenance,
      source: sourceMatch?.[1],
    });
  }
  return results;
}

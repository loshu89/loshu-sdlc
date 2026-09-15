// packages/cli/src/lib/codeowners.ts
export interface CodeownerEntry {
  pattern: string;
  owners: string[];
}

export function parseCodeowners(content: string): CodeownerEntry[] {
  const entries: CodeownerEntry[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const parts = line.split(/\s+/);
    const pattern = parts[0]!;
    const owners = parts.slice(1);
    if (owners.length > 0) entries.push({ pattern, owners });
  }
  return entries;
}

// Returns owners whose pattern matches `path`. Later patterns override earlier
// (matches GitHub semantics: last matching pattern wins).
export function reviewersForPath(entries: CodeownerEntry[], path: string): string[] {
  let result: string[] = [];
  for (const entry of entries) {
    if (matchPattern(entry.pattern, path)) result = entry.owners;
  }
  return result;
}

function matchPattern(pattern: string, path: string): boolean {
  if (pattern === path) return true;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    if (path.startsWith(prefix + '/') || path === prefix) return true;
  }
  return false;
}

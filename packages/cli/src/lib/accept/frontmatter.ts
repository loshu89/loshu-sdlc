import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

/**
 * Read and parse a markdown file's YAML frontmatter. Returns null on any
 * failure (file missing, unreadable, no frontmatter, parse error).
 * Used by the Layer 1/2 acceptance assertions.
 */
export async function readFrontmatterFile(
  path: string,
): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(path, 'utf-8');
    const m = FRONTMATTER_RE.exec(content);
    if (!m) return null;
    return parseYaml(m[1]!) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Same as readFrontmatterFile but returns {} on any failure instead of
 * null. Used by the Layer 2/3 assertions that want to fall through
 * to a "missing fields → fail with helpful message" rather than
 * short-circuit on a missing file.
 */
export async function readFrontmatterFileOrEmpty(
  path: string,
): Promise<Record<string, unknown>> {
  return (await readFrontmatterFile(path)) ?? {};
}
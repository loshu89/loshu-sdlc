import { ulid } from 'ulid';
import { randomBytes } from 'node:crypto';

export type Stage = 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';

export interface GenerateIdOptions {
  stage: Stage;
  cycle: number;
  slug: string;
}

export interface ParsedId {
  stage: Stage;
  cycle: number;
  slug: string;
  hex: string;
  ulid: string;
}

// ID format: stage-c##-slug-####-ULID
// Stage: one of plan|design|build|test|deploy|maintain
// c##: cycle number, zero-padded
// slug: kebab-case, max 30 chars
// ####: 4-hex random suffix (collision absorber)
// ULID: 26 chars (Crockford Base32), time-ordered
export const ID_REGEX =
  /^(plan|design|build|test|deploy|maintain)-c(\d{2,})-([a-z0-9-]+)-([0-9a-f]{4})-([0-9A-HJKMNP-TV-Z]{26})$/;

export function generateId(opts: GenerateIdOptions): string {
  const slug = opts.slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
  const cycle = String(opts.cycle).padStart(2, '0');
  const hex = randomBytes(2).toString('hex');
  const ulidStr = ulid();
  return `${opts.stage}-c${cycle}-${slug}-${hex}-${ulidStr}`;
}

export function validateId(id: string): boolean {
  return ID_REGEX.test(id);
}

export function parseId(id: string): ParsedId | null {
  const m = ID_REGEX.exec(id);
  if (!m) return null;
  return {
    stage: m[1] as Stage,
    cycle: Number(m[2]),
    slug: m[3] ?? '',
    hex: m[4] ?? '',
    ulid: m[5] ?? '',
  };
}
// packages/plugin/migrations/intent-0.1.0-to-0.2.0.ts
// 0.1.0 had no `state` field; 0.2.0 added it.
export function transform(artifact: any): any {
  return {
    ...artifact,
    state: 'draft',
  };
}
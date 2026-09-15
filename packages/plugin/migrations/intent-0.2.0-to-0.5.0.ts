// Adds Identity fields required by 0.5.0. Caller provides actual values
// for `id`, `cycle_id`, etc. via post-processing.
export function transform(artifact: any): any {
  return {
    ...artifact,
    // Identity fields — defaults; loshu-sdlc migrate CLI fills in real values
    id: artifact.id ?? '',
    schema_version: '0.5.0',
    cycle_id: artifact.cycle_id ?? 0,
    stage: 'plan',
    created_by: artifact.created_by ?? 'unknown',
    created_at: artifact.created_at ?? new Date().toISOString(),
    parent_ids: artifact.parent_ids ?? [],
    state: artifact.state ?? 'iterating',
  };
}

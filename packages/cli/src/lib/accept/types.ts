import type { Stage } from '../identity.js';

export interface Artifact {
  stage: Stage;
  filePath: string;
  id: string;
  // Absolute path to the project root (parent of `.loshu-sdlc/`).
  // Populated by discover.ts from the cycle.json path. Needed by
  // project-scope assertions (A3 global uniqueness, V4 cross-cycle,
  // C4 parent existence) to re-read cycle.json or walk the artifact set.
  rootPath: string;
}

export type AssertionResult =
  | { pass: true; rule: string }
  | { pass: false; rule: string; message: string; fix?: string };

export interface Assertion {
  rule: string;
  layer: 1 | 2 | 3 | 4;
  description: string;
  run: (artifact: Artifact) => Promise<AssertionResult>;
}
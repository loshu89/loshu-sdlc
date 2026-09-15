import type { Stage } from '../identity.js';

export interface Artifact {
  stage: Stage;
  filePath: string;
  id: string;
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
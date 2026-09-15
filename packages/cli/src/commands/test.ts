import { runProject } from '../lib/accept/runner.js';

export interface TestArgs {
  file?: string;
  layer?: 1 | 2 | 3 | 4;
  strict?: boolean;
  fix?: boolean;
  reporter?: 'text' | 'json' | 'junit';
}

export async function test(args: TestArgs): Promise<number> {
  const rootPath = process.cwd();
  const result = await runProject(rootPath, {
    ...(args.file !== undefined ? { file: args.file } : {}),
    ...(args.layer !== undefined ? { layer: args.layer } : {}),
  });
  if (args.reporter === 'json') {
    console.log(JSON.stringify(result, null, 2));
  } else if (args.reporter === 'junit') {
    console.log('<?xml version="1.0" encoding="UTF-8"?>');
    console.log(`<testsuites tests="${result.total}" failures="${result.failed}">`);
    console.log('<testsuite name="acceptance">');
    for (const { artifact, assertion } of result.results) {
      if (assertion.pass) {
        console.log(`<testcase classname="${artifact.stage}" name="${assertion.rule}" />`);
      } else {
        console.log(
          `<testcase classname="${artifact.stage}" name="${assertion.rule}"><failure>${assertion.message}</failure></testcase>`,
        );
      }
    }
    console.log('</testsuite></testsuites>');
  } else {
    console.log(
      `Acceptance: ${result.passed}/${result.total} passed, ${result.failed} failed`,
    );
    if (result.failed > 0) {
      console.log('\nFailures:');
      for (const { artifact, assertion } of result.results) {
        if (!assertion.pass)
          console.log(
            `  ${assertion.rule} [${artifact.stage}] ${artifact.filePath}: ${assertion.message}`,
          );
      }
    }
  }
  return args.strict && result.failed > 0 ? 1 : 0;
}
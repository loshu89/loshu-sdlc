import chalk from 'chalk';
import { validateArtifact } from '../lib/validate.js';

export interface ValidateArgs {
  artifact: string;
  filePath: string;
  strict?: boolean | undefined;
  verbose?: boolean | undefined;
}

export async function validate(args: ValidateArgs): Promise<number> {
  const result = await validateArtifact(args.artifact, args.filePath);
  if (result.valid) {
    console.log(chalk.green(`✔ ${args.filePath} valid`));
    return 0;
  } else {
    console.error(chalk.red(`✗ ${args.filePath} failed validation:`));
    for (const err of result.errors) {
      console.error(`  ${err}`);
    }
    return 3;
  }
}

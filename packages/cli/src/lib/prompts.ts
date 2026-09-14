import inquirer from 'inquirer';

export interface ScaffoldOptions {
  projectName: string;
  template: 'minimal' | 'full';
  installUx: boolean;
  installEcc: boolean;
  coverageLine: number;
  coverageBranch: number;
  initGit: boolean;
  strict: boolean;
}

export async function runPrompts(defaultName: string): Promise<ScaffoldOptions> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'Project name:',
      default: defaultName,
    },
    {
      type: 'list',
      name: 'template',
      message: 'Template:',
      choices: ['minimal', 'full'],
      default: 'minimal',
    },
    {
      type: 'confirm',
      name: 'installUx',
      message: 'Install ui-ux-pro-max alongside?',
      default: false,
    },
    {
      type: 'confirm',
      name: 'installEcc',
      message: 'Install ECC alongside?',
      default: false,
    },
    {
      type: 'number',
      name: 'coverageLine',
      message: 'Line coverage threshold:',
      default: 80,
    },
    {
      type: 'number',
      name: 'coverageBranch',
      message: 'Branch coverage threshold:',
      default: 75,
    },
    {
      type: 'confirm',
      name: 'initGit',
      message: 'Initialize git + first commit?',
      default: true,
    },
    {
      type: 'confirm',
      name: 'strict',
      message: 'Enable strict eval mode?',
      default: false,
    },
  ]);
  return answers as ScaffoldOptions;
}
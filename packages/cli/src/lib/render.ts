import ejs from 'ejs';

export function renderEjs(template: string, vars: Record<string, string>): string {
  return ejs.render(template, vars, { filename: '<inline>' });
}

export async function renderFile(
  filePath: string,
  vars: Record<string, string>,
): Promise<string> {
  return ejs.renderFile(filePath, vars, { async: true });
}
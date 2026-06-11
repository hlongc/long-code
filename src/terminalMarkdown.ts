import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import chalk from "chalk";

marked.setOptions({
  renderer: new TerminalRenderer({
    heading: chalk.bold.cyan,
    strong: chalk.bold,
    em: chalk.italic,
    codespan: chalk.yellow,
    code: chalk.green,
    blockquote: chalk.gray,
    table: chalk.white,

    showSectionPrefix: false,
    reflowText: true,
    width: process.stdout.columns || 100,
  }),
});

export async function renderMarkdown(markdown: string | null | undefined) {
  if (!markdown) {
    return "";
  }

  return await marked(markdown);
}

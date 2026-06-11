import { marked } from "marked";
import TerminalRenderer from "marked-terminal";
import chalk from "chalk";

marked.setOptions({
  gfm: true,
  breaks: false,
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
  }) as any,
});

export async function renderMarkdown(markdown: string | null | undefined) {
  if (!markdown) {
    return "";
  }

  const rendered = await marked(markdown);

  return cleanMarkdownArtifacts(rendered);
}

function cleanMarkdownArtifacts(text: string) {
  return text
    .replace(/^(\s*)#{1,6}\s+/gm, "$1")
    .replace(/^(\s*)\*\s+\*\*(.*?)\*\*/gm, "$1• $2")
    .replace(/^(\s*)\*\s+/gm, "$1• ")
    .replace(/^(\s*\d+\.\s*)\*\*(.*?)\*\*/gm, "$1$2")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(?<!\S)\*([^*\n]+)\*(?!\S)/g, "$1");
}

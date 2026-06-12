import fs from "node:fs/promises";
import { resolveProjectPath } from "../pathSecurity.js";

export async function readFile(args: {
  file: string;
  startLine?: number;
  endLine?: number;
}) {
  const decision = resolveProjectPath(args.file);

  if (!decision.allowed) {
    return [
      `读取失败：${decision.reason}`,
      `absPath: ${decision.absPath}`,
      `如确实需要访问项目外文件，请先获得用户授权。`,
    ].join("\n");
  }

  const content = await fs.readFile(decision.absPath, "utf-8");
  const lines = content.split("\n");

  if (args.startLine || args.endLine) {
    const startLine = Math.max((args.startLine || 1) - 1, 0);
    const endLine = Math.min(args.endLine || lines.length, lines.length);

    return lines
      .slice(startLine, endLine)
      .map((line, index) => `${startLine + index + 1}: ${line}`)
      .join("\n");
  }

  const maxLength = 12000;

  if (content.length > maxLength) {
    return (
      content.slice(0, maxLength) +
      `\n\n[文件过长，已截断。总行数=${lines.length}。如需后续内容，请使用 startLine/endLine 分段读取]`
    );
  }

  return content;
}

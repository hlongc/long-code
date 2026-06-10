import fs from "node:fs/promises";
import { resolveProjectPath } from "../pathSecurity.js";

export async function readFile(args: { file: string }) {
  const decision = resolveProjectPath(args.file);

  if (!decision.allowed) {
    return [
      `读取失败：${decision.reason}`,
      `absPath: ${decision.absPath}`,
      `如确实需要访问项目外文件，请先获得用户授权。`,
    ].join("\n");
  }

  const content = await fs.readFile(decision.absPath, "utf-8");

  const maxLength = 12000;

  if (content.length > maxLength) {
    return content.slice(0, maxLength) + "\n\n[文件过长，已截断]";
  }

  return content;
}

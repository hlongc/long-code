import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectPath } from "../pathSecurity.js";

export async function writeFile(args: { file: string; content: string }) {
  const decision = resolveProjectPath(args.file);

  if (!decision.allowed) {
    return [
      `写入失败：${decision.reason}`,
      `absPath: ${decision.absPath}`,
      `项目外写入需要用户显式授权。`,
    ].join("\n");
  }

  await fs.mkdir(path.dirname(decision.absPath), { recursive: true });
  await fs.writeFile(decision.absPath, args.content, "utf-8");

  return `写入成功：${args.file}`;
}

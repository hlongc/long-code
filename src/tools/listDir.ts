import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectPath } from "../pathSecurity.js";

export async function listDir(args: { dir?: string }) {
  const dir = args.dir || ".";
  const decision = resolveProjectPath(dir);

  if (!decision.allowed) {
    return [
      `列目录失败：${decision.reason}`,
      `absPath: ${decision.absPath}`,
      `项目外目录访问需要用户显式授权。`,
    ].join("\n");
  }

  const entries = await fs.readdir(decision.absPath, { withFileTypes: true });

  return entries
    .map((entry) => {
      if (entry.isDirectory()) return `${entry.name}/`;
      return entry.name;
    })
    .join("\n");
}

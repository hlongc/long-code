import fg from "fast-glob";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveProjectPath } from "../pathSecurity.js";
import { runtimeContext } from "../runtimeContext.js";

export async function grep(args: {
  query: string;
  glob?: string;
  dir?: string;
}) {
  const searchDir = args.dir || ".";
  const dirDecision = resolveProjectPath(searchDir);

  if (!dirDecision.allowed) {
    return [
      `搜索失败：${dirDecision.reason}`,
      `absPath: ${dirDecision.absPath}`,
      `项目外搜索需要用户显式授权。`,
    ].join("\n");
  }

  const pattern = args.glob || "**/*.{ts,tsx,js,jsx,json,md}";

  const files = await fg(pattern, {
    cwd: dirDecision.absPath,
    onlyFiles: true,
    ignore: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".git/**",
      "coverage/**",
      "pnpm-lock.yaml",
    ],
  });

  const results: string[] = [];
  const normalizedQuery = args.query.toLowerCase();

  for (const file of files.slice(0, 200)) {
    const absPath = path.resolve(dirDecision.absPath, file);
    const content = await fs.readFile(absPath, "utf-8").catch(() => "");

    if (!content) {
      continue;
    }

    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(normalizedQuery)) {
        const relativePath = path.relative(runtimeContext.projectRoot, absPath);

        results.push(`${relativePath}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  return results.slice(0, 50).join("\n") || "没有找到匹配结果";
}

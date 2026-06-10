import fg from "fast-glob";
import fs from "node:fs/promises";

export async function grep(args: { query: string; glob?: string }) {
  const pattern = args.glob || "**/*.{ts,tsx,js,jsx,json,md}";
  const files = await fg(pattern, {
    cwd: process.cwd(),
    ignore: ["node_modules/**", "dist/**", "build/**", ".git/**"],
  });

  const results: string[] = [];

  for (const file of files.slice(0, 200)) {
    const content = await fs.readFile(file, "utf-8").catch(() => "");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(args.query.toLowerCase())) {
        results.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  return results.slice(0, 50).join("\n") || "没有找到匹配结果";
}
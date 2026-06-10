import fs from "node:fs/promises";
import path from "node:path";

export async function readFile(args: { file: string }) {
  const target = path.resolve(process.cwd(), args.file);
  const content = await fs.readFile(target, "utf-8");

  // 防止一次性塞爆上下文，先简单截断
  const maxLength = 12000;

  if (content.length > maxLength) {
    return content.slice(0, maxLength) + "\n\n[文件过长，已截断]";
  }

  return content;
}
import fs from "node:fs/promises";
import path from "node:path";

export async function writeFile(args: { file: string; content: string }) {
  const target = path.resolve(process.cwd(), args.file);

  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, args.content, "utf-8");

  return `写入成功：${args.file}`;
}
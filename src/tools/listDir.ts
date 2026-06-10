import fs from "node:fs/promises";
import path from "node:path";

export async function listDir(args: { dir?: string }) {
  const dir = args.dir || ".";
  const target = path.resolve(process.cwd(), dir);

  const entries = await fs.readdir(target, { withFileTypes: true });

  return entries
    .map((entry) => {
      if (entry.isDirectory()) return `${entry.name}/`;
      return entry.name;
    })
    .join("\n");
}
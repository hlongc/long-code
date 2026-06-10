import fs from "node:fs/promises";
import path from "node:path";

export async function editFile(args: {
  file: string;
  oldText: string;
  newText: string;
}) {
  const target = path.resolve(process.cwd(), args.file);

  const content = await fs.readFile(target, "utf-8");

  if (!content.includes(args.oldText)) {
    return [
      `编辑失败：文件中没有找到 oldText。`,
      `file: ${args.file}`,
      ``,
      `建议：请重新 read_file 获取最新文件内容后，再使用精确的 oldText。`,
    ].join("\n");
  }

  const nextContent = content.replace(args.oldText, args.newText);

  await fs.writeFile(target, nextContent, "utf-8");

  return [
    `编辑成功：${args.file}`,
    `替换内容长度：${args.oldText.length} -> ${args.newText.length}`,
  ].join("\n");
}
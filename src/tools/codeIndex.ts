import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { writeCodeChunks, type CodeChunk } from "../codeIndexStore.js";

const defaultPatterns = ["**/*.{ts,tsx,js,jsx,json,md}"];

const ignorePatterns = [
  "node_modules/**",
  "dist/**",
  "build/**",
  ".git/**",
  "coverage/**",
  "pnpm-lock.yaml",
];

export async function codeIndex(args: { glob?: string }) {
  const pattern = args.glob || defaultPatterns;

  const files = await fg(pattern, {
    cwd: process.cwd(),
    ignore: ignorePatterns,
    onlyFiles: true,
  });

  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const absPath = path.resolve(process.cwd(), file);
    const content = await fs.readFile(absPath, "utf-8").catch(() => "");

    if (!content.trim()) {
      continue;
    }

    chunks.push(...splitFileIntoChunks(file, content));
  }

  writeCodeChunks(chunks);

  return [
    `代码索引已建立。`,
    `文件数量：${files.length}`,
    `代码片段数量：${chunks.length}`,
  ].join("\n");
}

function splitFileIntoChunks(file: string, content: string): CodeChunk[] {
  const lines = content.split("\n");

  const chunkSize = 80;
  const overlap = 20;

  const chunks: CodeChunk[] = [];

  for (let start = 0; start < lines.length; start += chunkSize - overlap) {
    const end = Math.min(start + chunkSize, lines.length);
    const chunkLines = lines.slice(start, end);

    chunks.push({
      id: `${file}:${start + 1}-${end}`,
      file,
      startLine: start + 1,
      endLine: end,
      content: chunkLines.join("\n"),
    });

    if (end === lines.length) {
      break;
    }
  }

  return chunks;
}

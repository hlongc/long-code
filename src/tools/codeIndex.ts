import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { writeCodeChunks, type CodeChunk } from "../codeIndexStore.js";
import { resolveProjectPath } from "../pathSecurity.js";
import { runtimeContext } from "../runtimeContext.js";

const defaultPatterns = ["**/*.{ts,tsx,js,jsx,json,md}"];

const ignorePatterns = [
  "node_modules/**",
  "dist/**",
  "build/**",
  ".git/**",
  "coverage/**",
  "pnpm-lock.yaml",
];

export async function codeIndex(args: { glob?: string; dir?: string }) {
  const indexDir = args.dir || ".";
  const dirDecision = resolveProjectPath(indexDir);

  if (!dirDecision.allowed) {
    return [
      `代码索引失败：${dirDecision.reason}`,
      `absPath: ${dirDecision.absPath}`,
      `项目外代码索引需要用户显式授权。`,
    ].join("\n");
  }

  const pattern = args.glob || defaultPatterns;

  const files = await fg(pattern, {
    cwd: dirDecision.absPath,
    ignore: ignorePatterns,
    onlyFiles: true,
  });

  const chunks: CodeChunk[] = [];

  for (const file of files) {
    const absPath = path.resolve(dirDecision.absPath, file);
    const content = await fs.readFile(absPath, "utf-8").catch(() => "");

    if (!content.trim()) {
      continue;
    }

    const displayPath = path.relative(runtimeContext.projectRoot, absPath);

    chunks.push(...splitFileIntoChunks(displayPath, content));
  }

  writeCodeChunks(chunks);

  const displayIndexDir =
    path.relative(runtimeContext.projectRoot, dirDecision.absPath) || ".";

  return [
    `代码索引已建立。`,
    `索引目录：${displayIndexDir}`,
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

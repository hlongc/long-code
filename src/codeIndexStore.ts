import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import { runtimeContext } from "./runtimeContext.js";

export type CodeChunk = {
  id: string;
  file: string;
  startLine: number;
  endLine: number;
  content: string;
};

export type CodeIndexFile = {
  version: 1;
  projectRoot: string;
  createdAt: string;
  files: IndexedFileMeta[];
  chunks: CodeChunk[];
};

export type IndexedFileMeta = {
  file: string;
  size: number;
  mtimeMs: number;
};

let chunks: CodeChunk[] = [];

const defaultPatterns = ["**/*.{ts,tsx,js,jsx,json,md}"];

const ignorePatterns = [
  "node_modules/**",
  "dist/**",
  "build/**",
  ".git/**",
  "coverage/**",
  "pnpm-lock.yaml",
  ".code-index/**",
];

export function writeCodeChunks(nextChunks: CodeChunk[]) {
  chunks = nextChunks;
}

export function readCodeChunks() {
  return chunks;
}

export function clearCodeChunks() {
  chunks = [];
}

export async function inspectCodeIndexFreshness() {
  const status = await getCodeIndexStatus();

  if (!status.exists) {
    return {
      exists: false,
      fresh: false,
      reason: "索引不存在",
      changedFiles: [] as string[],
      addedFiles: [] as string[],
      deletedFiles: [] as string[],
    };
  }

  const indexFile = getCodeIndexFilePath();
  const raw = await fs.readFile(indexFile, "utf-8").catch(() => "");

  if (!raw) {
    return {
      exists: false,
      fresh: false,
      reason: "索引文件读取失败",
      changedFiles: [] as string[],
      addedFiles: [] as string[],
      deletedFiles: [] as string[],
    };
  }

  const payload = JSON.parse(raw) as CodeIndexFile;

  if (!Array.isArray(payload.files)) {
    return {
      exists: true,
      fresh: false,
      reason: "索引格式过旧，需要重建",
      changedFiles: [],
      addedFiles: [],
      deletedFiles: [],
    };
  }

  const indexedFiles = new Map(
    (payload.files || []).map((file) => [file.file, file]),
  );

  const currentFiles = await fg(defaultPatterns, {
    cwd: runtimeContext.projectRoot,
    ignore: ignorePatterns,
    onlyFiles: true,
  });

  const currentFileMetas = new Map<string, IndexedFileMeta>();

  for (const file of currentFiles) {
    const absPath = path.join(runtimeContext.projectRoot, file);
    const stat = await fs.stat(absPath).catch(() => null);

    if (!stat || !stat.isFile()) {
      continue;
    }

    currentFileMetas.set(file, {
      file,
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }

  const changedFiles: string[] = [];
  const addedFiles: string[] = [];
  const deletedFiles: string[] = [];

  for (const [file, current] of currentFileMetas) {
    const indexed = indexedFiles.get(file);

    if (!indexed) {
      addedFiles.push(file);
      continue;
    }

    if (indexed.size !== current.size || indexed.mtimeMs !== current.mtimeMs) {
      changedFiles.push(file);
    }
  }

  for (const file of indexedFiles.keys()) {
    if (!currentFileMetas.has(file)) {
      deletedFiles.push(file);
    }
  }

  const fresh =
    changedFiles.length === 0 &&
    addedFiles.length === 0 &&
    deletedFiles.length === 0;

  return {
    exists: true,
    fresh,
    reason: fresh ? "索引是最新的" : "索引已过期",
    changedFiles,
    addedFiles,
    deletedFiles,
  };
}

export async function saveCodeIndexToDisk(files: IndexedFileMeta[]) {
  const indexFile = getCodeIndexFilePath();

  await fs.mkdir(path.dirname(indexFile), { recursive: true });

  const payload: CodeIndexFile = {
    version: 1,
    projectRoot: runtimeContext.projectRoot,
    createdAt: new Date().toISOString(),
    chunks,
    files,
  };

  await fs.writeFile(indexFile, JSON.stringify(payload, null, 2), "utf-8");
}

export async function loadCodeIndexFromDisk() {
  const indexFile = getCodeIndexFilePath();

  const raw = await fs.readFile(indexFile, "utf-8").catch(() => "");

  if (!raw) {
    return false;
  }

  const payload = JSON.parse(raw) as CodeIndexFile;

  if (payload.version !== 1 || !Array.isArray(payload.chunks)) {
    return false;
  }

  chunks = payload.chunks;

  return true;
}

export function getCodeIndexFilePath() {
  return path.join(runtimeContext.projectRoot, ".code-index", "index.json");
}

export async function getCodeIndexStatus() {
  const indexFile = getCodeIndexFilePath();

  const raw = await fs.readFile(indexFile, "utf-8").catch(() => "");

  if (!raw) {
    return {
      exists: false,
      indexFile,
      chunks: 0,
      createdAt: "",
      projectRoot: runtimeContext.projectRoot,
    };
  }

  try {
    const payload = JSON.parse(raw) as CodeIndexFile;

    return {
      exists: true,
      indexFile,
      chunks: payload.chunks?.length || 0,
      createdAt: payload.createdAt,
      projectRoot: payload.projectRoot,
    };
  } catch {
    return {
      exists: false,
      indexFile,
      chunks: 0,
      createdAt: "",
      projectRoot: runtimeContext.projectRoot,
    };
  }
}

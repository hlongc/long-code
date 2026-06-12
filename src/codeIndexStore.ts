import fs from "node:fs/promises";
import path from "node:path";
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
  chunks: CodeChunk[];
};

let chunks: CodeChunk[] = [];

export function writeCodeChunks(nextChunks: CodeChunk[]) {
  chunks = nextChunks;
}

export function readCodeChunks() {
  return chunks;
}

export function clearCodeChunks() {
  chunks = [];
}

export async function saveCodeIndexToDisk() {
  const indexFile = getCodeIndexFilePath();

  await fs.mkdir(path.dirname(indexFile), { recursive: true });

  const payload: CodeIndexFile = {
    version: 1,
    projectRoot: runtimeContext.projectRoot,
    createdAt: new Date().toISOString(),
    chunks,
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

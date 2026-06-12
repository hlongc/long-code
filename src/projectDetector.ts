import fs from "node:fs/promises";
import path from "node:path";
import { runtimeContext } from "./runtimeContext.js";

export type ProjectType = "node" | "python" | "go" | "rust" | "unknown";

export type ProjectInfo = {
  type: ProjectType;
  root: string;
  files: string[];
};

const detectorFiles = [
  "package.json",
  "pyproject.toml",
  "requirements.txt",
  "go.mod",
  "Cargo.toml",
];

export async function detectProject(): Promise<ProjectInfo> {
  const root = runtimeContext.projectRoot;
  const existingFiles: string[] = [];

  for (const file of detectorFiles) {
    const absPath = path.join(root, file);

    try {
      await fs.access(absPath);
      existingFiles.push(file);
    } catch {
      // ignore
    }
  }

  if (existingFiles.includes("package.json")) {
    return { type: "node", root, files: existingFiles };
  }

  if (
    existingFiles.includes("pyproject.toml") ||
    existingFiles.includes("requirements.txt")
  ) {
    return { type: "python", root, files: existingFiles };
  }

  if (existingFiles.includes("go.mod")) {
    return { type: "go", root, files: existingFiles };
  }

  if (existingFiles.includes("Cargo.toml")) {
    return { type: "rust", root, files: existingFiles };
  }

  return { type: "unknown", root, files: existingFiles };
}

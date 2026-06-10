import path from "node:path";
import { runtimeContext } from "./runtimeContext.js";

const allowedExternalPaths = new Set<string>();

export function allowExternalPath(absPath: string) {
  allowedExternalPaths.add(absPath);
}

export function isExternalPathAllowed(absPath: string) {
  return allowedExternalPaths.has(absPath);
}

export type PathAccessDecision =
  | {
      allowed: true;
      absPath: string;
      isOutsideProject: boolean;
    }
  | {
      allowed: false;
      absPath: string;
      isOutsideProject: true;
      reason: string;
    };

export function resolveProjectPath(inputPath: string): PathAccessDecision {
  const projectRoot = runtimeContext.projectRoot;
  const absPath = path.resolve(projectRoot, inputPath);

  const relative = path.relative(projectRoot, absPath);
  const isOutsideProject =
    relative.startsWith("..") || path.isAbsolute(relative);

  if (isOutsideProject && !isExternalPathAllowed(absPath)) {
    return {
      allowed: false,
      absPath,
      isOutsideProject: true,
      reason: `路径超出项目目录：${inputPath}`,
    };
  }

  return {
    allowed: true,
    absPath,
    isOutsideProject,
  };
}

export function inspectPathAccess(inputPath: string) {
  const projectRoot = runtimeContext.projectRoot;
  const absPath = path.resolve(projectRoot, inputPath);
  const relative = path.relative(projectRoot, absPath);
  const isOutsideProject =
    relative.startsWith("..") || path.isAbsolute(relative);

  return {
    inputPath,
    absPath,
    isOutsideProject,
    alreadyAllowed: isExternalPathAllowed(absPath),
  };
}

import path from "node:path";

export const runtimeContext = {
  projectRoot: process.cwd(),
};

export function setProjectRoot(projectRoot: string) {
  runtimeContext.projectRoot = path.resolve(projectRoot);
}
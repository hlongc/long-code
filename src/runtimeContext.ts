import path from "node:path";

export const runtimeContext = {
  projectRoot: process.cwd(),
  maxSteps: 15,
};

export function setProjectRoot(projectRoot: string) {
  runtimeContext.projectRoot = path.resolve(projectRoot);
}

export function setMaxSteps(maxSteps: number) {
  runtimeContext.maxSteps = maxSteps;
}

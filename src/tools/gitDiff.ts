import { execa } from "execa";
import { runtimeContext } from "../runtimeContext.js";

async function runGit(args: string[]) {
  const result = await execa("git", args, {
    cwd: runtimeContext.projectRoot,
  }).catch((error) => {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
    };
  });

  return [
    result.stdout ? result.stdout : "",
    result.stderr ? `stderr:\n${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function gitDiff() {
  const status = await runGit(["status", "--short"]);
  const unstagedDiff = await runGit(["diff"]);
  const stagedDiff = await runGit(["diff", "--cached"]);

  return [
    "## Git Status",
    status || "工作区没有状态变更",
    "",
    "## Unstaged Diff",
    unstagedDiff || "没有未暂存 diff",
    "",
    "## Staged Diff",
    stagedDiff || "没有已暂存 diff",
  ].join("\n");
}

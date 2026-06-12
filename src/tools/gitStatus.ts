import { execa } from "execa";
import { runtimeContext } from "../runtimeContext.js";

async function runGit(args: string[]) {
  const result = await execa("git", args, {
    cwd: runtimeContext.projectRoot,
  }).catch((error) => {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      exitCode: error.exitCode ?? 1,
    };
  });

  return {
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    exitCode: "exitCode" in result ? result.exitCode : 0,
  };
}

export async function gitStatus() {
  const branch = await runGit(["branch", "--show-current"]);
  const status = await runGit(["status", "--short"]);
  const lastCommit = await runGit(["log", "-1", "--oneline"]);

  return [
    `当前分支：${branch.stdout || "unknown"}`,
    "",
    "工作区状态：",
    status.stdout || "工作区干净",
    "",
    "最近提交：",
    lastCommit.stdout || "无提交记录",
  ].join("\n");
}

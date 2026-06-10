import { execa } from "execa";
import { runtimeContext } from "../runtimeContext.js";
import { checkDangerousCommand } from "../commandSafety.js";

export async function bash(args: { command: string }) {
  const command = args.command.trim();

  const safetyDecision = checkDangerousCommand(command);

  if (!safetyDecision.allowed) {
    return `拒绝执行危险命令：${safetyDecision.reason}`;
  }

  const result = await execa(command, {
    shell: true,
    cwd: runtimeContext.projectRoot,
    timeout: 20_000,
  }).catch((error) => {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
    };
  });

  return [
    result.stdout ? `stdout:\n${result.stdout}` : "",
    result.stderr ? `stderr:\n${result.stderr}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

import { execa } from "execa";

const dangerousPatterns = [
  "rm -rf",
  "sudo",
  "mkfs",
  "dd ",
  ":(){",
  "chmod -R 777",
  "git push",
  "git reset --hard",
];

export async function bash(args: { command: string }) {
  const command = args.command.trim();

  for (const pattern of dangerousPatterns) {
    if (command.includes(pattern)) {
      return `拒绝执行危险命令：${command}`;
    }
  }

  const result = await execa(command, {
    shell: true,
    cwd: process.cwd(),
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
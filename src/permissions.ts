import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

const alwaysAllowCommands = [
  "pwd",
  "ls",
  "ls -la",
  "git status",
  "git diff",
  "git branch",
  "pnpm -v",
  "node -v",
  "npm -v",
];

const dangerousPatterns = [
  "rm ",
  "rm -rf",
  "rimraf",
  "rmdir",
  "Remove-Item",
  "fs.rm",
  "rmSync",
  "unlink",
  "unlinkSync",

  "sudo",
  "mkfs",
  "dd ",
  ":(){",
  "chmod -R 777",

  "git push",
  "git reset --hard",
  "git clean -fd",

  "curl ",
  "wget ",
];

export function shouldAskPermission(toolName: string, args: unknown): boolean {
  if (toolName !== "bash") {
    return false;
  }

  const command = getCommand(args);

  if (!command) {
    return true;
  }

  if (alwaysAllowCommands.includes(command)) {
    return false;
  }

  return true;
}

export function checkDangerousCommand(args: unknown): PermissionDecision {
  const command = getCommand(args);

  if (!command) {
    return {
      allowed: false,
      reason: "缺少 command 参数",
    };
  }

  for (const pattern of dangerousPatterns) {
    if (command.includes(pattern)) {
      return {
        allowed: false,
        reason: `命中危险命令规则：${pattern}`,
      };
    }
  }

  return {
    allowed: true,
  };
}

export async function askUserPermission(toolName: string, args: unknown) {
  const rl = readline.createInterface({ input, output });

  console.log("\n[Permission Required]");
  console.log(`Tool: ${toolName}`);
  console.log("Args:");
  console.log(JSON.stringify(args, null, 2));

  const answer = await rl.question("是否允许执行？输入 y 确认，其他任意键拒绝：");

  rl.close();

  return answer.trim().toLowerCase() === "y";
}

function getCommand(args: unknown) {
  if (
    typeof args === "object" &&
    args !== null &&
    "command" in args &&
    typeof args.command === "string"
  ) {
    return args.command.trim();
  }

  return "";
}
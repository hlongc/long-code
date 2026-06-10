import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

export type PermissionResult = "allow" | "deny" | "always";

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
  if (toolName === "edit_file" || toolName === "write_file") {
    return true;
  }

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

export function checkDangerousBashCommand(args: unknown): PermissionDecision {
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

function formatArgs(args: unknown) {
  const text = JSON.stringify(args, null, 2);

  if (text.length > 2000) {
    return text.slice(0, 2000) + "\n\n...内容过长，已截断展示...";
  }

  return text;
}

function getPermissionSummary(toolName: string, args: unknown) {
  switch (toolName) {
    case "bash":
      return `Command: ${(args as any)?.command}`;

    case "edit_file":
      return [`File: ${(args as any)?.file}`, "", "即将修改文件内容"].join(
        "\n",
      );

    case "write_file":
      return [`File: ${(args as any)?.file}`, "", "即将创建或覆盖文件"].join(
        "\n",
      );

    default:
      return formatArgs(args);
  }
}

export async function askUserPermission(
  toolName: string,
  args: unknown,
): Promise<PermissionResult> {
  const rl = readline.createInterface({ input, output });

  console.log("\n[Permission Required]");
  console.log(`Tool: ${toolName}`);
  console.log("Args:");
  console.log(getPermissionSummary(toolName, args));

  const answer = await rl.question(
    "是否允许执行？[y] 允许一次 / [a] 总是允许 / 其他任意键拒绝：",
  );

  rl.close();

  switch (answer.trim().toLowerCase()) {
    case "y":
      return "allow";
    case "a":
      return "always";
    default:
      return "deny";
  }
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

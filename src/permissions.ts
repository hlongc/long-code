import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { allowExternalPath, inspectPathAccess } from "./pathSecurity.js";
import { checkDangerousCommand } from "./commandSafety.js";

export type PermissionDecision = {
  allowed: boolean;
  reason?: string;
};

export type PermissionResult = "allow" | "deny" | "always";

const pathTools = new Set([
  "read_file",
  "write_file",
  "edit_file",
  "list_dir",
  "grep",
  "code_index",
]);

export function shouldAskExternalPathPermission(
  toolName: string,
  args: unknown,
) {
  const targetPath = getToolPath(toolName, args);

  if (!targetPath) {
    return null;
  }

  const access = inspectPathAccess(targetPath);

  if (!access.isOutsideProject || access.alreadyAllowed) {
    return null;
  }

  return access;
}

export function authorizeExternalPathForSession(absPath: string) {
  allowExternalPath(absPath);
}

function getToolPath(toolName: string, args: unknown) {
  if (!pathTools.has(toolName)) {
    return "";
  }

  if (typeof args !== "object" || args === null) {
    return "";
  }

  if (
    toolName === "list_dir" &&
    "dir" in args &&
    typeof args.dir === "string"
  ) {
    return args.dir;
  }

  if (toolName === "grep" && "dir" in args && typeof args.dir === "string") {
    return args.dir;
  }

  if (
    toolName === "code_index" &&
    "dir" in args &&
    typeof args.dir === "string"
  ) {
    return args.dir;
  }

  if ("file" in args && typeof args.file === "string") {
    return args.file;
  }

  return "";
}

export function shouldAskPermission(toolName: string, _args: unknown): boolean {
  return (
    toolName === "edit_file" || toolName === "write_file" || toolName === "bash"
  );
}

export function checkDangerousBashCommand(args: unknown): PermissionDecision {
  const command = getCommand(args);

  if (!command) {
    return {
      allowed: false,
      reason: "缺少 command 参数",
    };
  }

  const decision = checkDangerousCommand(command);

  if (!decision.allowed) {
    return {
      allowed: false,
      reason: decision.reason,
    };
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

export async function askExternalPathPermission(access: {
  inputPath: string;
  absPath: string;
}) {
  const rl = readline.createInterface({ input, output });

  console.log("\n[External Path Access Required]");
  console.log(`Input Path: ${access.inputPath}`);
  console.log(`Absolute Path: ${access.absPath}`);
  console.log("该路径位于当前项目目录之外。");

  const answer = await rl.question(
    "是否允许本次会话访问该外部路径？[y] 允许 / 其他任意键拒绝：",
  );

  rl.close();

  return answer.trim().toLowerCase() === "y";
}

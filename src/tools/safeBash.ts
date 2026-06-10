import { execa } from "execa";
import { runtimeContext } from "../runtimeContext.js";

type SafeBashArgs = {
  command: string;
  args?: string[];
};

const allowedCommands = new Set(["git", "node", "npm", "pnpm"]);

const allowedGitSubcommands = new Set(["status", "diff", "branch", "log"]);

const allowedPnpmScripts = new Set(["typecheck", "test", "lint", "build"]);

export async function safeBash(args: SafeBashArgs) {
  const command = args.command.trim();
  const commandArgs = args.args || [];

  const validation = validateSafeCommand(command, commandArgs);

  if (!validation.allowed) {
    return `拒绝执行：${validation.reason}`;
  }

  const result = await execa(command, commandArgs, {
    cwd: runtimeContext.projectRoot,
    timeout: 60_000,
  }).catch((error) => {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      exitCode: error.exitCode ?? 1,
    };
  });

  const exitCode = "exitCode" in result ? result.exitCode : 0;

  return [
    `命令：${command} ${commandArgs.join(" ")}`,
    `退出码：${exitCode}`,
    "",
    result.stdout ? `stdout:\n${truncate(result.stdout)}` : "",
    result.stderr ? `stderr:\n${truncate(result.stderr)}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function validateSafeCommand(command: string, args: string[]) {
  if (!allowedCommands.has(command)) {
    return {
      allowed: false,
      reason: `不在白名单中的命令：${command}`,
    };
  }

  if (args.some((arg) => hasShellMetaCharacters(arg))) {
    return {
      allowed: false,
      reason: "参数中包含 shell 元字符",
    };
  }

  if (command === "git") {
    return validateGitArgs(args);
  }

  if (command === "pnpm") {
    return validatePnpmArgs(args);
  }

  if (command === "node") {
    return validateVersionOnly(command, args);
  }

  if (command === "npm") {
    return validateVersionOnly(command, args);
  }

  return {
    allowed: false,
    reason: "未知命令规则",
  };
}

function validateGitArgs(args: string[]) {
  const subcommand = args[0];

  if (!subcommand) {
    return {
      allowed: false,
      reason: "缺少 git 子命令",
    };
  }

  if (!allowedGitSubcommands.has(subcommand)) {
    return {
      allowed: false,
      reason: `不允许的 git 子命令：${subcommand}`,
    };
  }

  if (subcommand === "status") {
    return allowOnlyArgs(args, ["status", "--short", "-s"]);
  }

  if (subcommand === "diff") {
    return allowOnlyArgs(args, ["diff", "--cached", "--stat"]);
  }

  if (subcommand === "branch") {
    return allowOnlyArgs(args, ["branch"]);
  }

  if (subcommand === "log") {
    return allowOnlyArgs(args, ["log", "--oneline", "-n", "5", "10"]);
  }

  return {
    allowed: false,
    reason: `未配置 git ${subcommand} 的参数规则`,
  };
}

function validatePnpmArgs(args: string[]) {
  if (args.length === 1 && args[0] === "-v") {
    return {
      allowed: true,
    };
  }

  if (args.length !== 2 || args[0] !== "run") {
    return {
      allowed: false,
      reason: "pnpm 只允许 pnpm -v 或 pnpm run <script>",
    };
  }

  const script = args[1];

  if (!allowedPnpmScripts.has(script)) {
    return {
      allowed: false,
      reason: `不允许运行的 pnpm script：${script}`,
    };
  }

  return {
    allowed: true,
  };
}

function validateVersionOnly(command: string, args: string[]) {
  if (args.length === 1 && args[0] === "-v") {
    return {
      allowed: true,
    };
  }

  return {
    allowed: false,
    reason: `${command} 只允许使用 -v 参数`,
  };
}

function allowOnlyArgs(args: string[], allowedArgs: string[]) {
  const invalidArg = args.find((arg) => !allowedArgs.includes(arg));

  if (invalidArg) {
    return {
      allowed: false,
      reason: `不允许的参数：${invalidArg}`,
    };
  }

  return {
    allowed: true,
  };
}

function hasShellMetaCharacters(value: string) {
  return /[;&|`$<>\\\n\r]/.test(value);
}

function truncate(text: string) {
  const maxLength = 12000;

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "\n\n[输出过长，已截断]";
}

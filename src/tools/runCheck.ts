import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";
import { runtimeContext } from "../runtimeContext.js";
import { detectProject } from "../projectDetector.js";

type PackageJson = {
  packageManager?: string;
  scripts?: Record<string, string>;
};

type CheckCommand = {
  command: string;
  args: string[];
  reason: string;
};

const preferredNodeScripts = ["typecheck", "lint", "test", "build"];

export async function runCheck(args: { script?: string }) {
  const project = await detectProject();

  const commands = await resolveCheckCommands(project.type, args.script);

  if (commands.length === 0) {
    return [
      `没有找到可自动执行的检查命令。`,
      `项目类型：${project.type}`,
      `检测到的清单文件：${project.files.join(", ") || "无"}`,
      "",
      `建议：Node 项目添加 typecheck/lint/test/build 脚本；Python 项目配置 pytest/ruff/mypy；Go 项目使用 go test；Rust 项目使用 cargo check/test。`,
    ].join("\n");
  }

  const results: string[] = [];

  for (const command of commands) {
    const result = await runCommand(command);

    results.push(result.output);

    if (result.exitCode !== 0) {
      results.push("检查失败，已停止后续检查。");
      break;
    }
  }

  return [
    `项目类型：${project.type}`,
    `检查数量：${commands.length}`,
    "",
    ...results,
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function runCommand(command: CheckCommand) {
  const result = await execa(command.command, command.args, {
    cwd: runtimeContext.projectRoot,
    timeout: 60_000,
  }).catch((error) => {
    return {
      exitCode: error.exitCode ?? 1,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
    };
  });

  const exitCode = "exitCode" in result ? result.exitCode : 0;

  return {
    exitCode,
    output: [
      `检查命令：${command.command} ${command.args.join(" ")}`,
      `选择原因：${command.reason}`,
      `退出码：${exitCode}`,
      "",
      result.stdout ? `stdout:\n${truncate(result.stdout)}` : "",
      result.stderr ? `stderr:\n${truncate(result.stderr)}` : "",
      "",
      exitCode === 0 ? "检查通过 ✅" : "检查失败 ❌",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

async function resolveCheckCommands(
  projectType: string,
  requestedScript?: string,
): Promise<CheckCommand[]> {
  switch (projectType) {
    case "node":
      return resolveNodeCheckCommands(requestedScript);

    case "python":
      return resolvePythonCheckCommands(requestedScript);

    case "go":
      return [resolveGoCheckCommand(requestedScript)];

    case "rust":
      return [resolveRustCheckCommand(requestedScript)];

    default:
      return [];
  }
}

async function resolveNodeCheckCommands(
  requestedScript?: string,
): Promise<CheckCommand[]> {
  const packageJsonPath = path.resolve(
    runtimeContext.projectRoot,
    "package.json",
  );
  const raw = await fs.readFile(packageJsonPath, "utf-8").catch(() => "");

  if (!raw) {
    return [];
  }

  let packageJson: PackageJson;

  try {
    packageJson = JSON.parse(raw);
  } catch {
    return [];
  }

  const scripts = packageJson.scripts || {};
  const packageManager = detectPackageManager(packageJson.packageManager);

  if (requestedScript) {
    if (!scripts[requestedScript]) {
      return [];
    }

    return [
      {
        command: packageManager,
        args: ["run", requestedScript],
        reason: `Node 项目，使用 package.json scripts.${requestedScript}`,
      },
    ];
  }

  return preferredNodeScripts
    .filter((scriptName) => scripts[scriptName])
    .map((scriptName) => ({
      command: packageManager,
      args: ["run", scriptName],
      reason: `Node 项目，使用 package.json scripts.${scriptName}`,
    }));
}

function resolvePythonCheckCommands(requestedScript?: string): CheckCommand[] {
  if (requestedScript === "ruff") {
    return [
      {
        command: "python",
        args: ["-m", "ruff", "check", "."],
        reason: "Python 项目，用户指定 ruff",
      },
    ];
  }

  if (requestedScript === "mypy") {
    return [
      {
        command: "python",
        args: ["-m", "mypy", "."],
        reason: "Python 项目，用户指定 mypy",
      },
    ];
  }

  if (requestedScript === "pytest") {
    return [
      {
        command: "python",
        args: ["-m", "pytest"],
        reason: "Python 项目，用户指定 pytest",
      },
    ];
  }

  if (requestedScript) {
    return [];
  }

  return [
    {
      command: "python",
      args: ["-m", "pytest"],
      reason: "Python 项目，默认运行 pytest",
    },
  ];
}

function resolveGoCheckCommand(requestedScript?: string): CheckCommand {
  if (requestedScript === "test" || !requestedScript) {
    return {
      command: "go",
      args: ["test", "./..."],
      reason: "Go 项目，运行 go test ./...",
    };
  }

  return {
    command: "go",
    args: ["test", "./..."],
    reason: `Go 项目暂不支持指定脚本 ${requestedScript}，回退到 go test ./...`,
  };
}

function resolveRustCheckCommand(requestedScript?: string): CheckCommand {
  if (requestedScript === "test") {
    return {
      command: "cargo",
      args: ["test"],
      reason: "Rust 项目，用户指定 cargo test",
    };
  }

  return {
    command: "cargo",
    args: ["check"],
    reason: "Rust 项目，默认运行 cargo check",
  };
}

function detectPackageManager(packageManager?: string) {
  if (packageManager?.startsWith("pnpm")) return "pnpm";
  if (packageManager?.startsWith("yarn")) return "yarn";
  if (packageManager?.startsWith("npm")) return "npm";

  return "pnpm";
}

function truncate(text: string) {
  const maxLength = 12000;

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "\n\n[输出过长，已截断]";
}

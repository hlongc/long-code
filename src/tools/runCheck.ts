import fs from "node:fs/promises";
import path from "node:path";
import { execa } from "execa";

type PackageJson = {
  scripts?: Record<string, string>;
};

const preferredScripts = ["typecheck", "lint", "test", "build"];

export async function runCheck(args: { script?: string }) {
  const packageJsonPath = path.resolve(process.cwd(), "package.json");

  const raw = await fs.readFile(packageJsonPath, "utf-8").catch(() => "");

  if (!raw) {
    return "run_check 失败：当前目录没有 package.json";
  }

  let packageJson: PackageJson;

  try {
    packageJson = JSON.parse(raw);
  } catch {
    return "run_check 失败：package.json 不是合法 JSON";
  }

  const scripts = packageJson.scripts || {};
  const scriptName =
    args.script || preferredScripts.find((name) => scripts[name]);

  if (!scriptName) {
    const availableScripts = Object.keys(scripts);

    return [
      "没有找到可自动执行的检查脚本。",
      availableScripts.length > 0
        ? `当前可用 scripts: ${availableScripts.join(", ")}`
        : "当前 package.json 没有 scripts。",
      "",
      "建议：如需验证项目，可以先添加 typecheck、lint、test 或 build 脚本。",
    ].join("\n");
  }

  if (!scripts[scriptName]) {
    return [
      `run_check 失败：package.json 中不存在脚本：${scriptName}`,
      `当前可用 scripts: ${Object.keys(scripts).join(", ") || "无"}`,
    ].join("\n");
  }

  const command = getPackageManagerCommand(scriptName);

  const result = await execa(command.command, command.args, {
    cwd: process.cwd(),
    timeout: 60_000,
  }).catch((error) => {
    return {
      exitCode: error.exitCode ?? 1,
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
    };
  });

  const exitCode = "exitCode" in result ? result.exitCode : 0;

  return [
    `检查命令：${command.command} ${command.args.join(" ")}`,
    `退出码：${exitCode}`,
    "",
    result.stdout ? `stdout:\n${truncate(result.stdout)}` : "",
    result.stderr ? `stderr:\n${truncate(result.stderr)}` : "",
    "",
    exitCode === 0 ? "检查通过 ✅" : "检查失败 ❌",
  ]
    .filter(Boolean)
    .join("\n");
}

function getPackageManagerCommand(scriptName: string) {
  // 先简单默认 pnpm，后面可以根据 lockfile 判断 npm/yarn/bun
  return {
    command: "pnpm",
    args: ["run", scriptName],
  };
}

function truncate(text: string) {
  const maxLength = 12000;

  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength) + "\n\n[输出过长，已截断]";
}

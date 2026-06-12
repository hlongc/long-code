export type CheckRecord = {
  script?: string;
  status: "passed" | "failed" | "unknown";
  summary: string;
};

export type AgentState = {
  userInput: string;
  currentStep: number;
  enabledTools: string[];
  touchedFiles: string[];
  modifiedFiles: string[];
  deniedActions: string[];
  toolErrors: string[];
  inspectedDiff: boolean;
  checks: CheckRecord[];
};

export function createAgentState(userInput: string): AgentState {
  return {
    userInput,
    currentStep: 0,
    enabledTools: [],
    touchedFiles: [],
    modifiedFiles: [],
    deniedActions: [],
    toolErrors: [],
    inspectedDiff: false,
    checks: [],
  };
}

export function addUnique(list: string[], value: string) {
  if (!value) return;

  if (!list.includes(value)) {
    list.push(value);
  }
}

function summarizeCheckResult(result: string) {
  const lines = result
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const importantLines = lines.filter((line) => {
    return (
      line.startsWith("项目类型：") ||
      line.startsWith("检查命令：") ||
      line.startsWith("选择原因：") ||
      line.startsWith("退出码：") ||
      line.includes("检查通过") ||
      line.includes("检查失败") ||
      line.toLowerCase().includes("error") ||
      line.toLowerCase().includes("failed")
    );
  });

  return importantLines.slice(0, 12).join("\n") || lines.slice(0, 8).join("\n");
}

export function recordToolEffect(args: {
  state: AgentState;
  toolName: string;
  toolArgs: any;
  result: string;
  success?: boolean;
}) {
  const { state, toolName, toolArgs, result, success = true } = args;

  if (toolName === "read_file" && typeof toolArgs?.file === "string") {
    addUnique(state.touchedFiles, toolArgs.file);
  }

  if (toolName === "edit_file" && typeof toolArgs?.file === "string") {
    addUnique(state.touchedFiles, toolArgs.file);
    addUnique(state.modifiedFiles, toolArgs.file);
  }

  if (toolName === "write_file" && typeof toolArgs?.file === "string") {
    addUnique(state.touchedFiles, toolArgs.file);
    addUnique(state.modifiedFiles, toolArgs.file);
  }

  if (toolName === "git_diff") {
    state.inspectedDiff = true;
  }

  if (toolName === "run_check") {
    state.checks.push({
      script:
        typeof toolArgs?.script === "string" ? toolArgs.script : undefined,
      status: result.includes("检查通过")
        ? "passed"
        : result.includes("检查失败")
          ? "failed"
          : "unknown",
      summary: summarizeCheckResult(result),
    });
  }

  if (!success) {
    state.toolErrors.push(`[${toolName}] ${result}`);
  }
}

export function recordDeniedAction(state: AgentState, message: string) {
  state.deniedActions.push(message);
}

export function formatAgentStateSummary(state: AgentState) {
  return [
    "## Agent State",
    `当前步骤：${state.currentStep}`,
    `启用工具：${state.enabledTools.join(", ") || "无"}`,
    state.touchedFiles.length
      ? `读取/触达文件：${state.touchedFiles.join(", ")}`
      : "",
    state.modifiedFiles.length
      ? `修改文件：${state.modifiedFiles.join(", ")}`
      : "",
    state.inspectedDiff ? "已查看 git diff：是" : "",
    state.deniedActions.length
      ? `被拒绝操作：${state.deniedActions.join(" | ")}`
      : "",
    state.toolErrors.length
      ? `工具错误：${state.toolErrors.slice(-5).join(" | ")}`
      : "",
    state.checks.length
      ? [
          "项目检查记录：",
          ...state.checks.map((check, index) =>
            [
              `${index + 1}. ${check.script || "auto"}: ${check.status}`,
              check.summary,
            ].join("\n"),
          ),
        ].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

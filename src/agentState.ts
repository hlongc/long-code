export type AgentState = {
  userInput: string;
  currentStep: number;
  enabledTools: string[];
  touchedFiles: string[];
  modifiedFiles: string[];
  deniedActions: string[];
  toolErrors: string[];
  lastCheckResult?: string;
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
  };
}

export function addUnique(list: string[], value: string) {
  if (!value) return;

  if (!list.includes(value)) {
    list.push(value);
  }
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

  if (toolName === "run_check") {
    state.lastCheckResult = result.includes("检查通过")
      ? "passed"
      : result.includes("检查失败")
        ? "failed"
        : "unknown";
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
    state.deniedActions.length
      ? `被拒绝操作：${state.deniedActions.join(" | ")}`
      : "",
    state.toolErrors.length
      ? `工具错误：${state.toolErrors.slice(-5).join(" | ")}`
      : "",
    state.lastCheckResult ? `最后检查结果：${state.lastCheckResult}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

// src/toolCapabilityPolicy.ts
export const autoGrantTools = new Set([
  "list_dir",
  "read_file",
  "grep",
  "code_index_status",
  "code_index",
  "code_search",
  "todo_write",
  "todo_read",
  "todo_clear",
  "run_check",
  "git_diff",
  "run_subagent",
  "safe_bash",
  "git_status",
]);

export const restrictedTools = new Set(["edit_file", "write_file", "bash"]);

export function evaluateToolRequest(requestedTools: string[]) {
  const granted: string[] = [];
  const denied: string[] = [];
  const unknown: string[] = [];

  for (const tool of requestedTools) {
    if (autoGrantTools.has(tool)) {
      granted.push(tool);
    } else if (restrictedTools.has(tool)) {
      denied.push(tool);
    } else {
      unknown.push(tool);
    }
  }

  return { granted, denied, unknown };
}

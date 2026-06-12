export async function requestTools(args: { tools: string[]; reason?: string }) {
  return [
    "工具请求已记录。",
    `请求工具：${args.tools.join(", ")}`,
    args.reason ? `原因：${args.reason}` : "",
    "如果主 Agent 允许，这些工具会在下一轮可用。",
  ]
    .filter(Boolean)
    .join("\n");
}

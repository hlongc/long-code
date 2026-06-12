export function selectToolNames(userInput: string) {
  const text = userInput.toLowerCase();

  const baseTools = [
    "list_dir",
    "read_file",
    "grep",
    "code_index_status",
    "code_index",
    "code_search",
    "todo_write",
    "todo_read",
    "todo_clear",
    "request_tools",
  ];

  const editTools = ["edit_file", "write_file", "git_diff", "run_check"];

  const commandTools = ["safe_bash", "bash"];

  const subAgentTools = ["run_subagent"];

  const wantsEdit =
    /修改|改|修复|添加|新增|删除|重构|生成|写入|replace|fix|add|remove|refactor|write/i.test(
      text,
    );

  const wantsCommand =
    /运行|执行|命令|检查|测试|typecheck|lint|build|test|git|run|execute/i.test(
      text,
    );

  const wantsSubAgent =
    /review|审查|风险|测试分析|文档|总结|子 agent|subagent/i.test(text);

  return new Set([
    ...baseTools,
    ...(wantsEdit ? editTools : []),
    ...(wantsCommand ? commandTools : []),
    ...(wantsSubAgent ? subAgentTools : []),
  ]);
}

import type OpenAI from "openai";
import { createChatCompletionWithRetry } from "./llm.js";
import { formatAgentStateSummary, type AgentState } from "./agentState.js";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

export async function refineFinalAnswer(args: {
  draft: string;
  agentState: AgentState;
}) {
  const messages: Message[] = [
    {
      role: "system",
      content: [
        "你负责根据 Agent 的结构化执行状态优化最终回答。",
        "最终回答必须自包含，不要说“如上”“以上就是”。",
        "不要声称执行了 AgentState 中没有记录的操作。",
        "如果有修改文件，应明确列出修改文件。",
        "如果有用户拒绝的操作，应明确说明未执行。",
        "如果有工具错误，应简要说明。",
      ].join("\n"),
    },
    {
      role: "user",
      content: [
        "AgentState：",
        formatAgentStateSummary(args.agentState),
        "",
        "模型草稿最终回答：",
        args.draft || "无",
        "",
        "请输出优化后的最终回答。",
      ].join("\n"),
    },
  ];

  const response = await createChatCompletionWithRetry({
    messages,
    tools: [] as Tool[],
    tool_choice: "auto",
  });

  return response.choices[0]?.message?.content || args.draft;
}

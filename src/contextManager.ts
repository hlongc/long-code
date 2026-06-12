import type OpenAI from "openai";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MAX_TOOL_RESULT_LENGTH = 12000;
const MAX_MESSAGES = 40;

export function compactToolResult(toolName: string, result: string) {
  if (result.length <= MAX_TOOL_RESULT_LENGTH) {
    return result;
  }

  return [
    result.slice(0, MAX_TOOL_RESULT_LENGTH),
    "",
    `[工具结果过长，已截断。tool=${toolName}, 原始长度=${result.length}, 保留长度=${MAX_TOOL_RESULT_LENGTH}]`,
    "如需更多内容，请使用更精确的 read_file 范围、grep、code_search 或重新查询。",
  ].join("\n");
}

export function compactMessages(messages: Message[]) {
  if (messages.length <= MAX_MESSAGES) {
    return messages;
  }

  const systemMessage = messages.find((message) => message.role === "system");
  const recentMessages = messages.slice(-MAX_MESSAGES);

  if (systemMessage && recentMessages[0]?.role !== "system") {
    return [systemMessage, ...recentMessages];
  }

  return recentMessages;
}

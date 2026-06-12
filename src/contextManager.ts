import type OpenAI from "openai";
import { client, getModel } from "./model.js";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MAX_TOOL_RESULT_LENGTH = 12000;
const MAX_MESSAGES = 40;
const SUMMARY_TRIGGER_MESSAGES = 30;
const RECENT_MESSAGES_TO_KEEP = 12;

let conversationSummary = "";

export function compactToolResult(toolName: string, result: string) {
  if (result.length <= MAX_TOOL_RESULT_LENGTH) return result;

  return [
    result.slice(0, MAX_TOOL_RESULT_LENGTH),
    "",
    `[工具结果过长，已截断。tool=${toolName}, 原始长度=${result.length}, 保留长度=${MAX_TOOL_RESULT_LENGTH}]`,
    "如需更多内容，请使用更精确的 read_file 范围、grep、code_search 或重新查询。",
  ].join("\n");
}

export async function compactMessagesWithSummary(messages: Message[]) {
  if (messages.length <= SUMMARY_TRIGGER_MESSAGES) {
    return messages;
  }

  const systemMessage = messages.find((m) => m.role === "system");
  const recentMessages = messages.slice(-RECENT_MESSAGES_TO_KEEP);
  const oldMessages = messages.slice(1, -RECENT_MESSAGES_TO_KEEP);

  if (oldMessages.length > 0) {
    conversationSummary = await summarizeOldMessages(
      conversationSummary,
      oldMessages,
    );
  }

  const summaryMessage: Message = {
    role: "system",
    content: [
      "以下是之前对话和工具调用的压缩摘要，用于延续上下文：",
      conversationSummary || "暂无摘要。",
    ].join("\n\n"),
  };

  return systemMessage
    ? [systemMessage, summaryMessage, ...recentMessages]
    : [summaryMessage, ...recentMessages];
}

export function compactMessages(messages: Message[]) {
  if (messages.length <= MAX_MESSAGES) return messages;

  const systemMessage = messages.find((message) => message.role === "system");
  const recentMessages = messages.slice(-MAX_MESSAGES);

  if (systemMessage && recentMessages[0]?.role !== "system") {
    return [systemMessage, ...recentMessages];
  }

  return recentMessages;
}

async function summarizeOldMessages(
  previousSummary: string,
  oldMessages: Message[],
) {
  const text = oldMessages
    .map((message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);

      return `[${message.role}]\n${content}`;
    })
    .join("\n\n")
    .slice(0, 30000);

  const response = await client.chat.completions.create({
    model: getModel(),
    messages: [
      {
        role: "system",
        content:
          "你负责压缩 Agent 对话历史。请保留任务目标、已完成事项、关键文件、重要错误、用户授权/拒绝、安全限制、下一步计划。不要编造。",
      },
      {
        role: "user",
        content: [
          "已有摘要：",
          previousSummary || "无",
          "",
          "需要压缩的新历史：",
          text,
          "",
          "请输出更新后的简洁摘要。",
        ].join("\n"),
      },
    ],
  });

  return response.choices[0]?.message?.content || previousSummary;
}

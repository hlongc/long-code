import type OpenAI from "openai";
import { client, getModel } from "./model.js";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;
type Tool = OpenAI.Chat.Completions.ChatCompletionTool;

const requestTimeoutMs = Number(process.env.OPENAI_TIMEOUT_MS || 60_000);
export async function createChatCompletionWithRetry(args: {
  messages: Message[];
  tools: Tool[];
  tool_choice: "auto";
}) {
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.chat.completions.create(
        {
          model: getModel(),
          messages: args.messages,
          tools: args.tools,
          tool_choice: args.tool_choice,
        },
        {
          timeout: requestTimeoutMs,
        },
      );
    } catch (error) {
      const message = getErrorMessage(error);

      console.log(
        `\n[LLM Error] 第 ${attempt}/${maxRetries} 次请求失败：${message}`,
      );

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delayMs = 1000 * attempt * attempt;

      console.log(`[LLM Retry] ${delayMs}ms 后重试...`);

      await sleep(delayMs);
    }
  }

  throw new Error("LLM 请求失败");
}

function isRetryableError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();

  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("socket") ||
    message.includes("network") ||
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

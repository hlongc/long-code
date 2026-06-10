import type OpenAI from "openai";
import { client, MODEL } from "./model.js";
import { systemPrompt } from "./prompts.js";
import { tools, runTool } from "./tools/index.js";
import {
  askUserPermission,
  checkDangerousCommand,
  shouldAskPermission,
} from "./permissions.js";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function runAgent(userInput: string) {
  const messages: Message[] = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: userInput,
    },
  ];

  const maxSteps = 15;

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`\n===== Agent Step ${step} =====`);

    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("模型没有返回消息");
    }

    messages.push(message);

    // 没有工具调用，说明模型已经准备好回答
    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log("\n===== Final Answer =====\n");
      console.log(message.content);
      return message.content;
    }

    // 执行工具调用
    for (const toolCall of message.tool_calls) {
      if (toolCall.type !== "function") {
        console.log(`[Skip Tool Call] 不支持的工具类型：${toolCall.type}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: `不支持的工具类型：${toolCall.type}`,
        });

        continue;
      }

      const toolName = toolCall.function.name;
      const rawArgs = toolCall.function.arguments || "{}";

      let args: any = {};
      try {
        args = JSON.parse(rawArgs);
      } catch {
        args = {};
      }

      console.log(`\n[Tool Call] ${toolName}`);
      console.log(args);

      const dangerCheck = checkDangerousCommand(args);

      if (toolName === "bash" && !dangerCheck.allowed) {
        const deniedMessage = `拒绝执行：${dangerCheck.reason}。这是破坏性操作，禁止尝试通过其他等价命令绕过。`;

        console.log(`\n[Permission Denied] ${deniedMessage}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: deniedMessage,
        });

        continue;
      }

      if (shouldAskPermission(toolName, args)) {
        const allowed = await askUserPermission(toolName, args);

        if (!allowed) {
          const deniedMessage = "用户拒绝执行该工具调用";

          console.log(`\n[Permission Denied] ${deniedMessage}`);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: deniedMessage,
          });

          continue;
        }
      }

      const result = await runTool(toolName, args);

      console.log(`\n[Tool Result]`);
      console.log(String(result).slice(0, 1000));

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: String(result),
      });
    }
  }

  return "达到最大步骤限制，Agent 停止。";
}

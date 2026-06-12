import type OpenAI from "openai";
import { runtimeContext } from "./runtimeContext.js";
import { systemPrompt } from "./prompts.js";
import { runTool } from "./tools/index.js";
import {
  askExternalPathPermission,
  askUserPermission,
  authorizeExternalPathForSession,
  checkDangerousBashCommand,
  shouldAskExternalPathPermission,
  shouldAskPermission,
  askSensitiveFilePermission,
  shouldAskSensitiveFilePermission,
} from "./permissions.js";
import {
  allowPermissionForSession,
  isPermissionAllowedForSession,
} from "./permissionSession.js";
import { renderMarkdown } from "./terminalMarkdown.js";
import {
  compactMessagesWithSummary,
  compactToolResult,
} from "./contextManager.js";
import { selectToolNames } from "./toolRouter.js";
import { filterToolsByNames } from "./tools/index.js";
import { createChatCompletionWithRetry } from "./llm.js";
import { evaluateToolRequest } from "./toolCapabilityPolicy.js";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

export async function runAgent(userInput: string) {
  const enabledToolNames = selectToolNames(userInput);
  let enabledTools = filterToolsByNames(enabledToolNames);

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

  const maxSteps = runtimeContext.maxSteps;

  for (let step = 1; step <= maxSteps; step++) {
    console.log(`\n===== Agent Step ${step} =====`);

    let response;

    try {
      response = await createChatCompletionWithRetry({
        messages: await compactMessagesWithSummary(messages),
        tools: enabledTools,
        tool_choice: "auto",
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      console.log("\n[Agent Stopped]");
      console.log(`LLM 请求失败：${errorMessage}`);

      return `LLM 请求失败：${errorMessage}`;
    }

    const message = response.choices[0]?.message;
    if (!message) {
      throw new Error("模型没有返回消息");
    }

    messages.push(message);

    // 没有工具调用，说明模型已经准备好回答
    if (!message.tool_calls || message.tool_calls.length === 0) {
      console.log("\n===== Final Answer =====\n");
      const finalContent = message.content || "";

      const rendered = await renderMarkdown(finalContent);

      console.log(rendered);

      return finalContent;
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
        const errorMessage = `工具参数解析失败：${rawArgs}`;

        console.log(`\n[Tool Args Error] ${errorMessage}`);

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: errorMessage,
        });

        continue;
      }

      console.log(`\n[Tool Call] ${toolName}`);
      console.log(args);

      if (toolName === "bash") {
        const dangerCheck = checkDangerousBashCommand(args);

        if (!dangerCheck.allowed) {
          const deniedMessage = `拒绝执行：${dangerCheck.reason}。这是破坏性操作，禁止尝试通过其他等价命令绕过。`;

          console.log(`\n[Permission Denied] ${deniedMessage}`);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: deniedMessage,
          });

          continue;
        }
      }

      if (toolName === "request_tools") {
        const requestedTools = Array.isArray(args.tools) ? args.tools : [];

        const decision = evaluateToolRequest(requestedTools);

        for (const name of decision.granted) {
          enabledToolNames.add(name);
        }

        enabledTools = filterToolsByNames(enabledToolNames);

        const result = [
          decision.granted.length
            ? `已启用工具：${decision.granted.join(", ")}`
            : "没有启用新的工具。",
          decision.denied.length
            ? `拒绝启用高风险工具：${decision.denied.join(", ")}。如需这些工具，用户必须在任务中明确要求相关操作。`
            : "",
          decision.unknown.length
            ? `未知工具：${decision.unknown.join(", ")}`
            : "",
          args.reason ? `请求原因：${args.reason}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });

        continue;
      }

      const externalPathAccess = shouldAskExternalPathPermission(
        toolName,
        args,
      );

      if (externalPathAccess) {
        const allowed = await askExternalPathPermission(externalPathAccess);

        if (!allowed) {
          const deniedMessage = `用户拒绝访问项目外路径：${externalPathAccess.absPath}`;

          console.log(`\n[External Path Denied] ${deniedMessage}`);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: deniedMessage,
          });

          continue;
        }

        authorizeExternalPathForSession(externalPathAccess.absPath);
      }

      const sensitiveFileAccess = shouldAskSensitiveFilePermission(
        toolName,
        args,
      );

      if (sensitiveFileAccess) {
        const allowed = await askSensitiveFilePermission(sensitiveFileAccess);

        if (!allowed) {
          const deniedMessage = `用户拒绝或系统阻止访问敏感文件：${sensitiveFileAccess.inputPath}，原因：${sensitiveFileAccess.reason}`;

          console.log(`\n[Sensitive File Denied] ${deniedMessage}`);

          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: deniedMessage,
          });

          continue;
        }
      }

      if (shouldAskPermission(toolName, args)) {
        if (!isPermissionAllowedForSession(toolName, args)) {
          const permissionResult = await askUserPermission(toolName, args);

          if (permissionResult === "deny") {
            const deniedMessage =
              "用户拒绝执行该工具调用，禁止尝试通过其他等价方式绕过。";

            console.log(`\n[Permission Denied] ${deniedMessage}`);

            messages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              content: deniedMessage,
            });

            continue;
          }

          if (permissionResult === "always") {
            allowPermissionForSession(toolName, args);
          }
        } else {
          console.log(`\n[Permission Auto Allowed] ${toolName}`);
        }
      }

      let result: string;

      try {
        result = String(await runTool(toolName, args));
      } catch (error) {
        result =
          error instanceof Error
            ? `工具执行失败：${error.message}`
            : `工具执行失败：${String(error)}`;
      }

      const compactedResult = compactToolResult(toolName, result);

      console.log(`\n[Tool Result]`);
      console.log(result.slice(0, 1000));

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: compactedResult,
      });
    }
  }

  return "达到最大步骤限制，Agent 停止。";
}

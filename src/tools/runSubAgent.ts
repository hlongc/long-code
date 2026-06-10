import { client, MODEL } from "../model.js";
import { subAgents, type SubAgentName } from "../subagents.js";

export async function runSubAgent(args: {
  agent: SubAgentName;
  task: string;
  context?: string;
}) {
  const config = subAgents[args.agent];

  if (!config) {
    return [
      `未知子 Agent：${args.agent}`,
      `可用子 Agent：${Object.keys(subAgents).join(", ")}`,
    ].join("\n");
  }

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: config.systemPrompt,
      },
      {
        role: "user",
        content: [
          `任务：${args.task}`,
          "",
          args.context ? `上下文：\n${args.context}` : "上下文：无",
        ].join("\n"),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;

  return [
    `子 Agent：${config.name}`,
    `职责：${config.description}`,
    "",
    content || "子 Agent 没有返回内容",
  ].join("\n");
}

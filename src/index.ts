import { runAgent } from "./agent.js";

const userInput = process.argv.slice(2).join(" ");

if (!userInput) {
  console.log("请输入任务，例如：");
  console.log('pnpm dev "帮我分析这个项目是干什么的"');
  process.exit(0);
}

await runAgent(userInput);
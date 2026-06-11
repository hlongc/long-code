#!/usr/bin/env node

import { Command } from "commander";
import { runAgent } from "./agent.js";
import { setModel } from "./model.js";
import { setMaxSteps, setProjectRoot } from "./runtimeContext.js";

const program = new Command();

program
  .name("mini-agent")
  .description("A mini coding agent built with TypeScript")
  .argument("<task...>", "task for the agent")
  .option("--cwd <dir>", "project working directory", process.cwd())
  .option("--model <model>", "model name")
  .option("--max-steps <number>", "max agent steps", "15")
  .action(async (taskParts: string[], options) => {
    const task = taskParts.join(" ");

    setProjectRoot(options.cwd);

    if (options.model) {
      setModel(options.model);
    }

    const maxSteps = Number(options.maxSteps);

    if (!Number.isFinite(maxSteps) || maxSteps <= 0) {
      throw new Error(`非法 max-steps：${options.maxSteps}`);
    }

    setMaxSteps(maxSteps);

    await runAgent(task);
  });

await program.parseAsync();

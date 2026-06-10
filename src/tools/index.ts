import type OpenAI from "openai";
import { listDir } from "./listDir.js";
import { readFile } from "./readFile.js";
import { grep } from "./grep.js";
import { bash } from "./bash.js";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function" as const,
    function: {
      name: "list_dir",
      description: "列出指定目录下的文件和文件夹",
      parameters: {
        type: "object",
        properties: {
          dir: {
            type: "string",
            description: "要查看的目录，默认是当前目录",
          },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "read_file",
      description: "读取项目中的文本文件内容",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "要读取的文件路径",
          },
        },
        required: ["file"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "grep",
      description: "在项目文件中搜索关键词",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "要搜索的关键词",
          },
          glob: {
            type: "string",
            description: "搜索文件范围，例如 **/*.ts",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "bash",
      description: "在当前项目目录执行安全的 shell 命令",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "要执行的 shell 命令",
          },
        },
        required: ["command"],
      },
    },
  },
];

export async function runTool(name: string, args: any) {
  switch (name) {
    case "list_dir":
      return listDir(args);
    case "read_file":
      return readFile(args);
    case "grep":
      return grep(args);
    case "bash":
      return bash(args);
    default:
      return `未知工具：${name}`;
  }
}

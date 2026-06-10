import type OpenAI from "openai";
import { listDir } from "./listDir.js";
import { readFile } from "./readFile.js";
import { grep } from "./grep.js";
import { bash } from "./bash.js";
import { editFile } from "./editFile.js";
import { writeFile } from "./writeFile.js";
import { gitDiff } from "./gitDiff.js";
import { todoWrite } from "./todoWrite.js";
import { todoRead } from "./todoRead.js";
import { todoClear } from "./todoClear.js";

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
  {
    type: "function",
    function: {
      name: "edit_file",
      description:
        "替换文件中的一段文本。修改文件前必须先 read_file，oldText 必须是文件中真实存在的完整文本片段。",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "要修改的文件路径",
          },
          oldText: {
            type: "string",
            description: "要被替换的原始文本，必须与文件内容精确匹配",
          },
          newText: {
            type: "string",
            description: "替换后的新文本",
          },
        },
        required: ["file", "oldText", "newText"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "创建或覆盖一个文本文件。这个工具会写入完整文件内容，使用前必须非常谨慎。",
      parameters: {
        type: "object",
        properties: {
          file: {
            type: "string",
            description: "要写入的文件路径",
          },
          content: {
            type: "string",
            description: "完整文件内容",
          },
        },
        required: ["file", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "git_diff",
      description: "查看当前 git 工作区的未提交变更",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "todo_write",
      description:
        "创建或更新当前任务的 todo 列表。适合复杂任务开始前制定计划，以及执行过程中更新任务状态。",
      parameters: {
        type: "object",
        properties: {
          todos: {
            type: "array",
            description: "todo 列表",
            items: {
              type: "object",
              properties: {
                id: {
                  type: "string",
                  description: "todo 唯一 ID，例如 1、2、3",
                },
                content: {
                  type: "string",
                  description: "todo 内容",
                },
                status: {
                  type: "string",
                  enum: ["pending", "in_progress", "completed"],
                  description: "任务状态",
                },
              },
              required: ["id", "content", "status"],
            },
          },
        },
        required: ["todos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "todo_read",
      description: "读取当前任务的 todo 列表",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
  {
    type: "function",
    function: {
      name: "todo_clear",
      description: "清空当前任务的 todo 列表。通常在任务完成后使用。",
      parameters: {
        type: "object",
        properties: {},
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
    case "edit_file":
      return editFile(args);
    case "write_file":
      return writeFile(args);
    case "git_diff":
      return gitDiff();
    case "todo_write":
      return todoWrite(args);
    case "todo_read":
      return todoRead();
    case "todo_clear":
      return todoClear();
    default:
      return `未知工具：${name}`;
  }
}

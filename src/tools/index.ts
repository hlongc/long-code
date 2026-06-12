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
import { runCheck } from "./runCheck.js";
import { codeIndex } from "./codeIndex.js";
import { codeSearch } from "./codeSearch.js";
import { runSubAgent } from "./runSubAgent.js";
import { safeBash } from "./safeBash.js";
import { codeIndexStatus } from "./codeIndexStatus.js";

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
          startLine: {
            type: "number",
            description:
              "可选，开始读取的行号，从 1 开始。适合读取大文件的局部内容。",
          },
          endLine: {
            type: "number",
            description: "可选，结束读取的行号，包含该行。",
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
          dir: {
            type: "string",
            description:
              "搜索目录，默认当前项目根目录。项目外目录需要用户授权。",
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
      description:
        "高风险工具：执行自由 shell 命令。只有当 safe_bash、run_check、git_diff 等安全工具无法满足需求，并且用户明确要求执行普通 shell 命令时才可使用。不要优先使用该工具。",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description:
              "要执行的 shell 命令。高风险，可能访问或修改项目外资源。",
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
  {
    type: "function",
    function: {
      name: "run_check",
      description:
        "运行项目检查命令，例如 typecheck、lint、test 或 build。修改代码后应使用该工具验证结果。",
      parameters: {
        type: "object",
        properties: {
          script: {
            type: "string",
            description:
              "要运行的 package.json scripts 名称，例如 typecheck、lint、test、build。不传则自动选择一个合适的检查脚本。",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "code_index",
      description:
        "扫描当前项目并建立代码索引。适合在需要理解代码库、跨文件搜索、定位功能实现前调用。",
      parameters: {
        type: "object",
        properties: {
          glob: {
            type: "string",
            description:
              "索引文件范围，例如 **/*.ts。不传则默认索引 ts、tsx、js、jsx、json、md 文件。",
          },
          dir: {
            type: "string",
            description:
              "索引目录，默认当前项目根目录。项目外目录需要用户授权。",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "code_search",
      description:
        "在已建立的代码索引中搜索相关代码片段。使用前应先调用 code_index。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "搜索查询，例如 agent loop、permission、tool call",
          },
          limit: {
            type: "number",
            description: "返回结果数量，默认 5",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_subagent",
      description:
        "调用一个专门角色的子 Agent 来完成分析、审查、测试结果分析或文档撰写。子 Agent 不会直接访问文件系统，只会基于传入的 task 和 context 进行分析。",
      parameters: {
        type: "object",
        properties: {
          agent: {
            type: "string",
            enum: ["code_reader", "reviewer", "tester", "writer"],
            description: "要调用的子 Agent 名称",
          },
          task: {
            type: "string",
            description: "交给子 Agent 的具体任务",
          },
          context: {
            type: "string",
            description:
              "提供给子 Agent 的上下文，例如代码片段、diff、检查结果、搜索结果等",
          },
        },
        required: ["agent", "task"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "safe_bash",
      description:
        "执行受限的安全命令。只支持白名单命令，例如 git status、git diff、pnpm run typecheck、pnpm run test、node -v 等。优先使用该工具，不要优先使用 bash。",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "命令名，例如 git、pnpm、node、npm",
          },
          args: {
            type: "array",
            items: {
              type: "string",
            },
            description:
              "命令参数，例如 ['status', '--short'] 或 ['run', 'typecheck']",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "code_index_status",
      description:
        "检查当前项目是否已有持久化代码索引。搜索已有索引前应优先调用该工具，只有索引不存在时才调用 code_index。",
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
    case "run_check":
      return runCheck(args);
    case "code_index":
      return codeIndex(args);
    case "code_search":
      return codeSearch(args);
    case "run_subagent":
      return runSubAgent(args);
    case "safe_bash":
      return safeBash(args);
    case "code_index_status":
      return codeIndexStatus();
    default:
      return `未知工具：${name}`;
  }
}

export function filterToolsByNames(names: Set<string>) {
  return tools.filter((tool) => {
    if (tool.type !== "function") {
      return false;
    }

    return names.has(tool.function.name);
  });
}

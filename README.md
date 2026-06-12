# Mini Coding Agent

一个运行在用户本地项目目录中的轻量级 AI 编程助手。基于 OpenAI Chat Completions API 的 Function Calling 能力，通过循环调用工具来自主完成代码分析、文件编辑、命令执行等任务。

## 项目简介

Mini Coding Agent 是一个基于 TypeScript 构建的本地 AI 编程代理，采用 **ReAct (Reasoning + Acting)** 循环架构，能够自主分析代码库、编辑文件并执行命令来完成用户指定的编程任务。

核心特点：

- **自主循环执行**：Agent 通过最多 15 轮的 LLM 对话循环，自动规划、执行和验证任务，无需用户逐步干预。
- **丰富的工具体系**：内置 10 个本地工具，涵盖文件读写、目录浏览、关键词搜索、Shell 命令执行、Git 差异查看和任务计划管理。
- **三层安全防护**：危险命令硬拦截 → 权限交互确认 → 工具内二次校验，确保在用户本地环境中安全运行。
- **轻量可配置**：支持任意兼容 OpenAI Chat Completions API 的模型服务端，通过环境变量即可切换模型和端点。
- **任务计划系统**：内置 Todo 机制，对复杂任务自动拆分步骤、跟踪进度，保证执行过程的可追溯性。

技术栈：TypeScript · Node.js · OpenAI SDK · Zod · Commander · Chalk

## 快速开始

```bash
# 安装依赖
pnpm install

# 配置环境变量（在 .env 文件中）
# OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL=https://api.openai.com/v1   （可选）
# OPENAI_MODEL=gpt-4o-mini                      （可选，默认 gpt-4o-mini）

# 运行
pnpm dev "你的任务描述"
```

## 项目运行机制

### 整体架构

项目采用经典的 **ReAct (Reasoning + Acting) Agent Loop** 架构，核心执行流程如下：

```
用户输入 → 构建消息上下文 → 循环调用 LLM → 判断是否有工具调用
                                                    ↓
                              ┌──────── 无 ────────→ 输出最终回答 → 结束
                              │
                              └──────── 有 ────────→ 安全校验 → 权限确认 → 执行工具 → 将结果写回消息上下文 → 继续下一轮循环
```

### 启动入口 (`src/index.ts`)

从命令行参数读取用户输入，传递给 `runAgent()` 函数启动 Agent 循环。

### Agent 核心循环 (`src/agent.ts`)

1. **初始化上下文**：将 System Prompt（工作规则与行为约束）和用户输入组装为初始消息数组。
2. **循环执行**（最多 15 轮）：
   - 将当前消息数组发送给 LLM，请求中携带所有可用工具的定义。
   - **若无工具调用**：说明模型已形成最终回答，打印输出并返回。
   - **若有工具调用**：逐个处理——解析参数 → 安全检查 → 权限确认 → 执行工具 → 将工具返回结果以 `tool` 角色消息追加到上下文中，进入下一轮循环。

### 工具体系 (`src/tools/`)

Agent 通过以下 10 个工具与本地环境交互：

| 工具 | 功能 | 是否需要权限确认 |
|------|------|:---:|
| `list_dir` | 列出目录内容 | 否 |
| `read_file` | 读取文件（自动截断 >12000 字符） | 否 |
| `grep` | 在项目中搜索关键词 | 否 |
| `bash` | 执行 shell 命令（20 秒超时） | 视情况* |
| `edit_file` | 通过 oldText/newText 替换方式局部编辑文件 | 是 |
| `write_file` | 创建或覆盖整个文件 | 是 |
| `git_diff` | 查看 git 工作区变更 | 否 |
| `todo_write` | 创建/更新任务计划 | 否 |
| `todo_read` | 读取当前任务计划 | 否 |
| `todo_clear` | 清空任务计划 | 否 |

\* `bash` 工具：白名单命令（如 `ls`、`git status`、`git diff`）自动放行；其他命令需用户交互确认。

### 安全机制 (`src/permissions.ts`)

项目采用 **三层安全策略** 保护用户环境：

1. **危险命令硬拦截**：匹配到 `rm`、`sudo`、`git push`、`curl`、`wget` 等危险模式的命令直接拒绝执行，不弹出确认。
2. **权限交互确认**：对文件修改操作（`edit_file`、`write_file`）和非白名单的 bash 命令，通过终端交互提示用户选择"允许一次 / 总是允许 / 拒绝"。
3. **工具内二次校验**：`bash` 工具实现内部同样包含危险命令检测逻辑，作为兜底防线。

### 模型配置 (`src/model.ts`)

通过环境变量配置 OpenAI 兼容的 API 端点和模型名称，支持任何兼容 OpenAI Chat Completions API 的服务。

### Todo 计划系统 (`src/todoStore.ts`)

Agent 内置轻量级任务规划系统，在内存中维护一个 Todo 列表。对于多步骤复杂任务，Agent 会先制定计划、逐步推进并更新状态，确保任务执行的可追踪性。


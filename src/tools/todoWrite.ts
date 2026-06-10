import { writeTodos, type TodoItem } from "../todoStore.js";

export async function todoWrite(args: { todos: TodoItem[] }) {
  if (!Array.isArray(args.todos)) {
    return "todo_write 失败：todos 必须是数组";
  }

  for (const todo of args.todos) {
    if (
      typeof todo.id !== "string" ||
      typeof todo.content !== "string" ||
      !["pending", "in_progress", "completed"].includes(todo.status)
    ) {
      return `todo_write 失败：todo 格式不正确：${JSON.stringify(todo)}`;
    }
  }

  writeTodos(args.todos);

  return [
    "todo 已更新：",
    ...args.todos.map(
      (todo) => `- [${formatStatus(todo.status)}] ${todo.id}: ${todo.content}`,
    ),
  ].join("\n");
}

function formatStatus(status: TodoItem["status"]) {
  switch (status) {
    case "pending":
      return " ";
    case "in_progress":
      return "~";
    case "completed":
      return "x";
  }
}
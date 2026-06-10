import { readTodos } from "../todoStore.js";

export async function todoRead() {
  const todos = readTodos();

  if (todos.length === 0) {
    return "当前没有 todo";
  }

  return [
    "当前 todo：",
    ...todos.map((todo) => {
      const mark =
        todo.status === "completed"
          ? "x"
          : todo.status === "in_progress"
            ? "~"
            : " ";

      return `- [${mark}] ${todo.id}: ${todo.content}`;
    }),
  ].join("\n");
}
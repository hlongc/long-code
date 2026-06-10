import { clearTodos } from "../todoStore.js";

export async function todoClear() {
  clearTodos();

  return "todo 已清空";
}
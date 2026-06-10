export type TodoStatus = "pending" | "in_progress" | "completed";

export type TodoItem = {
  id: string;
  content: string;
  status: TodoStatus;
};

let todos: TodoItem[] = [];

export function writeTodos(nextTodos: TodoItem[]) {
  todos = nextTodos;
}

export function readTodos() {
  return todos;
}

export function clearTodos() {
  todos = [];
}
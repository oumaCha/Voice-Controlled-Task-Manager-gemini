import type { Task } from "../types/task";

const TASKS_KEY = "voice_tasks";

export function loadTasks(): Task[] {
  const saved = localStorage.getItem(TASKS_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveTasks(tasks: Task[]) {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
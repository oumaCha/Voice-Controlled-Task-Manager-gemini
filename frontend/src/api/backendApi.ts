import type { Task } from "../types/task";

const API_BASE_URL = "http://localhost:4000/api";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
};

export async function apiSignup(name: string, email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Signup failed.");
  }

  return data.user as AuthUser;
}

export async function apiLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }

  return data.user as AuthUser;
}

export async function apiGetTasks(userId: string) {
  const response = await fetch(`${API_BASE_URL}/tasks/${userId}`);

  if (!response.ok) {
    throw new Error("Could not load tasks.");
  }

  const rows = await response.json();

  return rows.map((row: any): Task => ({
    id: row.id,
    title: row.title,
    date: row.date ?? undefined,
    time: row.time ?? undefined,
    completed: Boolean(row.completed),
    createdAt: row.created_at,
  }));
}

export async function apiCreateTask(
  userId: string,
  task: Pick<Task, "title" | "date" | "time">
) {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      title: task.title,
      date: task.date,
      time: task.time,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not create task.");
  }

  const row = await response.json();

  return {
    id: row.id,
    title: row.title,
    date: row.date ?? undefined,
    time: row.time ?? undefined,
    completed: Boolean(row.completed),
    createdAt: row.createdAt,
  } as Task;
}

export async function apiUpdateTask(task: Task) {
  const response = await fetch(`${API_BASE_URL}/tasks/${task.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: task.title,
      date: task.date,
      time: task.time,
      completed: task.completed,
    }),
  });

  if (!response.ok) {
    throw new Error("Could not update task.");
  }
}

export async function apiDeleteTask(taskId: string) {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Could not delete task.");
  }
}
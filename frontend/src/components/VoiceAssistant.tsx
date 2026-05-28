import { useEffect, useMemo, useState } from "react";
import type { AssistantContext, AssistantIntent } from "../types/assistant";
import type { Task } from "../types/task";
import { understandCommandWithGemini } from "../services/gemini";


import {
  apiCreateTask,
  apiDeleteTask,
  apiGetTasks,
  apiUpdateTask,
} from "../api/backendApi";

export default function VoiceAssistant({
  username,
  userId,
}: {
  username: string;
  userId: string;
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [lastCommand, setLastCommand] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);

  const [assistantContext, setAssistantContext] = useState<AssistantContext>({
    lastListedTaskIds: [],
  });

  useEffect(() => {
  async function loadUserTasks() {
    try {
      const loadedTasks = await apiGetTasks(userId);
      setTasks(loadedTasks);
    } catch (error) {
      console.error(error);
      respond("I could not load your tasks from the backend.");
    }
  }

  loadUserTasks();
}, [userId]);

  const taskMap = useMemo(() => {
    return new Map(tasks.map((task) => [task.id, task]));
  }, [tasks]);

  function speak(message: string) {
    try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.pitch = 1;

    utterance.onerror = (event) => {
  if (event.error === "interrupted" || event.error === "canceled") {
    console.log("TTS was interrupted intentionally.");
    return;
  }

  console.error("TTS error:", event.error);
  setAssistantMessage(message);
};
      
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    console.error("Speech synthesis failed:", error);
    setAssistantMessage(message);
  }
}

  function respond(message: string) {
    setAssistantMessage(message);
    speak(message);
  }

  function updateTasks(newTasks: Task[]) {
  setTasks(newTasks);
}

  function createTaskTitle(task: Pick<Task, "title" | "date" | "time">) {
    const parts = [task.title];

    if (task.date) {
      parts.push(`on ${task.date}`);
    }

    if (task.time) {
      parts.push(`at ${task.time}`);
    }

    return parts.join(" ");
  }

  function normalize(text: string) {
    return text.toLowerCase().replace(/[^\w\s]/g, "").trim();
  }

  function taskMatchesTitle(task: Task, search?: string) {
  if (!search) return false;

  const taskText = normalize(`${task.title} ${task.date ?? ""} ${task.time ?? ""}`);

  const cleanedSearch = normalize(
    search
      .replace(/\bupdate\b/gi, "")
      .replace(/\bchange\b/gi, "")
      .replace(/\bmove\b/gi, "")
      .replace(/\bdelete\b/gi, "")
      .replace(/\bremove\b/gi, "")
      .replace(/\btask\b/gi, "")
      .replace(/\bfrom\b/gi, "")
      .replace(/\bto\b/gi, "")
      .replace(/\bbe\b/gi, "")
  );

  if (!cleanedSearch) return false;

  if (taskText.includes(cleanedSearch)) return true;
  if (cleanedSearch.includes(taskText)) return true;

  const searchWords = cleanedSearch
    .split(" ")
    .filter((word) => word.length > 2);

  if (searchWords.length === 0) return false;

  const matchedWords = searchWords.filter((word) => taskText.includes(word));

  return matchedWords.length >= Math.min(2, searchWords.length);
}
  function resolveTarget(intent: Extract<AssistantIntent, { intent: "update_task" | "delete_task" }>) {
    const target = intent.target;

    if (!target) return null;

    if (target.taskId && taskMap.has(target.taskId)) {
      return taskMap.get(target.taskId) ?? null;
    }

    if (target.reference === "previous" || target.reference === "last") {
      const previousId = assistantContext.lastReferencedTaskId;
      if (previousId && taskMap.has(previousId)) {
        return taskMap.get(previousId) ?? null;
      }
    }

    if (target.ordinal && target.ordinal > 0) {
      const listedId = assistantContext.lastListedTaskIds[target.ordinal - 1];

      if (listedId && taskMap.has(listedId)) {
        return taskMap.get(listedId) ?? null;
      }

      const taskByGlobalIndex = tasks[target.ordinal - 1];
      if (taskByGlobalIndex) return taskByGlobalIndex;
    }

    if (target.taskTitle) {
  const matches = tasks.filter((task) => taskMatchesTitle(task, target.taskTitle));

  if (matches.length === 1) return matches[0];

  if (matches.length > 1) {
    const searchText = normalize(target.taskTitle);

    const tomorrowMatch = matches.find((task) =>
      normalize(`${task.date ?? ""} ${task.time ?? ""} ${task.title}`).includes("tomorrow")
    );

    const todayMatch = matches.find((task) =>
      normalize(`${task.date ?? ""} ${task.time ?? ""} ${task.title}`).includes("today")
    );

    const morningMatch = matches.find((task) =>
      normalize(`${task.date ?? ""} ${task.time ?? ""} ${task.title}`).includes("morning")
    );

    const eveningMatch = matches.find((task) =>
      normalize(`${task.date ?? ""} ${task.time ?? ""} ${task.title}`).includes("evening")
    );

    if (searchText.includes("tomorrow") && tomorrowMatch) return tomorrowMatch;
    if (searchText.includes("today") && todayMatch) return todayMatch;
    if (searchText.includes("morning") && morningMatch) return morningMatch;
    if (searchText.includes("evening") && eveningMatch) return eveningMatch;

    respond(
      `I found more than one matching task. Please say first, second, or the exact task name.`
    );

    setAssistantContext((prev) => ({
      ...prev,
      lastListedTaskIds: matches.map((task) => task.id),
    }));

    return null;
  }
}

    return null;
  }

  function getHourFromTask(task: Task) {
    const text = `${task.time ?? ""} ${task.title}`.toLowerCase();

    const match = text.match(/\b(\d{1,2})(?::\d{2})?\s*(am|pm)?\b/);
    if (!match) return null;

    let hour = Number(match[1]);
    const ampm = match[2];

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    return hour;
  }

  function matchesReadFilter(task: Task, intent: Extract<AssistantIntent, { intent: "read_tasks" }>) {
    const date = intent.date?.toLowerCase();

    if (date && date !== "all") {
      const taskDateText = `${task.date ?? ""} ${task.title}`.toLowerCase();

      if (date === "today" && taskDateText.includes("tomorrow")) return false;
      if (date === "tomorrow" && !taskDateText.includes("tomorrow")) return false;
    }

    const hour = getHourFromTask(task);

    if (!intent.timeRange || intent.timeRange === "all") return true;

    if (hour === null) {
      const text = `${task.title} ${task.time ?? ""}`.toLowerCase();

      if (intent.timeRange === "morning") return text.includes("morning") || text.includes("am");
      if (intent.timeRange === "afternoon") return text.includes("afternoon") || text.includes("pm");
      if (intent.timeRange === "evening") return text.includes("evening") || text.includes("pm");
      if (intent.timeRange === "night") return text.includes("night") || text.includes("pm");

      return true;
    }

    if (intent.timeRange === "morning") return hour >= 5 && hour < 12;
    if (intent.timeRange === "afternoon") return hour >= 12 && hour < 17;
    if (intent.timeRange === "evening") return hour >= 17 && hour < 22;
    if (intent.timeRange === "night") return hour >= 22 || hour < 5;

    return true;
  }

  async function applyIntent(intent: AssistantIntent) {
    switch (intent.intent) {
      case "create_tasks": {
        if (!intent.tasks || intent.tasks.length === 0) {
          respond("What task should I create?");
          return;
        }

        const createdTasks: Task[] = [];

for (const task of intent.tasks) {
  const createdTask = await apiCreateTask(userId, {
    title: task.title,
    date: task.date,
    time: task.time,
  });

  createdTasks.push(createdTask);
}

const updatedTasks = [...tasks, ...createdTasks];
updateTasks(updatedTasks);

        const lastCreated = createdTasks[createdTasks.length - 1];

        setAssistantContext((prev) => ({
          ...prev,
          lastReferencedTaskId: lastCreated.id,
          lastListedTaskIds: createdTasks.map((task) => task.id),
        }));

        if (createdTasks.length === 1) {
          respond(`Okay, I created ${createTaskTitle(createdTasks[0])}.`);
        } else {
          respond(
            `Okay, I created ${createdTasks.length} tasks: ${createdTasks
              .map(createTaskTitle)
              .join(", ")}.`
          );
        }

        return;
      }

      case "read_tasks": {
        const filteredTasks = tasks.filter((task) => matchesReadFilter(task, intent));

        if (filteredTasks.length === 0) {
          respond("I could not find any matching tasks.");
          return;
        }

        setAssistantContext((prev) => ({
          ...prev,
          lastListedTaskIds: filteredTasks.map((task) => task.id),
          lastReferencedTaskId: filteredTasks[filteredTasks.length - 1].id,
        }));

        const summary = filteredTasks
          .map((task, index) => `${index + 1}. ${createTaskTitle(task)}`)
          .join(". ");

        respond(`Here is your agenda: ${summary}.`);
        return;
      }

      case "update_task": {
        const taskToUpdate = resolveTarget(intent);

        if (!taskToUpdate) {
          respond("I could not find the task you want to update. Please say the task name again.");
          return;
        }

        const updatedTask: Task = {
          ...taskToUpdate,
          title: intent.newTitle ?? taskToUpdate.title,
          date: intent.newDate ?? taskToUpdate.date,
          time: intent.newTime ?? taskToUpdate.time,
        };
        await apiUpdateTask(updatedTask);

        const updatedTasks = tasks.map((task) =>
          task.id === taskToUpdate.id ? updatedTask : task
        );

        updateTasks(updatedTasks);

        setAssistantContext((prev) => ({
          ...prev,
          lastReferencedTaskId: updatedTask.id,
        }));

        respond(`Okay, I updated it to ${createTaskTitle(updatedTask)}.`);
        return;
      }

      case "delete_task": {
        const taskToDelete = resolveTarget(intent);

        if (!taskToDelete) {
          respond("I could not find the task you want to delete. Please say the task name again.");
          return;
        }

        setAssistantContext((prev) => ({
          ...prev,
          pendingDeleteTaskId: taskToDelete.id,
          lastReferencedTaskId: taskToDelete.id,
        }));

        respond(`Do you want me to delete ${createTaskTitle(taskToDelete)}? Please say yes or no.`);
        return;
      }

      case "confirm": {
        const pendingDeleteId = assistantContext.pendingDeleteTaskId;

        if (!pendingDeleteId) {
          respond("There is nothing to confirm right now.");
          return;
        }

        const taskToDelete = taskMap.get(pendingDeleteId);

        if (!taskToDelete) {
          respond("That task was already removed.");
          setAssistantContext((prev) => ({
            ...prev,
            pendingDeleteTaskId: undefined,
          }));
          return;
        }

       await apiDeleteTask(pendingDeleteId);

const updatedTasks = tasks.filter((task) => task.id !== pendingDeleteId);
updateTasks(updatedTasks);

        setAssistantContext((prev) => ({
          ...prev,
          pendingDeleteTaskId: undefined,
          lastReferencedTaskId: undefined,
          lastListedTaskIds: prev.lastListedTaskIds.filter((id) => id !== pendingDeleteId),
        }));

        respond(`Okay, I deleted ${createTaskTitle(taskToDelete)}.`);
        return;
      }

      case "cancel": {
        setAssistantContext((prev) => ({
          ...prev,
          pendingDeleteTaskId: undefined,
        }));

        respond("Okay, I cancelled that.");
        return;
      }

      case "clarify": {
        respond(intent.question);
        return;
      }

      case "unknown":
      default: {
        respond(
          intent.reply ??
            "Sorry, I did not understand. Try saying: create a task for gym tomorrow at 7 AM."
        );
      }
    }
  }

  async function handleCommand(command: string) {
    setIsThinking(true);

    try {
      const intent = await understandCommandWithGemini({
        command,
        tasks,
        context: assistantContext,
      });

      await applyIntent(intent);
    } catch (error) {
      console.error(error);
      respond("Something went wrong while understanding your command.");
    } finally {
      setIsThinking(false);
    }
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      respond("Speech recognition is not supported in this browser. Please use Google Chrome.");
      return;
    }

    window.speechSynthesis.cancel();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    setIsListening(true);
    recognition.start();

    recognition.onresult = (event: any) => {
      const command = event.results[0][0].transcript;
      setLastCommand(command);
      handleCommand(command);
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      console.error("Speech recognition error:", event.error);

      if (event.error === "not-allowed") {
        respond("Microphone permission is blocked. Please allow microphone access in Chrome.");
        return;
      }

      if (event.error === "no-speech") {
        respond("I did not hear anything. Please speak after clicking the voice assistant.");
        return;
      }

      if (event.error === "network") {
        respond("Speech recognition has a network problem. Please check your internet connection.");
        return;
      }

      respond(`Speech recognition error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  }

  return (
    <section className="assistant-panel">
      <div className="welcome">
        Welcome, <span className="username">{username}</span> 👋
      </div>

      <button
        onClick={startListening}
        className={`voice-btn ${isListening ? "listening" : ""}`}
        disabled={isThinking}
      >
        {isListening
          ? "🎙 Listening..."
          : isThinking
          ? "🧠 Understanding..."
          : "🎤 Start Voice Assistant"}
      </button>

      <div className="info-pill">
        No manual task actions are available. Create, update, read, and delete tasks only by speaking.
      </div>

      <div className="conversation-grid">
        <div className="message-card">
          <h3>💬 You said</h3>
          <p>{lastCommand || "Nothing yet..."}</p>
        </div>

        <div className="message-card assistant">
          <h3>🤖 Assistant</h3>
          <p>{assistantMessage || "I am ready to help."}</p>
        </div>
      </div>

      <div className="tasks-card">
        <div className="tasks-header">
          <h2>📋 Tasks</h2>
          <span className="task-count">{tasks.length} tasks</span>
        </div>

        {tasks.length === 0 ? (
          <p className="empty">No tasks yet.</p>
        ) : (
          <div className="task-list">
            {tasks.map((task, index) => (
              <div key={task.id} className="task-item">
                ✅ {index + 1}. {createTaskTitle(task)}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
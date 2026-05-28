import type { AssistantIntent, GeminiParserInput } from "../types/assistant";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-2.5-flash-lite";

function safeJsonParse(text: string): AssistantIntent {
  try {
    return JSON.parse(text) as AssistantIntent;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      return {
        intent: "unknown",
        reply: "Sorry, I could not understand that.",
      };
    }

    try {
      return JSON.parse(match[0]) as AssistantIntent;
    } catch {
      return {
        intent: "unknown",
        reply: "Sorry, I could not understand that.",
      };
    }
  }
}

function buildPrompt(input: GeminiParserInput) {
  // Send only the latest 20 tasks to reduce token usage and latency
  const simplifiedTasks = input.tasks.slice(-20).map((task, index) => ({
    index: index + 1,
    id: task.id,
    title: task.title,
    date: task.date ?? "",
    time: task.time ?? "",
  }));

  return `
You are the natural language understanding brain for a voice-controlled task manager.

Your job:
Convert the user's voice command into ONE valid JSON object.
Do not return markdown.
Do not explain.
Return JSON only.

The app supports:
- create_tasks
- read_tasks
- update_task
- delete_task
- confirm
- cancel
- clarify
- unknown

Current tasks:
${JSON.stringify(simplifiedTasks, null, 2)}

Conversation context:
${JSON.stringify(input.context, null, 2)}

User command:
"${input.command}"

Important rules:
1. If the user says "yes", "confirm", "delete it", return { "intent": "confirm" }.
2. If the user says "no", "cancel", "stop", return { "intent": "cancel" }.
3. If the user says "previous one", "last one", or "it", use target.reference = "previous".
4. If the user says "first one", "second one", "third one", use target.ordinal as 1, 2, 3.
5. If the user says "move the second one to tomorrow", return update_task with ordinal 2 and newDate "tomorrow".
6. For delete_task, do not actually delete. The app will ask for confirmation.
7. For multiple create requests, return all tasks separately.
8. Extract date and time when possible.
9. If the command is unclear, return clarify with a question.
10. If the user asks for evening tasks, use read_tasks with timeRange "evening".
11. If the user asks for agenda, today, tomorrow, morning, afternoon, evening, use read_tasks.
12. If you can match a task from the current tasks, prefer taskId.
13. For "move my evening workout", find a task with workout/gym/sport and evening/PM time.
14. For "previous one", use the last referenced task from context.
15. For "second one", use the second task from the last listed task list.
16. If the user says "to evening", "to morning", "to afternoon", or "to night", return that as newTime.
17. If the user says "from X to Y", X usually identifies the old task time and Y is the new time.
18. For "update the gym from tomorrow morning to evening", return target.taskTitle = "gym tomorrow morning" and newTime = "evening".
19. For "update the gym from tomorrow at 8 AM to 11 PM", return target.taskTitle = "gym tomorrow 8 AM" and newTime = "11 PM".
Return only one of these JSON shapes:

Create:
{
  "intent": "create_tasks",
  "tasks": [
    { "title": "Gym", "date": "tomorrow", "time": "7 AM" }
  ]
}

Read:
{
  "intent": "read_tasks",
  "date": "today",
  "timeRange": "evening"
}

Update:
{
  "intent": "update_task",
  "target": {
    "taskId": "existing-task-id",
    "taskTitle": "LinkedIn",
    "ordinal": 2,
    "reference": "previous"
  },
  "newTitle": "Post on LinkedIn",
  "newDate": "tomorrow",
  "newTime": "6 PM"
}

Delete:
{
  "intent": "delete_task",
  "target": {
    "taskId": "existing-task-id",
    "taskTitle": "LinkedIn",
    "ordinal": 2,
    "reference": "previous"
  }
}

Confirm:
{
  "intent": "confirm"
}

Cancel:
{
  "intent": "cancel"
}

Clarify:
{
  "intent": "clarify",
  "question": "Which task do you mean?"
}

Unknown:
{
  "intent": "unknown",
  "reply": "Sorry, I did not understand."
}
`;
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export async function understandCommandWithGemini(
  input: GeminiParserInput
): Promise<AssistantIntent> {
  if (!GEMINI_API_KEY) {
    return {
      intent: "unknown",
      reply:
        "Gemini API key is missing. Please add VITE_GEMINI_API_KEY to your .env file.",
    };
  }

  const prompt = buildPrompt(input);

  async function callGemini() {
    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 12000);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      return response;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  try {
    let response = await callGemini();

    // Retry once if Gemini is temporarily busy
    if (response.status === 503) {
      await wait(1500);
      response = await callGemini();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini error:", errorText);

      if (response.status === 429) {
  return localFallbackParser(input.command);
}
      if (response.status === 503) {
        return {
          intent: "unknown",
          reply:
            "Gemini is currently busy. Please try again in a moment.",
        };
      }

      if (response.status === 404) {
        return {
          intent: "unknown",
          reply:
            "The selected Gemini model is not available. Please check the model name in gemini.ts.",
        };
      }

      return {
        intent: "unknown",
        reply: "Gemini could not understand the command right now.",
      };
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      '{"intent":"unknown","reply":"Sorry, I did not understand."}';

    return safeJsonParse(text);
  } catch (error) {
    console.error("Gemini request failed:", error);

    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        intent: "unknown",
        reply:
          "The AI took too long to respond. Please try again with a shorter command.",
      };
    }

    return {
      intent: "unknown",
      reply:
        "I could not connect to Gemini right now. Please check your internet connection and try again.",
    };
  }
}

function extractNewTime(command: string): string | undefined {
  const text = command.toLowerCase();

  const afterTo = text.split(/\bto\b/).pop()?.trim() ?? "";

  if (afterTo.includes("morning")) return "morning";
  if (afterTo.includes("afternoon")) return "afternoon";
  if (afterTo.includes("evening")) return "evening";
  if (afterTo.includes("night")) return "night";

  const allTimes = command.match(/\b\d{1,2}(:\d{2})?\s*(AM|PM|am|pm|a\.m\.|p\.m\.)?\b/g);

  if (allTimes && allTimes.length > 0) {
    return allTimes[allTimes.length - 1].replace(/\./g, "");
  }

  return undefined;
}

function extractTargetText(command: string): string {
  return command
    .replace(/\bupdate\b/gi, "")
    .replace(/\bchange\b/gi, "")
    .replace(/\bmove\b/gi, "")
    .replace(/\bthe\b/gi, "")
    .split(/\bto\b/i)[0]
    .replace(/\bfrom\b/gi, "")
    .trim();
}

function localFallbackParser(command: string): AssistantIntent {
  const text = command.toLowerCase();

  if (text.includes("yes") || text.includes("confirm")) {
    return { intent: "confirm" };
  }

  if (text.includes("no") || text.includes("cancel") || text.includes("stop")) {
    return { intent: "cancel" };
  }

  if (
    text.includes("what") ||
    text.includes("agenda") ||
    text.includes("read") ||
    text.includes("show") ||
    text.includes("list")
  ) {
    return {
      intent: "read_tasks",
      date: text.includes("tomorrow") ? "tomorrow" : "today",
      timeRange: text.includes("morning")
        ? "morning"
        : text.includes("afternoon")
        ? "afternoon"
        : text.includes("evening")
        ? "evening"
        : "all",
      reply: "I will check your tasks.",
    };
  }

  if (text.includes("delete") || text.includes("remove")) {
    return {
      intent: "delete_task",
      target: {
        taskTitle: command.replace(/delete|remove/gi, "").trim(),
      },
    };
  }

  if (
  text.includes("change") ||
  text.includes("move") ||
  text.includes("update")
) {
  const newTime = extractNewTime(command);
  const targetText = extractTargetText(command);

  return {
    intent: "update_task",
    target: text.includes("second")
      ? { ordinal: 2 }
      : text.includes("first")
      ? { ordinal: 1 }
      : text.includes("previous") || text.includes("last")
      ? { reference: "previous" }
      : { taskTitle: targetText },
    newDate: text.includes("tomorrow") ? "tomorrow" : undefined,
    newTime,
  };
}

  if (text.includes("create") || text.includes("add")) {
    const cleanedTitle = command
      .replace(/create a task for/gi, "")
      .replace(/create task for/gi, "")
      .replace(/create/gi, "")
      .replace(/add a task for/gi, "")
      .replace(/add task for/gi, "")
      .replace(/add/gi, "")
      .trim();

    const timeMatch = command.match(/\b\d{1,2}(:\d{2})?\s*(AM|PM|am|pm)?\b/);

    return {
      intent: "create_tasks",
      tasks: [
        {
          title: cleanedTitle || "New task",
          date: text.includes("tomorrow") ? "tomorrow" : "today",
          time: timeMatch?.[0],
        },
      ],
    };
  }

  return {
    intent: "clarify",
    question:
      "Gemini quota is currently exhausted. I can still handle simple commands. What task action do you want?",
  };
}
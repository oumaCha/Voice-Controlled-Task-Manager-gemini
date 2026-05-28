import type { Task } from "./task";

export type TimeRange = "morning" | "afternoon" | "evening" | "night" | "all";

export type AssistantContext = {
  lastReferencedTaskId?: string;
  lastListedTaskIds: string[];
  pendingDeleteTaskId?: string;
};

export type ParsedTaskInput = {
  title: string;
  date?: string;
  time?: string;
};

export type AssistantIntent =
  | {
      intent: "create_tasks";
      tasks: ParsedTaskInput[];
      reply?: string;
    }
  | {
      intent: "read_tasks";
      date?: "today" | "tomorrow" | string;
      timeRange?: TimeRange;
      reply?: string;
    }
  | {
      intent: "update_task";
      target?: {
        taskId?: string;
        taskTitle?: string;
        ordinal?: number;
        reference?: "previous" | "last" | "pending_delete";
      };
      newTitle?: string;
      newDate?: string;
      newTime?: string;
      reply?: string;
    }
  | {
      intent: "delete_task";
      target?: {
        taskId?: string;
        taskTitle?: string;
        ordinal?: number;
        reference?: "previous" | "last";
      };
      reply?: string;
    }
  | {
      intent: "confirm";
      reply?: string;
    }
  | {
      intent: "cancel";
      reply?: string;
    }
  | {
      intent: "clarify";
      question: string;
    }
  | {
      intent: "unknown";
      reply?: string;
    };

export type GeminiParserInput = {
  command: string;
  tasks: Task[];
  context: AssistantContext;
};
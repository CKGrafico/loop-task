import type { TaskDefinition } from "../../types.js";

// Re-export task-related types from the IPC contract boundary for convenience
export type { TaskDefinition, TaskCommand, TaskStep } from "../../types.js";

export type TaskSortMode = "name" | "command" | "created";

export interface TaskFilters {
  query: string;
  sort: TaskSortMode;
}

export const defaultTaskFilters: TaskFilters = {
  query: "",
  sort: "name",
};

function taskSearchableText(task: TaskDefinition): string {
  return `${task.id} ${task.name} ${task.command} ${task.commandArgs.join(" ")}`.toLowerCase();
}

function matches(task: TaskDefinition, filters: TaskFilters): boolean {
  const query = filters.query.trim().toLowerCase();
  if (!query) return true;
  return taskSearchableText(task).includes(query);
}

function compare(left: TaskDefinition, right: TaskDefinition, sort: TaskSortMode): number {
  if (sort === "name") {
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }

  if (sort === "command") {
    const leftCmd = left.commandRaw ?? [left.command, ...left.commandArgs].join(" ");
    const rightCmd = right.commandRaw ?? [right.command, ...right.commandArgs].join(" ");
    const byCmd = leftCmd.localeCompare(rightCmd, undefined, { sensitivity: "base" });
    if (byCmd !== 0) return byCmd;
    return left.name.localeCompare(right.name, undefined, { sensitivity: "base" });
  }

  // "created"  newest first
  return right.createdAt.localeCompare(left.createdAt);
}

export function applyTaskFilters(
  tasks: TaskDefinition[],
  filters: TaskFilters,
): TaskDefinition[] {
  return tasks
    .filter((task) => matches(task, filters))
    .sort((left, right) => compare(left, right, filters.sort));
}

const TASK_SORT_CYCLE: Record<TaskSortMode, TaskSortMode> = {
  name: "command",
  command: "created",
  created: "name",
};

export function cycleTaskSortMode(mode: TaskSortMode): TaskSortMode {
  return TASK_SORT_CYCLE[mode];
}

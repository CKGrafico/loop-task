import crypto from "node:crypto";
import type { TaskDefinition } from "../../types.js";
import { DEFAULT_TASK_MAX_RUNS } from "../../types.js";
import { saveTask, loadAllTasks, loadTask, deleteTask as deleteTaskState } from "../state/index.js";
import { daemonLog } from "../daemon-log.js";

export class TaskManager {
  private tasks = new Map<string, TaskDefinition>();

  init(): void {
    const saved = loadAllTasks();
    for (const task of saved) {
      this.tasks.set(task.id, {
        ...task,
        maxRuns: task.maxRuns ?? DEFAULT_TASK_MAX_RUNS,
      });
    }
    if (saved.length > 0) {
      daemonLog(`loaded ${saved.length} task(s) from persisted state`);
    }
  }

  create(input: Omit<TaskDefinition, "createdAt">): TaskDefinition {
    const task: TaskDefinition = {
      ...input,
      id: input.id ?? crypto.randomUUID().slice(0, 8),
      maxRuns: input.maxRuns ?? DEFAULT_TASK_MAX_RUNS,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    saveTask(task);
    return task;
  }

  get(id: string): TaskDefinition | null {
    return this.tasks.get(id) ?? null;
  }

  list(): TaskDefinition[] {
    return [...this.tasks.values()];
  }

  update(id: string, input: Omit<TaskDefinition, "id" | "createdAt">): TaskDefinition | null {
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: TaskDefinition = { ...existing, ...input };
    this.tasks.set(id, updated);
    saveTask(updated);
    return updated;
  }

  delete(id: string): boolean {
    if (!this.tasks.has(id)) return false;
    this.tasks.delete(id);
    deleteTaskState(id);
    return true;
  }

  createInline(command: string, commandArgs: string[]): TaskDefinition {
    const id = crypto.randomUUID().slice(0, 8);
    const name = [command, ...commandArgs].join(" ").slice(0, 40);
    return this.create({
      id,
      name,
      command,
      commandArgs,
      onSuccessTaskId: null,
      onFailureTaskId: null,
      maxRuns: DEFAULT_TASK_MAX_RUNS,
    });
  }

  reload(newTasks: TaskDefinition[]): void {
    this.tasks.clear();
    for (const task of newTasks) {
      this.tasks.set(task.id, task);
    }
    daemonLog(`reloaded ${newTasks.length} task(s) from external change`);
  }
}

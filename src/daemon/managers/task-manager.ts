import crypto from "node:crypto";
import type { TaskDefinition } from "../../types.js";
import { saveTask, loadAllTasks, deleteTask as deleteTaskState } from "../state/index.js";
import { daemonLog } from "../daemon-log.js";
import type { RecipeTaskStore } from "../recipe/task-store.js";

export class TaskManager {
  private tasks = new Map<string, TaskDefinition>();
  private recipeTaskStore: RecipeTaskStore | null = null;

  setRecipeTaskStore(store: RecipeTaskStore): void {
    this.recipeTaskStore = store;
  }

  init(): void {
    const saved = loadAllTasks();
    for (const task of saved) {
      this.tasks.set(task.id, task);
    }
    if (saved.length > 0) {
      daemonLog(`loaded ${saved.length} task(s) from persisted state`);
    }
  }

  create(input: Omit<TaskDefinition, "createdAt">): TaskDefinition {
    const task: TaskDefinition = {
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    saveTask(task);
    return task;
  }

  get(id: string): TaskDefinition | null {
    const userTask = this.tasks.get(id) ?? null;
    if (userTask) return userTask;
    if (this.recipeTaskStore) {
      return this.recipeTaskStore.get(id);
    }
    return null;
  }

  list(): TaskDefinition[] {
    const userTasks = [...this.tasks.values()];
    if (this.recipeTaskStore) {
      return [...userTasks, ...this.recipeTaskStore.list()];
    }
    return userTasks;
  }

  update(id: string, input: Omit<TaskDefinition, "id" | "createdAt">): TaskDefinition | null {
    if (this.recipeTaskStore?.has(id)) {
      throw new Error("Recipe tasks are immutable and cannot be updated");
    }
    const existing = this.tasks.get(id);
    if (!existing) return null;
    const updated: TaskDefinition = { ...existing, ...input };
    this.tasks.set(id, updated);
    saveTask(updated);
    return updated;
  }

  delete(id: string): boolean {
    if (this.recipeTaskStore?.has(id)) {
      throw new Error("Recipe tasks are immutable and cannot be deleted");
    }
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

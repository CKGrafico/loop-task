import type { TaskDefinition } from "../../types.js";

export class RecipeTaskStore {
  private tasks = new Map<string, TaskDefinition>();

  get(id: string): TaskDefinition | null {
    return this.tasks.get(id) ?? null;
  }

  list(): TaskDefinition[] {
    return [...this.tasks.values()];
  }

  set(task: TaskDefinition): void {
    this.tasks.set(task.id, task);
  }

  setMany(tasks: TaskDefinition[]): void {
    for (const task of tasks) {
      this.tasks.set(task.id, task);
    }
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }

  deleteMany(ids: string[]): void {
    for (const id of ids) {
      this.tasks.delete(id);
    }
  }

  clear(): void {
    this.tasks.clear();
  }

  has(id: string): boolean {
    return this.tasks.has(id);
  }
}

import { injectable } from "inversify";
import type { TaskDefinition } from "../../types.js";
import { sendRequest } from "../../client/ipc.js";
import type { TaskService } from "./types.js";

@injectable()
export class IpcTaskService implements TaskService {
  async list(): Promise<TaskDefinition[]> {
    const response = await sendRequest({ type: "task-list" });
    if (response.type !== "ok") {
      throw new Error((response as { message: string }).message);
    }
    return response.data as TaskDefinition[];
  }

  async create(payload: Omit<TaskDefinition, "createdAt">): Promise<TaskDefinition> {
    const response = await sendRequest({ type: "task-create", payload });
    if (response.type !== "ok") {
      throw new Error((response as { message: string }).message);
    }
    return response.data as TaskDefinition;
  }

  async update(id: string, payload: Omit<TaskDefinition, "id" | "createdAt">): Promise<TaskDefinition> {
    const response = await sendRequest({ type: "task-update", payload: { id, ...payload } });
    if (response.type !== "ok") {
      throw new Error((response as { message: string }).message);
    }
    return response.data as TaskDefinition;
  }

  async delete(id: string): Promise<void> {
    const response = await sendRequest({ type: "task-delete", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Task delete failed");
    }
  }
}

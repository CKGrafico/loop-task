import type { TaskDefinition } from "../../types.js";
import { TaskManager } from "../managers/task-manager.js";
import { sendOk, sendError, sendNotFound, readBody } from "./helpers.js";
import type { RouteHandler } from "./helpers.js";

export function registerTaskRoutes(taskManager: TaskManager, r: (method: string, path: string, handler: RouteHandler) => void): void {
  r("GET", "/api/tasks", (_req, res) => {
    sendOk(res, taskManager.list());
  });

  r("GET", "/api/tasks/:id", (_req, res, params) => {
    const task = taskManager.get(params.id);
    if (!task) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res, task);
  });

  r("POST", "/api/tasks", async (req, res) => {
    try {
      const body = await readBody(req) as Omit<TaskDefinition, "createdAt">;
      if (!body.name?.trim()) {
        sendError(res, 400, "Task name is required");
        return;
      }
      if (!body.command?.trim()) {
        sendError(res, 400, "Task command is required");
        return;
      }
      const task = taskManager.create(body);
      sendOk(res, task, 201);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : String(err));
    }
  });

  r("PATCH", "/api/tasks/:id", async (req, res, params) => {
    try {
      const body = await readBody(req) as Omit<TaskDefinition, "id" | "createdAt">;
      const updated = taskManager.update(params.id, body);
      if (!updated) {
        sendNotFound(res, params.id);
        return;
      }
      sendOk(res, updated);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : String(err));
    }
  });

  r("DELETE", "/api/tasks/:id", (_req, res, params) => {
    if (!taskManager.delete(params.id)) {
      sendNotFound(res, params.id);
      return;
    }
    sendOk(res);
  });
}

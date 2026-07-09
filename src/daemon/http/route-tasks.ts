import type { TaskDefinition } from "../../types.js";
import { TaskManager } from "../managers/task-manager.js";
import { validateContext } from "../../core/context/validate-context.js";
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
      if (body.context !== undefined) {
        const result = validateContext(body.context);
        if (!result.valid) {
          sendError(res, 400, result.error);
          return;
        }
        body.context = result.context;
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
      if (body.context !== undefined) {
        const result = validateContext(body.context);
        if (!result.valid) {
          sendError(res, 400, result.error);
          return;
        }
        body.context = result.context;
      }
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

  r("POST", "/api/task-chains", async (req, res) => {
    try {
      const body = await readBody(req) as { tasks: Omit<TaskDefinition, "createdAt">[]; chain: "sequential-success" | "sequential-failure" | "none" };
      if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
        sendError(res, 400, "tasks array must not be empty");
        return;
      }
      if (body.chain && body.chain !== "sequential-success" && body.chain !== "sequential-failure" && body.chain !== "none") {
        sendError(res, 400, `Invalid chain mode: "${body.chain}". Must be "sequential-success", "sequential-failure", or "none"`);
        return;
      }
      for (const task of body.tasks) {
        if (!task.name?.trim()) {
          sendError(res, 400, "Each task must have a name");
          return;
        }
        if (!task.command?.trim()) {
          sendError(res, 400, "Each task must have a command");
          return;
        }
      }
      const created: TaskDefinition[] = [];
      try {
        for (const taskInput of body.tasks) {
          const task = taskManager.create(taskInput);
          created.push(task);
        }
        const chainMode = body.chain ?? "none";
        if (chainMode === "sequential-success") {
          for (let i = 0; i < created.length - 1; i++) {
            taskManager.update(created[i]!.id, {
              ...created[i]!,
              onSuccessTaskId: created[i + 1]!.id,
            });
          }
        } else if (chainMode === "sequential-failure") {
          for (let i = 0; i < created.length - 1; i++) {
            taskManager.update(created[i]!.id, {
              ...created[i]!,
              onFailureTaskId: created[i + 1]!.id,
            });
          }
        }
      } catch (err) {
        for (const task of created) {
          taskManager.delete(task.id);
        }
        sendError(res, 400, err instanceof Error ? err.message : String(err));
        return;
      }
      sendOk(res, { taskIds: created.map((t) => t.id) }, 201);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : String(err));
    }
  });
}

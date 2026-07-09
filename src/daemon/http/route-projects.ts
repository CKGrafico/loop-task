import { ProjectManager } from "../managers/project-manager.js";
import { sendOk, sendError, sendNotFound, readBody } from "./helpers.js";
import type { RouteHandler } from "./helpers.js";

export function registerProjectRoutes(projectManager: ProjectManager, r: (method: string, path: string, handler: RouteHandler) => void): void {
  r("GET", "/api/projects", (_req, res) => {
    sendOk(res, projectManager.getAll());
  });

  r("POST", "/api/projects", async (req, res) => {
    try {
      const body = await readBody(req) as { name?: string; color?: string; directory?: string; githubSource?: string };
      if (!body.name?.trim()) {
        sendError(res, 400, "Project name is required");
        return;
      }
      const project = projectManager.create(body.name.trim(), body.color ?? "#ffffff", body.directory, body.githubSource);
      sendOk(res, project, 201);
    } catch (err) {
      sendError(res, 400, err instanceof Error ? err.message : String(err));
    }
  });

  r("PATCH", "/api/projects/:id", async (req, res, params) => {
    try {
      const body = await readBody(req) as { name?: string; color?: string; directory?: string; githubSource?: string };
      if (!body.name?.trim()) {
        sendError(res, 400, "Project name is required");
        return;
      }
      projectManager.update(params.id, body.name.trim(), body.color, body.directory, body.githubSource);
      sendOk(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found")) {
        sendNotFound(res, params.id);
      } else {
        sendError(res, 400, msg);
      }
    }
  });

  r("DELETE", "/api/projects/:id", (_req, res, params) => {
    try {
      projectManager.delete(params.id);
      sendOk(res);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("not found") || msg.includes("system")) {
        sendError(res, 400, msg);
      } else {
        sendError(res, 500, msg);
      }
    }
  });
}

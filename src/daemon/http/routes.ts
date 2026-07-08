import { LoopManager } from "../managers/loop-manager.js";
import { TaskManager } from "../managers/task-manager.js";
import { ProjectManager } from "../managers/project-manager.js";
import type { RouteEntry, RouteHandler } from "./helpers.js";
import { SseClientSet } from "./sse.js";
import { registerLoopRoutes } from "./route-loops.js";
import { registerTaskRoutes } from "./route-tasks.js";
import { registerProjectRoutes } from "./route-projects.js";
import { registerMiscRoutes } from "./route-misc.js";

export interface RouteDeps {
  manager: LoopManager;
  taskManager: TaskManager;
  projectManager: ProjectManager;
  sseClients: SseClientSet;
}

export function registerRoutes(deps: RouteDeps): RouteEntry[] {
  const { manager, taskManager, projectManager, sseClients } = deps;
  const routes: RouteEntry[] = [];

  const r = (method: string, path: string, handler: RouteHandler): void => {
    const segments = path.split("/").filter((s) => s.length > 0);
    routes.push({ method, segments, handler });
  };

  registerLoopRoutes(manager, routes, r);
  registerTaskRoutes(taskManager, r);
  registerProjectRoutes(projectManager, r);
  registerMiscRoutes(sseClients, r);

  return routes;
}

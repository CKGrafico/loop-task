import { Container } from "inversify";
import { TYPES } from "../services/types.js";
import { IpcLoopService } from "../services/loop-service.js";
import { IpcTaskService } from "../services/task-service.js";
import { IpcProjectService } from "../services/project-service.js";
import { IpcLogService } from "../services/log-service.js";
import { IpcExportService } from "../services/export-service.js";
import type { LoopService, TaskService, ProjectService } from "../services/types.js";

export function createContainer(): Container {
  const container = new Container();
  container.bind<LoopService>(TYPES.LoopService).to(IpcLoopService);
  container.bind<TaskService>(TYPES.TaskService).to(IpcTaskService);
  container.bind<ProjectService>(TYPES.ProjectService).to(IpcProjectService);
  container.bind(TYPES.LogService).to(IpcLogService);

  container.bind(TYPES.ExportService).toDynamicValue(() => {
    const loopService = container.get<LoopService>(TYPES.LoopService);
    const taskService = container.get<TaskService>(TYPES.TaskService);
    const projectService = container.get<ProjectService>(TYPES.ProjectService);
    return new IpcExportService(loopService, taskService, projectService);
  });

  return container;
}

export const container = createContainer();

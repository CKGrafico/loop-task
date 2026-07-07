import { injectable } from "inversify";
import type { LoopMeta, TaskDefinition, Project } from "../../types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "../../config/paths.js";
import type { LoopService, TaskService, ProjectService, ExportService } from "./types.js";

@injectable()
export class IpcExportService implements ExportService {
  private loopService: LoopService;
  private taskService: TaskService;
  private projectService: ProjectService;

  constructor(loopService: LoopService, taskService: TaskService, projectService: ProjectService) {
    this.loopService = loopService;
    this.taskService = taskService;
    this.projectService = projectService;
  }

  async exportConfig(): Promise<{ json: string; filePath: string }> {
    const [loops, tasks, projects] = await Promise.all([
      this.loopService.list().catch(() => [] as LoopMeta[]),
      this.taskService.list().catch(() => [] as TaskDefinition[]),
      this.projectService.list().catch(() => [] as Project[]),
    ]);
    const exportData = {
      version: 2,
      exportedAt: new Date().toISOString(),
      loops,
      tasks,
      projects,
    };
    const json = JSON.stringify(exportData, null, 2);
    const dataDir = getDataDir();
    const exportsDir = path.join(dataDir, "exports");
    await fs.mkdir(exportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const filePath = path.join(exportsDir, `loop-export-${ts}.json`);
    await fs.writeFile(filePath, json, "utf-8");
    return { json, filePath };
  }
}

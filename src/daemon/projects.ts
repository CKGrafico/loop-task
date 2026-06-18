import type { Project } from "../types.js";
import fs from "node:fs";
import { writeFileAtomic } from "../shared/fs-utils.js";
import { homedir } from "node:os";
import { join } from "node:path";
import { daemonLog } from "./daemon-log.js";
import crypto from "node:crypto";

export class ProjectManager {
  private projects: Map<string, Project> = new Map();
  private projectsDir: string;

  constructor(loopCliHome?: string) {
    const baseDir = loopCliHome || join(homedir(), ".loop-cli");
    this.projectsDir = join(baseDir, "projects");
  }

  init(): void {
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
    this.loadProjects();
    if (!this.projects.has("default")) {
      this.createDefaultProject();
    }
  }

  private loadProjects(): void {
    this.projects.clear();
    if (!fs.existsSync(this.projectsDir)) return;
    try {
      const files = fs.readdirSync(this.projectsDir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        try {
          const raw = fs.readFileSync(join(this.projectsDir, file), "utf-8");
          const content = JSON.parse(raw) as Project;
          if (content.id) this.projects.set(content.id, content);
        } catch (err) {
          daemonLog(`Failed to load project ${file}: ${err}`);
        }
      }
    } catch (err) {
      daemonLog(`Failed to load projects directory: ${err}`);
    }
  }

  private saveProject(project: Project): void {
    const filePath = join(this.projectsDir, `${project.id}.json`);
    writeFileAtomic(filePath, JSON.stringify(project, null, 2));
    this.projects.set(project.id, project);
  }

  private createDefaultProject(): void {
    const defaultProject: Project = {
      id: "default",
      name: "Default",
      color: "#ffffff",
      createdAt: new Date().toISOString(),
      isSystem: true,
      isDefault: true,
    };
    this.saveProject(defaultProject);
  }

  getAll(): Project[] {
    return Array.from(this.projects.values());
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  create(name: string, color: string): Project {
    const id = crypto.randomBytes(4).toString("hex");
    const project: Project = {
      id,
      name,
      color,
      createdAt: new Date().toISOString(),
      isSystem: false,
      isDefault: false,
    };
    this.saveProject(project);
    return project;
  }

  update(id: string, name: string, color?: string): void {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project ${id} not found`);
    if (project.isSystem) throw new Error("Cannot rename system project");
    project.name = name;
    if (color) project.color = color;
    this.saveProject(project);
  }

  delete(id: string): void {
    const project = this.projects.get(id);
    if (!project) throw new Error(`Project ${id} not found`);
    if (project.isSystem) throw new Error("Cannot delete system project");
    const filePath = join(this.projectsDir, `${id}.json`);
    if (fs.existsSync(filePath)) fs.rmSync(filePath);
    this.projects.delete(id);
  }
}

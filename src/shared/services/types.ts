import type net from "node:net";
import type { LoopMeta, LoopOptions, TaskDefinition, Project } from "../../types.js";

export const TYPES = {
  LoopService: Symbol.for("LoopService"),
  TaskService: Symbol.for("TaskService"),
  ProjectService: Symbol.for("ProjectService"),
  LogService: Symbol.for("LogService"),
  ExportService: Symbol.for("ExportService"),
};

export interface LoopService {
  list(): Promise<LoopMeta[]>;
  create(options: LoopOptions, intervalHuman: string): Promise<string>;
  update(id: string, options: LoopOptions, intervalHuman: string): Promise<string>;
  pause(id: string): Promise<void>;
  resume(id: string): Promise<void>;
  stop(id: string): Promise<void>;
  play(id: string): Promise<void>;
  trigger(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface TaskService {
  list(): Promise<TaskDefinition[]>;
  create(payload: Omit<TaskDefinition, "createdAt">): Promise<TaskDefinition>;
  update(id: string, payload: Omit<TaskDefinition, "id" | "createdAt">): Promise<TaskDefinition>;
  delete(id: string): Promise<void>;
}

export interface ProjectService {
  list(): Promise<Project[]>;
  create(name: string, color: string, directory?: string, githubSource?: string): Promise<Project>;
  update(id: string, name: string, color?: string, directory?: string, githubSource?: string): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface LogService {
  fetchRunLog(id: string, runNumber: number): Promise<string>;
  streamRunLog(
    id: string,
    runNumber: number,
    onLine: (line: string) => void,
    onEnd: () => void,
    onError: (error: Error) => void,
  ): net.Socket;
  streamLogs(
    id: string,
    onLine: (line: string) => void,
    onError: (error: Error) => void,
  ): net.Socket;
}

export interface ExportService {
  exportConfig(): Promise<{ json: string; filePath: string }>;
}

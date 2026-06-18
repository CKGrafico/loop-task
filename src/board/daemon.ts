import type net from "node:net";
import type { LoopMeta, LoopOptions, TaskDefinition, Project } from "../types.js";
import { sendRequest, streamRequest } from "../client/ipc.js";
import { t } from "../i18n/index.js";
import { LOG_TAIL_DEFAULT } from "../config/constants.js";

function expectOk(message: string, type: string): asserts type is "ok" {
  if (type !== "ok") {
    throw new Error(message);
  }
}

export async function listLoops(): Promise<LoopMeta[]> {
  const response = await sendRequest({ type: "list" });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return response.data as LoopMeta[];
}

export async function pauseLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "pause", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.pauseFailed"), response.type);
}

export async function resumeLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "resume", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.resumeFailed"), response.type);
}

export async function stopLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "stop-loop", payload: { id } });
  expectOk((response as { message?: string }).message ?? "Stop failed", response.type);
}

export async function playLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "play-loop", payload: { id } });
  expectOk((response as { message?: string }).message ?? "Play failed", response.type);
}

export async function triggerLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "trigger", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.forceRunFailed"), response.type);
}

export async function deleteLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "delete", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.deleteFailed"), response.type);
}

export async function createLoop(
  options: LoopOptions,
  intervalHuman: string
): Promise<string> {
  const response = await sendRequest({
    type: "start",
    payload: { ...options, intervalHuman },
  });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return (response.data as { id: string }).id;
}

export async function updateLoop(
  id: string,
  options: LoopOptions,
  intervalHuman: string
): Promise<string> {
  const response = await sendRequest({
    type: "update",
    payload: { id, ...options, intervalHuman },
  });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return (response.data as { id: string }).id;
}

export function streamLogs(
  id: string,
  onLine: (line: string) => void,
  onError: (error: Error) => void
): net.Socket {
  return streamRequest(
    { type: "logs", payload: { id, follow: true, tail: LOG_TAIL_DEFAULT } },
    onLine,
    () => {},
    onError
  );
}

export async function fetchRunLog(id: string, runNumber: number): Promise<string> {
  const response = await sendRequest({ type: "run-log", payload: { id, runNumber } });
  if (response.type !== "ok") {
    throw new Error((response as { message?: string }).message ?? "Failed to fetch run log");
  }
  return (response.data as string) ?? "";
}

export function streamRunLog(
  id: string,
  runNumber: number,
  onLine: (line: string) => void,
  onEnd: () => void,
  onError: (error: Error) => void
): net.Socket {
  return streamRequest(
    { type: "run-log-stream", payload: { id, runNumber } },
    onLine,
    onEnd,
    onError
  );
}

export async function listTasks(): Promise<TaskDefinition[]> {
  const response = await sendRequest({ type: "task-list" });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return response.data as TaskDefinition[];
}

export async function createTask(payload: Omit<TaskDefinition, "createdAt">): Promise<TaskDefinition> {
  const response = await sendRequest({ type: "task-create", payload });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return response.data as TaskDefinition;
}

export async function updateTask(id: string, payload: Omit<TaskDefinition, "id" | "createdAt">): Promise<TaskDefinition> {
  const response = await sendRequest({ type: "task-update", payload: { id, ...payload } });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return response.data as TaskDefinition;
}

export async function deleteTask(id: string): Promise<void> {
  const response = await sendRequest({ type: "task-delete", payload: { id } });
  expectOk((response as { message?: string }).message ?? "Task delete failed", response.type);
}

export async function listProjects(): Promise<Project[]> {
  const response = await sendRequest({ type: "project-list" });
  if (response.type !== "ok") throw new Error((response as { message: string }).message);
  return response.data as Project[];
}

export async function createProject(name: string, color: string): Promise<Project> {
  const response = await sendRequest({ type: "project-create", payload: { name, color } });
  if (response.type !== "ok") throw new Error((response as { message: string }).message);
  return response.data as Project;
}

export async function updateProject(id: string, name: string, color?: string): Promise<void> {
  const response = await sendRequest({ type: "project-update", payload: { id, name, color } });
  expectOk((response as { message?: string }).message ?? t("project.error.updateFailed"), response.type);
}

export async function deleteProject(id: string): Promise<void> {
  const response = await sendRequest({ type: "project-delete", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("project.error.deleteFailed"), response.type);
}

import type { IpcRequest } from "../../../types.js";
import { send } from "../../ipc/send.js";
import { t } from "../../../shared/i18n/index.js";
import type { HandlerContext } from "./loop-handlers.js";

export function handleProjectList(
  _request: Extract<IpcRequest, { type: "project-list" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  send(socket, { type: "ok", data: ctx.manager.listProjects() });
}

export function handleProjectCreate(
  request: Extract<IpcRequest, { type: "project-create" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const { name, color, directory, githubSource } = request.payload;
  if (!name || !name.trim()) {
    send(socket, { type: "error", message: t("project.error.nameRequired") });
    return;
  }
  try {
    const project = ctx.manager.createProject(name.trim(), color, directory, githubSource);
    send(socket, { type: "ok", data: project });
  } catch (err) {
    send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

export function handleProjectUpdate(
  request: Extract<IpcRequest, { type: "project-update" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const { id, name, color, directory, githubSource } = request.payload;
  if (!name || !name.trim()) {
    send(socket, { type: "error", message: t("project.error.nameEmpty") });
    return;
  }
  try {
    ctx.manager.updateProject(id, name.trim(), color, directory, githubSource);
    send(socket, { type: "ok" });
  } catch (err) {
    send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

export function handleProjectDelete(
  request: Extract<IpcRequest, { type: "project-delete" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  try {
    ctx.manager.deleteProject(request.payload.id);
    send(socket, { type: "ok" });
  } catch (err) {
    send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

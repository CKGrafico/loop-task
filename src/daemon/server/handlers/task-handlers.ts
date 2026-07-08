import type { IpcRequest } from "../../../types.js";
import { send } from "../../ipc/send.js";
import type { HandlerContext } from "./loop-handlers.js";
import type { TaskManager } from "../../managers/task-manager.js";

export interface TaskHandlerContext extends HandlerContext {
  taskManager: TaskManager;
}

export function handleTaskCreate(
  request: Extract<IpcRequest, { type: "task-create" }>,
  socket: import("node:net").Socket,
  ctx: TaskHandlerContext
): void {
  const task = ctx.taskManager.create(request.payload);
  send(socket, { type: "ok", data: task });
}

export function handleTaskUpdate(
  request: Extract<IpcRequest, { type: "task-update" }>,
  socket: import("node:net").Socket,
  ctx: TaskHandlerContext
): void {
  const updated = ctx.taskManager.update(request.payload.id, request.payload);
  ctx.respondOk(socket, updated !== null, request.payload.id, updated ?? undefined);
}

export function handleTaskList(
  _request: Extract<IpcRequest, { type: "task-list" }>,
  socket: import("node:net").Socket,
  ctx: TaskHandlerContext
): void {
  send(socket, { type: "ok", data: ctx.taskManager.list() });
}

export function handleTaskGet(
  request: Extract<IpcRequest, { type: "task-get" }>,
  socket: import("node:net").Socket,
  ctx: TaskHandlerContext
): void {
  const task = ctx.taskManager.get(request.payload.id);
  ctx.respondOk(socket, task !== null, request.payload.id, task ?? undefined);
}

export function handleTaskDelete(
  request: Extract<IpcRequest, { type: "task-delete" }>,
  socket: import("node:net").Socket,
  ctx: TaskHandlerContext
): void {
  const ok = ctx.taskManager.delete(request.payload.id);
  ctx.respondOk(socket, ok, request.payload.id);
}

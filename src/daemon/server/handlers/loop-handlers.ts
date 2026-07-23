import type { IpcRequest } from "../../../types.js";
import type { LoopManager } from "../../managers/loop-manager.js";
import type { TelemetryManager } from "../../telemetry/telemetry-manager.js";
import { send } from "../../ipc/send.js";
import { t } from "../../../shared/i18n/index.js";

export interface HandlerContext {
  manager: LoopManager;
  telemetryManager: TelemetryManager;
  respondOk(socket: import("node:net").Socket, ok: boolean, id: string, data?: unknown): void;
}

export function handleStart(
  request: Extract<IpcRequest, { type: "start" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const { intervalHuman, ...options } = request.payload;
  const id = ctx.manager.start(options, intervalHuman);
  send(socket, { type: "ok", data: { id } });
}

export async function handleUpdate(
  request: Extract<IpcRequest, { type: "update" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): Promise<void> {
  const { id, intervalHuman, ...options } = request.payload;
  try {
    const ok = await ctx.manager.update(id, options, intervalHuman);
    ctx.respondOk(socket, ok, id, ok ? { id } : undefined);
  } catch (err) {
    send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

export function handleList(
  _request: Extract<IpcRequest, { type: "list" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  send(socket, { type: "ok", data: ctx.manager.list() });
}

export function handleStatus(
  request: Extract<IpcRequest, { type: "status" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const meta = ctx.manager.status(request.payload.id);
  ctx.respondOk(socket, meta !== null, request.payload.id, meta ?? undefined);
}

export function handlePause(
  request: Extract<IpcRequest, { type: "pause" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  ctx.respondOk(socket, ctx.manager.pause(request.payload.id), request.payload.id);
}

export function handleResume(
  request: Extract<IpcRequest, { type: "resume" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  ctx.respondOk(socket, ctx.manager.resume(request.payload.id), request.payload.id);
}

export async function handleStopLoop(
  request: Extract<IpcRequest, { type: "stop-loop" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): Promise<void> {
  ctx.respondOk(socket, await ctx.manager.stopLoop(request.payload.id), request.payload.id);
}

export async function handleStopAll(
  _request: Extract<IpcRequest, { type: "stop-all" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): Promise<void> {
  const count = await ctx.manager.stopAllLoops();
  send(socket, { type: "ok", data: count });
}

export function handlePlayLoop(
  request: Extract<IpcRequest, { type: "play-loop" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  if (ctx.manager.isMaxRunsBlocked(request.payload.id)) {
    send(socket, { type: "error", message: t("errors.maxRunsReached") });
    return;
  }
  ctx.respondOk(socket, ctx.manager.playLoop(request.payload.id), request.payload.id);
}

export function handleTrigger(
  request: Extract<IpcRequest, { type: "trigger" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  if (ctx.manager.isMaxRunsBlocked(request.payload.id)) {
    send(socket, { type: "error", message: t("errors.maxRunsReached") });
    return;
  }
  if (ctx.manager.isRunning(request.payload.id)) {
    send(socket, { type: "error", message: t("errors.triggerWhileRunning") });
    return;
  }
  ctx.respondOk(socket, ctx.manager.trigger(request.payload.id), request.payload.id);
}

export async function handleDelete(
  request: Extract<IpcRequest, { type: "delete" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): Promise<void> {
  try {
    const ok = await ctx.manager.delete(request.payload.id);
    ctx.respondOk(socket, ok, request.payload.id);
  } catch (err) {
    send(socket, { type: "error", message: err instanceof Error ? err.message : String(err) });
  }
}

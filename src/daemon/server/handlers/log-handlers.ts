import fs from "node:fs";
import type { IpcRequest } from "../../../types.js";
import { send } from "../../ipc/send.js";
import { t } from "../../../shared/i18n/index.js";
import { LOG_TAIL_DEFAULT, MAX_STREAM_INITIAL_BYTES } from "../../../shared/config/constants.js";
import { tailFileBounded, readByteRange, IncrementalFileWatcher } from "../../../core/logging/bounded-log-reader.js";
import type { HandlerContext } from "./loop-handlers.js";

export function handleRunLog(
  request: Extract<IpcRequest, { type: "run-log" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const { id, runNumber } = request.payload;
  const logPath = ctx.manager.getLogPath(id);
  if (!logPath || !fs.existsSync(logPath)) {
    send(socket, { type: "ok", data: "" });
    return;
  }

  const meta = ctx.manager.status(id);
  if (!meta) {
    send(socket, { type: "ok", data: "" });
    return;
  }

  const records = meta.runHistory
    .filter((r) => r.runNumber === runNumber)
    .sort((a, b) => a.logOffset - b.logOffset);

  if (records.length === 0) {
    send(socket, { type: "ok", data: "" });
    return;
  }

  const allSorted = meta.runHistory.slice().sort((a, b) => a.logOffset - b.logOffset);

  const parts = records.map((record) => {
    const start = record.logOffset;
    const idx = allSorted.indexOf(record);
    const end = idx < allSorted.length - 1 ? allSorted[idx + 1].logOffset : undefined;
    return readByteRange(logPath, start, end);
  });

  send(socket, { type: "ok", data: parts.join("") });
}

export function handleRunLogStream(
  request: Extract<IpcRequest, { type: "run-log-stream" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const { id, runNumber } = request.payload;
  const meta = ctx.manager.status(id);
  if (!meta) {
    send(socket, { type: "error", message: t("errors.loopNotFound", { id }) });
    return;
  }
  const records = meta.runHistory
    .filter((r) => r.runNumber === runNumber)
    .sort((a, b) => a.logOffset - b.logOffset);
  if (records.length === 0) {
    send(socket, { type: "ok", data: "" });
    return;
  }

  const logPath = ctx.manager.getLogPath(id);
  if (!logPath || !fs.existsSync(logPath)) {
    send(socket, { type: "ok", data: "" });
    return;
  }

  const firstOffset = records[0].logOffset;
  const stat = fs.statSync(logPath);

  if (stat.size > firstOffset) {
    const data = readByteRange(logPath, firstOffset, Math.min(stat.size, firstOffset + MAX_STREAM_INITIAL_BYTES));
    for (const line of data.split("\n")) {
      if (line) {
        send(socket, { type: "data", line });
      }
    }
  }

  const allCompleted = records.every((r) => r.status === "completed");
  if (allCompleted) {
    send(socket, { type: "end" });
    return;
  }

  const watcher = new IncrementalFileWatcher({
    logPath,
    initialOffset: stat.size,
    onLines: (lines) => {
      for (const line of lines) {
        send(socket, { type: "data", line });
      }
    },
    onEnd: () => send(socket, { type: "end" }),
    onError: () => send(socket, { type: "end" }),
  });

  watcher.start();

  socket.on("close", () => watcher.close());
  socket.on("error", () => watcher.close());
}

export function handleLogs(
  request: Extract<IpcRequest, { type: "attach" | "logs" }>,
  socket: import("node:net").Socket,
  ctx: HandlerContext
): void {
  const id = request.payload.id;
  const logPath = ctx.manager.getLogPath(id);
  if (!logPath) {
    send(socket, { type: "error", message: t("errors.loopNotFound", { id }) });
    return;
  }

  if (!fs.existsSync(logPath)) {
    if (request.type === "logs") {
      send(socket, { type: "ok", data: "" });
    } else {
      send(socket, { type: "error", message: t("errors.noLogsYet") });
    }
    return;
  }

  const follow = request.type === "attach" || (request.type === "logs" && request.payload.follow);
  const tailCount = request.type === "logs" ? (request.payload.tail ?? LOG_TAIL_DEFAULT) : 0;

  if (follow) {
    streamLogFollowBounded(logPath, socket, tailCount);
  } else {
    const lines = tailFileBounded(logPath, tailCount);
    send(socket, { type: "ok", data: lines.join("\n") });
  }
}

function streamLogFollowBounded(
  logPath: string,
  socket: import("node:net").Socket,
  tailCount: number,
): void {
  if (fs.existsSync(logPath)) {
    const lines = tailFileBounded(logPath, tailCount);
    for (const line of lines) {
      if (line) {
        send(socket, { type: "data", line });
      }
    }
  }

  const initialOffset = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

  const watcher = new IncrementalFileWatcher({
    logPath,
    initialOffset,
    onLines: (lines) => {
      for (const line of lines) {
        send(socket, { type: "data", line });
      }
    },
    onEnd: () => send(socket, { type: "end" }),
    onError: () => send(socket, { type: "end" }),
  });

  watcher.start();

  socket.on("close", () => watcher.close());
  socket.on("error", () => watcher.close());
}

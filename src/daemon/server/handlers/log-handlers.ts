import fs from "node:fs";
import type { IpcRequest } from "../../../types.js";
import { send } from "../../ipc/send.js";
import { t } from "../../../shared/i18n/index.js";
import { LOG_TAIL_DEFAULT } from "../../../shared/config/constants.js";
import { tail } from "../../../shared/tail.js";
import { streamLogFollow } from "../../ipc/logs-stream.js";
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

  const buffer = fs.readFileSync(logPath);
  const allSorted = meta.runHistory.slice().sort((a, b) => a.logOffset - b.logOffset);

  const parts = records.map((record) => {
    const start = record.logOffset;
    const idx = allSorted.indexOf(record);
    const end = idx < allSorted.length - 1 ? allSorted[idx + 1].logOffset : buffer.length;
    return buffer.toString("utf-8", start, end);
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
    const fd = fs.openSync(logPath, "r");
    const buf = Buffer.alloc(stat.size - firstOffset);
    fs.readSync(fd, buf, 0, buf.length, firstOffset);
    fs.closeSync(fd);
    for (const line of buf.toString().split("\n")) {
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

  let fileSize = stat.size;

  const watcher = fs.watch(logPath, (eventType) => {
    if (eventType === "rename" && !fs.existsSync(logPath)) {
      watcher.close();
      send(socket, { type: "end" });
      return;
    }

    if (eventType === "change") {
      try {
        const s = fs.statSync(logPath);
        if (s.size > fileSize) {
          const fd = fs.openSync(logPath, "r");
          const buf = Buffer.alloc(s.size - fileSize);
          fs.readSync(fd, buf, 0, buf.length, fileSize);
          fs.closeSync(fd);
          fileSize = s.size;
          for (const line of buf.toString().split("\n")) {
            if (line) {
              send(socket, { type: "data", line });
            }
          }
        }
      } catch {
        watcher.close();
        send(socket, { type: "end" });
      }
    }
  });

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
    streamLogFollow(logPath, socket, tailCount);
  } else {
    const content = fs.readFileSync(logPath, "utf-8");
    send(socket, { type: "ok", data: tail(content, tailCount).join("\n") });
  }
}

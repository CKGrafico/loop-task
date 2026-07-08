import net from "node:net";
import fs from "node:fs";
import { send } from "./send.js";
import { tail } from "../../shared/tail.js";

const TAIL_WINDOW_BYTES = 64 * 1024;

function readInitialTail(logPath: string, tailCount: number): string[] {
  const size = fs.statSync(logPath).size;
  if (tailCount <= 0 || size <= TAIL_WINDOW_BYTES) {
    return tail(fs.readFileSync(logPath, "utf-8"), tailCount);
  }

  const fd = fs.openSync(logPath, "r");
  const buf = Buffer.alloc(TAIL_WINDOW_BYTES);
  fs.readSync(fd, buf, 0, TAIL_WINDOW_BYTES, size - TAIL_WINDOW_BYTES);
  fs.closeSync(fd);

  const windowLines = buf.toString("utf-8").split("\n");
  windowLines.shift();
  if (windowLines.length >= tailCount) {
    return windowLines.slice(-tailCount);
  }
  return tail(fs.readFileSync(logPath, "utf-8"), tailCount);
}

export function streamLogFollow(
  logPath: string,
  socket: net.Socket,
  tailCount: number
): void {
  if (fs.existsSync(logPath)) {
    for (const line of readInitialTail(logPath, tailCount)) {
      if (line) {
        send(socket, { type: "data", line });
      }
    }
  }

  let fileSize = fs.existsSync(logPath) ? fs.statSync(logPath).size : 0;

  const watcher = fs.watch(logPath, (eventType) => {
    if (eventType === "rename" && !fs.existsSync(logPath)) {
      watcher.close();
      send(socket, { type: "end" });
      return;
    }

    if (eventType === "change") {
      try {
        const stat = fs.statSync(logPath);
        if (stat.size > fileSize) {
          const fd = fs.openSync(logPath, "r");
          const buf = Buffer.alloc(stat.size - fileSize);
          fs.readSync(fd, buf, 0, buf.length, fileSize);
          fs.closeSync(fd);
          fileSize = stat.size;
          const newContent = buf.toString();
          for (const line of newContent.split("\n")) {
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

  socket.on("close", () => {
    watcher.close();
  });

  socket.on("error", () => {
    watcher.close();
  });
}

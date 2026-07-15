import net from "node:net";
import fs from "node:fs";
import { send } from "./send.js";
import { tailFileBounded, IncrementalFileWatcher } from "../../core/logging/bounded-log-reader.js";

export function streamLogFollow(
  logPath: string,
  socket: net.Socket,
  tailCount: number
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

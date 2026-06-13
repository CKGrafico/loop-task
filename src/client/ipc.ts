import net from "node:net";
import type { IpcRequest, IpcResponse } from "../types.js";
import { ensureDaemon, getSocket } from "../daemon/spawner.js";

export async function sendRequest(request: IpcRequest): Promise<IpcResponse> {
  ensureDaemon();
  const socketPath = getSocket();

  return new Promise((resolve, reject) => {
    let resolved = false;
    const socket = net.createConnection(socketPath, () => {
      socket.write(JSON.stringify(request) + "\n");
    });

    let buffer = "";

    socket.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim() && !resolved) {
          try {
            const response = JSON.parse(line) as IpcResponse;
            resolved = true;
            socket.destroy();
            resolve(response);
          } catch {
            resolved = true;
            socket.destroy();
            reject(new Error("Invalid response from daemon"));
          }
        }
      }
    });

    socket.on("close", () => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Connection closed before response"));
      }
    });

    socket.on("error", (err) => {
      if (!resolved) {
        resolved = true;
        reject(new Error(`Cannot connect to daemon: ${err.message}`));
      }
    });

    socket.setTimeout(10000, () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
        reject(new Error("Daemon request timed out"));
      }
    });
  });
}

export function streamRequest(
  request: IpcRequest,
  onLine: (line: string) => void,
  onEnd: () => void,
  onError: (err: Error) => void
): net.Socket {
  ensureDaemon();
  const socketPath = getSocket();

  const socket = net.createConnection(socketPath, () => {
    socket.write(JSON.stringify(request) + "\n");
  });

  let buffer = "";

  socket.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line) as IpcResponse;
          if (response.type === "data") {
            onLine(response.line);
          } else if (response.type === "error") {
            onError(new Error(response.message));
            socket.destroy();
          } else if (response.type === "end") {
            onEnd();
            socket.destroy();
          }
        } catch {
          onError(new Error("Invalid response from daemon"));
          socket.destroy();
        }
      }
    }
  });

  socket.on("error", (err) => {
    onError(new Error(`Cannot connect to daemon: ${err.message}`));
  });

  socket.on("close", () => {
    onEnd();
  });

  return socket;
}

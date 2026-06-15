import type net from "node:net";
import type { IpcResponse } from "../types.js";

export function send(socket: net.Socket, message: IpcResponse): void {
  if (!socket.destroyed) {
    socket.write(JSON.stringify(message) + "\n");
  }
}

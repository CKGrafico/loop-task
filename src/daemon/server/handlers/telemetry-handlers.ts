import type net from "node:net";
import type { IpcRequest } from "../../../types.js";
import type { TelemetryManager } from "../../telemetry/telemetry-manager.js";
import { send } from "../../ipc/send.js";

export async function handleTelemetryTest(
  _request: Extract<IpcRequest, { type: "telemetry-test" }>,
  socket: net.Socket,
  telemetryManager: TelemetryManager,
): Promise<void> {
  const result = await telemetryManager.testConnection();
  send(socket, { type: "ok", data: result });
}

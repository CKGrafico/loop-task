import type { IpcRequest } from "../../../types.js";
import type { SettingsManager } from "../../settings-manager.js";
import { send } from "../../ipc/send.js";

export async function handleSettingsGet(
  _request: Extract<IpcRequest, { type: "settings-get" }>,
  socket: import("node:net").Socket,
  settingsManager: SettingsManager,
): Promise<void> {
  send(socket, { type: "ok", data: settingsManager.get() });
}

export async function handleSettingsSet(
  request: Extract<IpcRequest, { type: "settings-set" }>,
  socket: import("node:net").Socket,
  settingsManager: SettingsManager,
): Promise<void> {
  const updated = settingsManager.set(request.settings);
  send(socket, { type: "ok", data: updated });
}

import { injectable } from "inversify";
import type { DaemonSettings } from "../../types.js";
import { sendRequest } from "../../client/ipc.js";
import type { SettingsService } from "./types.js";

@injectable()
export class IpcSettingsService implements SettingsService {
  async getHttpApiEnabled(): Promise<boolean> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    return (response.data as DaemonSettings).httpApiEnabled;
  }

  async setHttpApiEnabled(enabled: boolean): Promise<DaemonSettings> {
    const response = await sendRequest({ type: "settings-set", settings: { httpApiEnabled: enabled } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to set settings");
    }
    return response.data as DaemonSettings;
  }

  async getMcpApiEnabled(): Promise<boolean> {
    const response = await sendRequest({ type: "settings-get" });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to get settings");
    }
    return (response.data as DaemonSettings).mcpApiEnabled;
  }

  async setMcpApiEnabled(enabled: boolean): Promise<DaemonSettings> {
    const response = await sendRequest({ type: "settings-set", settings: { mcpApiEnabled: enabled } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to set settings");
    }
    return response.data as DaemonSettings;
  }
}

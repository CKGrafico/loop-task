import { injectable } from "inversify";
import type { LoopMeta, LoopOptions } from "../../types.js";
import { sendRequest } from "../../client/ipc.js";
import { t } from "../i18n/index.js";
import type { LoopService } from "./types.js";

@injectable()
export class IpcLoopService implements LoopService {
  async list(): Promise<LoopMeta[]> {
    const response = await sendRequest({ type: "list" });
    if (response.type !== "ok") {
      throw new Error((response as { message: string }).message);
    }
    return response.data as LoopMeta[];
  }

  async create(options: LoopOptions, intervalHuman: string): Promise<string> {
    const response = await sendRequest({
      type: "start",
      payload: { ...options, intervalHuman },
    });
    if (response.type !== "ok") {
      throw new Error((response as { message: string }).message);
    }
    return (response.data as { id: string }).id;
  }

  async update(id: string, options: LoopOptions, intervalHuman: string): Promise<string> {
    const response = await sendRequest({
      type: "update",
      payload: { id, ...options, intervalHuman },
    });
    if (response.type !== "ok") {
      throw new Error((response as { message: string }).message);
    }
    return (response.data as { id: string }).id;
  }

  async pause(id: string): Promise<void> {
    const response = await sendRequest({ type: "pause", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? t("errors.pauseFailed"));
    }
  }

  async resume(id: string): Promise<void> {
    const response = await sendRequest({ type: "resume", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? t("errors.resumeFailed"));
    }
  }

  async stop(id: string): Promise<void> {
    const response = await sendRequest({ type: "stop-loop", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Stop failed");
    }
  }

  async play(id: string): Promise<void> {
    const response = await sendRequest({ type: "play-loop", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Play failed");
    }
  }

  async trigger(id: string): Promise<void> {
    const response = await sendRequest({ type: "trigger", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? t("errors.forceRunFailed"));
    }
  }

  async delete(id: string): Promise<void> {
    const response = await sendRequest({ type: "delete", payload: { id } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? t("errors.deleteFailed"));
    }
  }
}

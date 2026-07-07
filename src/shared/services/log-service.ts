import { injectable } from "inversify";
import type net from "node:net";
import { sendRequest, streamRequest } from "../../client/ipc.js";
import { LOG_TAIL_DEFAULT } from "../../config/constants.js";
import type { LogService } from "./types.js";

@injectable()
export class IpcLogService implements LogService {
  async fetchRunLog(id: string, runNumber: number): Promise<string> {
    const response = await sendRequest({ type: "run-log", payload: { id, runNumber } });
    if (response.type !== "ok") {
      throw new Error((response as { message?: string }).message ?? "Failed to fetch run log");
    }
    return (response.data as string) ?? "";
  }

  streamRunLog(
    id: string,
    runNumber: number,
    onLine: (line: string) => void,
    onEnd: () => void,
    onError: (error: Error) => void,
  ): net.Socket {
    return streamRequest(
      { type: "run-log-stream", payload: { id, runNumber } },
      onLine,
      onEnd,
      onError,
    );
  }

  streamLogs(
    id: string,
    onLine: (line: string) => void,
    onError: (error: Error) => void,
  ): net.Socket {
    return streamRequest(
      { type: "logs", payload: { id, follow: true, tail: LOG_TAIL_DEFAULT } },
      onLine,
      () => {},
      onError,
    );
  }
}

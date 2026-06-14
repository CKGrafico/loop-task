import type net from "node:net";
import type { LoopMeta, LoopOptions } from "../types.js";
import { sendRequest, streamRequest } from "../client/ipc.js";

function expectOk(message: string, type: string): asserts type is "ok" {
  if (type !== "ok") {
    throw new Error(message);
  }
}

export async function listLoops(): Promise<LoopMeta[]> {
  const response = await sendRequest({ type: "list" });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return response.data as LoopMeta[];
}

export async function pauseLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "pause", payload: { id } });
  expectOk((response as { message?: string }).message ?? "pause failed", response.type);
}

export async function resumeLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "resume", payload: { id } });
  expectOk((response as { message?: string }).message ?? "resume failed", response.type);
}

export async function deleteLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "delete", payload: { id } });
  expectOk((response as { message?: string }).message ?? "delete failed", response.type);
}

export async function createLoop(
  options: LoopOptions,
  intervalHuman: string
): Promise<string> {
  const response = await sendRequest({
    type: "start",
    payload: { ...options, intervalHuman },
  });
  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }
  return (response.data as { id: string }).id;
}

export function streamLogs(
  id: string,
  onLine: (line: string) => void,
  onError: (error: Error) => void
): net.Socket {
  return streamRequest(
    { type: "logs", payload: { id, follow: true, tail: 50 } },
    onLine,
    () => {},
    onError
  );
}

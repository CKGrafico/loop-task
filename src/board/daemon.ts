import type net from "node:net";
import type { LoopMeta, LoopOptions } from "../types.js";
import { sendRequest, streamRequest } from "../client/ipc.js";
import { t } from "../i18n/index.js";
import { LOG_TAIL_DEFAULT } from "../config/constants.js";

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
  expectOk((response as { message?: string }).message ?? t("errors.pauseFailed"), response.type);
}

export async function resumeLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "resume", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.resumeFailed"), response.type);
}

export async function triggerLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "trigger", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.forceRunFailed"), response.type);
}

export async function deleteLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "delete", payload: { id } });
  expectOk((response as { message?: string }).message ?? t("errors.deleteFailed"), response.type);
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

export async function updateLoop(
  id: string,
  options: LoopOptions,
  intervalHuman: string
): Promise<string> {
  const response = await sendRequest({
    type: "update",
    payload: { id, ...options, intervalHuman },
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
    { type: "logs", payload: { id, follow: true, tail: LOG_TAIL_DEFAULT } },
    onLine,
    () => {},
    onError
  );
}

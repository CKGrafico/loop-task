import fs from "node:fs";
import { getBoardLogFile, getDataDir } from "../config/paths.js";

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.stack ?? `${error.name}: ${error.message}`;
  }
  return typeof error === "string" ? error : JSON.stringify(error);
}

export function boardLog(message: string, error?: unknown): void {
  try {
    fs.mkdirSync(getDataDir(), { recursive: true });
    const suffix = error === undefined ? "" : `\n${formatError(error)}\n`;
    fs.appendFileSync(getBoardLogFile(), `${new Date().toISOString()} ${message}${suffix}`);
  } catch {
    // best effort crash logging only
  }
}

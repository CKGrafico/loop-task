import fs from "node:fs";
import { getDataDir, getDaemonLogFile } from "../shared/config/paths.js";

export function daemonLog(message: string): void {
  try {
    fs.mkdirSync(getDataDir(), { recursive: true });
    fs.appendFileSync(getDaemonLogFile(), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // operational logging is best effort
  }
}

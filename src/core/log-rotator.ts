import fs from "node:fs";
import { MAX_LOG_BYTES, MAX_LOG_GENERATIONS } from "../config/constants.js";

export function rotateLogIfNeeded(
  logPath: string,
  currentStream: fs.WriteStream | null
): fs.WriteStream | null {
  if (!fs.existsSync(logPath)) {
    return currentStream;
  }

  const size = fs.statSync(logPath).size;
  if (size < MAX_LOG_BYTES) {
    return currentStream;
  }

  currentStream?.end();

  for (let index = MAX_LOG_GENERATIONS; index >= 1; index--) {
    const currentPath = `${logPath}.${index}`;
    if (!fs.existsSync(currentPath)) {
      continue;
    }

    if (index === MAX_LOG_GENERATIONS) {
      fs.unlinkSync(currentPath);
      continue;
    }

    fs.renameSync(currentPath, `${logPath}.${index + 1}`);
  }

  fs.renameSync(logPath, `${logPath}.1`);
  return fs.createWriteStream(logPath, { flags: "a" });
}

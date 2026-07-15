import fs from "node:fs";
import { Writable } from "node:stream";
import { MAX_LOG_BYTES, MAX_LOG_GENERATIONS } from "../../shared/config/constants.js";
import { RotatingWriteStream } from "./rotating-log-stream.js";

export function rotateLogIfNeeded(
  logPath: string,
  currentStream: Writable | null
): Writable | null {
  if (!fs.existsSync(logPath)) {
    return currentStream;
  }

  const size = fs.statSync(logPath).size;
  if (size < MAX_LOG_BYTES) {
    return currentStream;
  }

  if (currentStream instanceof RotatingWriteStream) {
    currentStream.end();
  } else {
    currentStream?.end();
  }

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
  return RotatingWriteStream.create(logPath);
}

export function createLogStream(logPath: string): RotatingWriteStream {
  return RotatingWriteStream.create(logPath);
}

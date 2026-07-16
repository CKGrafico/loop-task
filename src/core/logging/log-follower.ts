import { IncrementalFileWatcher } from "./bounded-log-reader.js";
import { FOLLOW_READ_BATCH_BYTES } from "../../shared/config/constants.js";

export interface FollowDestination {
  write(chunk: string): boolean;
  once(event: "drain", listener: () => void): unknown;
  destroyed?: boolean;
}

export interface FollowLogOptions {
  logPath: string;
  initialOffset: number;
  dest: FollowDestination;
  formatLine: (line: string) => string;
  onEnd: () => void;
  onError: (err: Error) => void;
}

export function followLogFile(options: FollowLogOptions): IncrementalFileWatcher {
  const { logPath, initialOffset, dest, formatLine, onEnd, onError } = options;
  const watcher = new IncrementalFileWatcher({
    logPath,
    initialOffset,
    readBatchBytes: FOLLOW_READ_BATCH_BYTES,
    onLines: (lines) => {
      if (dest.destroyed) return;
      let writable = true;
      for (const line of lines) {
        writable = dest.write(formatLine(line));
      }
      if (!writable) {
        watcher.pause();
        dest.once("drain", () => watcher.resume());
      }
    },
    onEnd,
    onError,
  });
  watcher.start();
  return watcher;
}

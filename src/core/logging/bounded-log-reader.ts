import fs from "node:fs";

const DEFAULT_TAIL_WINDOW = 64 * 1024;
const INCREMENTAL_READ_CHUNK = 64 * 1024;
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024;

export function tailFileBounded(
  logPath: string,
  lineCount: number,
  windowBytes: number = DEFAULT_TAIL_WINDOW,
): string[] {
  if (!fs.existsSync(logPath)) return [];

  const size = fs.statSync(logPath).size;
  if (size === 0) return [];

  if (lineCount <= 0) {
    const data = readBounded(logPath, 0, Math.min(size, MAX_RESPONSE_BYTES));
    return splitLines(data);
  }

  const readSize = Math.min(windowBytes, size);
  const offset = size - readSize;
  const fd = fs.openSync(logPath, "r");
  const buf = Buffer.allocUnsafe(readSize);
  let bytesRead: number;
  try {
    bytesRead = fs.readSync(fd, buf, 0, readSize, offset);
  } finally {
    fs.closeSync(fd);
  }

  const text = buf.toString("utf-8", 0, bytesRead);
  const lines = text.split("\n").filter((l) => l.length > 0);

  return lines.slice(-lineCount);
}

export function readByteRange(
  logPath: string,
  start: number,
  end: number | undefined,
): string {
  if (!fs.existsSync(logPath)) return "";

  const size = fs.statSync(logPath).size;
  if (size === 0 || start >= size) return "";

  const effectiveEnd = end ?? size;
  const readEnd = Math.min(effectiveEnd, size);
  const readLen = Math.min(readEnd - start, MAX_RESPONSE_BYTES);

  if (readLen <= 0) return "";

  const fd = fs.openSync(logPath, "r");
  const buf = Buffer.allocUnsafe(readLen);
  let bytesRead: number;
  try {
    bytesRead = fs.readSync(fd, buf, 0, readLen, start);
  } finally {
    fs.closeSync(fd);
  }

  return buf.toString("utf-8", 0, bytesRead);
}

export function readBounded(
  logPath: string,
  offset: number,
  maxBytes: number = MAX_RESPONSE_BYTES,
): string {
  if (!fs.existsSync(logPath)) return "";

  const size = fs.statSync(logPath).size;
  if (size === 0 || offset >= size) return "";

  const readLen = Math.min(size - offset, maxBytes);
  const fd = fs.openSync(logPath, "r");
  const buf = Buffer.allocUnsafe(readLen);
  let bytesRead: number;
  try {
    bytesRead = fs.readSync(fd, buf, 0, readLen, offset);
  } finally {
    fs.closeSync(fd);
  }

  return buf.toString("utf-8", 0, bytesRead);
}

export function readIncremental(
  logPath: string,
  fromOffset: number,
  highWaterMark: number = INCREMENTAL_READ_CHUNK,
  maxTotalBytes: number = MAX_RESPONSE_BYTES,
): { lines: string[]; newOffset: number } {
  if (!fs.existsSync(logPath)) return { lines: [], newOffset: fromOffset };

  const size = fs.statSync(logPath).size;
  if (size <= fromOffset) return { lines: [], newOffset: fromOffset };

  const totalToRead = Math.min(size - fromOffset, maxTotalBytes);
  const fd = fs.openSync(logPath, "r");

  try {
    const chunks: Buffer[] = [];
    let totalRead = 0;
    let currentOffset = fromOffset;

    while (totalRead < totalToRead) {
      const chunkSize = Math.min(highWaterMark, totalToRead - totalRead);
      const buf = Buffer.allocUnsafe(chunkSize);
      const bytesRead = fs.readSync(fd, buf, 0, chunkSize, currentOffset);
      if (bytesRead === 0) break;
      chunks.push(bytesRead < chunkSize ? buf.subarray(0, bytesRead) : buf);
      totalRead += bytesRead;
      currentOffset += bytesRead;
    }

    if (chunks.length === 0) {
      return { lines: [], newOffset: fromOffset };
    }

    const text = chunks.length === 1
      ? chunks[0].toString("utf-8")
      : Buffer.concat(chunks, totalRead).toString("utf-8");

    return { lines: splitLines(text), newOffset: fromOffset + totalRead };
  } finally {
    fs.closeSync(fd);
  }
}

export interface FileWatcherOptions {
  logPath: string;
  initialOffset: number;
  onLines: (lines: string[]) => void;
  onEnd: () => void;
  onError: (err: Error) => void;
  reattachDelayMs?: number;
  maxReattachAttempts?: number;
  readBatchBytes?: number;
  pollIntervalMs?: number;
}

const DEFAULT_REATTACH_DELAY_MS = 25;
const DEFAULT_MAX_REATTACH_ATTEMPTS = 40;
const DEFAULT_POLL_INTERVAL_MS = 100;

// Follows a log file across rotations. fs.watch tracks the inode on Linux,
// so a rotation rename silently detaches the watch — and during the rotation
// window the path briefly does not exist. Both cases re-attach to the path
// instead of ending the stream. fs.watch alone is also not sufficient for
// data flow: Windows defers directory-entry updates for files appended
// through an open handle, so change events stop while the writer holds the
// log open. A low-frequency poll backs the events up (tail -F style).
// pause()/resume() let a consumer apply backpressure: while paused nothing
// is read, the file itself is the buffer.
export class IncrementalFileWatcher {
  private watcher: fs.FSWatcher | null = null;
  private currentOffset: number;
  private readonly logPath: string;
  private readonly onLines: (lines: string[]) => void;
  private readonly onEnd: () => void;
  private readonly onError: (err: Error) => void;
  private readonly reattachDelayMs: number;
  private readonly maxReattachAttempts: number;
  private readonly readBatchBytes: number;
  private readonly pollIntervalMs: number;
  private closed = false;
  private paused = false;
  private polling = false;
  private pendingPoll = false;
  private reattachTimer: ReturnType<typeof setTimeout> | null = null;
  private reattachAttempts = 0;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  // identity of the file the offset refers to; 0/undefined on filesystems
  // without inode numbers, where the shrink heuristic is the fallback
  private currentIno: number | null = null;

  constructor(options: FileWatcherOptions) {
    this.logPath = options.logPath;
    this.currentOffset = options.initialOffset;
    this.onLines = options.onLines;
    this.onEnd = options.onEnd;
    this.onError = options.onError;
    this.reattachDelayMs = options.reattachDelayMs ?? DEFAULT_REATTACH_DELAY_MS;
    this.maxReattachAttempts = options.maxReattachAttempts ?? DEFAULT_MAX_REATTACH_ATTEMPTS;
    this.readBatchBytes = options.readBatchBytes ?? MAX_RESPONSE_BYTES;
    this.pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  }

  start(): void {
    this.attach();
    this.pollTimer = setInterval(() => {
      this.pendingPoll = true;
      this.drain();
    }, this.pollIntervalMs);
    this.pollTimer.unref?.();
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    if (this.closed) return;
    this.pendingPoll = true;
    setImmediate(() => this.drain());
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.reattachTimer) {
      clearTimeout(this.reattachTimer);
      this.reattachTimer = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.watcher?.close();
    this.watcher = null;
  }

  private attach(): void {
    if (this.closed) return;
    try {
      this.watcher = fs.watch(this.logPath, (eventType) => this.handleEvent(eventType));
    } catch {
      this.scheduleReattach();
      return;
    }
    this.reattachAttempts = 0;
    this.pendingPoll = true;
    this.drain();
  }

  private detach(): void {
    this.watcher?.close();
    this.watcher = null;
  }

  private handleEvent(eventType: string): void {
    if (this.closed) return;
    if (eventType === "rename") {
      this.detach();
      this.recoverFromRotation();
      return;
    }
    this.pendingPoll = true;
    this.drain();
  }

  // A rename event means rotation (file moved to .1, fresh file created) or
  // deletion. Recover immediately when the path exists again — waiting a
  // timer tick under heavy output loses whole rotation generations.
  private recoverFromRotation(): void {
    if (this.closed) return;
    if (!fs.existsSync(this.logPath)) {
      this.scheduleReattach();
      return;
    }
    try {
      const stat = fs.statSync(this.logPath);
      if (this.isRotation(stat)) {
        this.readRotatedRemainder();
        this.currentIno = stat.ino || null;
      }
    } catch {
      // raced another rotation; the next drain sorts it out
    }
    this.attach();
  }

  // Rotation detection: the file at the path is no longer the bytes our
  // offset refers to. A shrink below the offset always invalidates it (in-
  // place truncation or replacement); a changed inode catches replacement
  // even when the new file already grew past the old offset.
  private isRotation(stat: fs.Stats): boolean {
    if (stat.size < this.currentOffset) return true;
    if (this.currentIno !== null && stat.ino) {
      return stat.ino !== this.currentIno;
    }
    return false;
  }

  // The bytes between the last read offset and the end of the previous
  // generation moved to `<logPath>.1` during rotation. Deliver them before
  // continuing from the start of the fresh file. Bounded to one generation:
  // if the log rotates faster than we read, older generations are skipped —
  // the follower is a live view, not an archival reader (tail -F semantics).
  private readRotatedRemainder(): void {
    if (this.currentOffset === 0) return;
    try {
      const previous = `${this.logPath}.1`;
      if (fs.existsSync(previous) && fs.statSync(previous).size > this.currentOffset) {
        const result = readIncremental(
          previous,
          this.currentOffset,
          INCREMENTAL_READ_CHUNK,
          this.readBatchBytes,
        );
        if (result.lines.length > 0) {
          this.onLines(result.lines);
        }
      }
    } catch {
      // best effort — the remainder may already have rotated further
    }
    this.currentOffset = 0;
  }

  private scheduleReattach(): void {
    if (this.closed || this.reattachTimer) return;
    if (this.reattachAttempts >= this.maxReattachAttempts) {
      this.close();
      this.onEnd();
      return;
    }
    this.reattachAttempts++;
    this.reattachTimer = setTimeout(() => {
      this.reattachTimer = null;
      if (this.closed) return;
      if (fs.existsSync(this.logPath)) {
        this.attach();
      } else {
        this.scheduleReattach();
      }
    }, this.reattachDelayMs);
    this.reattachTimer.unref?.();
  }

  private drain(): void {
    if (this.closed || this.paused || this.polling || !this.pendingPoll) return;
    this.polling = true;
    this.pendingPoll = false;
    try {
      let stat = fs.statSync(this.logPath);
      if (this.isRotation(stat)) {
        // rotation replaced the file under us — recover the unread tail of
        // the previous generation before starting over
        this.readRotatedRemainder();
        stat = fs.statSync(this.logPath);
      }
      this.currentIno = stat.ino || null;
      if (stat.size > this.currentOffset) {
        const startOffset = this.currentOffset;
        const result = readIncremental(
          this.logPath,
          this.currentOffset,
          INCREMENTAL_READ_CHUNK,
          this.readBatchBytes,
        );
        this.currentOffset = result.newOffset;
        if (result.newOffset - startOffset >= this.readBatchBytes) {
          this.pendingPoll = true;
        }
        if (result.lines.length > 0) {
          this.onLines(result.lines);
        }
      }
    } catch (err) {
      this.polling = false;
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        this.detach();
        this.pendingPoll = true;
        this.recoverFromRotation();
        return;
      }
      this.close();
      this.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    this.polling = false;
    if (this.pendingPoll && !this.paused && !this.closed) {
      setImmediate(() => this.drain());
    }
  }
}

function splitLines(text: string): string[] {
  return text.split("\n").filter((l) => l.length > 0);
}

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
): { lines: string[]; newOffset: number } {
  if (!fs.existsSync(logPath)) return { lines: [], newOffset: fromOffset };

  const size = fs.statSync(logPath).size;
  if (size <= fromOffset) return { lines: [], newOffset: fromOffset };

  const totalToRead = Math.min(size - fromOffset, MAX_RESPONSE_BYTES);
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
}

export class IncrementalFileWatcher {
  private watcher: fs.FSWatcher | null = null;
  private currentOffset: number;
  private readonly logPath: string;
  private readonly onLines: (lines: string[]) => void;
  private readonly onEnd: () => void;
  private readonly onError: (err: Error) => void;
  private closed = false;

  constructor(options: FileWatcherOptions) {
    this.logPath = options.logPath;
    this.currentOffset = options.initialOffset;
    this.onLines = options.onLines;
    this.onEnd = options.onEnd;
    this.onError = options.onError;
  }

  start(): void {
    this.watcher = fs.watch(this.logPath, (eventType) => {
      if (this.closed) return;

      if (eventType === "rename" && !fs.existsSync(this.logPath)) {
        this.close();
        this.onEnd();
        return;
      }

      if (eventType === "change") {
        try {
          const stat = fs.statSync(this.logPath);
          if (stat.size < this.currentOffset) {
            this.currentOffset = 0;
          }
          if (stat.size > this.currentOffset) {
            const result = readIncremental(this.logPath, this.currentOffset);
            this.currentOffset = result.newOffset;
            if (result.lines.length > 0) {
              this.onLines(result.lines);
            }
          }
        } catch (err) {
          this.close();
          this.onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    });
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.watcher?.close();
    this.watcher = null;
  }
}

function splitLines(text: string): string[] {
  return text.split("\n").filter((l) => l.length > 0);
}

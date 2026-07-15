import { Transform, type TransformCallback } from "node:stream";
import { MAX_CONTEXT_STDOUT_BYTES } from "../../shared/config/constants.js";

const KV_LINE_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/;

export interface CapturedContext {
  raw: string;
  kv: Record<string, string>;
}

export class StdoutCaptureTransform extends Transform {
  private captured: Buffer[] = [];
  private totalBytes = 0;
  private truncated = false;
  private readonly maxBytes: number;
  private partialLine = "";
  private kvPairs: Record<string, string> = {};

  constructor(maxBytes: number = MAX_CONTEXT_STDOUT_BYTES) {
    super({ decodeStrings: true });
    this.maxBytes = maxBytes;
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.push(chunk);

    if (this.truncated) {
      callback();
      return;
    }

    const chunkBytes = chunk.byteLength;
    const remaining = this.maxBytes - this.totalBytes;

    if (remaining <= 0) {
      this.truncated = true;
      callback();
      return;
    }

    if (chunkBytes <= remaining) {
      this.captured.push(Buffer.from(chunk));
      this.totalBytes += chunkBytes;
    } else {
      const slice = Buffer.from(chunk).subarray(0, remaining);
      this.captured.push(slice);
      this.totalBytes += slice.byteLength;
      this.truncated = true;
    }

    this.extractKvFromChunk(chunk);

    callback();
  }

  private extractKvFromChunk(chunk: Buffer): void {
    const text = chunk.toString("utf-8");
    const combined = this.partialLine + text;
    const lines = combined.split("\n");
    this.partialLine = lines.pop() ?? "";

    for (const line of lines) {
      const match = line.trim().match(KV_LINE_RE);
      if (match) {
        this.kvPairs[match[1]] = match[2];
      }
    }
  }

  _flush(callback: TransformCallback): void {
    if (this.partialLine) {
      const match = this.partialLine.trim().match(KV_LINE_RE);
      if (match) {
        this.kvPairs[match[1]] = match[2];
      }
      this.partialLine = "";
    }
    callback();
  }

  getCaptured(): string {
    if (this.captured.length === 0) return "";
    return Buffer.concat(this.captured, this.totalBytes).toString("utf-8");
  }

  getKvPairs(): Record<string, string> {
    return { ...this.kvPairs };
  }

  isTruncated(): boolean {
    return this.truncated;
  }
}

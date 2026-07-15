import fs from "node:fs";
import { Writable } from "node:stream";
import { MAX_LOG_BYTES, MAX_LOG_GENERATIONS } from "../../shared/config/constants.js";

function safeCreateWriteStream(path: string): fs.WriteStream {
  const stream = fs.createWriteStream(path, { flags: "a" });
  stream.on("error", () => { /* suppressed: dir may have been removed */ });
  return stream;
}

export class RotatingWriteStream extends Writable {
  private innerStream: fs.WriteStream;
  private _bytesWritten = 0;
  private readonly maxBytes: number;
  private readonly maxGenerations: number;
  private readonly basePath: string;
  private _pendingRotation = false;

  static create(
    basePath: string,
    maxBytes: number = MAX_LOG_BYTES,
    maxGenerations: number = MAX_LOG_GENERATIONS,
  ): RotatingWriteStream {
    return new RotatingWriteStream(basePath, maxBytes, maxGenerations);
  }

  private constructor(
    basePath: string,
    maxBytes: number,
    maxGenerations: number,
  ) {
    super({ decodeStrings: true, highWaterMark: 64 * 1024 });
    this.basePath = basePath;
    this.maxBytes = maxBytes;
    this.maxGenerations = maxGenerations;
    this.innerStream = safeCreateWriteStream(basePath);

    try {
      if (fs.existsSync(basePath)) {
        this._bytesWritten = fs.statSync(basePath).size;
      }
    } catch {
      this._bytesWritten = 0;
    }
  }

  get bytesWritten(): number {
    return this._bytesWritten;
  }

  override _write(
    chunk: Buffer,
    _encoding: BufferEncoding,
    callback: (err?: Error | null) => void,
  ): void {
    this._bytesWritten += chunk.byteLength;

    if (!this.innerStream.writable) {
      callback(new Error("stream not writable"));
      return;
    }

    const canWrite = this.innerStream.write(chunk);
    if (!canWrite) {
      this.innerStream.once("drain", () => {
        this._checkRotateDuringWrite();
        callback();
      });
    } else {
      this._checkRotateDuringWrite();
      callback();
    }
  }

  override _final(callback: (err?: Error | null) => void): void {
    this._pendingRotation = false;
    this.innerStream.end(() => {
      callback();
    });
  }

  private _checkRotateDuringWrite(): void {
    if (!this._pendingRotation && this._bytesWritten >= this.maxBytes) {
      this._pendingRotation = true;
      setImmediate(() => {
        this._pendingRotation = false;
        this.rotateIfNeeded();
      });
    }
  }

  rotateIfNeeded(): boolean {
    if (this._bytesWritten < this.maxBytes) return false;
    this.doRotate();
    return true;
  }

  private doRotate(): void {
    this._bytesWritten = 0;
    this.innerStream.end();

    for (let index = this.maxGenerations; index >= 1; index--) {
      const currentPath = `${this.basePath}.${index}`;
      if (!fs.existsSync(currentPath)) continue;
      if (index === this.maxGenerations) {
        fs.unlinkSync(currentPath);
        continue;
      }
      fs.renameSync(currentPath, `${this.basePath}.${index + 1}`);
    }

    if (fs.existsSync(this.basePath)) {
      fs.renameSync(this.basePath, `${this.basePath}.1`);
    }

    const dir = this.basePath.substring(0, this.basePath.lastIndexOf("/"));
    if (dir && !fs.existsSync(dir)) {
      return;
    }

    this.innerStream = safeCreateWriteStream(this.basePath);
  }
}

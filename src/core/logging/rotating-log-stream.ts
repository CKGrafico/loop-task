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
  private _rotating = false;
  private _rotationWaiters: Array<() => void> = [];

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
    const proceed = (): void => this.writeChunk(chunk, callback);
    if (this._rotating) {
      this._rotationWaiters.push(proceed);
      return;
    }
    if (this._bytesWritten >= this.maxBytes) {
      this.rotateThen(proceed);
      return;
    }
    proceed();
  }

  private writeChunk(chunk: Buffer, callback: (err?: Error | null) => void): void {
    this._bytesWritten += chunk.byteLength;

    if (!this.innerStream.writable) {
      callback(new Error("stream not writable"));
      return;
    }

    const canWrite = this.innerStream.write(chunk);
    if (canWrite) {
      callback();
      return;
    }
    const inner = this.innerStream;
    const onDrain = (): void => {
      inner.off("error", onError);
      callback();
    };
    const onError = (): void => {
      inner.off("drain", onDrain);
      callback();
    };
    inner.once("drain", onDrain);
    inner.once("error", onError);
  }

  override _final(callback: (err?: Error | null) => void): void {
    const finish = (): void => {
      this.innerStream.end(() => {
        callback();
      });
    };
    if (this._rotating) {
      this._rotationWaiters.push(finish);
    } else {
      finish();
    }
  }

  rotateIfNeeded(): boolean {
    if (this._rotating) return false;
    if (this._bytesWritten < this.maxBytes) return false;
    this.rotateThen(() => {});
    return true;
  }

  private rotateThen(next: () => void): void {
    this._rotationWaiters.push(next);
    if (this._rotating) return;
    this._rotating = true;
    this._bytesWritten = 0;

    const old = this.innerStream;
    let finished = false;
    const finishRotation = (): void => {
      if (finished) return;
      finished = true;
      this.shiftGenerations();
      this._rotating = false;
      const waiters = this._rotationWaiters;
      this._rotationWaiters = [];
      for (const waiter of waiters) waiter();
    };
    old.once("error", finishRotation);
    old.end(finishRotation);
  }

  private shiftGenerations(): void {
    try {
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
    } catch {
      /* a locked or vanished generation must not break logging */
    }

    const dir = this.basePath.substring(0, this.basePath.lastIndexOf("/"));
    if (dir && !fs.existsSync(dir)) {
      return;
    }

    this.innerStream = safeCreateWriteStream(this.basePath);
  }
}

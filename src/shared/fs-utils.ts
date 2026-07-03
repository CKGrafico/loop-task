import fs from "node:fs";

// On Windows, renaming over a file that another handle has open (e.g. the
// daemon's own fs.watch on loops.json) can transiently fail with EPERM/EBUSY.
// Retry the rename a few times before falling back to a direct (non-atomic)
// write so a momentary lock can't take the daemon down.
const RENAME_RETRIES = 5;
const RENAME_BACKOFF_MS = 15;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function removeIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

export function writeFileAtomic(filePath: string, data: string): void {
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, data);

  let lastErr: unknown;
  for (let attempt = 0; attempt < RENAME_RETRIES; attempt++) {
    try {
      fs.renameSync(tmp, filePath);
      return;
    } catch (err) {
      lastErr = err;
      const code = (err as NodeJS.ErrnoException).code;
      if (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES") break;
      sleepSync(RENAME_BACKOFF_MS * (attempt + 1));
    }
  }

  // Fallback: the destination stayed locked. Write in place (non-atomic) so
  // state is still persisted; a partial write is recoverable since corrupt
  // JSON is skipped on load, whereas a crash-looping daemon is not.
  try {
    fs.writeFileSync(filePath, data);
    fs.rmSync(tmp, { force: true });
  } catch {
    fs.rmSync(tmp, { force: true });
    throw lastErr;
  }
}

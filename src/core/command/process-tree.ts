import type { SpawnOptions } from "node:child_process";

export function getDetachedSpawnOptions(base: SpawnOptions): SpawnOptions {
  if (process.platform === "win32") {
    return { ...base, windowsHide: true };
  }

  return {
    ...base,
    detached: true,
  };
}

const SIGKILL_TIMEOUT_MS = 5000;

export async function killProcessTree(pid: number, signal: NodeJS.Signals = "SIGTERM"): Promise<void> {
  if (process.platform === "win32") {
    try {
      const { execa: execaSync } = await import("execa");
      await execaSync("taskkill", ["/T", "/F", "/PID", String(pid)]);
    } catch {
      try { process.kill(pid, signal); } catch { /* already dead */ }
    }
    return;
  }

  const tryKill = (sig: NodeJS.Signals): boolean => {
    try {
      process.kill(-pid, sig);
      return true;
    } catch {
      try { process.kill(pid, sig); return true; } catch { return false; }
    }
  };

  const isAlive = (): boolean => {
    try { process.kill(pid, 0); return true; } catch { return false; }
  };

  const killed = tryKill(signal);
  if (!killed || !isAlive()) return;

  if (signal !== "SIGKILL") {
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        if (isAlive()) {
          tryKill("SIGKILL");
        }
        resolve();
      }, SIGKILL_TIMEOUT_MS);

      const check = setInterval(() => {
        if (!isAlive()) {
          clearTimeout(timer);
          clearInterval(check);
          resolve();
        }
      }, 200);

      setTimeout(() => {
        clearInterval(check);
        resolve();
      }, SIGKILL_TIMEOUT_MS + 1000);
    });
  }
}

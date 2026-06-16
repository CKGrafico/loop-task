import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { execa } from "execa";
import type { IpcRequest, IpcResponse } from "../src/types.js";

const cliPath = path.resolve("dist/entry.js");
const ipcModuleUrl = pathToFileURL(path.resolve("src/client/ipc.ts")).href;
const tempRoots: string[] = [];

async function makeTestHome(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loop-cli-test-"));
  tempRoots.push(root);
  return root;
}

function testEnv(home: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    LOOP_CLI_HOME: home,
  };
}

async function runCli(args: string[], home: string, timeout = 15000) {
  return execa("node", [cliPath, ...args], {
    env: testEnv(home),
    timeout,
  });
}

async function sendDaemonRequest(home: string, request: IpcRequest): Promise<IpcResponse> {
  const result = await execa(
    "node",
    [
      "-e",
      `import { sendRequest } from ${JSON.stringify(ipcModuleUrl)}; const response = await sendRequest(${JSON.stringify(request)}); console.log(JSON.stringify(response));`,
    ],
    {
      env: testEnv(home),
      timeout: 15000,
    }
  );

  return JSON.parse(result.stdout) as IpcResponse;
}

async function waitFor(
  check: () => Promise<boolean>,
  timeoutMs = 10000,
  intervalMs = 200
): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await check()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Condition not met within ${timeoutMs}ms`);
}

async function shutdownDaemon(home: string): Promise<void> {
  const pidFile = path.join(home, ".loop-cli", "daemon.pid");
  let pid: number | null = null;

  try {
    pid = Number((await fs.readFile(pidFile, "utf-8")).trim());
    if (Number.isFinite(pid)) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // already gone
      }
    }
  } catch {
    // daemon never started
  }

  await waitFor(async () => {
    try {
      await fs.access(pidFile);
      return false;
    } catch {
      if (pid === null) {
        return true;
      }

      try {
        process.kill(pid, 0);
        return false;
      } catch {
        return true;
      }
    }
  }, 5000, 100).catch(() => undefined);
}

async function crashDaemon(home: string): Promise<void> {
  const pidFile = path.join(home, ".loop-cli", "daemon.pid");

  try {
    const pid = Number((await fs.readFile(pidFile, "utf-8")).trim());
    if (!Number.isFinite(pid)) {
      return;
    }

    if (process.platform === "win32") {
      await execa("taskkill", ["/pid", String(pid), "/f", "/t"]);
    } else {
      process.kill(pid, "SIGKILL");
    }
  } catch {
    // daemon may already be gone
  }

  await waitFor(async () => {
    try {
      const pid = Number((await fs.readFile(pidFile, "utf-8")).trim());
      process.kill(pid, 0);
      return false;
    } catch {
      return true;
    }
  }, 5000, 100).catch(() => undefined);
}

async function readLogs(home: string, id: string): Promise<string> {
  const response = await sendDaemonRequest(home, {
    type: "logs",
    payload: { id, follow: false, tail: 50 },
  });

  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }

  return (response.data as string) ?? "";
}

async function attachOnce(home: string, id: string): Promise<string> {
  const result = await execa(
    "node",
    [
      "-e",
      `import { streamRequest } from ${JSON.stringify(ipcModuleUrl)}; let done = false; const socket = streamRequest({ type: "attach", payload: { id: ${JSON.stringify(id)} } }, (line) => { if (!done && line.includes("bg-loop-output")) { done = true; console.log(line); socket.destroy(); process.exit(0); } }, () => { if (!done) process.exit(1); }, (error) => { console.error(error.message); process.exit(1); }); setTimeout(() => { if (!done) { socket.destroy(); process.exit(1); } }, 10000);`,
    ],
    {
      env: testEnv(home),
      timeout: 15000,
    }
  );

  return result.stdout;
}

async function readLoopState(home: string, id: string): Promise<{
  status: string;
  remainingDelayMs: number | null;
}> {
  const filePath = path.join(home, ".loop-cli", "loops", `${id}.json`);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw) as {
    status: string;
    remainingDelayMs: number | null;
  };
}

afterEach(async () => {
  for (const root of tempRoots.splice(0)) {
    await shutdownDaemon(root);
    await fs.rm(root, { recursive: true, force: true });
  }
});

describe("background cli", () => {
  it("starts, lists, inspects, pauses, resumes, reads logs, and deletes a loop", async () => {
    const home = await makeTestHome();

    const start = await runCli(
      [
        "start",
        "--now",
        "250ms",
        "--",
        "node",
        "-e",
        "console.log('bg-loop-output')",
      ],
      home,
      20000
    );

    expect(start.stdout).toContain("Loop started in background");
    const id = start.stdout.match(/ID:\s+([a-f0-9]{8})/i)?.[1];
    expect(id).toBeDefined();

    await waitFor(async () => {
      const response = await sendDaemonRequest(home, { type: "list" });
      if (response.type !== "ok") {
        return false;
      }
      return JSON.stringify(response.data).includes(id ?? "");
    });

    const status = await sendDaemonRequest(home, {
      type: "status",
      payload: { id: id! },
    });
    expect(status.type).toBe("ok");
    expect(JSON.stringify(status.data)).toContain(id!);

    await waitFor(async () => {
      const logs = await readLogs(home, id!);
      return logs.includes("bg-loop-output");
    });

    const attached = await attachOnce(home, id!);
    expect(attached).toContain("bg-loop-output");

    const pause = await sendDaemonRequest(home, {
      type: "pause",
      payload: { id: id! },
    });
    expect(pause.type).toBe("ok");

    await waitFor(async () => {
      const result = await sendDaemonRequest(home, {
        type: "status",
        payload: { id: id! },
      });
      return JSON.stringify(result.data).includes("paused");
    });

    const resume = await sendDaemonRequest(home, {
      type: "resume",
      payload: { id: id! },
    });
    expect(resume.type).toBe("ok");

    const remove = await sendDaemonRequest(home, {
      type: "delete",
      payload: { id: id! },
    });
    expect(remove.type).toBe("ok");

    const listed = await sendDaemonRequest(home, { type: "list" });
    expect(listed.type).toBe("ok");
    expect(listed.data).toEqual([]);
  }, 60000);

  it("preserves paused sleep state across daemon restart", async () => {
    const home = await makeTestHome();

    const start = await runCli(
      [
        "start",
        "--max-runs",
        "1",
        "1500ms",
        "--",
        "node",
        "-e",
        "console.log('restart-sensitive-run')",
      ],
      home,
      20000
    );

    const id = start.stdout.match(/ID:\s+([a-f0-9]{8})/i)?.[1];
    expect(id).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 400));

    const pause = await sendDaemonRequest(home, {
      type: "pause",
      payload: { id: id! },
    });
    expect(pause.type).toBe("ok");

    await waitFor(async () => {
      const result = await sendDaemonRequest(home, {
        type: "status",
        payload: { id: id! },
      });
      return JSON.stringify(result.data).includes("paused");
    });

    const pausedState = await readLoopState(home, id!);
    expect(pausedState.status).toBe("paused");
    expect(pausedState.remainingDelayMs).not.toBeNull();
    expect(pausedState.remainingDelayMs).toBeGreaterThan(0);

    await crashDaemon(home);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const restartedStatus = await sendDaemonRequest(home, {
      type: "status",
      payload: { id: id! },
    });
    expect(restartedStatus.type).toBe("ok");
    expect(JSON.stringify(restartedStatus.data)).toContain("paused");

    const restartedState = await readLoopState(home, id!);
    expect(restartedState.status).toBe("paused");
    expect(restartedState.remainingDelayMs).not.toBeNull();
    expect(restartedState.remainingDelayMs).toBeGreaterThan(0);

    const beforeResumeLogs = await readLogs(home, id!);
    expect(beforeResumeLogs).not.toContain("restart-sensitive-run");

    const resume = await sendDaemonRequest(home, {
      type: "resume",
      payload: { id: id! },
    });
    expect(resume.type).toBe("ok");

    await waitFor(async () => {
      const logs = await readLogs(home, id!);
      return logs.includes("restart-sensitive-run");
    }, 4000, 250);

    const remove = await sendDaemonRequest(home, {
      type: "delete",
      payload: { id: id! },
    });
    expect(remove.type).toBe("ok");
  }, 60000);
});

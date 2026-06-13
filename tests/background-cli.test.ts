import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { execa } from "execa";

const cliPath = path.resolve("dist/cli.js");
const tempRoots: string[] = [];

async function makeTestHome(): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "loop-cli-test-"));
  tempRoots.push(root);
  return root;
}

function testEnv(home: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    USERPROFILE: home,
    HOME: home,
  };
}

async function runCli(args: string[], home: string, timeout = 15000) {
  return execa("node", [cliPath, ...args], {
    env: testEnv(home),
    timeout,
  });
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

  try {
    const pid = Number((await fs.readFile(pidFile, "utf-8")).trim());
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
}

async function readLogs(home: string, id: string): Promise<string> {
  const result = await runCli(["logs", id, "--tail", "50"], home);
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
      const result = await runCli(["list"], home);
      return result.stdout.includes(id ?? "");
    });

    const status = await runCli(["status", id!], home);
    expect(status.stdout).toContain(`Loop: ${id}`);
    expect(status.stdout).toContain("Command:");

    await waitFor(async () => {
      const logs = await runCli(["logs", id!, "--tail", "20"], home);
      return logs.stdout.includes("bg-loop-output");
    });

    const pause = await runCli(["pause", id!], home);
    expect(pause.stdout).toContain(`Loop ${id} paused.`);

    await waitFor(async () => {
      const result = await runCli(["status", id!], home);
      return result.stdout.includes("Status:    paused");
    });

    const resume = await runCli(["resume", id!], home);
    expect(resume.stdout).toContain(`Loop ${id} resumed.`);

    const remove = await runCli(["delete", id!], home);
    expect(remove.stdout).toContain(`Loop ${id} deleted.`);

    const listed = await runCli(["list"], home);
    expect(listed.stdout).toContain("No background loops running.");
  }, 15000);

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

    const pause = await runCli(["pause", id!], home);
    expect(pause.stdout).toContain(`Loop ${id} paused.`);

    await waitFor(async () => {
      const result = await runCli(["status", id!], home);
      return result.stdout.includes("Status:    paused");
    });

    const pausedState = await readLoopState(home, id!);
    expect(pausedState.status).toBe("paused");
    expect(pausedState.remainingDelayMs).not.toBeNull();
    expect(pausedState.remainingDelayMs).toBeGreaterThan(0);

    await shutdownDaemon(home);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const restartedStatus = await runCli(["status", id!], home);
    expect(restartedStatus.stdout).toContain("Status:    paused");

    const restartedState = await readLoopState(home, id!);
    expect(restartedState.status).toBe("paused");
    expect(restartedState.remainingDelayMs).not.toBeNull();
    expect(restartedState.remainingDelayMs).toBeGreaterThan(0);

    const beforeResumeLogs = await readLogs(home, id!);
    expect(beforeResumeLogs).not.toContain("restart-sensitive-run");

    const resume = await runCli(["resume", id!], home);
    expect(resume.stdout).toContain(`Loop ${id} resumed.`);

    await waitFor(async () => {
      const logs = await readLogs(home, id!);
      return logs.includes("restart-sensitive-run");
    }, 4000, 250);

    const remove = await runCli(["delete", id!], home);
    expect(remove.stdout).toContain(`Loop ${id} deleted.`);
  }, 15000);
});

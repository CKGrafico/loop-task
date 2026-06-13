import type { LoopMeta, LoopOptions } from "../types.js";
import { formatDuration } from "../duration.js";
import { sendRequest, streamRequest } from "./ipc.js";

export async function startLoop(
  options: LoopOptions,
  intervalHuman: string
): Promise<void> {
  const response = await sendRequest({
    type: "start",
    payload: { ...options, intervalHuman },
  });

  if (response.type !== "ok") {
    console.error(`Error: ${(response as { message: string }).message}`);
    process.exit(1);
  }

  const data = response.data as { id: string };
  console.log(`Loop started in background`);
  console.log(`  ID:       ${data.id}`);
  console.log(`  Command:  ${options.command} ${options.commandArgs.join(" ")}`);
  console.log(`  Interval: ${intervalHuman}`);
  console.log(`  Status:   running`);
  console.log();
  console.log(`  loop-task list          # see all loops`);
  console.log(`  loop-task attach ${data.id}  # view output`);
  console.log(`  loop-task pause ${data.id}   # pause`);
  console.log(`  loop-task delete ${data.id}  # remove`);
  process.exit(0);
}

export async function listLoops(): Promise<void> {
  const response = await sendRequest({ type: "list" });

  if (response.type !== "ok") {
    console.error(`Error: ${(response as { message: string }).message}`);
    process.exit(1);
  }

  const loops = response.data as LoopMeta[];

  if (loops.length === 0) {
    console.log("No background loops running.");
    return;
  }

  const idW = Math.max(4, ...loops.map((l) => l.id.length)) + 2;
  const cmdW = Math.max(7, ...loops.map((l) => formatCmd(l.command, l.commandArgs).length)) + 2;
  const intW = 10;
  const statusW = 10;
  const runsW = 6;

  const header =
    pad("ID", idW) +
    pad("COMMAND", cmdW) +
    pad("INTERVAL", intW) +
    pad("STATUS", statusW) +
    pad("RUNS", runsW) +
    "LAST EXIT";

  console.log(header);
  console.log("-".repeat(header.length));

  for (const loop of loops) {
    const exit = loop.lastExitCode !== null ? String(loop.lastExitCode) : "-";
    console.log(
      pad(loop.id, idW) +
      pad(formatCmd(loop.command, loop.commandArgs), cmdW) +
      pad(loop.intervalHuman, intW) +
      pad(loop.status, statusW) +
      pad(String(loop.runCount), runsW) +
      exit
    );
  }
  process.exit(0);
}

export async function showStatus(id: string): Promise<void> {
  const response = await sendRequest({ type: "status", payload: { id } });

  if (response.type !== "ok") {
    console.error(`Error: ${(response as { message: string }).message}`);
    process.exit(1);
  }

  const loop = response.data as LoopMeta;
  const cmd = `${loop.command} ${loop.commandArgs.join(" ")}`.trim();
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

  console.log(`Loop: ${loop.id}`);
  console.log(`  Command:   ${cmd}`);
  console.log(`  Interval:  ${loop.intervalHuman} (${formatDuration(loop.interval)})`);
  console.log(`  Status:    ${loop.status}`);
  console.log(`  Runs:      ${loop.runCount} / ${maxRuns}`);
  console.log(`  Created:   ${loop.createdAt}`);

  if (loop.lastRunAt) {
    const exitInfo = loop.lastExitCode !== null ? `exit ${loop.lastExitCode}` : "";
    const durInfo = loop.lastDuration !== null ? formatDuration(loop.lastDuration) : "";
    console.log(`  Last run:  ${loop.lastRunAt} ${exitInfo} ${durInfo}`.trim());
  }

  if (loop.nextRunAt) {
    console.log(`  Next run:  ${loop.nextRunAt}`);
  }
  process.exit(0);
}

export async function pauseLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "pause", payload: { id } });
  if (response.type !== "ok") {
    console.error(`Error: ${(response as { message: string }).message}`);
    process.exit(1);
  }
  console.log(`Loop ${id} paused.`);
  process.exit(0);
}

export async function resumeLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "resume", payload: { id } });
  if (response.type !== "ok") {
    console.error(`Error: ${(response as { message: string }).message}`);
    process.exit(1);
  }
  console.log(`Loop ${id} resumed.`);
  process.exit(0);
}

export async function deleteLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "delete", payload: { id } });
  if (response.type !== "ok") {
    console.error(`Error: ${(response as { message: string }).message}`);
    process.exit(1);
  }
  console.log(`Loop ${id} deleted.`);
  process.exit(0);
}

export async function viewLogs(
  id: string,
  follow: boolean,
  tail: number
): Promise<void> {
  if (!follow) {
    const response = await sendRequest({
      type: "logs",
      payload: { id, follow: false, tail },
    });
    if (response.type !== "ok") {
      console.error(`Error: ${(response as { message: string }).message}`);
      process.exit(1);
    }
    const content = response.data as string;
    if (content) {
      process.stdout.write(content);
      if (!content.endsWith("\n")) process.stdout.write("\n");
    }
    process.exit(0);
  }

  const socket = streamRequest(
    { type: "logs", payload: { id, follow: true, tail } },
    (line) => console.log(line),
    () => process.exit(0),
    (err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  );

  process.on("SIGINT", () => {
    socket.destroy();
    process.exit(0);
  });
}

export async function attachLoop(id: string): Promise<void> {
  console.log(`Attaching to loop ${id}... (Ctrl+C to detach)\n`);

  const socket = streamRequest(
    { type: "attach", payload: { id } },
    (line) => console.log(line),
    () => process.exit(0),
    (err) => {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  );

  process.on("SIGINT", () => {
    console.log("\nDetached.");
    socket.destroy();
    process.exit(0);
  });
}

function formatCmd(command: string, args: string[]): string {
  const full = `${command} ${args.join(" ")}`.trim();
  return full.length > 30 ? full.slice(0, 27) + "..." : full;
}

function pad(str: string, width: number): string {
  return str.length >= width ? str + " " : str + " ".repeat(width - str.length);
}

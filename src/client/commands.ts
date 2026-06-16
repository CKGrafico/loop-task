import type { LoopMeta, LoopOptions } from "../types.js";
import { formatDuration } from "../duration.js";
import { t } from "../i18n/index.js";
import { sendRequest, streamRequest } from "./ipc.js";

export async function createBackgroundLoop(
  options: LoopOptions,
  intervalHuman: string
): Promise<string> {
  const response = await sendRequest({
    type: "start",
    payload: { ...options, intervalHuman },
  });

  if (response.type !== "ok") {
    throw new Error((response as { message: string }).message);
  }

  return (response.data as { id: string }).id;
}

export async function startLoop(
  options: LoopOptions,
  intervalHuman: string
): Promise<void> {
  const id = await createBackgroundLoop(options, intervalHuman).catch(
    (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(t("cli.error", { message }));
      process.exit(1);
    }
  );

  console.log(t("cli.startedTitle"));
  console.log(t("cli.startedId", { id }));
  console.log(t("cli.startedCommand", { command: `${options.command} ${options.commandArgs.join(" ")}` }));
  console.log(t("cli.startedInterval", { interval: intervalHuman }));
  console.log(t("cli.startedStatus"));
  console.log();
  console.log(t("cli.startedHint"));
  process.exit(0);
}

export async function listLoops(): Promise<void> {
  const response = await sendRequest({ type: "list" });

  if (response.type !== "ok") {
    console.error(t("cli.error", { message: (response as { message: string }).message }));
    process.exit(1);
  }

  const loops = response.data as LoopMeta[];

  if (loops.length === 0) {
    console.log(t("cli.noLoops"));
    return;
  }

  const idW = Math.max(4, ...loops.map((l) => l.id.length)) + 2;
  const cmdW = Math.max(7, ...loops.map((l) => formatCmd(l.command, l.commandArgs).length)) + 2;
  const intW = 10;
  const statusW = 10;
  const runsW = 6;

  const header =
    pad(t("cli.headerId"), idW) +
    pad(t("cli.headerCommand"), cmdW) +
    pad(t("cli.headerInterval"), intW) +
    pad(t("cli.headerStatus"), statusW) +
    pad(t("cli.headerRuns"), runsW) +
    t("cli.headerLastExit");

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
    console.error(t("cli.error", { message: (response as { message: string }).message }));
    process.exit(1);
  }

  const loop = response.data as LoopMeta;
  const cmd = `${loop.command} ${loop.commandArgs.join(" ")}`.trim();
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : t("cli.unlimited");

  console.log(t("cli.statusTitle", { id: loop.id }));
  console.log(t("cli.statusCommand", { command: cmd }));
  console.log(t("cli.statusInterval", { interval: loop.intervalHuman, duration: formatDuration(loop.interval) }));
  console.log(t("cli.statusStatus", { status: loop.status }));
  console.log(t("cli.statusRuns", { runs: loop.runCount, maxRuns }));
  console.log(t("cli.statusCreated", { created: loop.createdAt }));

  if (loop.lastRunAt) {
    const exitInfo = loop.lastExitCode !== null ? t("cli.exitInfo", { code: loop.lastExitCode }) : "";
    const durInfo = loop.lastDuration !== null ? formatDuration(loop.lastDuration) : "";
    console.log(t("cli.statusLastRun", { lastRun: loop.lastRunAt, exit: exitInfo, duration: durInfo }).trim());
  }

  if (loop.nextRunAt) {
    console.log(t("cli.statusNextRun", { nextRun: loop.nextRunAt }));
  }
  process.exit(0);
}

export async function pauseLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "pause", payload: { id } });
  if (response.type !== "ok") {
    console.error(t("cli.error", { message: (response as { message: string }).message }));
    process.exit(1);
  }
  console.log(t("cli.paused", { id }));
  process.exit(0);
}

export async function resumeLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "resume", payload: { id } });
  if (response.type !== "ok") {
    console.error(t("cli.error", { message: (response as { message: string }).message }));
    process.exit(1);
  }
  console.log(t("cli.resumed", { id }));
  process.exit(0);
}

export async function deleteLoop(id: string): Promise<void> {
  const response = await sendRequest({ type: "delete", payload: { id } });
  if (response.type !== "ok") {
    console.error(t("cli.error", { message: (response as { message: string }).message }));
    process.exit(1);
  }
  console.log(t("cli.deleted", { id }));
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
      console.error(t("cli.error", { message: (response as { message: string }).message }));
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
      console.error(t("cli.error", { message: err.message }));
      process.exit(1);
    }
  );

  process.on("SIGINT", () => {
    socket.destroy();
    process.exit(0);
  });
}

export async function attachLoop(id: string): Promise<void> {
  console.log(t("cli.attaching", { id }));

  const socket = streamRequest(
    { type: "attach", payload: { id } },
    (line) => console.log(line),
    () => process.exit(0),
    (err) => {
      console.error(t("cli.error", { message: err.message }));
      process.exit(1);
    }
  );

  process.on("SIGINT", () => {
    console.log(t("cli.detached"));
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

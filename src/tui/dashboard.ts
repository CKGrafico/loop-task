import blessed from "blessed";
import type { LoopMeta } from "../types.js";
import { sendRequest, streamRequest } from "../client/ipc.js";

function formatCmd(command: string, args: string[]): string {
  const full = `${command} ${args.join(" ")}`.trim();
  return full.length > 25 ? full.slice(0, 22) + "..." : full;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "-";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 5) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function statusColor(status: string): string {
  switch (status) {
    case "running":
      return "{green-fg}running{/green-fg}";
    case "paused":
      return "{yellow-fg}paused{/yellow-fg}";
    case "sleeping":
      return "{cyan-fg}sleeping{/cyan-fg}";
    case "stopped":
      return "{red-fg}stopped{/red-fg}";
    default:
      return status;
  }
}

export async function launchDashboard(): Promise<void> {
  const screen = blessed.screen({
    smartCSR: true,
    title: "loop-task dashboard",
    fullUnicode: true,
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 2,
    content: " {bold}LOOP-TASK DASHBOARD{/bold}",
    tags: true,
    style: {
      fg: "white",
      bg: "blue",
    },
  });

  const loopList = blessed.list({
    top: 2,
    left: 0,
    width: "45%",
    height: "100%-5",
    label: " Loops ",
    border: { type: "line" },
    tags: true,
    keys: true,
    vi: true,
    style: {
      selected: { bg: "blue", fg: "white" },
      item: { fg: "white" },
      border: { fg: "gray" },
    },
    scrollbar: {
      ch: " ",
      track: { bg: "gray" },
      style: { bg: "white" },
    },
  });

  const detail = blessed.box({
    top: 2,
    left: "45%",
    width: "55%",
    height: "40%",
    label: " Details ",
    border: { type: "line" },
    tags: true,
    scrollable: true,
    style: {
      border: { fg: "gray" },
    },
  });

  const logBox = blessed.log({
    top: "42%",
    left: "45%",
    width: "55%",
    height: "100%-45%",
    label: " Logs ",
    border: { type: "line" },
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    style: {
      border: { fg: "gray" },
    },
  });

  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 3,
    content:
      " {cyan-fg}p{/cyan-fg}:pause  {cyan-fg}r{/cyan-fg}:resume  {cyan-fg}d{/cyan-fg}:delete  {cyan-fg}a{/cyan-fg}:attach  {cyan-fg}l{/cyan-fg}:logs  {cyan-fg}q{/cyan-fg}:quit",
    tags: true,
    style: {
      fg: "gray",
      bg: "black",
    },
  });

  screen.append(header);
  screen.append(loopList);
  screen.append(detail);
  screen.append(logBox);
  screen.append(footer);

  let loops: LoopMeta[] = [];
  let logSocket: ReturnType<typeof streamRequest> | null = null;
  let selectedId: string | null = null;

  async function refresh(): Promise<void> {
    try {
      const response = await sendRequest({ type: "list" });
      if (response.type === "ok") {
        loops = response.data as LoopMeta[];
        updateList();
        updateDetail();
      }
    } catch {
      // daemon might be starting
    }
    screen.render();
  }

  function updateList(): void {
    const items = loops.map((l) => {
      const cmd = formatCmd(l.command, l.commandArgs);
      const status = statusColor(l.status);
      return ` ${l.id}  ${cmd.padEnd(26)} ${l.intervalHuman.padEnd(8)} ${status}  ${String(l.runCount).padStart(4)} runs`;
    });
    loopList.setItems(items.length > 0 ? items : ["  No loops running"]);
  }

  function updateDetail(): void {
    const idx = (loopList as unknown as { selected: number }).selected;
    if (idx < 0 || idx >= loops.length) {
      detail.setContent("  Select a loop to view details");
      selectedId = null;
      return;
    }

    const loop = loops[idx];
    selectedId = loop.id;
    const cmd = `${loop.command} ${loop.commandArgs.join(" ")}`.trim();
    const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

    const lines = [
      `  {bold}ID:{/bold}        ${loop.id}`,
      `  {bold}Command:{/bold}   ${cmd}`,
      `  {bold}Interval:{/bold}  ${loop.intervalHuman}`,
      `  {bold}Status:{/bold}    ${statusColor(loop.status)}`,
      `  {bold}Runs:{/bold}      ${loop.runCount} / ${maxRuns}`,
      `  {bold}Created:{/bold}   ${loop.createdAt}`,
      `  {bold}Last run:{/bold}  ${timeAgo(loop.lastRunAt)}`,
      `  {bold}Last exit:{/bold} ${loop.lastExitCode !== null ? String(loop.lastExitCode) : "-"}`,
      `  {bold}Next run:{/bold}  ${loop.nextRunAt ? timeAgo(loop.nextRunAt) : "-"}`,
    ];
    detail.setContent(lines.join("\n"));
  }

  function attachLogs(id: string): void {
    if (logSocket) {
      logSocket.destroy();
      logSocket = null;
    }
    logBox.setContent("");

    logSocket = streamRequest(
      { type: "logs", payload: { id, follow: true, tail: 20 } },
      (line) => {
        logBox.add(line);
        logBox.setScrollPerc(100);
        screen.render();
      },
      () => {},
      (err) => {
        logBox.add(`{red-fg}Error: ${err.message}{/red-fg}`);
        screen.render();
      }
    );
  }

  loopList.on("select", () => {
    updateDetail();
    if (selectedId) {
      attachLogs(selectedId);
    }
    screen.render();
  });

  screen.key(["q", "C-c"], () => {
    if (logSocket) logSocket.destroy();
    screen.destroy();
    process.exit(0);
  });

  screen.key(["p"], async () => {
    if (!selectedId) return;
    await sendRequest({ type: "pause", payload: { id: selectedId } });
    await refresh();
  });

  screen.key(["r"], async () => {
    if (!selectedId) return;
    await sendRequest({ type: "resume", payload: { id: selectedId } });
    await refresh();
  });

  screen.key(["d"], async () => {
    if (!selectedId) return;
    const confirm = blessed.question({
      top: "center",
      left: "center",
      height: 7,
      width: 40,
      content: `Delete loop ${selectedId}?`,
      border: { type: "line" },
      style: {
        bg: "black",
        border: { fg: "red" },
      },
    });
    screen.append(confirm);
    confirm.ask(`Delete loop ${selectedId}?`, (err: unknown, value: string) => {
      void err;
      confirm.destroy();
      if (value === "yes" || value === "y") {
        sendRequest({ type: "delete", payload: { id: selectedId! } }).then(() => refresh());
      }
      screen.render();
    });
  });

  screen.key(["l"], () => {
    if (!selectedId) return;
    attachLogs(selectedId);
  });

  screen.key(["a"], () => {
    if (!selectedId) return;
    if (logSocket) logSocket.destroy();
    screen.destroy();
    import("../client/commands.js").then((cmds) => {
      cmds.attachLoop(selectedId!);
    });
  });

  await refresh();
  if (loops.length > 0) {
    attachLogs(loops[0].id);
  }

  screen.render();

  const interval = setInterval(async () => {
    await refresh();
  }, 3000);

  screen.on("destroy", () => {
    clearInterval(interval);
    if (logSocket) logSocket.destroy();
  });
}

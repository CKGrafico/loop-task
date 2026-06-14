import blessed from "blessed";
import type { BoardApp, BoardWidgets } from "./app.js";

function formatCmd(command: string, args: string[]): string {
  const full = `${command} ${args.join(" ")}`.trim();
  return full.length > 24 ? full.slice(0, 21) + "..." : full;
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

export function statusColor(status: string): string {
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

export function createBoardWidgets(): BoardWidgets {
  const screen = blessed.screen({
    smartCSR: true,
    title: "loop-task board",
    fullUnicode: true,
  });

  const header = blessed.box({
    top: 0,
    left: 0,
    width: "100%",
    height: 2,
    content: " {bold}LOOP-TASK BOARD{/bold}",
    tags: true,
    style: { fg: "white", bg: "blue" },
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
    label: " Inspector ",
    border: { type: "line" },
    tags: true,
    scrollable: true,
    style: { border: { fg: "gray" } },
  });

  const logBox = blessed.log({
    top: "42%",
    left: "45%",
    width: "55%",
    height: "100%-45%",
    label: " Timeline ",
    border: { type: "line" },
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    style: { border: { fg: "gray" } },
  });

  const footer = blessed.box({
    bottom: 0,
    left: 0,
    width: "100%",
    height: 3,
    tags: true,
    style: { fg: "gray", bg: "black" },
  });

  screen.append(header);
  screen.append(loopList);
  screen.append(detail);
  screen.append(logBox);
  screen.append(footer);

  return { screen, header, loopList, detail, logBox, footer };
}

export function renderLoopList(app: BoardApp): void {
  const visibleLoops = app.visibleLoops();

  const items = visibleLoops.map((loop) => {
    const cmd = formatCmd(loop.command, loop.commandArgs);
    const status = statusColor(loop.status);
    const timing = loop.nextRunAt
      ? `next ${timeAgo(loop.nextRunAt)}`
      : loop.lastRunAt
        ? `last ${timeAgo(loop.lastRunAt)}`
        : "new";
    const exit = loop.lastExitCode === null ? "-" : String(loop.lastExitCode);
    return ` ${status}  ${cmd.padEnd(25)} ${timing.padEnd(14)} exit ${exit.padEnd(3)} #${String(loop.runCount).padStart(3)}`;
  });

  app.widgets.loopList.setItems(items.length > 0 ? items : ["  No loops match the current view"]);
  app.widgets.loopList.setLabel(
    ` Loops ${visibleLoops.length}/${app.loops.length} | sort:${app.loopSortMode} | status:${app.filters.status} | interval:${app.filters.intervalBucket} | activity:${app.filters.recentActivity} `
  );
  app.syncSelection();
}

function renderHeader(app: BoardApp): void {
  const total = app.loops.length;
  const running = app.loops.filter((loop) => loop.status === "running").length;
  const sleeping = app.loops.filter((loop) => loop.status === "sleeping").length;
  const paused = app.loops.filter((loop) => loop.status === "paused").length;
  const daemon =
    app.daemonStatus === "connected"
      ? "{green-fg}connected{/green-fg}"
      : app.daemonStatus === "error"
        ? "{red-fg}error{/red-fg}"
        : "{yellow-fg}starting{/yellow-fg}";
  const loading =
    app.loadingState === "idle"
      ? ""
      : `  load:{yellow-fg}${app.loadingState}{/yellow-fg}`;

  app.widgets.header.setContent(
    ` {bold}LOOP-TASK BOARD{/bold}  daemon:${daemon}${loading}  loops:${total}  running:${running}  sleeping:${sleeping}  paused:${paused}`
  );
}

export function renderLoopDetail(app: BoardApp): void {
  const loop = app.selectedVisibleLoop();
  if (!loop) {
    app.widgets.detail.setContent("  Select a loop to view details");
    app.selectedId = null;
    return;
  }

  app.selectedId = loop.id;
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
    `  {bold}PID:{/bold}       ${loop.pid}`,
  ];

  app.widgets.detail.setContent(lines.join("\n"));
}

function renderFullScreenDetail(app: BoardApp): void {
  const loop = app.selectedVisibleLoop();
  if (!loop) {
    app.widgets.detail.setContent("  No loop selected");
    return;
  }

  const cmd = `${loop.command} ${loop.commandArgs.join(" ")}`.trim();
  const maxRuns = loop.maxRuns !== null ? String(loop.maxRuns) : "unlimited";

  const lines = [
    `{bold}LOOP DETAIL{/bold}`,
    "",
    `ID:         ${loop.id}`,
    `Command:    ${cmd}`,
    `Interval:   ${loop.intervalHuman}`,
    `Status:     ${loop.status}`,
    `Runs:       ${loop.runCount} / ${maxRuns}`,
    `Created:    ${loop.createdAt}`,
    `Last run:   ${loop.lastRunAt ?? "-"}`,
    `Last exit:  ${loop.lastExitCode ?? "-"}`,
    `Duration:   ${loop.lastDuration ?? "-"}`,
    `Next run:   ${loop.nextRunAt ?? "-"}`,
    `PID:        ${loop.pid}`,
    "",
    `{cyan-fg}Esc{/cyan-fg} return to board`,
  ];

  app.widgets.detail.setLabel(" Loop Detail ");
  app.widgets.detail.width = "100%";
  app.widgets.detail.height = "100%-5";
  app.widgets.detail.left = 0;
  app.widgets.detail.top = 2;
  app.widgets.detail.setContent(lines.join("\n"));
  app.widgets.detail.show();
  app.widgets.loopList.hide();
  app.widgets.logBox.hide();
}

function renderAttachView(app: BoardApp): void {
  const loop = app.selectedVisibleLoop();
  const title = loop ? ` Live Session ${loop.id} ` : " Live Session ";

  app.widgets.detail.setLabel(title);
  app.widgets.detail.width = "100%";
  app.widgets.detail.height = 5;
  app.widgets.detail.left = 0;
  app.widgets.detail.top = 2;
  app.widgets.detail.setContent("  Live attach view. Press Esc to return to the board.");

  app.widgets.logBox.setLabel(" Live Output ");
  app.widgets.logBox.top = 7;
  app.widgets.logBox.left = 0;
  app.widgets.logBox.width = "100%";
  app.widgets.logBox.height = "100%-10";

  app.widgets.detail.show();
  app.widgets.logBox.show();
  app.widgets.loopList.hide();
}

function renderHelpView(app: BoardApp): void {
  const lines = [
    "{bold}HELP{/bold}",
    "",
    "Navigation:",
    "  up/down or j/k move selection",
    "  enter opens detail view",
    "",
    "Actions:",
    "  n create loop",
    "  p pause loop",
    "  r resume loop",
    "  d delete loop",
    "  a attach view",
    "  l refresh timeline",
    "",
    "Discovery:",
    "  / search loops",
    "  f open filter mode",
    "  s cycle sort mode",
    "  h toggle help",
    "  esc return to board",
  ];

  app.widgets.detail.setLabel(" Help ");
  app.widgets.detail.width = "100%";
  app.widgets.detail.height = "100%-5";
  app.widgets.detail.left = 0;
  app.widgets.detail.top = 2;
  app.widgets.detail.setContent(lines.join("\n"));
  app.widgets.detail.show();
  app.widgets.loopList.hide();
  app.widgets.logBox.hide();
}

function resetBoardLayout(app: BoardApp): void {
  app.widgets.loopList.show();
  app.widgets.detail.show();
  app.widgets.logBox.show();

  app.widgets.loopList.width = "45%";
  app.widgets.loopList.height = "100%-5";
  app.widgets.loopList.left = 0;
  app.widgets.loopList.top = 2;

  app.widgets.detail.setLabel(" Inspector ");
  app.widgets.detail.width = "55%";
  app.widgets.detail.height = "40%";
  app.widgets.detail.left = "45%";
  app.widgets.detail.top = 2;

  app.widgets.logBox.setLabel(" Timeline ");
  app.widgets.logBox.top = "42%";
  app.widgets.logBox.left = "45%";
  app.widgets.logBox.width = "55%";
  app.widgets.logBox.height = "100%-45%";

  if (!app.liveLogLoopId) {
    app.widgets.logBox.setContent("  No logs attached. Select a loop to follow its timeline.");
  }
}

export function renderFooter(app: BoardApp): void {
  const mode = `{cyan-fg}mode{/cyan-fg}:${app.inputMode}`;
  const view = `{cyan-fg}view{/cyan-fg}:${app.activeView}`;
  const message = app.statusMessage ? `\n ${app.statusMessage}` : "";

  app.widgets.footer.setContent(
    ` {cyan-fg}n{/cyan-fg}:new  {cyan-fg}enter{/cyan-fg}:detail  {cyan-fg}a{/cyan-fg}:attach  {cyan-fg}/{/cyan-fg}:search  {cyan-fg}f{/cyan-fg}:filter  {cyan-fg}s{/cyan-fg}:sort  {cyan-fg}h{/cyan-fg}:help  {cyan-fg}q{/cyan-fg}:quit  ${mode}  ${view}${message}`
  );
}

export function renderAll(app: BoardApp): void {
  renderHeader(app);

  if (app.activeView === "detail") {
    renderFullScreenDetail(app);
  } else if (app.activeView === "attach") {
    renderAttachView(app);
  } else if (app.activeView === "help") {
    renderHelpView(app);
  } else {
    resetBoardLayout(app);
    renderLoopList(app);
    renderLoopDetail(app);
  }

  renderFooter(app);
  app.widgets.screen.render();
}

export function appendBoardMessage(app: BoardApp, message: string): void {
  app.widgets.logBox.add(`{cyan-fg}[board]{/cyan-fg} ${message}`);
  app.widgets.logBox.setScrollPerc(100);
  app.setStatusMessage(message);
  renderFooter(app);
  app.widgets.screen.render();
}

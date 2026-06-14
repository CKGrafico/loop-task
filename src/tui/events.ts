import blessed from "blessed";
import { sendRequest, streamRequest } from "../client/ipc.js";
import type { BoardApp } from "./app.js";
import { openCreateLoopWizard } from "./create-loop.js";
import { chooseOption } from "./popup.js";
import { appendBoardMessage, renderAll } from "./render.js";

export function bindBoardEvents(
  app: BoardApp,
  refresh: () => Promise<void>
): void {
  app.widgets.loopList.on("select", () => {
    renderAll(app);
    if (app.selectedId && app.activeView === "board") {
      attachLogStream(app, app.selectedId);
    }
  });

  app.widgets.screen.key(["up", "k"], () => {
    if (app.activeView !== "board") {
      return;
    }
    const nextIndex = Math.max(0, app.selectedIndex() - 1);
    app.widgets.loopList.select(nextIndex);
    renderAll(app);
    if (app.selectedId) {
      attachLogStream(app, app.selectedId);
    }
  });

  app.widgets.screen.key(["down", "j"], () => {
    if (app.activeView !== "board") {
      return;
    }
    const nextIndex = Math.min(app.visibleLoops().length - 1, app.selectedIndex() + 1);
    app.widgets.loopList.select(nextIndex);
    renderAll(app);
    if (app.selectedId) {
      attachLogStream(app, app.selectedId);
    }
  });

  app.widgets.screen.key(["q", "C-c"], () => {
    app.destroyLogStream();
    app.widgets.screen.destroy();
    process.exit(0);
  });

  app.widgets.screen.key(["p"], async () => {
    if (!app.selectedId) return;
    await confirmAction(app, `Pause loop ${app.selectedId}?`, async () => {
      await sendRequest({ type: "pause", payload: { id: app.selectedId! } });
      await refresh();
      appendBoardMessage(app, `Paused loop ${app.selectedId}.`);
    });
  });

  app.widgets.screen.key(["r"], async () => {
    if (!app.selectedId) return;
    await confirmAction(app, `Resume loop ${app.selectedId}?`, async () => {
      await sendRequest({ type: "resume", payload: { id: app.selectedId! } });
      await refresh();
      appendBoardMessage(app, `Resumed loop ${app.selectedId}.`);
    });
  });

  app.widgets.screen.key(["d"], async () => {
    if (!app.selectedId) return;
    await confirmAction(app, `Delete loop ${app.selectedId}?`, async () => {
      await sendRequest({ type: "delete", payload: { id: app.selectedId! } });
      await refresh();
      appendBoardMessage(app, `Deleted loop ${app.selectedId}.`);
    });
  });

  app.widgets.screen.key(["l"], () => {
    if (!app.selectedId) return;
    attachLogStream(app, app.selectedId);
  });

  app.widgets.screen.key(["enter"], () => {
    if (!app.selectedId) return;
    app.setActiveView(app.activeView === "detail" ? "board" : "detail");
    renderAll(app);
  });

  app.widgets.screen.key(["escape"], () => {
    if (app.activeView !== "board") {
      app.setActiveView("board");
      app.setInputMode("normal");
      renderAll(app);
    }
  });

  app.widgets.screen.key(["n"], async () => {
    await openCreateLoopWizard(app, refresh);
  });

  app.widgets.screen.key(["a"], () => {
    if (!app.selectedId) return;
    app.setActiveView("attach");
    app.setInputMode("attach");
    attachLogStream(app, app.selectedId);
    renderAll(app);
  });

  app.widgets.screen.key(["/"], async () => {
    await promptSearch(app);
    renderAll(app);
  });

  app.widgets.screen.key(["f"], () => {
    void promptFilter(app);
  });

  app.widgets.screen.key(["s"], () => {
    app.cycleSortMode();
    app.syncSelection();
    appendBoardMessage(app, `Sort mode set to ${app.loopSortMode}.`);
    renderAll(app);
  });

  app.widgets.screen.key(["h"], () => {
    app.setInputMode(app.activeView === "help" ? "normal" : "help");
    app.setActiveView(app.activeView === "help" ? "board" : "help");
    renderAll(app);
  });
}

function attachLogStream(app: BoardApp, id: string): void {
  app.setLoadingState("attaching");
  app.destroyLogStream();
  app.widgets.logBox.setContent("  Waiting for live output...");
  app.liveLogLoopId = id;

  app.logSocket = streamRequest(
    { type: "logs", payload: { id, follow: true, tail: 20 } },
    (line) => {
      app.setLoadingState("idle");
      app.widgets.logBox.add(line);
      app.widgets.logBox.setScrollPerc(100);
      app.widgets.screen.render();
    },
    () => {},
    (err) => {
      app.setLoadingState("idle");
      appendBoardMessage(app, `Log stream error: ${err.message}`);
    }
  );
}

async function confirmAction(
  app: BoardApp,
  question: string,
  onConfirm: () => Promise<void>
): Promise<void> {
  app.setInputMode("confirm");
  app.setModalState("confirm-delete");

  const value = await chooseOption(app, "Confirm", question, ["yes", "no"]);
  app.setModalState("none");
  app.setInputMode("normal");

  if (value !== "yes") {
    app.widgets.screen.render();
    return;
  }

  await onConfirm().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    appendBoardMessage(app, `Action failed: ${message}`);
  });

  app.widgets.screen.render();
}

async function promptSearch(app: BoardApp): Promise<void> {
  app.setInputMode("search");

  const prompt = blessed.prompt({
    top: "center",
    left: "center",
    width: 70,
    height: 10,
    border: { type: "line" },
    label: " Search ",
    keys: true,
    vi: true,
    style: {
      bg: "black",
      border: { fg: "cyan" },
    },
  });

  app.widgets.screen.append(prompt);
  app.widgets.screen.render();

  await new Promise<void>((resolve) => {
    (prompt as unknown as {
      input: (text: string, value: string, callback: (err: unknown, value: string) => void) => void;
    }).input("Search", app.filters.query, (err: unknown, value: string) => {
      void err;
      app.setSearchQuery(value ?? "");
      app.syncSelection();
      prompt.destroy();
      app.setInputMode("normal");
      appendBoardMessage(
        app,
        app.filters.query.trim()
          ? `Search query set to "${app.filters.query}".`
          : "Search cleared."
      );
      resolve();
    });
  });
}

async function promptFilter(app: BoardApp): Promise<void> {
  app.setInputMode("filter");

  const status = await askFilterValue(
    app,
    "Status filter",
    app.filters.status,
    "all | running | sleeping | paused | stopped"
  );
  if (status === null) {
    app.setInputMode("normal");
    return;
  }

  const intervalBucket = await askFilterValue(
    app,
    "Interval filter",
    app.filters.intervalBucket,
    "all | short | medium | long"
  );
  if (intervalBucket === null) {
    app.setInputMode("normal");
    return;
  }

  const recentActivity = await askFilterValue(
    app,
    "Activity filter",
    app.filters.recentActivity,
    "all | active | stale"
  );
  if (recentActivity === null) {
    app.setInputMode("normal");
    return;
  }

  if (isStatusFilter(status)) {
    app.setFilterStatus(status);
  }
  if (isIntervalFilter(intervalBucket)) {
    app.setFilterIntervalBucket(intervalBucket);
  }
  if (isActivityFilter(recentActivity)) {
    app.setFilterRecentActivity(recentActivity);
  }

  app.syncSelection();
  app.setInputMode("normal");
  appendBoardMessage(
    app,
    `Filters set: status=${app.filters.status}, interval=${app.filters.intervalBucket}, activity=${app.filters.recentActivity}.`
  );
  renderAll(app);
}

async function askFilterValue(
  app: BoardApp,
  label: string,
  initialValue: string,
  hint: string
): Promise<string | null> {
  const prompt = blessed.prompt({
    top: "center",
    left: "center",
    width: 70,
    height: 10,
    border: { type: "line" },
    label: ` ${label} `,
    keys: true,
    vi: true,
    style: {
      bg: "black",
      border: { fg: "cyan" },
    },
  });

  app.widgets.screen.append(prompt);
  app.widgets.screen.render();

  return new Promise((resolve) => {
    (prompt as unknown as {
      input: (text: string, value: string, callback: (err: unknown, value: string) => void) => void;
    }).input(`${label} (${hint})`, initialValue, (err: unknown, value: string) => {
      void err;
      prompt.destroy();
      app.widgets.screen.render();
      resolve((value ?? "").trim().toLowerCase() || null);
    });
  });
}

function isStatusFilter(
  value: string
): value is "all" | "running" | "sleeping" | "paused" | "stopped" {
  return ["all", "running", "sleeping", "paused", "stopped"].includes(value);
}

function isIntervalFilter(value: string): value is "all" | "short" | "medium" | "long" {
  return ["all", "short", "medium", "long"].includes(value);
}

function isActivityFilter(value: string): value is "all" | "active" | "stale" {
  return ["all", "active", "stale"].includes(value);
}

import { sendRequest } from "../client/ipc.js";
import { BoardApp } from "./app.js";
import { bindBoardEvents } from "./events.js";
import { appendBoardMessage, createBoardWidgets, renderAll } from "./render.js";

export async function launchDashboard(): Promise<void> {
  const app = new BoardApp(createBoardWidgets());
  let lastSnapshot = "";

  async function refresh(): Promise<void> {
    const wasStarting = app.daemonStatus === "starting";
    app.setLoadingState(wasStarting ? "starting" : "refreshing");
    try {
      const response = await sendRequest({ type: "list" });
      if (response.type === "ok") {
        app.setDaemonStatus("connected");
        app.loops = response.data as typeof app.loops;
        app.setLoadingState("idle");
        const snapshot = JSON.stringify(app.loops);
        if (snapshot !== lastSnapshot || wasStarting) {
          lastSnapshot = snapshot;
          renderAll(app);
        }
      }
    } catch (error: unknown) {
      app.setDaemonStatus("error");
      app.setLoadingState("idle");
      const message = error instanceof Error ? error.message : String(error);
      appendBoardMessage(app, `Refresh failed: ${message}`);
    }
  }

  bindBoardEvents(app, refresh);

  await refresh();
  if (app.loops.length > 0) {
    app.widgets.loopList.select(0);
    renderAll(app);
  }

  const interval = setInterval(async () => {
    await refresh();
  }, 3000);

  app.widgets.screen.on("destroy", () => {
    clearInterval(interval);
    app.destroyLogStream();
  });
}

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.js";
import { boardLog } from "./board-log.js";

export async function launchBoard(): Promise<void> {
  boardLog("board startup");
  process.on("uncaughtException", (error) => {
    boardLog("uncaught exception", error);
  });
  process.on("unhandledRejection", (reason) => {
    boardLog("unhandled rejection", reason);
  });

  const renderer = await createCliRenderer({ exitOnCtrlC: false });

  const quit = (): void => {
    try {
      renderer.destroy();
    } catch {
      // ignore teardown errors
    }
    process.stdout.write("\x1b[2J\x1b[3J\x1b[H");
    process.exit(0);
  };

  try {
    createRoot(renderer).render(<App onQuit={quit} />);
  } catch (error) {
    boardLog("render failure", error);
    throw error;
  }
}

import { createCliRenderer } from "@opentui/core";
import { createRoot } from "@opentui/react";
import { App } from "./App.js";

export async function launchBoard(): Promise<void> {
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

  createRoot(renderer).render(<App onQuit={quit} />);
}

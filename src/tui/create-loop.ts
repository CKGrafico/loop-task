import blessed from "blessed";
import { buildLoopOptions } from "../loop-config.js";
import { createBackgroundLoop } from "../client/commands.js";
import type { BoardApp } from "./app.js";
import { chooseOption } from "./popup.js";
import { appendBoardMessage } from "./render.js";

async function askText(
  app: BoardApp,
  label: string,
  initialValue = ""
): Promise<string | null> {
  return new Promise((resolve) => {
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

    (prompt as unknown as {
      input: (text: string, value: string, callback: (err: unknown, value: string) => void) => void;
    }).input(label, initialValue, (err: unknown, value: string) => {
      void err;
      prompt.destroy();
      app.widgets.screen.render();
      resolve(value ?? null);
    });
  });
}

async function askYesNo(app: BoardApp, question: string): Promise<boolean | null> {
  const value = await chooseOption(app, "Confirm", question, ["yes", "no"]);
  if (value === "yes") {
    return true;
  }
  if (value === "no") {
    return false;
  }
  return null;
}

export async function openCreateLoopWizard(
  app: BoardApp,
  refresh: () => Promise<void>
): Promise<void> {
  app.setModalState("create-loop");
  app.setInputMode("create");

  const intervalHuman = await askText(app, "Interval", "30m");
  if (intervalHuman === null) {
    app.setInputMode("normal");
    return;
  }

  const command = await askText(app, "Command", "");
  if (command === null || !command.trim()) {
    app.setInputMode("normal");
    appendBoardMessage(app, "Create loop cancelled: command is required.");
    return;
  }

  const argsInput = await askText(app, "Arguments", "");
  if (argsInput === null) {
    app.setInputMode("normal");
    return;
  }

  const runNow = await askYesNo(app, "Run immediately?");
  if (runNow === null) {
    app.setInputMode("normal");
    return;
  }

  const maxRunsInput = await askText(app, "Max runs (optional)", "");
  if (maxRunsInput === null) {
    app.setInputMode("normal");
    return;
  }

  try {
    const built = buildLoopOptions(
      intervalHuman.trim(),
      command.trim(),
      argsInput.trim() ? argsInput.trim().split(/\s+/) : [],
      {
        now: runNow,
        maxRuns: maxRunsInput.trim() || null,
        verbose: false,
      }
    );

    const id = await createBackgroundLoop(built.options, built.intervalHuman);
    await refresh();
    appendBoardMessage(app, `Started loop ${id}.`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    appendBoardMessage(app, `Failed to start loop: ${message}`);
  } finally {
    app.setModalState("none");
    app.setInputMode("normal");
  }
}

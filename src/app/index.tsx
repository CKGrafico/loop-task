import { render } from "ink";
import React from "react";
import { App } from "./App.js";
import { BRACKETED_PASTE_ENABLE, BRACKETED_PASTE_DISABLE, USER_TIMING_SWEEP_MS } from "../shared/config/constants.js";
import { InversifyProvider } from "../shared/providers/InversifyProvider.js";

// Node retains every performance.mark()/measure() entry until cleared.
// React's development build emits them on each render, so a long-lived board
// session grows the buffer without bound (#54). Sweeping keeps it flat no
// matter which React build is loaded or what NODE_ENV the user exported.
function startUserTimingSweep(): void {
  const timer = setInterval(() => {
    performance.clearMarks();
    performance.clearMeasures();
  }, USER_TIMING_SWEEP_MS);
  timer.unref();
}

export async function launchBoard(): Promise<void> {
  startUserTimingSweep();
  process.stdout.write(BRACKETED_PASTE_ENABLE);
  const disableBracketedPaste = () => process.stdout.write(BRACKETED_PASTE_DISABLE);

  const instance = render(React.createElement(
    InversifyProvider,
    null,
    React.createElement(App, {
      onQuit: () => {
        disableBracketedPaste();
        instance.unmount();
      }
    }),
  ));

  process.on("exit", disableBracketedPaste);

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    disableBracketedPaste();
    instance.unmount();
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
}

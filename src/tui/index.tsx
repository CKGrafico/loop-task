import { render } from "ink";
import React from "react";
import { App } from "./App.js";
import { BRACKETED_PASTE_ENABLE, BRACKETED_PASTE_DISABLE } from "../config/constants.js";

export async function launchBoard(): Promise<void> {
  // Enable bracketed paste so a native paste (Ctrl+Shift+V / Cmd+V / right-click)
  // arrives as one delimited chunk instead of a stream of keypresses.
  process.stdout.write(BRACKETED_PASTE_ENABLE);
  const disableBracketedPaste = () => process.stdout.write(BRACKETED_PASTE_DISABLE);

  const instance = render(React.createElement(App, {
    onQuit: () => {
      disableBracketedPaste();
      instance.unmount();
    }
  }));

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

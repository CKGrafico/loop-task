import { render } from "ink";
import React from "react";
import { App } from "./App.js";

export async function launchBoard(): Promise<void> {
  const instance = render(React.createElement(App, { onQuit: () => {
    instance.unmount();
  }}));

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    instance.unmount();
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    console.error("Unhandled rejection:", reason);
  });
}

#!/usr/bin/env node

// React (used by the Ink board) picks its build from NODE_ENV. Without it,
// the development build loads, and React 19.2's per-render performance
// instrumentation accumulates PerformanceMeasure entries in Node's global
// user-timing buffer without bound — the TUI reaches the heap limit within
// minutes (#54). The marker lets command execution strip the injected value
// so user commands still see the environment they were given.
if (process.env.NODE_ENV === undefined) {
  process.env.NODE_ENV = "production";
  process.env.LOOP_TASK_DEFAULTED_NODE_ENV = "1";
}

import { register } from "node:module";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
register(pathToFileURL(join(__dirname, "esm-loader.js")).href);

import("./cli.js");

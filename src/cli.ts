#!/usr/bin/env node

import { parseDuration } from "./duration.js";
import { Logger } from "./logger.js";
import { runLoop } from "./loop.js";
import type { LoopOptions } from "./types.js";

const args = process.argv.slice(2);

const loopOptions = {
  immediate: false,
  maxRuns: null as number | null,
  verbose: false,
};

const commandParts: string[] = [];
let i = 0;

while (i < args.length) {
  const arg = args[i];

  if (arg === "--immediate") {
    loopOptions.immediate = true;
    i++;
  } else if (arg === "--max-runs") {
    i++;
    const n = parseInt(args[i], 10);
    if (isNaN(n) || n < 1) {
      console.error("Error: --max-runs must be a positive integer");
      process.exit(1);
    }
    loopOptions.maxRuns = n;
    i++;
  } else if (arg === "--verbose") {
    loopOptions.verbose = true;
    i++;
  } else if (arg === "--help" || arg === "-h") {
    console.log(`
Usage:
  loop-task [options] <interval> <command>

Examples:
  loop-task 30m npm test
  loop-task 1h opencode --prompt '/ob-init'
  loop-task 30s --immediate -- echo hello
  loop-task --max-runs 5 5m npm test

Options:
  --immediate     Run immediately before waiting
  --max-runs <n>  Stop after N executions
  --verbose       Show execution details
  -h, --help      Display help
  -V, --version   Display version
`);
    process.exit(0);
  } else if (arg === "--version" || arg === "-V") {
    console.log("1.0.0");
    process.exit(0);
  } else if (arg === "--") {
    i++;
    commandParts.push(...args.slice(i));
    break;
  } else {
    commandParts.push(arg);
    i++;
  }
}

if (commandParts.length < 2) {
  console.error("Error: missing required arguments");
  console.error("Usage: loop-task [options] <interval> <command>");
  process.exit(1);
}

const intervalStr = commandParts[0];
const command = commandParts.slice(1).join(" ");

const logger = new Logger(loopOptions.verbose);

let interval: number;
try {
  interval = parseDuration(intervalStr);
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  logger.error(`Error: ${message}`);
  process.exit(1);
}

const options: LoopOptions = {
  interval,
  command,
  immediate: loopOptions.immediate,
  maxRuns: loopOptions.maxRuns,
  verbose: loopOptions.verbose,
};

const controller = new AbortController();

process.on("SIGINT", () => controller.abort());
process.on("SIGTERM", () => controller.abort());

await runLoop(options, logger, controller.signal);
process.exit(0);

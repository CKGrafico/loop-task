#!/usr/bin/env node

import { Command } from "commander";
import { parseDuration } from "./duration.js";
import { Logger } from "./logger.js";
import { runLoop } from "./loop.js";
import type { LoopOptions } from "./types.js";

const program = new Command();

program
  .name("loop")
  .description(
    "Repeatedly execute a shell command at a human-readable interval"
  )
  .version("1.0.0")
  .argument("<interval>", "Interval between runs (e.g. 10s, 5m, 1h, 1d, 1w)")
  .argument("<command...>", "Command to execute")
  .option("--immediate", "Run immediately before waiting", false)
  .option("--max-runs <n>", "Stop after N executions", (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) {
      throw new Error("--max-runs must be a positive integer");
    }
    return n;
  }, null)
  .option("--verbose", "Show execution details", false)
  .enablePositionalOptions()
  .passThroughOptions()
  .addHelpText(
    "before",
    `
Usage:
  loop [options] <interval> <command>

Examples:
  loop 30m npm test
  loop 1h opencode --prompt '/ob-init'
  loop --immediate 1h npm test
  loop --max-runs 5 5m npm test
`
  )
  .action(async (intervalStr: string, commandParts: string[], opts: Record<string, unknown>) => {
    const logger = new Logger(opts.verbose as boolean);

    let interval: number;
    try {
      interval = parseDuration(intervalStr);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Error: ${message}`);
      process.exit(1);
    }

    const command = commandParts.join(" ");

    const options: LoopOptions = {
      interval,
      command,
      immediate: opts.immediate as boolean,
      maxRuns: opts.maxRuns as number | null,
      verbose: opts.verbose as boolean,
    };

    const controller = new AbortController();

    process.on("SIGINT", () => controller.abort());
    process.on("SIGTERM", () => controller.abort());

    await runLoop(options, logger, controller.signal);
    process.exit(0);
  });

program.parse();

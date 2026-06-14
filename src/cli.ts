#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { Logger } from "./logger.js";
import { runLoop } from "./loop.js";
import { buildLoopOptions } from "./loop-config.js";
import { startLoop } from "./client/commands.js";
import { launchDashboard } from "./tui/dashboard.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

const program = new Command();

program
  .name("loop-task")
  .description("Open the loop board or start loops in the background.")
  .version(packageJson.version, "-V, --version");

program
  .command("start")
  .description("Start a loop in the background")
  .argument("<interval>", "Interval between runs (e.g. 30s, 5m, 1h)")
  .argument("<command...>", "Command to execute")
  .option("--now", "Run immediately before waiting", false)
  .option("--max-runs <n>", "Stop after N executions", parseInt)
  .option("--verbose", "Show execution details", false)
  .action(
    async (
      intervalStr: string,
      cmdArgs: string[],
      opts: { now: boolean; maxRuns?: number; verbose: boolean }
    ) => {
      const built = buildLoopOptions(intervalStr, cmdArgs[0], cmdArgs.slice(1), opts);
      await startLoop(built.options, built.intervalHuman);
    }
  );

program
  .command("run")
  .description("Run a loop in the foreground")
  .argument("<interval>", "Interval between runs (e.g. 30s, 5m, 1h)")
  .argument("<command...>", "Command to execute")
  .option("--now", "Run immediately before waiting")
  .option("--max-runs <n>", "Stop after N executions")
  .option("--verbose", "Show execution details")
  .action(
    async (
      intervalStr: string | undefined,
      cmdArgs: string[] | undefined,
      opts: { now?: boolean; maxRuns?: string; verbose?: boolean }
    ) => {
      if (!intervalStr || !cmdArgs || cmdArgs.length === 0) {
        program.help();
        return;
      }

      const logger = new Logger(opts.verbose ?? false);
      const built = buildLoopOptions(intervalStr, cmdArgs[0], cmdArgs.slice(1), opts);

      const controller = new AbortController();
      process.on("SIGINT", () => controller.abort());
      process.on("SIGTERM", () => controller.abort());

      await runLoop(built.options, logger, controller.signal);
      process.exit(0);
    }
  );

program.action(async () => {
  await launchDashboard();
});

await program.parseAsync(process.argv);

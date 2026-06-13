#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { parseDuration } from "./duration.js";
import { Logger } from "./logger.js";
import { runLoop } from "./loop.js";
import type { LoopOptions } from "./types.js";
import {
  startLoop,
  listLoops,
  showStatus,
  pauseLoop,
  resumeLoop,
  deleteLoop,
  viewLogs,
  attachLoop,
} from "./client/commands.js";
import { launchDashboard } from "./tui/dashboard.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

const program = new Command();

program
  .name("loop-task")
  .description("Run commands on an interval. Manage loops in the background.")
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
      const interval = parseDuration(intervalStr);
      const options: LoopOptions = {
        interval,
        command: cmdArgs[0],
        commandArgs: cmdArgs.slice(1),
        immediate: opts.now,
        maxRuns: opts.maxRuns ?? null,
        verbose: opts.verbose,
      };
      await startLoop(options, intervalStr);
    }
  );

program
  .command("list")
  .alias("ls")
  .description("List all background loops")
  .action(async () => {
    await listLoops();
  });

program
  .command("status")
  .description("Show detailed status of a loop")
  .argument("<id>", "Loop ID")
  .action(async (id: string) => {
    await showStatus(id);
  });

program
  .command("attach")
  .description("Attach to a loop's output stream")
  .argument("<id>", "Loop ID")
  .action(async (id: string) => {
    await attachLoop(id);
  });

program
  .command("pause")
  .description("Pause a running loop")
  .argument("<id>", "Loop ID")
  .action(async (id: string) => {
    await pauseLoop(id);
  });

program
  .command("resume")
  .description("Resume a paused loop")
  .argument("<id>", "Loop ID")
  .action(async (id: string) => {
    await resumeLoop(id);
  });

program
  .command("delete")
  .alias("rm")
  .description("Stop and delete a loop")
  .argument("<id>", "Loop ID")
  .action(async (id: string) => {
    await deleteLoop(id);
  });

program
  .command("logs")
  .description("View a loop's logs")
  .argument("<id>", "Loop ID")
  .option("-f, --follow", "Follow log output", false)
  .option("-n, --tail <n>", "Number of lines to show", "50")
  .action(
    async (
      id: string,
      opts: { follow: boolean; tail: string }
    ) => {
      await viewLogs(id, opts.follow, parseInt(opts.tail, 10));
    }
  );

program
  .command("dashboard")
  .description("Launch interactive TUI dashboard")
  .action(async () => {
    await launchDashboard();
  });

program
  .argument("[interval]", "Interval between runs (foreground mode)")
  .argument("[command...]", "Command to execute")
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

      const interval = parseDuration(intervalStr);
      const logger = new Logger(opts.verbose ?? false);

      const options: LoopOptions = {
        interval,
        command: cmdArgs[0],
        commandArgs: cmdArgs.slice(1),
        immediate: opts.now ?? false,
        maxRuns: opts.maxRuns ? parseInt(opts.maxRuns, 10) : null,
        verbose: opts.verbose ?? false,
      };

      const controller = new AbortController();
      process.on("SIGINT", () => controller.abort());
      process.on("SIGTERM", () => controller.abort());

      await runLoop(options, logger, controller.signal);
      process.exit(0);
    }
  );

await program.parseAsync(process.argv);

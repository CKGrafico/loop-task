#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { Logger } from "./logger.js";
import { runLoop } from "./core/foreground-loop.js";
import { buildLoopOptions } from "./loop-config.js";
import { startLoop } from "./client/commands.js";
import { t } from "./i18n/index.js";

const require = createRequire(import.meta.url);
const packageJson = require("../package.json") as { version: string };

const program = new Command();

program
  .name("loop-task")
  .description(t("cli.programDescription"))
  .version(packageJson.version, "-V, --version");

program
  .command("start")
  .description(t("cli.startDescription"))
  .argument("<interval>", t("cli.argInterval"))
  .argument("<command...>", t("cli.argCommand"))
  .option("--now", t("cli.optNow"), false)
  .option("--max-runs <n>", t("cli.optMaxRuns"), parseInt)
  .option("--verbose", t("cli.optVerbose"), false)
  .option("--cwd <dir>", t("cli.optCwd"))
  .action(
    async (
      intervalStr: string,
      cmdArgs: string[],
      opts: { now: boolean; maxRuns?: number; verbose: boolean; cwd?: string }
    ) => {
      const built = buildLoopOptions(intervalStr, cmdArgs[0], cmdArgs.slice(1), {
        ...opts,
        cwd: opts.cwd ?? process.cwd(),
      });
      await startLoop(built.options, built.intervalHuman);
    }
  );

program
  .command("run")
  .description(t("cli.runDescription"))
  .argument("<interval>", t("cli.argInterval"))
  .argument("<command...>", t("cli.argCommand"))
  .option("--now", t("cli.optNow"))
  .option("--max-runs <n>", t("cli.optMaxRuns"))
  .option("--verbose", t("cli.optVerbose"))
  .option("--cwd <dir>", t("cli.optCwd"))
  .action(
    async (
      intervalStr: string | undefined,
      cmdArgs: string[] | undefined,
      opts: { now?: boolean; maxRuns?: string; verbose?: boolean; cwd?: string }
    ) => {
      if (!intervalStr || !cmdArgs || cmdArgs.length === 0) {
        program.help();
        return;
      }

      const logger = new Logger(opts.verbose ?? false);
      const built = buildLoopOptions(intervalStr, cmdArgs[0], cmdArgs.slice(1), {
        ...opts,
        cwd: opts.cwd ?? process.cwd(),
      });

      const controller = new AbortController();
      process.on("SIGINT", () => controller.abort());
      process.on("SIGTERM", () => controller.abort());

      await runLoop(built.options, logger, controller.signal);
      process.exit(0);
    }
  );

program.action(async () => {
  if (!process.execPath.includes("bun")) {
    const { spawn } = await import("node:child_process");
    const child = spawn("bun", [process.argv[1]], {
      stdio: "inherit",
      env: { ...process.env },
      shell: true,
    });
    child.on("error", () => {
      console.error(
        "The board requires the Bun runtime for OpenTUI native FFI.\n" +
        "Install Bun: npm install -g bun\n" +
        "Then run: loop-task"
      );
      process.exit(1);
    });
    child.on("exit", (code) => process.exit(code ?? 0));
    return;
  }
  const { launchBoard } = await import("./board/index.js");
  await launchBoard();
});

await program.parseAsync(process.argv);

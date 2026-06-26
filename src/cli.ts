#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "node:module";
import { Logger } from "./logger.js";
import { runLoop } from "./core/foreground-loop.js";
import { buildLoopOptions } from "./loop-config.js";
import { parseDuration } from "./duration.js";
import { startLoop } from "./client/commands.js";
import {
  listProjectsCli,
  createProjectCli,
  renameProjectCli,
  setProjectColorCli,
  deleteProjectCli,
  resolveProjectId,
} from "./client/commands.js";
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
  .action(async () => {
    const { ensureDaemon } = await import("./daemon/spawner.js");
    ensureDaemon();
    console.log(t("cli.daemonStarted"));
  });

program
  .command("stop")
  .description("Stop a running loop and interrupt its current execution")
  .argument("<id>", "Loop ID")
  .action(async (id: string) => {
    try {
      const { sendRequest } = await import("./client/ipc.js");
      const res = await sendRequest({ type: "stop-loop", payload: { id } });
      if (res.type === "ok" && res.data) {
        console.log(`Stopped loop ${id}`);
      } else if (res.type === "error") {
        console.error(res.message);
        process.exit(1);
      } else {
        console.error(`Loop ${id} not found`);
        process.exit(1);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(t("cli.error", { message }));
      process.exit(1);
    }
  });

program
  .command("restart")
  .description("Kill the daemon and all running loops, then restart fresh")
  .action(async () => {
    const { stopDaemon, ensureDaemon } = await import("./daemon/spawner.js");
    const { readDaemonPid, removeDaemonPid, removeDaemonSignature } = await import("./daemon/state.js");
    const pid = readDaemonPid();
    if (pid !== null) {
      console.log("Stopping daemon...");
      stopDaemon(pid);
      removeDaemonPid();
      removeDaemonSignature();
    }
    console.log("Starting fresh daemon...");
    ensureDaemon();
    console.log("Daemon restarted.");
  });

program
  .command("new")
  .description(t("cli.newDescription"))
  .argument("<interval>", t("cli.argInterval"))
  .argument("<command...>", t("cli.argCommand"))
  .option("--now", t("cli.optNow"), false)
  .option("--max-runs <n>", t("cli.optMaxRuns"), parseInt)
  .option("--verbose", t("cli.optVerbose"), false)
  .option("--cwd <dir>", t("cli.optCwd"))
  .option("--project <name>", t("cli.optProject"))
  .option("--offset <duration>", "Phase offset (e.g. 5m, 15m)")
  .action(
    async (
      intervalStr: string,
      cmdArgs: string[],
      opts: { now: boolean; maxRuns?: number; verbose: boolean; cwd?: string; project?: string; offset?: string }
    ) => {
      try {
        const projectId = opts.project
          ? await resolveProjectId(opts.project)
          : undefined;
        const offsetMs = opts.offset ? parseDuration(opts.offset) : null;
        const built = buildLoopOptions(intervalStr, {
          ...opts,
          command: cmdArgs[0],
          commandArgs: cmdArgs.slice(1),
          cwd: opts.cwd ?? process.cwd(),
          projectId,
          offset: offsetMs,
        });
        await startLoop(built.options, built.intervalHuman);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(t("cli.error", { message }));
        process.exit(1);
      }
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
      const built = buildLoopOptions(intervalStr, {
        ...opts,
        command: cmdArgs[0],
        commandArgs: cmdArgs.slice(1),
        cwd: opts.cwd ?? process.cwd(),
      });

      const controller = new AbortController();
      process.on("SIGINT", () => controller.abort());
      process.on("SIGTERM", () => controller.abort());

      await runLoop(built.options, logger, controller.signal);
      process.exit(0);
    }
  );

const projectCmd = program.command("project").description(t("cli.projectDescription"));

projectCmd
  .command("list")
  .description(t("cli.projectListDescription"))
  .action(async () => {
    await listProjectsCli();
  });

projectCmd
  .command("new")
  .description(t("cli.projectNewDescription"))
  .argument("<name>", t("cli.projectArgName"))
  .option("--color <color>", t("cli.optProjectColor"))
  .action(async (name: string, opts: { color?: string }) => {
    await createProjectCli(name, opts.color);
  });

projectCmd
  .command("rename")
  .description(t("cli.projectRenameDescription"))
  .argument("<id-or-name>", t("cli.projectArgIdOrName"))
  .argument("<new-name>", t("cli.projectArgNewName"))
  .action(async (idOrName: string, newName: string) => {
    await renameProjectCli(idOrName, newName);
  });

projectCmd
  .command("color")
  .description(t("cli.projectColorDescription"))
  .argument("<id-or-name>", t("cli.projectArgIdOrName"))
  .argument("<color>", t("cli.projectArgColor"))
  .action(async (idOrName: string, color: string) => {
    await setProjectColorCli(idOrName, color);
  });

projectCmd
  .command("delete")
  .description(t("cli.projectDeleteDescription"))
  .argument("<id-or-name>", t("cli.projectArgIdOrName"))
  .action(async (idOrName: string) => {
    await deleteProjectCli(idOrName);
  });

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

/**
 * launch.ts — Start the loop-task CLI deterministically for evidence capture.
 *
 * For a CLI app, "launch" means: prepare a temp LOOP_CLI_HOME, optionally
 * start the daemon, and return a handle for running subcommands.
 *
 * No headless browser needed — we capture stdout/stderr from the CLI itself.
 */

import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execaNode } from "execa";

export interface CliHandle {
  /** Temp LOOP_CLI_HOME directory (isolated state) */
  homeDir: string;
  /** Run a CLI subcommand and return stdout + exit code */
  run: (args: string[], timeoutMs?: number) => Promise<CliResult>;
  /** Clean up temp directory */
  cleanup: () => void;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

/** Path to the CLI entry point (dev mode via tsx) */
const CLI_PATH = join(process.cwd(), "src", "cli.ts");

export function launch(): CliHandle {
  const homeDir = mkdtempSync(join(tmpdir(), "loop-task-evidence-"));

  // Ensure subdirs exist
  mkdirSync(join(homeDir, "logs"), { recursive: true });

  const env = {
    ...process.env,
    LOOP_CLI_HOME: homeDir,
    // Force no interactive TTY
    CI: "true",
    TERM: "dumb",
  };

  return {
    homeDir,

    async run(
      args: string[],
      timeoutMs = 30_000,
    ): Promise<CliResult> {
      try {
        const result = await execaNode(CLI_PATH, args, {
          nodeOptions: ["--import", "tsx"],
          env,
          timeout: timeoutMs,
          reject: false,
        });

        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode ?? 1,
          timedOut: result.timedOut ?? false,
        };
      } catch (err: unknown) {
        return {
          stdout: "",
          stderr: String(err),
          exitCode: 1,
          timedOut: false,
        };
      }
    },

    cleanup() {
      try {
        rmSync(homeDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    },
  };
}

/**
 * scenario-registry.ts — Map change IDs to CLI scenarios with assertions.
 *
 * A scenario runs CLI commands, asserts on output/exit-code, and names
 * capture checkpoints. Returns `blocked` for unknown change IDs.
 */

import type { CliHandle } from "./launch.js";
import type { CaptureCheckpoint } from "./capture.js";

export interface ScenarioStep {
  /** CLI args (without the binary name) */
  args: string[];
  /** Human-readable label for the checkpoint */
  label: string;
  /** Assertion on the result. Throw to fail the scenario. */
  assert: (result: { stdout: string; stderr: string; exitCode: number }) => void;
}

export interface Scenario {
  changeId: string;
  steps: ScenarioStep[];
}

type ScenarioFactory = (cli: CliHandle) => Promise<Scenario>;

const registry = new Map<string, ScenarioFactory>();

/** Register a scenario factory for a change ID */
export function register(changeId: string, factory: ScenarioFactory): void {
  registry.set(changeId, factory);
}

/** Look up and run a scenario. Returns `blocked` for unknown IDs. */
export async function runScenario(
  changeId: string,
  cli: CliHandle,
): Promise<{ status: "passed" | "failed" | "blocked"; checkpoints: CaptureCheckpoint[]; failedStep?: string }> {
  const factory = registry.get(changeId);

  if (!factory) {
    return { status: "blocked", checkpoints: [] };
  }

  const scenario = await factory(cli);
  const checkpoints: CaptureCheckpoint[] = [];

  for (const step of scenario.steps) {
    const result = await cli.run(step.args);

    try {
      step.assert(result);
    } catch {
      // Still capture on failure for debugging
      checkpoints.push({
        label: step.label,
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
      });

      return {
        status: "failed",
        checkpoints,
        failedStep: step.label,
      };
    }

    checkpoints.push({
      label: step.label,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    });
  }

  return { status: "passed", checkpoints };
}

// ─── Sample scenario: verify the CLI starts and shows help ───

register("sample-cli-help", async (_cli) => ({
  changeId: "sample-cli-help",
  steps: [
    {
      args: ["--help"],
      label: "Help output",
      assert: (r) => {
        if (r.exitCode !== 0) {
          throw new Error(`Expected exit code 0, got ${r.exitCode}`);
        }
        if (!r.stdout.includes("loop-task")) {
          throw new Error("Help output missing 'loop-task'");
        }
        if (!r.stdout.includes("Commands:")) {
          throw new Error("Help output missing 'Commands:'");
        }
      },
    },
  ],
}));

// ─── Sample scenario: verify version command ───

register("sample-version", async (_cli) => ({
  changeId: "sample-version",
  steps: [
    {
      args: ["--version"],
      label: "Version output",
      assert: (r) => {
        if (r.exitCode !== 0) {
          throw new Error(`Expected exit code 0, got ${r.exitCode}`);
        }
        if (!r.stdout.match(/\d+\.\d+\.\d+/)) {
          throw new Error(`Version output doesn't match semver: ${r.stdout}`);
        }
      },
    },
  ],
}));

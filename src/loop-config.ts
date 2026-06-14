import { parseDuration } from "./duration.js";
import type { LoopOptions } from "./types.js";

export interface LoopCommandOptionsInput {
  now?: boolean;
  maxRuns?: number | string | null;
  verbose?: boolean;
}

export interface BuiltLoopOptions {
  intervalHuman: string;
  options: LoopOptions;
}

export function parseMaxRuns(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error("--max-runs must be a positive integer");
  }

  return parsed;
}

export function buildLoopOptions(
  intervalHuman: string,
  command: string,
  commandArgs: string[],
  input: LoopCommandOptionsInput = {}
): BuiltLoopOptions {
  if (!command.trim()) {
    throw new Error("Command cannot be empty");
  }

  return {
    intervalHuman,
    options: {
      interval: parseDuration(intervalHuman),
      command,
      commandArgs,
      immediate: input.now ?? false,
      maxRuns: parseMaxRuns(input.maxRuns),
      verbose: input.verbose ?? false,
    },
  };
}

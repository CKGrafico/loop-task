import { parseDuration } from "./duration.js";
import { t } from "./i18n/index.js";
import type { LoopOptions } from "./types.js";

export interface LoopCommandOptionsInput {
  now?: boolean;
  maxRuns?: number | string | null;
  verbose?: boolean;
  description?: string;
  taskId?: string | null;
  command?: string;
  commandArgs?: string[];
  cwd?: string;
  projectId?: string;
  offset?: number | null;
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
    throw new Error(t("errors.maxRunsInvalid"));
  }

  return parsed;
}

export function parseCommandLine(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let hasToken = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === "\\" && quote === '"' && i + 1 < input.length) {
        i += 1;
        current += input[i];
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
      continue;
    }

    if (char === " " || char === "\t") {
      if (hasToken) {
        tokens.push(current);
        current = "";
        hasToken = false;
      }
      continue;
    }

    current += char;
    hasToken = true;
  }

  if (quote) {
    throw new Error(t("errors.unbalancedQuote"));
  }

  if (hasToken) {
    tokens.push(current);
  }

  return tokens;
}

export function buildLoopOptions(
  intervalHuman: string,
  input: LoopCommandOptionsInput = {}
): BuiltLoopOptions {
  const command = input.command ?? "";
  const commandArgs = input.commandArgs ?? [];
  const taskId = input.taskId ?? null;

  if (!taskId && !command.trim()) {
    throw new Error(t("errors.commandEmpty"));
  }

  const description = input.description?.trim() ?? "";
  if (!description) {
    throw new Error(t("errors.descriptionEmpty"));
  }

  return {
    intervalHuman,
    options: {
      interval: parseDuration(intervalHuman),
      taskId,
      command,
      commandArgs,
      cwd: input.cwd ?? "",
      immediate: input.now ?? false,
      maxRuns: parseMaxRuns(input.maxRuns),
      verbose: input.verbose ?? false,
      description,
      projectId: input.projectId ?? "default",
      offset: input.offset ?? null,
    },
  };
}

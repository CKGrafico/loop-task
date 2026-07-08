import { parseDuration } from "./duration.js";
import { t } from "./shared/i18n/index.js";
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
  context?: Record<string, unknown>;
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
      } else if (char === "\\" && quote === '"') {
        if (i + 1 < input.length) {
          i += 1;
          current += input[i];
        } else {
          current += char;
        }
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

export function joinCommandLines(text: string): string {
  // Quote-aware split: don't split on newlines inside quoted strings
  const segments: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (quote) {
      if (char === quote) {
        quote = null;
      } else if (char === "\\" && quote === '"' && i + 1 < text.length) {
        current += char + text[i + 1];
        i += 1;
        continue;
      }
      current += char;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === "\n") {
      segments.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  segments.push(current);

  // Join segments according to backslash-continuation rules:
  // - Empty/whitespace-only segments are dropped
  // - Segment ending with \: backslash consumed, joins to next with NO added space
  // - Segment NOT ending with \: joins to next with a single space
  // Leading whitespace on each line is trimmed (indentation); trailing whitespace
  // before \ is preserved (it's part of the content — e.g. separates tokens).
  let result = "";
  let prevContinued = false; // true if previous segment ended with \

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed === "") continue;

    const endsBackslash = trimmed.endsWith("\\");
    const content = endsBackslash ? trimmed.slice(0, -1) : trimmed;

    if (result === "") {
      result = content;
    } else if (prevContinued) {
      result += content;
    } else {
      result += " " + content;
    }

    prevContinued = endsBackslash;
  }

  return result;
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

  const parsedInterval = parseDuration(intervalHuman);
  const isManual = parsedInterval === 0;
  const normalizedIntervalHuman = isManual ? "manual" : intervalHuman;

  return {
    intervalHuman: normalizedIntervalHuman,
    options: {
      interval: parsedInterval,
      taskId,
      command,
      commandArgs,
      cwd: input.cwd ?? "",
      immediate: isManual ? false : (input.now ?? false),
      maxRuns: parseMaxRuns(input.maxRuns),
      verbose: input.verbose ?? false,
      description,
      projectId: input.projectId ?? "default",
      offset: input.offset ?? null,
      context: input.context,
    },
  };
}

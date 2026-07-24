import fs from "node:fs";
import { writeFileAtomic } from "../../shared/fs-utils.js";

type SelfWriteNotifier = (filePath: string, content: string) => void;

let selfWriteNotifier: SelfWriteNotifier | null = null;

export function setRecipeSelfWriteNotifier(notifier: SelfWriteNotifier | null): void {
  selfWriteNotifier = notifier;
}

export interface RecipeOverrideFields {
  intervalHuman?: string;
  maxRuns?: number | null;
  context?: Record<string, unknown>;
}

export function writeRecipeOverrides(
  filePath: string,
  overrides: RecipeOverrideFields,
): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Recipe file not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw) as Record<string, unknown>;

  if (!Array.isArray(data.loops) || data.loops.length === 0) {
    throw new Error(`Recipe file has no loops: ${filePath}`);
  }

  const loop = data.loops[0] as Record<string, unknown>;

  if (overrides.intervalHuman !== undefined) {
    loop.intervalHuman = overrides.intervalHuman;
  }
  if (overrides.maxRuns !== undefined) {
    loop.maxRuns = overrides.maxRuns;
  }
  if (overrides.context !== undefined) {
    loop.context = overrides.context;
  }

  const content = JSON.stringify(data, null, 2);
  writeFileAtomic(filePath, content);

  if (selfWriteNotifier) {
    selfWriteNotifier(filePath, content);
  }
}

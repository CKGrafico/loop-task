import fs from "node:fs";
import { parseDuration } from "../../duration.js";
import { parseMaxRuns } from "../../loop-config.js";
import { t } from "../i18n/index.js";

type ValidateFn = (value: string, options?: { taskMode?: string; allValues?: Record<string, string> }) => string | null;

const validators: Record<string, ValidateFn> = {
  name(value) {
    if (!value.trim()) return t("errors.commandEmpty");
    return null;
  },

  interval(value) {
    if (!value.trim()) return null;
    try {
      parseDuration(value);
      return null;
    } catch (err: unknown) {
      return err instanceof Error ? err.message : t("wizard.validationError");
    }
  },

  command(value, options) {
    if (options?.taskMode === "existing") return null;
    if (!value.trim()) return t("errors.commandEmpty");
    return null;
  },

  description(value) {
    if (!value.trim()) return null;
    return null;
  },

  maxRuns(value) {
    if (!value.trim()) return null;
    try {
      parseMaxRuns(value);
      return null;
    } catch (err: unknown) {
      return err instanceof Error ? err.message : t("wizard.validationError");
    }
  },

  cwd(value) {
    if (!value.trim()) return null;
    if (!fs.existsSync(value)) return t("board.cwdMissing", { cwd: value });
    return null;
  },
};

export function validateField(
  key: string,
  value: string,
  options?: { taskMode?: string; allValues?: Record<string, string> },
): string | null {
  const fn = validators[key];
  return fn ? fn(value, options) : null;
}

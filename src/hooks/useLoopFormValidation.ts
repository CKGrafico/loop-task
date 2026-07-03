import fs from "node:fs";
import { parseDuration } from "../duration.js";
import { parseMaxRuns } from "../loop-config.js";
import { t } from "../i18n/index.js";

// ── Types ───────────────────────────────────────────────────────────

export const createFields = [
  "interval",
  "taskMode",
  "command",
  "cwd",
  "taskId",
  "description",
  "runNow",
  "maxRuns",
  "project",
] as const;

export type CreateField = (typeof createFields)[number];

// ── Validation ──────────────────────────────────────────────────────

/**
 * Validates a single loop form field and returns an error string, or
 * `null` if the value is valid.
 *
 * Mirrors the validation logic used in the board's CreateForm submit()
 * and the TUI's validation utility, but in a single shared hook that
 * both surfaces can consume.
 *
 * @param key   - The field to validate.
 * @param values - All form values (needed for cross-field rules like
 *                 "command is required only when taskMode is inline").
 */
function validateField(
  key: CreateField,
  values: Record<CreateField, string>,
): string | null {
  const value = values[key] ?? "";

  switch (key) {
    // ── interval ──────────────────────────────────────────────────
    // Always required; delegates to parseDuration() which throws on
    // empty, invalid syntax, or non-positive values.
    case "interval": {
      if (!value.trim()) {
        return t("errors.durationEmpty");
      }
      try {
        parseDuration(value);
        return null;
      } catch (err: unknown) {
        return err instanceof Error ? err.message : String(err);
      }
    }

    // ── command ───────────────────────────────────────────────────
    // Required only when the user chose inline mode.
    case "command": {
      if (values.taskMode === "existing") return null;
      if (!value.trim()) {
        return t("errors.commandEmpty");
      }
      return null;
    }

    // ── cwd ───────────────────────────────────────────────────────
    // Optional; if provided the directory must exist on disk.
    case "cwd": {
      if (!value.trim()) return null;
      if (!fs.existsSync(value)) {
        return t("board.cwdMissing", { cwd: value });
      }
      return null;
    }

    // ── description ───────────────────────────────────────────────
    // Always required.
    case "description": {
      if (!value.trim()) {
        return t("errors.descriptionEmpty");
      }
      return null;
    }

    // ── maxRuns ───────────────────────────────────────────────────
    // Optional; if provided it must be a positive integer.
    case "maxRuns": {
      if (!value.trim()) return null;
      try {
        parseMaxRuns(value);
        return null;
      } catch (err: unknown) {
        return err instanceof Error ? err.message : String(err);
      }
    }

    // ── no validation needed ──────────────────────────────────────
    case "taskMode":
    case "runNow":
    case "project":
    case "taskId":
      return null;
  }
}

/**
 * Validates every relevant field and returns a map of field-key → error
 * message. Only fields that fail validation appear in the map (omitted
 * fields are valid).
 */
function validateAll(
  values: Record<CreateField, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const fieldsToValidate: CreateField[] = [
    "interval",
    "command",
    "cwd",
    "description",
    "maxRuns",
  ];

  for (const field of fieldsToValidate) {
    const error = validateField(field, values);
    if (error !== null) {
      errors[field] = error;
    }
  }

  return errors;
}

// ── Hook ────────────────────────────────────────────────────────────

/**
 * Shared form-validation hook for loop creation / edit forms.
 *
 * Returns stable references to `validateField` and `validateAll` so it
 * can be called from any React component without triggering re-renders.
 *
 * @example
 * ```ts
 * const { validateField, validateAll } = useLoopFormValidation();
 *
 * // On-blur per-field check:
 * const err = validateField("interval", values);
 *
 * // On-submit full check:
 * const errors = validateAll(values);
 * if (Object.keys(errors).length === 0) { submit(); }
 * ```
 */
export function useLoopFormValidation(): {
  validateField: (
    key: CreateField,
    values: Record<CreateField, string>,
  ) => string | null;
  validateAll: (
    values: Record<CreateField, string>,
  ) => Record<string, string>;
} {
  return { validateField, validateAll };
}

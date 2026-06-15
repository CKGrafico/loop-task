import ms from "ms";
import { t } from "./i18n/index.js";

export function parseDuration(input: string): number {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error(t("errors.durationEmpty"));
  }

  const result = ms(trimmed as unknown as Parameters<typeof ms>[0]);

  if (typeof result !== "number" || isNaN(result)) {
    throw new Error(t("errors.durationInvalid", { input }));
  }

  if (result <= 0) {
    throw new Error(t("errors.durationNotPositive", { input }));
  }

  return result;
}

export function formatDuration(value: number): string {
  return ms(value, { long: true });
}

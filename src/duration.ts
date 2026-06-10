import ms from "ms";

export function parseDuration(input: string): number {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Duration cannot be empty");
  }

  const result = ms(trimmed as unknown as Parameters<typeof ms>[0]);

  if (typeof result !== "number" || isNaN(result)) {
    throw new Error(`Invalid duration: "${input}". Use formats like 10s, 5m, 1h, 1d, 1w`);
  }

  if (result <= 0) {
    throw new Error(`Duration must be positive, got: "${input}"`);
  }

  return result;
}

export function formatDuration(value: number): string {
  return ms(value, { long: true });
}

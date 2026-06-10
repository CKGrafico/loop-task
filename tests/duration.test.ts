import { describe, it, expect } from "vitest";
import { parseDuration, formatDuration } from "../src/duration.js";

describe("parseDuration", () => {
  describe("valid durations", () => {
    it.each([
      ["10s", 10_000],
      ["30s", 30_000],
      ["5m", 300_000],
      ["15m", 900_000],
      ["30m", 1_800_000],
      ["1h", 3_600_000],
      ["2h", 7_200_000],
      ["12h", 43_200_000],
      ["1d", 86_400_000],
      ["1w", 604_800_000],
    ])("parses %s as %d ms", (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    it("handles whitespace", () => {
      expect(parseDuration("  5m  ")).toBe(300_000);
    });
  });

  describe("invalid durations", () => {
    it.each([
      ["abc", "Invalid duration"],
      ["foo", "Invalid duration"],
      ["0", "Duration must be positive"],
      ["-1h", "Duration must be positive"],
      ["", "Duration cannot be empty"],
    ])("rejects %s", (input, expectedError) => {
      expect(() => parseDuration(input)).toThrow(expectedError);
    });
  });
});

describe("formatDuration", () => {
  it("formats milliseconds to human-readable string", () => {
    expect(formatDuration(1000)).toBe("1 second");
    expect(formatDuration(60_000)).toBe("1 minute");
    expect(formatDuration(3_600_000)).toBe("1 hour");
  });
});

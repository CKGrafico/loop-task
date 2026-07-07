import { describe, it, expect } from "vitest";
import { computePhase, alignToPhase } from "../src/core/scheduling.js";



describe("computePhase", () => {
  it("returns a deterministic value for the same inputs", () => {
    const a = computePhase("my-loop", 10_000);
    const b = computePhase("my-loop", 10_000);
    expect(a).toBe(b);
  });

  it("returns values in range [0, intervalMs)", () => {
    const intervalMs = 5000;
    for (const id of ["alpha", "beta", "gamma", "delta", "epsilon"]) {
      const phase = computePhase(id, intervalMs);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(intervalMs);
    }
  });

  it("produces different phases for different loopIds (spread)", () => {
    const intervalMs = 10_000;
    const phases = new Set<number>();
    for (let i = 0; i < 20; i++) {
      phases.add(computePhase(`loop-${i}`, intervalMs));
    }
    // With 20 distinct loopIds we expect some distribution, not all identical
    expect(phases.size).toBeGreaterThan(1);
  });

  it("always returns 0 when intervalMs is 1", () => {
    expect(computePhase("any-id", 1)).toBe(0);
    expect(computePhase("different-id", 1)).toBe(0);
  });

  it("works with large intervals", () => {
    const large = 86_400_000; // 1 day in ms
    const phase = computePhase("daily-loop", large);
    expect(phase).toBeGreaterThanOrEqual(0);
    expect(phase).toBeLessThan(large);
  });

  it("returns 0 for empty string loopId", () => {
    // hash starts at 0, empty string produces hash 0, abs(0) % N = 0
    expect(computePhase("", 1000)).toBe(0);
  });

  it("produces consistent results across multiple invocations", () => {
    const results = Array.from({ length: 5 }, () =>
      computePhase("stress-test", 999)
    );
    expect(new Set(results).size).toBe(1);
  });
});



describe("alignToPhase", () => {
  it("returns 0 delay when now equals the phase (exactly aligned)", () => {
    const intervalMs = 10_000;
    const phaseMs = 3000;
    // now % intervalMs === phaseMs
    const now = 13_000; // 13000 % 10000 = 3000
    const delay = alignToPhase(now, intervalMs, phaseMs);
    expect(delay).toBe(0);
  });

  it("returns correct delay for known values", () => {
    // phaseMs = 2000, now = 1500, intervalMs = 10000
    // elapsed = 1500, delay = (2000 - 1500 + 10000) % 10000 = 500
    expect(alignToPhase(1500, 10_000, 2000)).toBe(500);
  });

  it("always returns value in [0, intervalMs)", () => {
    const intervalMs = 10_000;
    const phaseMs = 7000;
    for (const now of [0, 1, 6999, 7000, 7001, 9999, 10_000, 50_000, 123_456]) {
      const delay = alignToPhase(now, intervalMs, phaseMs);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(intervalMs);
    }
  });

  it("wraps around correctly when now is past the phase", () => {
    // phaseMs = 3000, now = 5000, intervalMs = 10000
    // elapsed = 5000, delay = (3000 - 5000 + 10000) % 10000 = 8000
    expect(alignToPhase(5000, 10_000, 3000)).toBe(8000);
  });

  it("returns intervalMs when now is 0 and phase is 0 (wrap case)", () => {
    // elapsed = 0, delay = (0 - 0 + 10000) % 10000 = 0
    expect(alignToPhase(0, 10_000, 0)).toBe(0);
  });

  it("computes correct delay when now is 0 with non-zero phase", () => {
    // elapsed = 0, delay = (phaseMs - 0 + intervalMs) % intervalMs = phaseMs
    expect(alignToPhase(0, 10_000, 4000)).toBe(4000);
  });

  it("handles phase at exactly intervalMs boundary", () => {
    // phaseMs = 0 (same as interval boundary)
    // elapsed = 5000, delay = (0 - 5000 + 10000) % 10000 = 5000
    expect(alignToPhase(5000, 10_000, 0)).toBe(5000);
  });
});

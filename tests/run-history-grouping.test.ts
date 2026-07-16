import { describe, it, expect } from "vitest";
import { groupRunsByCycle } from "../src/widgets/right-panel/RunHistory.js";
import type { RunRecord } from "../src/types.js";

function makeRun(n: number, over: Partial<RunRecord> = {}): RunRecord {
  return {
    runNumber: n,
    startedAt: `2026-01-01T00:00:${String(n).padStart(2, "0")}Z`,
    exitCode: 0,
    duration: 100,
    logSize: 50,
    status: "completed",
    logOffset: 0,
    ...over,
  };
}

describe("groupRunsByCycle", () => {
  it("returns empty array for empty input", () => {
    expect(groupRunsByCycle([])).toEqual([]);
  });

  it("returns single records unchanged (no chain)", () => {
    const r1 = makeRun(1);
    const r2 = makeRun(2);
    const result = groupRunsByCycle([r1, r2]);
    expect(result).toHaveLength(2);
    expect(result[0]).toBe(r1);
    expect(result[1]).toBe(r2);
  });

  it("collapses chain records with the same runNumber into one row", () => {
    const main = makeRun(5, { duration: 200, logSize: 100, chainGroupId: "grp1" });
    const chainA = makeRun(5, {
      duration: 300,
      logSize: 80,
      chainGroupId: "grp1",
      chainName: "TaskA",
    });
    const chainB = makeRun(5, {
      duration: 150,
      logSize: 40,
      chainGroupId: "grp1",
      chainName: "TaskB",
    });
    const result = groupRunsByCycle([main, chainA, chainB]);
    expect(result).toHaveLength(1);
    const row = result[0]!;
    expect(row.runNumber).toBe(5);
    expect(row.duration).toBe(650);
    expect(row.logSize).toBe(220);
    expect(row.status).toBe("completed");
    expect(row.exitCode).toBe(chainB.exitCode);
    expect(row.chainGroupId).toBe("grp1");
    expect(row.chainName).toBe("\u2192 TaskA \u2192 TaskB");
  });

  it("uses the last exitCode in the chain as the aggregated exitCode", () => {
    const main = makeRun(3, { exitCode: 1, chainGroupId: "g", duration: 10, logSize: 5 });
    const chain = makeRun(3, {
      exitCode: 0,
      chainGroupId: "g",
      chainName: "NextTask",
      duration: 20,
      logSize: 7,
    });
    const result = groupRunsByCycle([main, chain]);
    expect(result).toHaveLength(1);
    expect(result[0]!.exitCode).toBe(0);
  });

  it("flags a group as running when any record is running", () => {
    const main = makeRun(7, { status: "completed", chainGroupId: "g", duration: 10, logSize: 5 });
    const chain = makeRun(7, {
      status: "running",
      exitCode: -1,
      chainGroupId: "g",
      chainName: "Pending",
      duration: 0,
      logSize: 0,
    });
    const result = groupRunsByCycle([main, chain]);
    expect(result).toHaveLength(1);
    expect(result[0]!.status).toBe("running");
    expect(result[0]!.exitCode).toBe(-1);
  });

  it("preserves run order across cycles", () => {
    const r1 = makeRun(1);
    const r2Main = makeRun(2, { chainGroupId: "g2" });
    const r2Chain = makeRun(2, { chainGroupId: "g2", chainName: "A" });
    const r3 = makeRun(3);
    const result = groupRunsByCycle([r1, r2Main, r2Chain, r3]);
    expect(result.map((r) => r.runNumber)).toEqual([1, 2, 3]);
  });

  it("truncates very long chain labels", () => {
    const main = makeRun(1, { chainGroupId: "g" });
    const chain = makeRun(1, {
      chainGroupId: "g",
      chainName: "A".repeat(40),
    });
    const result = groupRunsByCycle([main, chain]);
    expect(result[0]!.chainName!.length).toBeLessThanOrEqual(28);
    expect(result[0]!.chainName!.endsWith("...")).toBe(true);
  });
});
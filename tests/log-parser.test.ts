import { describe, it, expect } from "vitest";
import { splitLogByRuns } from "../src/core/log-parser.js";

describe("splitLogByRuns", () => {
  it("parses a single run with header and exit marker", () => {
    const content = "[Run #1] starting\noutput line 1\noutput line 2\n[exit 0]";
    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(1);
    expect(runs[0].runNumber).toBe(1);
    expect(runs[0].lines).toEqual(["output line 1", "output line 2"]);
  });

  it("parses multiple runs", () => {
    const content = [
      "[Run #1] starting",
      "output a",
      "[exit 0]",
      "[Run #2] starting",
      "output b",
      "[exit 1]",
    ].join("\n");

    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(2);
    expect(runs[0].runNumber).toBe(1);
    expect(runs[0].lines).toEqual(["output a"]);
    expect(runs[1].runNumber).toBe(2);
    expect(runs[1].lines).toEqual(["output b"]);
  });

  it("handles a run without exit marker (open run)", () => {
    const content = "[Run #5] starting\nstill running\nmore output";
    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(1);
    expect(runs[0].runNumber).toBe(5);
    expect(runs[0].lines).toEqual(["still running", "more output"]);
  });

  it("handles empty content", () => {
    const runs = splitLogByRuns("");
    expect(runs).toHaveLength(0);
  });

  it("ignores lines before the first header", () => {
    const content = "orphan line 1\norphan line 2\n[Run #1] starting\nactual output\n[exit 0]";
    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(1);
    expect(runs[0].lines).toEqual(["actual output"]);
  });

  it("handles exit codes like [exit 0] and [exit 1]", () => {
    const content = "[Run #1] start\ndata\n[exit 0]\n[Run #2] start\ndata2\n[exit 1]";
    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(2);
    expect(runs[0].runNumber).toBe(1);
    expect(runs[1].runNumber).toBe(2);
  });

  it("extracts run numbers correctly", () => {
    const content = "[Run #42] start\noutput\n[exit 0]";
    const runs = splitLogByRuns(content);

    expect(runs[0].runNumber).toBe(42);
  });

  it("handles consecutive runs with no gap", () => {
    const content = "[Run #1] a\n[exit 0]\n[Run #2] b\n[exit 0]";
    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(2);
    expect(runs[0].lines).toEqual([]);
    expect(runs[1].lines).toEqual([]);
  });

  it("handles a run with empty lines in output", () => {
    const content = "[Run #1] start\n\nsome output\n\n[exit 0]";
    const runs = splitLogByRuns(content);

    expect(runs[0].lines).toEqual(["", "some output", ""]);
  });

  it("handles open run followed by a new run header", () => {
    // First run has no exit marker, second run starts — should push the first
    const content = "[Run #1] start\noutput a\n[Run #2] start\noutput b\n[exit 0]";
    const runs = splitLogByRuns(content);

    expect(runs).toHaveLength(2);
    expect(runs[0].runNumber).toBe(1);
    expect(runs[0].lines).toEqual(["output a"]);
    expect(runs[1].runNumber).toBe(2);
    expect(runs[1].lines).toEqual(["output b"]);
  });

  it("handles only newlines", () => {
    const runs = splitLogByRuns("\n\n\n");
    expect(runs).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import type blessed from "blessed";
import type { LoopMeta } from "../src/types.js";
import { BoardApp, type BoardWidgets } from "../src/tui/app.js";

function createWidgets(): BoardWidgets {
  const listState = { selected: 0 };
  return {
    screen: {
      render() {},
    } as unknown as blessed.Widgets.Screen,
    header: {
      setContent() {},
      show() {},
      hide() {},
    } as unknown as blessed.Widgets.BoxElement,
    loopList: {
      selected: 0,
      setItems() {},
      setLabel() {},
      select(value: number) {
        listState.selected = value;
        (this as unknown as { selected: number }).selected = value;
      },
      show() {},
      hide() {},
    } as unknown as blessed.Widgets.ListElement,
    detail: {
      setContent() {},
      setLabel() {},
      show() {},
      hide() {},
    } as unknown as blessed.Widgets.BoxElement,
    logBox: {
      setContent() {},
      setLabel() {},
      add() {},
      setScrollPerc() {},
      show() {},
      hide() {},
    } as unknown as blessed.Widgets.Log,
    footer: {
      setContent() {},
      show() {},
      hide() {},
    } as unknown as blessed.Widgets.BoxElement,
  };
}

function loop(id: string, values: Partial<LoopMeta> = {}): LoopMeta {
  return {
    id,
    command: "echo",
    commandArgs: [id],
    interval: 1000,
    intervalHuman: "1s",
    immediate: false,
    maxRuns: null,
    verbose: false,
    status: "sleeping",
    createdAt: "2026-06-14T10:00:00.000Z",
    runCount: 0,
    lastRunAt: null,
    lastExitCode: null,
    lastDuration: null,
    nextRunAt: null,
    remainingDelayMs: null,
    pid: 123,
    ...values,
  };
}

describe("BoardApp", () => {
  it("filters loops by status and query", () => {
    const app = new BoardApp(createWidgets());
    app.loops = [
      loop("a1", { status: "running", commandArgs: ["alpha"] }),
      loop("b2", { status: "paused", commandArgs: ["beta"] }),
    ];

    app.filters.status = "paused";
    expect(app.visibleLoops().map((item) => item.id)).toEqual(["b2"]);

    app.filters.status = "all";
    app.setSearchQuery("alpha");
    expect(app.visibleLoops().map((item) => item.id)).toEqual(["a1"]);
  });

  it("sorts loops by mode and preserves selected visible loop", () => {
    const app = new BoardApp(createWidgets());
    app.loops = [
      loop("paused", { status: "paused", createdAt: "2026-06-14T10:00:00.000Z" }),
      loop("running", { status: "running", createdAt: "2026-06-14T11:00:00.000Z" }),
    ];

    app.syncSelection();
    expect(app.selectedVisibleLoop()?.id).toBe("running");

    app.selectedId = "paused";
    app.syncSelection();
    expect(app.selectedVisibleLoop()?.id).toBe("paused");

    app.cycleSortMode();
    expect(app.loopSortMode).toBe("recent");
  });
});

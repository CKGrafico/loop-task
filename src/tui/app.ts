import blessed from "blessed";
import type { LoopMeta } from "../types.js";
import { streamRequest } from "../client/ipc.js";

export type InputMode =
  | "normal"
  | "create"
  | "search"
  | "filter"
  | "help"
  | "confirm"
  | "attach";

export type ActiveView = "board" | "detail" | "attach" | "help";

export type ModalState = "none" | "create-loop" | "confirm-delete";

export interface BoardFilters {
  status: "all" | "running" | "sleeping" | "paused" | "stopped";
  intervalBucket: "all" | "short" | "medium" | "long";
  recentActivity: "all" | "active" | "stale";
  query: string;
}

export type LoopSortMode = "status" | "recent" | "created";

export type LoadingState = "idle" | "starting" | "refreshing" | "attaching";

export interface BoardWidgets {
  screen: blessed.Widgets.Screen;
  header: blessed.Widgets.BoxElement;
  loopList: blessed.Widgets.ListElement;
  detail: blessed.Widgets.BoxElement;
  logBox: blessed.Widgets.Log;
  footer: blessed.Widgets.BoxElement;
}

export class BoardApp {
  loops: LoopMeta[] = [];
  selectedId: string | null = null;
  activeView: ActiveView = "board";
  inputMode: InputMode = "normal";
  modalState: ModalState = "none";
  filters: BoardFilters = {
    status: "all",
    intervalBucket: "all",
    recentActivity: "all",
    query: "",
  };
  loopSortMode: LoopSortMode = "status";
  liveLogLoopId: string | null = null;
  daemonStatus: "starting" | "connected" | "error" = "starting";
  loadingState: LoadingState = "starting";
  statusMessage = "";
  logSocket: ReturnType<typeof streamRequest> | null = null;

  constructor(readonly widgets: BoardWidgets) {}

  destroyLogStream(): void {
    if (this.logSocket) {
      this.logSocket.destroy();
      this.logSocket = null;
    }
    this.liveLogLoopId = null;
  }

  setInputMode(mode: InputMode): void {
    this.inputMode = mode;
  }

  setStatusMessage(message: string): void {
    this.statusMessage = message;
  }

  setModalState(state: ModalState): void {
    this.modalState = state;
  }

  setActiveView(view: ActiveView): void {
    this.activeView = view;
  }

  setDaemonStatus(status: "starting" | "connected" | "error"): void {
    this.daemonStatus = status;
  }

  setLoadingState(state: LoadingState): void {
    this.loadingState = state;
  }

  cycleSortMode(): void {
    this.loopSortMode =
      this.loopSortMode === "status"
        ? "recent"
        : this.loopSortMode === "recent"
          ? "created"
          : "status";
  }

  cycleStatusFilter(): void {
    this.filters.status =
      this.filters.status === "all"
        ? "running"
        : this.filters.status === "running"
          ? "sleeping"
          : this.filters.status === "sleeping"
            ? "paused"
            : this.filters.status === "paused"
              ? "stopped"
              : "all";
  }

  setFilterStatus(value: BoardFilters["status"]): void {
    this.filters.status = value;
  }

  setFilterIntervalBucket(value: BoardFilters["intervalBucket"]): void {
    this.filters.intervalBucket = value;
  }

  setFilterRecentActivity(value: BoardFilters["recentActivity"]): void {
    this.filters.recentActivity = value;
  }

  setSearchQuery(value: string): void {
    this.filters.query = value;
  }

  visibleLoops(): LoopMeta[] {
    const query = this.filters.query.trim().toLowerCase();

    return [...this.loops]
      .filter((loop) => {
        if (this.filters.status !== "all" && loop.status !== this.filters.status) {
          return false;
        }

        if (this.filters.intervalBucket !== "all") {
          const intervalBucket =
            loop.interval <= 60_000
              ? "short"
              : loop.interval <= 3_600_000
                ? "medium"
                : "long";

          if (intervalBucket !== this.filters.intervalBucket) {
            return false;
          }
        }

        if (this.filters.recentActivity !== "all") {
          const baseline = loop.lastRunAt ?? loop.createdAt;
          const activityAgeMs = Date.now() - new Date(baseline).getTime();
          const activityBucket = activityAgeMs <= 15 * 60_000 ? "active" : "stale";
          if (activityBucket !== this.filters.recentActivity) {
            return false;
          }
        }

        if (!query) {
          return true;
        }

        const haystack = [
          loop.id,
          loop.command,
          ...loop.commandArgs,
          loop.status,
          loop.intervalHuman,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query);
      })
      .sort((left, right) => this.compareLoops(left, right));
  }

  selectedVisibleLoop(): LoopMeta | null {
    const loops = this.visibleLoops();
    const index = this.selectedIndex();
    if (index < 0 || index >= loops.length) {
      return null;
    }
    return loops[index] ?? null;
  }

  syncSelection(): void {
    const loops = this.visibleLoops();

    if (loops.length === 0) {
      this.widgets.loopList.select(0);
      this.selectedId = null;
      return;
    }

    const selectedIndex = this.selectedId
      ? loops.findIndex((loop) => loop.id === this.selectedId)
      : -1;

    this.widgets.loopList.select(selectedIndex >= 0 ? selectedIndex : 0);
    this.selectedId = loops[selectedIndex >= 0 ? selectedIndex : 0]?.id ?? null;
  }

  private compareLoops(left: LoopMeta, right: LoopMeta): number {
    if (this.loopSortMode === "created") {
      return right.createdAt.localeCompare(left.createdAt);
    }

    if (this.loopSortMode === "recent") {
      return (right.lastRunAt ?? right.createdAt).localeCompare(
        left.lastRunAt ?? left.createdAt
      );
    }

    const statusOrder: Record<LoopMeta["status"], number> = {
      running: 0,
      sleeping: 1,
      paused: 2,
      stopped: 3,
    };

    const byStatus = statusOrder[left.status] - statusOrder[right.status];
    if (byStatus !== 0) {
      return byStatus;
    }

    const leftNext = left.nextRunAt ?? left.lastRunAt ?? left.createdAt;
    const rightNext = right.nextRunAt ?? right.lastRunAt ?? right.createdAt;
    return rightNext.localeCompare(leftNext);
  }

  selectedIndex(): number {
    return (this.widgets.loopList as unknown as { selected: number }).selected;
  }
}

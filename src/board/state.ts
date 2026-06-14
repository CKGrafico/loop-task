import type { LoopMeta } from "../types.js";

export type StatusFilter =
  | "all"
  | "running"
  | "sleeping"
  | "paused"
  | "stopped";

export type IntervalFilter = "all" | "short" | "medium" | "long";

export type ActivityFilter = "all" | "active" | "stale";

export type SortMode = "status" | "recent" | "created";

export interface Filters {
  status: StatusFilter;
  intervalBucket: IntervalFilter;
  recentActivity: ActivityFilter;
  query: string;
}

export const defaultFilters: Filters = {
  status: "all",
  intervalBucket: "all",
  recentActivity: "all",
  query: "",
};

const statusOrder: Record<LoopMeta["status"], number> = {
  running: 0,
  sleeping: 1,
  paused: 2,
  stopped: 3,
};

function intervalBucketOf(interval: number): IntervalFilter {
  if (interval <= 60_000) return "short";
  if (interval <= 3_600_000) return "medium";
  return "long";
}

function activityBucketOf(loop: LoopMeta): ActivityFilter {
  const baseline = loop.lastRunAt ?? loop.createdAt;
  const ageMs = Date.now() - new Date(baseline).getTime();
  return ageMs <= 15 * 60_000 ? "active" : "stale";
}

function matches(loop: LoopMeta, filters: Filters): boolean {
  if (filters.status !== "all" && loop.status !== filters.status) {
    return false;
  }

  if (
    filters.intervalBucket !== "all" &&
    intervalBucketOf(loop.interval) !== filters.intervalBucket
  ) {
    return false;
  }

  if (
    filters.recentActivity !== "all" &&
    activityBucketOf(loop) !== filters.recentActivity
  ) {
    return false;
  }

  const query = filters.query.trim().toLowerCase();
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
}

function compare(left: LoopMeta, right: LoopMeta, sort: SortMode): number {
  if (sort === "created") {
    return right.createdAt.localeCompare(left.createdAt);
  }

  if (sort === "recent") {
    return (right.lastRunAt ?? right.createdAt).localeCompare(
      left.lastRunAt ?? left.createdAt
    );
  }

  const byStatus = statusOrder[left.status] - statusOrder[right.status];
  if (byStatus !== 0) {
    return byStatus;
  }

  const leftNext = left.nextRunAt ?? left.lastRunAt ?? left.createdAt;
  const rightNext = right.nextRunAt ?? right.lastRunAt ?? right.createdAt;
  return rightNext.localeCompare(leftNext);
}

export function applyLoopFilters(
  loops: LoopMeta[],
  filters: Filters,
  sort: SortMode
): LoopMeta[] {
  return loops
    .filter((loop) => matches(loop, filters))
    .sort((left, right) => compare(left, right, sort));
}

export function cycleSortMode(mode: SortMode): SortMode {
  return mode === "status" ? "recent" : mode === "recent" ? "created" : "status";
}

export function cycleStatusFilter(status: StatusFilter): StatusFilter {
  switch (status) {
    case "all":
      return "running";
    case "running":
      return "sleeping";
    case "sleeping":
      return "paused";
    case "paused":
      return "stopped";
    default:
      return "all";
  }
}

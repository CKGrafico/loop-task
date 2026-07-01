import type { LoopMeta } from "../types.js";

export type StatusFilter =
  | "all"
  | "running"
  | "waiting"
  | "paused"
  | "idle"
  | "stopped";

export type IntervalFilter = "all" | "short" | "medium" | "long";

export type ActivityFilter = "all" | "active" | "stale";

export type SortMode = "description" | "status" | "recent" | "created";

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
  waiting: 1,
  paused: 2,
  idle: 3,
  stopped: 4,
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
    loop.description ?? "",
    loop.status,
    loop.intervalHuman,
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

function describeLoop(loop: LoopMeta): string {
  return loop.description?.trim() || [loop.command, ...loop.commandArgs].join(" ").trim();
}

function compare(left: LoopMeta, right: LoopMeta, sort: SortMode): number {
  if (sort === "description") {
    return describeLoop(left).localeCompare(describeLoop(right));
  }

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

const SORT_CYCLE: Record<SortMode, SortMode> = {
  description: "status",
  status: "recent",
  recent: "created",
  created: "description",
};

export function cycleSortMode(mode: SortMode): SortMode {
  return SORT_CYCLE[mode];
}

const STATUS_CYCLE: Record<StatusFilter, StatusFilter> = {
  all: "running",
  running: "waiting",
  waiting: "paused",
  paused: "idle",
  idle: "stopped",
  stopped: "all",
};

export function cycleStatusFilter(status: StatusFilter): StatusFilter {
  return STATUS_CYCLE[status];
}

export type ProjectHasLoopsFilter = "all" | "with-loops" | "empty";

export type ProjectIsSystemFilter = "all" | "system" | "user";

export type ProjectSortMode = "name" | "loop-count" | "created-date";

export interface ProjectFilters {
  query: string;
  hasLoops: ProjectHasLoopsFilter;
  isSystem: ProjectIsSystemFilter;
  sort: ProjectSortMode;
}

export const defaultProjectFilters: ProjectFilters = {
  query: "",
  hasLoops: "all",
  isSystem: "all",
  sort: "name",
};

export function applyProjectFilters(
  projects: import("../types.js").Project[],
  loops: import("../types.js").LoopMeta[],
  filters: ProjectFilters,
): import("../types.js").Project[] {
  const filtered = projects.filter((project) => {
    if (filters.hasLoops === "with-loops") {
      const count = loops.filter((l) => (l.projectId ?? "default") === project.id).length;
      if (count === 0) return false;
    }
    if (filters.hasLoops === "empty") {
      const count = loops.filter((l) => (l.projectId ?? "default") === project.id).length;
      if (count > 0) return false;
    }
    if (filters.isSystem === "system" && !project.isSystem) return false;
    if (filters.isSystem === "user" && project.isSystem) return false;
    const query = filters.query.trim().toLowerCase();
    if (query && !project.name.toLowerCase().includes(query)) return false;
    return true;
  });

  return filtered.sort((a, b) => {
    if (filters.sort === "name") {
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    if (filters.sort === "loop-count") {
      const ca = loops.filter((l) => (l.projectId ?? "default") === a.id).length;
      const cb = loops.filter((l) => (l.projectId ?? "default") === b.id).length;
      if (cb !== ca) return cb - ca;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    }
    const da = a.createdAt;
    const db = b.createdAt;
    if (da !== db) return db.localeCompare(da);
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

const PROJECT_SORT_CYCLE: Record<ProjectSortMode, ProjectSortMode> = {
  name: "loop-count",
  "loop-count": "created-date",
  "created-date": "name",
};

export function cycleProjectSortMode(mode: ProjectSortMode): ProjectSortMode {
  return PROJECT_SORT_CYCLE[mode];
}

const PROJECT_HAS_LOOPS_CYCLE: Record<ProjectHasLoopsFilter, ProjectHasLoopsFilter> = {
  all: "with-loops",
  "with-loops": "empty",
  empty: "all",
};

export function cycleProjectHasLoopsFilter(filter: ProjectHasLoopsFilter): ProjectHasLoopsFilter {
  return PROJECT_HAS_LOOPS_CYCLE[filter];
}

const PROJECT_IS_SYSTEM_CYCLE: Record<ProjectIsSystemFilter, ProjectIsSystemFilter> = {
  all: "system",
  system: "user",
  user: "all",
};

export function cycleProjectIsSystemFilter(filter: ProjectIsSystemFilter): ProjectIsSystemFilter {
  return PROJECT_IS_SYSTEM_CYCLE[filter];
}

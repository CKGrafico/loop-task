import type { Project, LoopMeta } from "../../types.js";

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
  projects: Project[],
  loops: LoopMeta[],
  filters: ProjectFilters,
): Project[] {
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

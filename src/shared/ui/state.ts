export type { StatusFilter, IntervalFilter, ActivityFilter, SortMode, Filters } from "../../entities/loops/filters.js";
export { defaultFilters, applyLoopFilters, cycleSortMode, cycleStatusFilter } from "../../entities/loops/filters.js";

export type { ProjectHasLoopsFilter, ProjectIsSystemFilter, ProjectSortMode, ProjectFilters } from "../../entities/projects/filters.js";
export { defaultProjectFilters, applyProjectFilters, cycleProjectSortMode, cycleProjectHasLoopsFilter, cycleProjectIsSystemFilter } from "../../entities/projects/filters.js";

export type InputOwner = "modal" | "commandBar" | "panel";

export interface InputOwnerState {
  modalOpen: boolean;
  commandBarHasText: boolean;
  commandBarDropdownOpen: boolean;
}

export function resolveInputOwner(state: InputOwnerState): InputOwner {
  if (state.modalOpen) return "modal";
  if (state.commandBarHasText || state.commandBarDropdownOpen) return "commandBar";
  return "panel";
}

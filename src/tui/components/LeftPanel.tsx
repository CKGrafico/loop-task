import React from "react";
import { Box, Text } from "ink";
import type { LoopMeta, TaskDefinition, Project } from "../../types.js";
import type { TabName } from "../types.js";
import type { Filters, SortMode, ProjectFilters } from "../state.js";
import { darkTheme as theme, tabAccentColor } from "../theme.js";
import { t } from "../../i18n/index.js";
import { Navigator } from "./Navigator.js";
import { TaskNavigator } from "./TaskBrowser.js";
import { FocusableList } from "./FocusableList.js";

export function LeftPanel(props: {
  isFocused: boolean;
  navActive?: boolean;
  activeTab: TabName;
  query: string;
  // Loop list props
  loops: LoopMeta[];
  selectedIndex: number;
  filters: Filters;
  sort: SortMode;
  breakpoint: string;
  projects: Project[];
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  // Task list props
  tasks: TaskDefinition[];
  taskSelectedIndex: number;
  onTaskSelect: (index: number) => void;
  onTaskActivate: (index: number) => void;
  // Optional filter bar controls (for loops tab)
  onStatusCycle?: () => void;
  onSortCycle?: () => void;
  onSelectProject?: () => void;
  currentProjectName?: string;
  // Project list props
  projectFilters?: ProjectFilters;
  projectSelectedIndex?: number;
  onProjectSelect?: (index: number) => void;
  onProjectActivate?: (index: number) => void;
  projectLoops?: LoopMeta[];
}): React.ReactNode {
  const {
    isFocused,
    navActive = true,
    activeTab,
    query,
    loops,
    selectedIndex,
    filters,
    sort,
    breakpoint,
    projects,
    onSelect,
    onActivate,
    tasks,
    taskSelectedIndex,
    onTaskSelect,
    onTaskActivate,
    currentProjectName,
    projectFilters,
    projectSelectedIndex = 0,
    onProjectSelect,
    onProjectActivate,
    projectLoops,
  } = props;

  const accentColor = tabAccentColor(activeTab);
  const borderColor = isFocused ? accentColor : theme.border.default;
  const hasFilter = query.length > 0;

  const loopCountFor = (projectId: string): number =>
    (projectLoops ?? loops).filter((l) => l.projectId === projectId).length;

  return (
    <Box
      flexDirection="column"
      width="60%"
      flexShrink={0}
      borderStyle="single"
      borderColor={borderColor}
    >
      {/* Filter status labels - shows active filter state */}
      <Box paddingLeft={1} gap={1}>
        {hasFilter ? (
          <Text color={accentColor}>
            filter: {query}
          </Text>
        ) : null}
        {activeTab === "loops" ? (
          <>
            {currentProjectName != null ? (
              <Text color={theme.text.muted}>
                [project: {currentProjectName}]
              </Text>
            ) : null}
            <Text color={theme.text.muted}>
              [status: {filters.status}]
            </Text>
            <Text color={theme.text.muted}>
              [sort: {sort}]
            </Text>
          </>
        ) : null}
        {activeTab === "projects" && projectFilters ? (
          <>
            {projectFilters.query.length > 0 ? (
              <Text color={accentColor}>
                [search: {projectFilters.query}]
              </Text>
            ) : null}
            {projectFilters.hasLoops !== "all" ? (
              <Text color={theme.text.muted}>
                [loops: {projectFilters.hasLoops}]
              </Text>
            ) : null}
            {projectFilters.isSystem !== "all" ? (
              <Text color={theme.text.muted}>
                [type: {projectFilters.isSystem}]
              </Text>
            ) : null}
            <Text color={theme.text.muted}>
              [sort: {projectFilters.sort}]
            </Text>
          </>
        ) : null}
      </Box>

      {/* Content area based on active tab */}
      {activeTab === "loops" ? (
        <Navigator
          visible={loops}
          total={loops.length}
          selectedIndex={selectedIndex}
          filters={{ status: filters.status }}
          sort={sort}
          breakpoint={breakpoint}
          projects={projects}
          onSelect={onSelect}
          onActivate={onActivate}
          isFocused={isFocused}
          navActive={navActive}
        />
      ) : activeTab === "tasks" ? (
        <TaskNavigator
          visible={tasks}
          total={tasks.length}
          selectedIndex={taskSelectedIndex}
          query={query}
          onSelect={onTaskSelect}
          onActivate={onTaskActivate}
          isFocused={isFocused}
          navActive={navActive}
          allTasks={tasks}
        />
      ) : (
        <ProjectNavigator
          projects={projects}
          loops={projectLoops ?? loops}
          selectedIndex={projectSelectedIndex}
          onSelect={onProjectSelect ?? (() => {})}
          onActivate={onProjectActivate ?? (() => {})}
          isFocused={isFocused}
          navActive={navActive}
          loopCountFor={loopCountFor}
        />
      )}
    </Box>
  );
}

function ProjectNavigator(props: {
  projects: Project[];
  loops: LoopMeta[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onActivate: (index: number) => void;
  isFocused: boolean;
  navActive?: boolean;
  loopCountFor: (id: string) => number;
}): React.ReactNode {
  const { projects, selectedIndex, onSelect, onActivate, isFocused, navActive = true, loopCountFor } = props;

  if (projects.length === 0) {
    return (
      <Box paddingX={1}>
        <Text color={theme.text.muted}>{t("project.noLoops")}</Text>
      </Box>
    );
  }

  return (
    <FocusableList
      items={projects}
      selectedIndex={selectedIndex}
      isFocused={isFocused}
      navActive={navActive}
      limit={15}
      onSelect={onSelect}
      onActivate={onActivate}
      renderItem={(project, isSelected) => {
        const count = loopCountFor(project.id);
        const fg = isSelected ? theme.text.inverse : theme.text.primary;
        const countFg = isSelected ? theme.text.inverse : theme.text.muted;
        const createdFg = isSelected ? theme.text.inverse : theme.text.muted;
        return (
          <React.Fragment>
            <Text color={project.color}>{"\u25CF"}</Text>
            <Text color={fg}> {project.name.padEnd(18)}</Text>
            <Text color={countFg}>{String(count).padStart(3)} </Text>
            <Text color={createdFg}>{project.createdAt.slice(0, 10)}</Text>
          </React.Fragment>
        );
      }}
    />
  );
}

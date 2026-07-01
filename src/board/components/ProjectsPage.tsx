import { useState, useEffect } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG, ENTITY_COLORS } from "../../config/constants.js";
import { DeleteProjectConfirm } from "./DeleteProjectConfirm.js";
import { SearchBox } from "./SearchBox.js";
import {
  defaultProjectFilters,
  applyProjectFilters,
  cycleProjectSortMode,
  cycleProjectHasLoopsFilter,
  cycleProjectIsSystemFilter,
} from "../state.js";
import type { ProjectFilters } from "../state.js";

type SubModal = "none" | "create" | "edit" | "delete";
type FilterPanel = "search" | "has-loops" | "is-system" | "sort" | "list" | "edit" | "delete";

function ClickableBadge(props: {
  title?: string;
  text: string;
  textColor: string;
  focused: boolean;
  onMouseDown: () => void;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.focused ? "#1e3a2a" : isHovered ? HOVER_BG : "#0b0b0b";
  const borderColor = props.focused ? ENTITY_COLORS.project : undefined;
  const titleProp = props.title ? { title: props.title } : {};
  return (
    <box
      {...titleProp}
      border
      borderColor={borderColor}
      onMouseDown={props.onMouseDown}
      style={{ flexGrow: 1, height: 3, marginRight: props.marginRight, paddingLeft: 1, backgroundColor: bg }}
      {...hoverProps}
    >
      <text fg={props.textColor}>{props.text}</text>
    </box>
  );
}

function ProjectFilterBar(props: {
  filters: ProjectFilters;
  searchActive: boolean;
  focusedPanel: string;
  onHasLoopsCycle: () => void;
  onIsSystemCycle: () => void;
  onSortCycle: () => void;
  onQueryChange: (value: string) => void;
  onSearchActivate: () => void;
  onSearchDismiss: () => void;
}): React.ReactNode {
  const { filters, searchActive, focusedPanel, onHasLoopsCycle, onIsSystemCycle, onSortCycle, onQueryChange, onSearchActivate, onSearchDismiss } = props;

  const hasLoopsDisplay = filters.hasLoops === "with-loops"
    ? t("project.filterHasLoopsWithLoops")
    : filters.hasLoops === "empty"
    ? t("project.filterHasLoopsEmpty")
    : t("project.filterHasLoopsAll");

  const isSystemDisplay = filters.isSystem === "system"
    ? t("project.filterIsSystemSystem")
    : filters.isSystem === "user"
    ? t("project.filterIsSystemUser")
    : t("project.filterIsSystemAll");

  const sortDisplay = filters.sort === "loop-count"
    ? t("project.sortLoopCount")
    : filters.sort === "created-date"
    ? t("project.sortCreatedDate")
    : t("project.sortName");

  return (
    <box style={{ flexDirection: "row", height: 3, paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}>
      <SearchBox
        query={filters.query}
        searchActive={searchActive}
        focused={focusedPanel === "search"}
        onQueryChange={onQueryChange}
        onActivate={onSearchActivate}
        onDismiss={onSearchDismiss}
      />
      <ClickableBadge
        title={t("project.filterHasLoopsTitle")}
        text={hasLoopsDisplay}
        textColor="#34d399"
        focused={focusedPanel === "has-loops"}
        onMouseDown={onHasLoopsCycle}
        marginRight={1}
      />
      <ClickableBadge
        title={t("project.filterIsSystemTitle")}
        text={isSystemDisplay}
        textColor="#a78bfa"
        focused={focusedPanel === "is-system"}
        onMouseDown={onIsSystemCycle}
        marginRight={1}
      />
      <ClickableBadge
        title={t("project.sortTitle")}
        text={sortDisplay}
        textColor="#a3e635"
        focused={focusedPanel === "sort"}
        onMouseDown={onSortCycle}
      />
    </box>
  );
}

function ProjectActionButton(props: {
  label: string;
  selected: boolean;
  onMouseDown: () => void;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.selected ? "#1e3a8a" : isHovered ? HOVER_BG : undefined;
  const fg = props.selected ? "#ffffff" : isHovered ? "#e5e7eb" : "#9ca3af";
  return (
    <box
      onMouseDown={props.onMouseDown}
      style={{ backgroundColor: bg, paddingLeft: 1, paddingRight: 1, marginRight: 1 }}
      {...hoverProps}
    >
      <text fg={fg}><strong>{props.label}</strong></text>
    </box>
  );
}

function fit(text: string, width: number): string {
  if (width <= 0) return "";
  if (text.length <= width) return text.padEnd(width);
  return text.length > width ? text.slice(0, width - 1) + "…" : text;
}

export function ProjectsPage(props: {
  projects: Project[];
  loops: LoopMeta[];
  headerFocused: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onOpenCreate?: (trigger: () => void) => void;
  onEnterHeader?: (direction: "left" | "right") => void;
  onNavigateCreate?: () => void;
  onNavigateEdit?: (project: Project) => void;
}): React.ReactNode {
  const { projects, loops, headerFocused, onClose, onRefresh, onOpenCreate, onEnterHeader, onNavigateCreate, onNavigateEdit } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subModal, setSubModal] = useState<SubModal>("none");
  const [projectFilters, setProjectFilters] = useState<ProjectFilters>(defaultProjectFilters);
  const [searchActive, setSearchActive] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<FilterPanel>("list");

  const filteredProjects = applyProjectFilters(projects, loops, projectFilters);
  const clampedIndex = Math.min(selectedIndex, Math.max(0, filteredProjects.length - 1));
  const selectedProject = filteredProjects[clampedIndex] ?? null;

  const loopCount = (projectId: string) =>
    loops.filter((l) => (l.projectId ?? "default") === projectId).length;

  const { width } = useTerminalDimensions();
  const panelWidth = Math.floor(width * 0.4) - 4;
  const bulletW = 2;
  const loopsW = 6;
  const createdW = 12;
  const nameW = Math.max(10, panelWidth - bulletW - 1 - loopsW - 1 - createdW);

  const header =
    "  " +
    fit("", bulletW) +
    fit(t("project.headerName"), nameW) +
    " " +
    fit(t("project.headerLoops"), loopsW) +
    " " +
    fit(t("project.headerCreated"), createdW);

  const filterPanels: FilterPanel[] = ["search", "has-loops", "is-system", "sort", "list", "edit", "delete"];
  const currentPanelIndex = filterPanels.indexOf(focusedPanel);

  function movePanel(direction: 1 | -1): void {
    const next = currentPanelIndex + direction;
    if (next < 0) {
      onEnterHeader?.("left");
    } else if (next >= filterPanels.length) {
      onEnterHeader?.("right");
    } else {
      setFocusedPanel(filterPanels[next]);
    }
  }

  function runAction(actionIndex: number): void {
    if (!selectedProject || selectedProject.isSystem) return;
    if (actionIndex === 0) {
      if (onNavigateEdit) onNavigateEdit(selectedProject);
      else setSubModal("edit");
    }
    else if (actionIndex === 1) setSubModal("delete");
  }

  // Expose create trigger to parent via callback
  useState(() => { onOpenCreate?.(() => setSubModal("create")); });

  useEffect(() => {
    if (headerFocused && focusedPanel !== "list") {
      setFocusedPanel("list");
    }
  }, [headerFocused]);

  useKeyboard((key) => {
    if (subModal !== "none") return;
    if (headerFocused) return;

    if (searchActive) {
      if (key.name === "escape") {
        setSearchActive(false);
        setProjectFilters((f) => ({ ...f, query: "" }));
        setFocusedPanel("list");
        key.preventDefault();
      }
      return;
    }

    if (key.name === "/") {
      setSearchActive(true);
      setFocusedPanel("search");
      key.preventDefault();
      return;
    }

    if (key.name === "left" || key.name === "right") {
      movePanel(key.name === "left" ? -1 : 1);
      key.preventDefault();
      return;
    }

    if (key.name === "up" || key.name === "down") {
      if (focusedPanel === "list") {
        if (key.name === "up") {
          setSelectedIndex((i) => Math.max(0, i - 1));
        } else {
          setSelectedIndex((i) => Math.min(filteredProjects.length - 1, i + 1));
        }
      }
      key.preventDefault();
      return;
    }

    if (key.name === "return" || key.name === "enter") {
      if (focusedPanel === "list") {
        setFocusedPanel("edit");
      } else if (focusedPanel === "search") {
        setSearchActive(true);
      } else if (focusedPanel === "has-loops") {
        setProjectFilters((f) => ({ ...f, hasLoops: cycleProjectHasLoopsFilter(f.hasLoops) }));
      } else if (focusedPanel === "is-system") {
        setProjectFilters((f) => ({ ...f, isSystem: cycleProjectIsSystemFilter(f.isSystem) }));
      } else if (focusedPanel === "sort") {
        setProjectFilters((f) => ({ ...f, sort: cycleProjectSortMode(f.sort) }));
      } else if (focusedPanel === "edit") {
        if (selectedProject && !selectedProject.isSystem) setSubModal("edit");
      } else if (focusedPanel === "delete") {
        if (selectedProject && !selectedProject.isSystem) setSubModal("delete");
      }
      key.preventDefault();
      return;
    }

    if (key.name === "n") {
      if (onNavigateCreate) onNavigateCreate();
      else setSubModal("create");
      key.preventDefault();
      return;
    }
    if (key.name === "e" && selectedProject && !selectedProject.isSystem) {
      if (onNavigateEdit) onNavigateEdit(selectedProject);
      else setSubModal("edit");
      key.preventDefault();
      return;
    }
    if (key.name === "d" && selectedProject && !selectedProject.isSystem) {
      setSubModal("delete");
      key.preventDefault();
      return;
    }
    if (key.name === "escape") {
      onClose();
      key.preventDefault();
    }
  });

  const actions = [
    { key: "edit", label: t("project.editProjectLabel") },
    { key: "delete", label: t("project.deleteProjectLabel") },
  ];

  return (
    <box
      style={{ flexDirection: "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}
    >
      <box
        style={{ width: "40%", flexDirection: "column", backgroundColor: "#0b0b0b", flexShrink: 0 }}
      >
        <ProjectFilterBar
          filters={projectFilters}
          searchActive={searchActive}
          focusedPanel={focusedPanel}
          onHasLoopsCycle={() => setProjectFilters((f) => ({ ...f, hasLoops: cycleProjectHasLoopsFilter(f.hasLoops) }))}
          onIsSystemCycle={() => setProjectFilters((f) => ({ ...f, isSystem: cycleProjectIsSystemFilter(f.isSystem) }))}
          onSortCycle={() => setProjectFilters((f) => ({ ...f, sort: cycleProjectSortMode(f.sort) }))}
          onQueryChange={(q) => setProjectFilters((f) => ({ ...f, query: q }))}
          onSearchActivate={() => { setSearchActive(true); setFocusedPanel("search"); }}
          onSearchDismiss={() => { setSearchActive(false); setFocusedPanel("list"); }}
        />
        <box
          title={t("project.navigatorTitle", {
            visible: filteredProjects.length,
            total: projects.length,
            sort: projectFilters.sort,
            hasLoops: projectFilters.hasLoops,
          })}
          border
          borderColor={focusedPanel === "list" ? ENTITY_COLORS.project : "#1e3a2a"}
          style={{ flexGrow: 1, flexDirection: "column", backgroundColor: "#0b0b0b", overflow: "hidden" }}
        >
          <text fg="#6b7280" style={{ height: 1, overflow: "hidden" }}>{header}</text>
          {filteredProjects.length === 0 ? (
            <text fg="#9ca3af">{t("project.noMatch")}</text>
          ) : (
            <scrollbox style={{ flexGrow: 1, backgroundColor: "#0b0b0b" }}>
              {filteredProjects.map((project, index) => {
                const isSelected = index === clampedIndex;
                const bg = isSelected ? "#1e3a8a" : undefined;
                const count = loopCount(project.id);
                const nameText = fit(project.name, nameW);
                const createdText = fit(project.createdAt.slice(0, 10), createdW);
                return (
                  <box
                    key={project.id}
                    backgroundColor={bg}
                    onMouseDown={() => { setSelectedIndex(index); setFocusedPanel("list"); }}
                    style={{ height: 1, overflow: "hidden" }}
                  >
                    <text fg="#e5e7eb">
                      {isSelected ? "› " : "  "}
                      <span fg={project.color}>{"● "}</span>
                      {nameText}
                      {" "}
                      <span fg="#6b7280">{fit(String(count), loopsW)}</span>
                      {" "}
                      <span fg="#6b7280">{createdText}</span>
                    </text>
                  </box>
                );
              })}
            </scrollbox>
          )}
        </box>
      </box>

      <box style={{ flexGrow: 1, flexDirection: "column", backgroundColor: "#0b0b0b", overflow: "hidden" }}>
        <box
          title={t("board.inspectorTitle")}
          border
          style={{ flexGrow: 1, flexDirection: "column", backgroundColor: "#0b0b0b", padding: 1 }}
        >
          {selectedProject ? (
            <>
              <text>
                <span fg={selectedProject.color}>●</span>
                {` `}
                <strong>{selectedProject.name}</strong>
              </text>
              <text fg="#6b7280">{t("project.fieldId")}{selectedProject.id}</text>
              <text fg="#6b7280">{t("project.fieldLoops")}{loopCount(selectedProject.id)}</text>
              <text fg="#6b7280">{t("project.fieldCreated")}{selectedProject.createdAt.slice(0, 10)}</text>
              {selectedProject.isSystem ? (
                <text fg="#9ca3af">{t("project.systemLabel")}</text>
              ) : null}
            </>
          ) : (
            <text fg="#9ca3af">{t("project.inspectorEmpty")}</text>
          )}
        </box>

        <box
          border
          borderColor={focusedPanel === "edit" || focusedPanel === "delete" ? ENTITY_COLORS.project : undefined}
          style={{ flexDirection: "row", height: 3, flexShrink: 0, paddingLeft: 1, backgroundColor: "#0b0b0b", alignItems: "center", justifyContent: selectedProject?.isSystem ? "center" : "flex-start" }}
        >
          {selectedProject && !selectedProject.isSystem ? (
            actions.map((action, i) => (
              <ProjectActionButton
                key={action.key}
                label={action.label}
                selected={focusedPanel === action.key}
                onMouseDown={() => { setFocusedPanel(action.key as FilterPanel); runAction(i); }}
              />
            ))
          ) : (
            <text fg="#9ca3af">{t("project.systemLabel")}</text>
          )}
        </box>
      </box>

      {subModal === "delete" && selectedProject ? (
        <DeleteProjectConfirm
          project={selectedProject}
          loopCount={loopCount(selectedProject.id)}
          onDone={async () => {
            setSubModal("none");
            setSelectedIndex((i) => Math.max(0, i - 1));
            await onRefresh();
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}
    </box>
  );
}

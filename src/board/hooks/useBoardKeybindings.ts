import type { Dispatch, SetStateAction } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta, RunRecord, TaskDefinition } from "../../types.js";
import { cycleSortMode, cycleStatusFilter, type Filters, type SortMode } from "../state.js";
import { copyToClipboard } from "../../shared/clipboard.js";
import { getActionCount, getActionKeys } from "../components/ActionButtons.js";
import type { ConfirmState, PanelFocus, View } from "../types.js";

const PANEL_ORDER: PanelFocus[] = ["search", "project-filter", "status", "sort", "header-tasks", "header-projects", "header-new", "loops", "runs", "actions"];

const PANEL_LEFT: Record<PanelFocus, PanelFocus> = {
  search:            "actions",
  "project-filter":  "search",
  status:            "project-filter",
  sort:              "status",
  "header-tasks":    "sort",
  "header-projects": "header-tasks",
  "header-new":      "header-projects",
  loops:             "header-new",
  runs:              "loops",
  actions:           "runs",
  projects:          "header-new",
};

const PANEL_RIGHT: Record<PanelFocus, PanelFocus> = {
  search:            "project-filter",
  "project-filter":  "status",
  status:            "sort",
  sort:              "header-tasks",
  "header-tasks":    "header-projects",
  "header-projects": "header-new",
  "header-new":      "loops",
  loops:             "runs",
  runs:              "actions",
  actions:           "search",
  projects:          "loops",
};

function nextPanel(current: PanelFocus, direction: "left" | "right"): PanelFocus {
  return direction === "left" ? PANEL_LEFT[current] : PANEL_RIGHT[current];
}

const CONFIRM_KEYS: Record<string, (p: ConfirmParams) => void> = {
  left: (p) => p.setConfirmChoice((c) => (c === 1 ? 0 : 1)),
  right: (p) => p.setConfirmChoice((c) => (c === 1 ? 0 : 1)),
  tab: (p) => p.setConfirmChoice((c) => (c === 1 ? 0 : 1)),
  y: (p) => { const a = p.confirm.action; p.setConfirm(null); void a(); },
  n: (p) => p.setConfirm(null),
  escape: (p) => p.setConfirm(null),
  return: (p) => {
    if (p.confirmChoice === 1) { const a = p.confirm.action; p.setConfirm(null); void a(); }
    else p.setConfirm(null);
  },
  enter: (p) => {
    if (p.confirmChoice === 1) { const a = p.confirm.action; p.setConfirm(null); void a(); }
    else p.setConfirm(null);
  },
};

interface ConfirmParams {
  confirm: ConfirmState;
  confirmChoice: number;
  setConfirm: Dispatch<SetStateAction<ConfirmState | null>>;
  setConfirmChoice: Dispatch<SetStateAction<number>>;
}

const VIEW_ESCAPE: Record<string, (p: ViewEscapeParams) => void> = {
  create: (p) => { p.setEditTarget(null); p.onBack(); },
  "task-create": (p) => { p.setEditTask(null); p.onBack(); },
  "task-edit": (p) => { p.setEditTask(null); p.onBack(); },
  "task-list": (p) => p.onBack(),
  projects: (p) => p.onBack(),
};

interface ViewEscapeParams {
  setEditTarget: Dispatch<SetStateAction<LoopMeta | null>>;
  setEditTask: Dispatch<SetStateAction<TaskDefinition | null>>;
  onBack: () => void;
}

interface OverlayParams {
  setLogModalRun: Dispatch<SetStateAction<RunRecord | null>>;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;
  setSearchActive: Dispatch<SetStateAction<boolean>>;
  setFocusedPanel: Dispatch<SetStateAction<PanelFocus>>;
}

const OVERLAY_DISMISS: Record<string, (p: OverlayParams, overlay: string) => boolean> = {
  log: (p) => { p.setLogModalRun(null); return true; },
  help: (p) => { p.setHelpOpen(false); return true; },
  search: (p, key) => {
    p.setSearchActive(false);
    p.setFocusedPanel(key === "return" || key === "enter" ? "loops" : "search");
    return true;
  },
};

const GLOBAL_KEYS: Record<string, (p: GlobalKeyParams) => void> = {
  escape: (p) => { p.destroyLogSocket(); p.onQuit(); },
  h: (p) => p.setHelpOpen(true),
  n: (p) => { p.setEditTarget(null); p.push("create"); },
  t: (p) => { p.setEditTask(null); p.push("task-create"); },
  e: (p) => p.onAction("edit"),
  d: (p) => p.onAction("delete"),
  delete: (p) => p.onAction("delete"),
  c: (p) => p.onAction("clone"),
  p: (p) => p.onAction("pause-or-play"),
  s: (p) => p.onAction("stop"),
  f: (p) => p.onAction("trigger"),
};

interface GlobalKeyParams {
  destroyLogSocket: () => void;
  onQuit: () => void;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;
  setEditTarget: Dispatch<SetStateAction<LoopMeta | null>>;
  setEditTask: Dispatch<SetStateAction<TaskDefinition | null>>;
  push: (view: View) => void;
  onAction: (action: string) => void;
}

interface PanelHandlerParams {
  setSearchActive: Dispatch<SetStateAction<boolean>>;
  setFilters: Dispatch<SetStateAction<Filters>>;
  setSort: Dispatch<SetStateAction<SortMode>>;
  setEditTarget: Dispatch<SetStateAction<LoopMeta | null>>;
  push: (view: View) => void;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setSelectedRunIndex: Dispatch<SetStateAction<number>>;
  setFocusedPanel: Dispatch<SetStateAction<PanelFocus>>;
  selectedRunCount: number;
  selected: LoopMeta | null;
  selectedRunIndex: number;
  setSelectedAction: Dispatch<SetStateAction<number>>;
  selectedAction: number;
  onAction: (action: string) => void;
  onOpenRunLog: (run: RunRecord) => void;
  refreshTasks?: () => Promise<void>;
  onViewTasks?: () => void;
  onViewProjects?: () => void;
  onAddLoop?: () => void;
  onSelectProject?: () => void;
}

type PanelKeyHandler = (key: string, p: PanelHandlerParams) => boolean;

const panelHandlers: Record<PanelFocus, PanelKeyHandler> = {
  search: (key, p) => {
    if (key === "return" || key === "enter") { p.setSearchActive(true); return true; }
    return false;
  },
  "project-filter": (key, p) => {
    if (key === "return" || key === "enter") { p.onSelectProject?.(); return true; }
    return false;
  },
  status: (key, p) => {
    if (key === "return" || key === "enter") { p.setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) })); return true; }
    return false;
  },
  sort: (key, p) => {
    if (key === "return" || key === "enter") { p.setSort((prev) => cycleSortMode(prev)); return true; }
    return false;
  },
  "header-tasks": (key, p) => {
    if (key === "return" || key === "enter") { p.onViewTasks?.(); return true; }
    return false;
  },
  "header-projects": (key, p) => {
    if (key === "return" || key === "enter") { p.onViewProjects?.(); return true; }
    return false;
  },
  "header-new": (key, p) => {
    if (key === "return" || key === "enter") { p.onAddLoop?.(); return true; }
    return false;
  },
  loops: (key, p) => {
    if (key === "up" || key === "k") { p.setSelectedIndex((i) => Math.max(0, i - 1)); return true; }
    if (key === "down" || key === "j") { p.setSelectedIndex((i) => Math.min(p.selected ? p.selected.runHistory.length - 1 : 0, i + 1)); return true; }
    if (key === "return" || key === "enter") { p.setFocusedPanel("actions"); return true; }
    return false;
  },
  runs: (key, p) => {
    if (key === "up" || key === "k") { p.setSelectedRunIndex((i) => Math.max(0, i - 1)); return true; }
    if (key === "down" || key === "j") { p.setSelectedRunIndex((i) => Math.min(p.selectedRunCount - 1, i + 1)); return true; }
    if ((key === "return" || key === "enter") && p.selected && p.selected.runHistory.length > 0) {
      const runs = p.selected.runHistory;
      const idx = Math.min(p.selectedRunIndex, runs.length - 1);
      p.onOpenRunLog(runs[runs.length - 1 - idx]);
      return true;
    }
    return false;
  },
  actions: (key, p) => {
    const count = p.selected ? getActionCount(p.selected.status) : 0;
    const keys = p.selected ? getActionKeys(p.selected.status) : [];
    if (key === "up" || key === "k") { p.setSelectedAction((i) => Math.max(0, Math.min(i, count - 1))); return true; }
    if (key === "down" || key === "j") { p.setSelectedAction((i) => Math.min(count - 1, i + 1)); return true; }
    if (key === "return" || key === "enter") { p.onAction(keys[p.selectedAction] ?? "edit"); return true; }
    return false;
  },
  projects: () => false,
};

const BOARD_SHORTCUTS: Record<string, (p: PanelHandlerParams) => void> = {
  "/": (p) => p.setSearchActive(true),
  o: (p) => p.setSort((prev) => cycleSortMode(prev)),
  x: (p) => p.setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) })),
  r: (p) => p.onSelectProject?.(),
};

export interface BoardKeybindingParams {
  confirm: ConfirmState | null;
  confirmChoice: number;
  setConfirm: Dispatch<SetStateAction<ConfirmState | null>>;
  setConfirmChoice: Dispatch<SetStateAction<number>>;
  helpOpen: boolean;
  setHelpOpen: Dispatch<SetStateAction<boolean>>;
  searchActive: boolean;
  setSearchActive: Dispatch<SetStateAction<boolean>>;
  view: View;
  push: (view: View) => void;
  pop: () => void;
  setEditTarget: Dispatch<SetStateAction<LoopMeta | null>>;
  setEditTask: Dispatch<SetStateAction<TaskDefinition | null>>;
  selected: LoopMeta | null;
  visibleCount: number;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setFilters: Dispatch<SetStateAction<Filters>>;
  setSort: Dispatch<SetStateAction<SortMode>>;
  onQuit: () => void;
  destroyLogSocket: () => void;
  logModalRun: RunRecord | null;
  setLogModalRun: Dispatch<SetStateAction<RunRecord | null>>;
  logModalLines: string[];
  selectedRunIndex: number;
  setSelectedRunIndex: Dispatch<SetStateAction<number>>;
  selectedRunCount: number;
  focusedPanel: PanelFocus;
  setFocusedPanel: Dispatch<SetStateAction<PanelFocus>>;
  selectedAction: number;
  setSelectedAction: Dispatch<SetStateAction<number>>;
  onAction: (action: string) => void;
  onOpenRunLog: (run: RunRecord) => void;
  refreshTasks?: () => Promise<void>;
  onViewTasks?: () => void;
  onViewProjects?: () => void;
  onViewLoops?: () => void;
  onAddLoop?: () => void;
  onAddTask?: () => void;
  onSelectProject?: () => void;
  onExitHeader?: (direction: "left" | "right") => void;
}

export function useBoardKeybindings(params: BoardKeybindingParams): void {
  const {
    confirm,
    confirmChoice,
    setConfirm,
    setConfirmChoice,
    helpOpen,
    setHelpOpen,
    searchActive,
    setSearchActive,
    view,
    push,
    pop,
    setEditTarget,
    setEditTask,
    selected,
    visibleCount,
    setSelectedIndex,
    setFilters,
    setSort,
    onQuit,
    destroyLogSocket,
    logModalRun,
    setLogModalRun,
    logModalLines,
    selectedRunIndex,
    setSelectedRunIndex,
    selectedRunCount,
    focusedPanel,
    setFocusedPanel,
    selectedAction,
    setSelectedAction,
    onAction,
    onOpenRunLog,
    refreshTasks,
    onViewTasks,
    onViewProjects,
    onViewLoops,
    onAddLoop,
    onAddTask,
    onSelectProject,
    onExitHeader,
  } = params;

  useKeyboard((key) => {
    const name = key.name;

    if (confirm) {
      CONFIRM_KEYS[name]?.({ confirm, confirmChoice, setConfirm, setConfirmChoice });
      key.preventDefault();
      return;
    }

    if (logModalRun) {
      if (name === "escape" || name === "q") {
        OVERLAY_DISMISS.log({ setLogModalRun, setHelpOpen, setSearchActive, setFocusedPanel }, name);
        key.preventDefault();
        return;
      }
      if (key.ctrl && name === "c") {
        copyToClipboard(logModalLines.join("\n"));
        key.preventDefault();
        return;
      }
      return;
    }

    if (helpOpen && (name === "h" || name === "escape")) {
      OVERLAY_DISMISS.help({ setLogModalRun, setHelpOpen, setSearchActive, setFocusedPanel }, name);
      key.preventDefault();
      return;
    }
    if (helpOpen) return;

    if (searchActive) {
      if (name === "escape") {
        setSearchActive(false);
        setFocusedPanel("loops");
        key.preventDefault();
        return;
      }
      if (name === "up" || name === "k" || name === "down" || name === "j") {
        const handler = panelHandlers["loops"];
        if (handler) {
          handler(name, {
            setSearchActive, setFilters, setSort, setEditTarget, push,
            setSelectedIndex, setSelectedRunIndex, setFocusedPanel, selectedRunCount, selected,
            selectedRunIndex, setSelectedAction, selectedAction, onAction, onOpenRunLog,
            refreshTasks, onViewTasks, onViewProjects, onAddLoop,
          });
          key.preventDefault();
        }
        return;
      }
      return;
    }

    if (view !== "board" && name === "escape") {
      VIEW_ESCAPE[view]?.({ setEditTarget, setEditTask, onBack: pop });
      key.preventDefault();
      return;
    }

    if (name === "tab" && view !== "board") {
      const HEADER_PANELS: PanelFocus[] = ["header-tasks", "header-projects", "header-new"];
      const isHeader = HEADER_PANELS.includes(focusedPanel);
      const direction = key.shift ? "left" : "right";

      if (isHeader) {
        const idx = HEADER_PANELS.indexOf(focusedPanel);
        if (direction === "right" && idx === HEADER_PANELS.length - 1) {
          onExitHeader?.("right");
        } else if (direction === "left" && idx === 0) {
          onExitHeader?.("left");
        } else {
          const nextIdx = direction === "right"
            ? idx + 1
            : idx - 1;
          setFocusedPanel(HEADER_PANELS[nextIdx]);
        }
        key.preventDefault();
        return;
      }
    }

    if (view !== "board" && (name === "return" || name === "enter")) {
      if (view === "task-list") {
        if (focusedPanel === "header-tasks") { onViewProjects?.(); key.preventDefault(); return; }
        if (focusedPanel === "header-projects") { onViewLoops?.(); key.preventDefault(); return; }
        if (focusedPanel === "header-new") { onAddTask?.(); key.preventDefault(); return; }
      } else if (view === "projects") {
        if (focusedPanel === "header-tasks") { onViewLoops?.(); key.preventDefault(); return; }
        if (focusedPanel === "header-projects") { onViewTasks?.(); key.preventDefault(); return; }
        if (focusedPanel === "header-new") { onViewProjects?.(); key.preventDefault(); return; }
      } else if (view === "create" || view === "task-create" || view === "task-edit") {
        if (focusedPanel === "header-tasks") { onViewProjects?.(); key.preventDefault(); return; }
        if (focusedPanel === "header-projects") { onViewTasks?.(); key.preventDefault(); return; }
        if (focusedPanel === "header-new") { onAddLoop?.(); key.preventDefault(); return; }
      }
    }

    if (view !== "board") return;

    if (name === "tab") {
      const direction = key.shift ? "left" : "right";
      if (focusedPanel === "actions") {
        const actionCount = selected ? getActionCount(selected.status) : 0;
        if (direction === "left" && selectedAction === 0) {
          setFocusedPanel((p) => nextPanel(p, "left"));
        } else if (direction === "right" && selectedAction === actionCount - 1) {
          setFocusedPanel((p) => nextPanel(p, "right"));
        } else {
          setSelectedAction((i) =>
            direction === "right"
              ? Math.min(actionCount - 1, i + 1)
              : Math.max(0, i - 1)
          );
        }
      } else {
        const next = nextPanel(focusedPanel, direction);
        if (next === "actions") {
          setFocusedPanel("actions");
          setSelectedAction(0);
        } else {
          setFocusedPanel(next);
        }
      }
      key.preventDefault();
      return;
    }

    const globalHandler = GLOBAL_KEYS[name];
    if (globalHandler) {
      globalHandler({ destroyLogSocket, onQuit, setHelpOpen, setEditTarget, setEditTask, push, onAction });
      key.preventDefault();
      return;
    }

    const panelHandler = panelHandlers[focusedPanel];
    if (panelHandler?.(name, {
      setSearchActive, setFilters, setSort, setEditTarget, push,
      setSelectedIndex, setSelectedRunIndex, setFocusedPanel, selectedRunCount, selected,
      selectedRunIndex, setSelectedAction, selectedAction, onAction, onOpenRunLog,
      refreshTasks, onViewTasks, onViewProjects, onAddLoop,
    })) {
      key.preventDefault();
      return;
    }

    const shortcut = BOARD_SHORTCUTS[name];
    if (shortcut) {
      shortcut({
        setSearchActive, setFilters, setSort, setEditTarget, push,
        setSelectedIndex, setSelectedRunIndex, setFocusedPanel, selectedRunCount, selected,
        selectedRunIndex, setSelectedAction, selectedAction, onAction, onOpenRunLog,
        onSelectProject,
      });
      key.preventDefault();
    }
  });
}

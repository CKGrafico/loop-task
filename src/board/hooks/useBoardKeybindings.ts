import type { Dispatch, SetStateAction } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta, RunRecord, TaskDefinition } from "../../types.js";
import { cycleSortMode, cycleStatusFilter, type Filters, type SortMode } from "../state.js";
import { copyToClipboard } from "../../shared/clipboard.js";
import { getActionCount, getActionKeys } from "../components/ActionButtons.js";
import type { ConfirmState, PanelFocus, View } from "../types.js";

const PANEL_ORDER: PanelFocus[] = ["search", "status", "sort", "tasks", "new", "loops", "runs", "actions"];

const PANEL_LEFT: Record<PanelFocus, PanelFocus> = {
  search: "loops",
  status: "search",
  sort: "status",
  tasks: "sort",
  new: "tasks",
  loops: "new",
  runs: "loops",
  actions: "runs",
  projects: "new",
};

const PANEL_RIGHT: Record<PanelFocus, PanelFocus> = {
  search: "status",
  status: "sort",
  sort: "tasks",
  tasks: "new",
  new: "loops",
  loops: "runs",
  runs: "actions",
  actions: "search",
  projects: "loops",
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
  create: (p) => { p.setEditTarget(null); p.setView("board"); },
  "task-create": (p) => { p.setEditTask(null); p.setView("board"); },
  "task-edit": (p) => { p.setEditTask(null); p.setView("board"); },
  "task-list": (p) => p.setView(p.returnView ?? "board"),
  projects: (p) => p.setView("board"),
};

interface ViewEscapeParams {
  setEditTarget: Dispatch<SetStateAction<LoopMeta | null>>;
  setEditTask: Dispatch<SetStateAction<TaskDefinition | null>>;
  setView: Dispatch<SetStateAction<View>>;
  returnView?: View;
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
  n: (p) => { p.setEditTarget(null); p.setView("create"); },
  t: (p) => { p.setEditTask(null); p.setView("task-create"); },
  e: (p) => p.onAction("edit"),
  d: (p) => p.onAction("delete"),
  delete: (p) => p.onAction("delete"),
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
  setView: Dispatch<SetStateAction<View>>;
  onAction: (action: string) => void;
}

interface PanelHandlerParams {
  setSearchActive: Dispatch<SetStateAction<boolean>>;
  setFilters: Dispatch<SetStateAction<Filters>>;
  setSort: Dispatch<SetStateAction<SortMode>>;
  setEditTarget: Dispatch<SetStateAction<LoopMeta | null>>;
  setView: Dispatch<SetStateAction<View>>;
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
  setTaskListReturnView?: Dispatch<SetStateAction<View>>;
  refreshTasks?: () => Promise<void>;
}

type PanelKeyHandler = (key: string, p: PanelHandlerParams) => boolean;

const panelHandlers: Record<PanelFocus, PanelKeyHandler> = {
  search: (key, p) => {
    if (key === "return" || key === "enter") { p.setSearchActive(true); return true; }
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
  new: (key, p) => {
    if (key === "return" || key === "enter") { p.setEditTarget(null); p.setView("create"); return true; }
    return false;
  },
  tasks: (key, p) => {
    if (key === "return" || key === "enter") { p.setTaskListReturnView?.("board"); p.refreshTasks?.(); p.setView("task-list"); return true; }
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
  setView: Dispatch<SetStateAction<View>>;
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
  returnView?: View;
  setTaskListReturnView?: Dispatch<SetStateAction<View>>;
  refreshTasks?: () => Promise<void>;
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
    setView,
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
    returnView,
    setTaskListReturnView,
    refreshTasks,
  } = params;

  useKeyboard((key) => {
    const name = key.name;

    if (confirm) {
      CONFIRM_KEYS[name]?.({ confirm, confirmChoice, setConfirm, setConfirmChoice });
      return;
    }

    if (logModalRun) {
      if (name === "escape" || name === "q") {
        OVERLAY_DISMISS.log({ setLogModalRun, setHelpOpen, setSearchActive, setFocusedPanel }, name);
        return;
      }
      if (key.ctrl && name === "c") {
        copyToClipboard(logModalLines.join("\n"));
        return;
      }
      return;
    }

    if (helpOpen && (name === "h" || name === "escape")) {
      OVERLAY_DISMISS.help({ setLogModalRun, setHelpOpen, setSearchActive, setFocusedPanel }, name);
      return;
    }
    if (helpOpen) return;

    if (searchActive && (name === "escape" || name === "return" || name === "enter")) {
      OVERLAY_DISMISS.search({ setLogModalRun, setHelpOpen, setSearchActive, setFocusedPanel }, name);
      return;
    }

    if (searchActive) {
      if (name === "left") {
        setSearchActive(false);
        setFocusedPanel("actions");
        setSelectedAction((selected ? getActionCount(selected.status) : 0) - 1);
        return;
      }
      if (name === "backspace") {
        setFilters((prev) => ({ ...prev, query: prev.query.slice(0, -1) }));
        return;
      }
      if (key.sequence && key.sequence.length === 1 && key.sequence >= " " && key.sequence <= "~") {
        setFilters((prev) => ({ ...prev, query: prev.query + key.sequence }));
        return;
      }
      return;
    }

    if (name === "left" || name === "right") {
      if (focusedPanel === "actions") {
        const actionCount = selected ? getActionCount(selected.status) : 0;
        if (name === "left" && selectedAction === 0) {
          setFocusedPanel((p) => nextPanel(p, "left"));
        } else if (name === "right" && selectedAction === actionCount - 1) {
          setFocusedPanel((p) => nextPanel(p, "right"));
        } else {
          setSelectedAction((i) =>
            name === "right"
              ? Math.min(actionCount - 1, i + 1)
              : Math.max(0, i - 1)
          );
        }
      } else {
        const next = nextPanel(focusedPanel, name === "right" ? "right" : "left");
        if (next === "actions") {
          setFocusedPanel("actions");
          setSelectedAction(0);
        } else {
          setFocusedPanel(next);
        }
      }
      return;
    }

    if (view !== "board" && name === "escape") {
      VIEW_ESCAPE[view]?.({ setEditTarget, setEditTask, setView, returnView });
      return;
    }
    if (view !== "board") return;

    const globalHandler = GLOBAL_KEYS[name];
    if (globalHandler) {
      globalHandler({ destroyLogSocket, onQuit, setHelpOpen, setEditTarget, setEditTask, setView, onAction });
      return;
    }

    const panelHandler = panelHandlers[focusedPanel];
    if (panelHandler?.(name, {
      setSearchActive, setFilters, setSort, setEditTarget, setView,
      setSelectedIndex, setSelectedRunIndex, setFocusedPanel, selectedRunCount, selected,
      selectedRunIndex, setSelectedAction, selectedAction, onAction, onOpenRunLog,
      setTaskListReturnView, refreshTasks,
    })) return;

    const shortcut = BOARD_SHORTCUTS[name];
    if (shortcut) {
      shortcut({
        setSearchActive, setFilters, setSort, setEditTarget, setView,
        setSelectedIndex, setSelectedRunIndex, setFocusedPanel, selectedRunCount, selected,
        selectedRunIndex, setSelectedAction, selectedAction, onAction, onOpenRunLog,
      });
    }
  });
}

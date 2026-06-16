import type { Dispatch, SetStateAction } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta, RunRecord } from "../../types.js";
import { cycleSortMode, cycleStatusFilter, type Filters, type SortMode } from "../state.js";
import type { ConfirmState, PanelFocus, View } from "../types.js";

const PANEL_ORDER: PanelFocus[] = ["search", "status", "sort", "new", "loops", "runs", "actions"];
const ACTION_COUNT = 4;

function nextPanel(current: PanelFocus, direction: "left" | "right"): PanelFocus {
  const idx = PANEL_ORDER.indexOf(current);
  return PANEL_ORDER[(idx + (direction === "right" ? 1 : PANEL_ORDER.length - 1)) % PANEL_ORDER.length];
}

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
  selected: LoopMeta | null;
  visibleCount: number;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setFilters: Dispatch<SetStateAction<Filters>>;
  setSort: Dispatch<SetStateAction<SortMode>>;
  onQuit: () => void;
  destroyLogSocket: () => void;
  logModalRun: RunRecord | null;
  setLogModalRun: Dispatch<SetStateAction<RunRecord | null>>;
  selectedRunIndex: number;
  setSelectedRunIndex: Dispatch<SetStateAction<number>>;
  selectedRunCount: number;
  focusedPanel: PanelFocus;
  setFocusedPanel: Dispatch<SetStateAction<PanelFocus>>;
  selectedAction: number;
  setSelectedAction: Dispatch<SetStateAction<number>>;
  onAction: (action: string) => void;
  onOpenRunLog: (run: RunRecord) => void;
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
    selected,
    visibleCount,
    setSelectedIndex,
    setFilters,
    setSort,
    onQuit,
    destroyLogSocket,
    logModalRun,
    setLogModalRun,
    selectedRunIndex,
    setSelectedRunIndex,
    selectedRunCount,
    focusedPanel,
    setFocusedPanel,
    selectedAction,
    setSelectedAction,
    onAction,
    onOpenRunLog,
  } = params;

  useKeyboard((key) => {
    const name = key.name;

    if (confirm) {
      if (name === "left" || name === "right" || name === "tab") {
        setConfirmChoice((c) => (c === 1 ? 0 : 1));
        return;
      }
      if (name === "y") {
        const action = confirm.action;
        setConfirm(null);
        void action();
      } else if (name === "n" || name === "escape") {
        setConfirm(null);
      } else if (name === "return" || name === "enter") {
        if (confirmChoice === 1) {
          const action = confirm.action;
          setConfirm(null);
          void action();
        } else {
          setConfirm(null);
        }
      }
      return;
    }

    if (logModalRun) {
      if (name === "escape" || name === "q") {
        setLogModalRun(null);
      }
      return;
    }

    if (helpOpen) {
      if (name === "h" || name === "escape") {
        setHelpOpen(false);
      }
      return;
    }

    if (searchActive) {
      if (name === "escape") {
        setSearchActive(false);
        setFocusedPanel("search");
      } else if (name === "return" || name === "enter") {
        setSearchActive(false);
        setFocusedPanel("loops");
      }
      return;
    }

    if (view === "create") {
      if (name === "escape") {
        setEditTarget(null);
        setView("board");
      }
      return;
    }

    if (name === "escape") {
      destroyLogSocket();
      onQuit();
      return;
    }

    if (name === "h") {
      setHelpOpen(true);
      return;
    }

    if (name === "n") {
      setEditTarget(null);
      setView("create");
      return;
    }

    if (name === "r") {
      onAction("run");
      return;
    }

    if (view === "board") {
      if (name === "left" || name === "right") {
        if (focusedPanel === "actions") {
          setSelectedAction((i) =>
            name === "right"
              ? Math.min(ACTION_COUNT - 1, i + 1)
              : Math.max(0, i - 1)
          );
        } else {
          setFocusedPanel((p) => nextPanel(p, name === "right" ? "right" : "left"));
        }
        return;
      }

      if (focusedPanel === "search") {
        if (name === "return" || name === "enter") {
          setSearchActive(true);
          return;
        }
      } else if (focusedPanel === "status") {
        if (name === "return" || name === "enter") {
          setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }));
          return;
        }
      } else if (focusedPanel === "sort") {
        if (name === "return" || name === "enter") {
          setSort((prev) => cycleSortMode(prev));
          return;
        }
      } else if (focusedPanel === "new") {
        if (name === "return" || name === "enter") {
          setEditTarget(null);
          setView("create");
          return;
        }
      } else if (focusedPanel === "loops") {
        if (name === "up" || name === "k") {
          setSelectedIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (name === "down" || name === "j") {
          setSelectedIndex((i) => Math.min(visibleCount - 1, i + 1));
          return;
        }
        if ((name === "return" || name === "enter") && selected) {
          setEditTarget(selected);
          setView("create");
          return;
        }
      } else if (focusedPanel === "runs") {
        if (name === "up" || name === "k") {
          setSelectedRunIndex((i) => Math.max(0, i - 1));
          return;
        }
        if (name === "down" || name === "j") {
          setSelectedRunIndex((i) => Math.min(selectedRunCount - 1, i + 1));
          return;
        }
        if ((name === "return" || name === "enter") && selected && selected.runHistory.length > 0) {
          const runs = selected.runHistory;
          const idx = Math.min(selectedRunIndex, runs.length - 1);
          onOpenRunLog(runs[runs.length - 1 - idx]);
          return;
        }
      } else if (focusedPanel === "actions") {
        if (name === "up" || name === "k") {
          setSelectedAction((i) => Math.max(0, i - 1));
          return;
        }
        if (name === "down" || name === "j") {
          setSelectedAction((i) => Math.min(ACTION_COUNT - 1, i + 1));
          return;
        }
        if (name === "return" || name === "enter") {
          const actionKeys = ["pause-resume", "run", "edit", "delete"];
          onAction(actionKeys[selectedAction] ?? "edit");
          return;
        }
      }

      if (name === "/") {
        setSearchActive(true);
        return;
      }

      if (name === "f") {
        setFilters((prev) => ({ ...prev, status: cycleStatusFilter(prev.status) }));
        return;
      }

      if (name === "s") {
        setSort((prev) => cycleSortMode(prev));
        return;
      }
    }
  });
}

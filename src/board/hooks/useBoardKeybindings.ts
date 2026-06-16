import type { Dispatch, SetStateAction } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta } from "../../types.js";
import { t } from "../../i18n/index.js";
import { deleteLoop, pauseLoop, resumeLoop, triggerLoop } from "../daemon.js";
import { cycleSortMode, cycleStatusFilter, type Filters, type SortMode } from "../state.js";
import type { ConfirmState, View } from "../types.js";

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
  selectedId: string | null;
  visibleCount: number;
  setSelectedIndex: Dispatch<SetStateAction<number>>;
  setFilters: Dispatch<SetStateAction<Filters>>;
  setSort: Dispatch<SetStateAction<SortMode>>;
  onQuit: () => void;
  destroyLogSocket: () => void;
  runAction: (label: string, action: () => Promise<void>) => () => Promise<void>;
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
    selectedId,
    visibleCount,
    setSelectedIndex,
    setFilters,
    setSort,
    onQuit,
    destroyLogSocket,
    runAction,
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

    if (helpOpen) {
      if (name === "h" || name === "escape") {
        setHelpOpen(false);
      }
      return;
    }

    if (searchActive) {
      if (name === "escape" || name === "return" || name === "enter") {
        setSearchActive(false);
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
      if (view !== "board") {
        setView("board");
      } else {
        destroyLogSocket();
        onQuit();
      }
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

    if (name === "e" && selected) {
      setEditTarget(selected);
      setView("create");
      return;
    }

    if (view === "board") {
      if (name === "up" || name === "k") {
        setSelectedIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (name === "down" || name === "j") {
        setSelectedIndex((i) => Math.min(visibleCount - 1, i + 1));
        return;
      }
    }

    if (name === "return" || name === "enter") {
      if (selectedId) setView((v) => (v === "detail" ? "board" : "detail"));
      return;
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

    if (!selectedId) {
      return;
    }

    if (name === "p") {
      const actionLabel = selected?.status === "paused" ? t("board.actionResume") : t("board.actionPause");
      const actionVerb = selected?.status === "paused" ? t("board.actionResumed") : t("board.actionPaused");
      const action = selected?.status === "paused"
        ? () => resumeLoop(selectedId)
        : () => pauseLoop(selectedId);
      setConfirmChoice(0);
      setConfirm({
        message: t("board.confirmPauseResume", { action: actionLabel, id: selectedId }),
        action: runAction(t("board.toastActionId", { verb: actionVerb, id: selectedId }), action),
      });
    } else if (name === "d") {
      setConfirmChoice(0);
      setConfirm({
        message: t("board.confirmDelete", { id: selectedId }),
        action: runAction(t("board.toastDeleted", { id: selectedId }), () => deleteLoop(selectedId)),
      });
    } else if (name === "x") {
      void runAction(t("board.toastTriggered", { id: selectedId }), () => triggerLoop(selectedId))();
    }
  });
}

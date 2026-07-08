import { useCallback } from "react";
import { copyToClipboard } from "../../shared/clipboard.js";
import { commandLine } from "../../shared/ui/format.js";
import { t } from "../../shared/i18n/index.js";
import type { ActionContext } from "../../app/types.js";
import { groupRunsByCycle } from "../../widgets/right-panel/RunHistory.js";

export function useContextualActions(context: ActionContext) {
  const {
    activeTab, focusedPanel, selected, selectedRunIndex, selectedTask, selectedProjectEntity,
    tasks, push, setCloneMode, setEditTarget, setPendingTaskSelection,
    handleCommand, handleOpenRunLog, pushToast, isBoardView,
    view, logModalRun, commandsBrowserOpen, confirmState, searchState,
    setChordState, chordState,
  } = context;

  const handleContextualCopy = useCallback(() => {
    const copyHandlers: Record<string, () => void> = {
      loops: () => {
        if (!selected) return;
        const text = selected.commandRaw
          ? selected.commandRaw.split("\n").map((l: string) => l.trim()).filter(Boolean).join(" ")
          : commandLine(selected.command, selected.commandArgs);
        copyToClipboard(text);
        pushToast("info", t("board.toastTextCopied"));
      },
      tasks: () => {
        if (!selectedTask) return;
        const text = selectedTask.commandRaw
          ? selectedTask.commandRaw.split("\n").map((l: string) => l.trim()).filter(Boolean).join(" ")
          : commandLine(selectedTask.command, selectedTask.commandArgs);
        copyToClipboard(text);
        pushToast("info", t("board.toastTextCopied"));
      },
      projects: () => {
        if (!selectedProjectEntity) return;
        copyToClipboard(selectedProjectEntity.name);
        pushToast("info", t("board.toastTextCopied"));
      },
    };
    const handler = copyHandlers[activeTab];
    if (handler) handler();
  }, [activeTab, selected, selectedTask, selectedProjectEntity, pushToast]);

  const triggerContextualAction = useCallback((): void => {
    if (!isBoardView(view) || logModalRun || commandsBrowserOpen || confirmState || searchState?.active) return;
    if (chordState) setChordState(null);

    const editSelectedLoop = () => {
      if (!selected) return;
      setCloneMode(false);
      setEditTarget(selected);
      const task = selected.taskId ? tasks.find((t) => t.id === selected.taskId) : null;
      setPendingTaskSelection(task ? { id: task.id, name: task.name } : null);
      push("create");
    };

    const handlers: Record<string, () => void> = {
      "tasks:": () => { if (selectedTask) handleCommand("edit"); },
      "projects:": () => { if (selectedProjectEntity) handleCommand("edit"); },
      "loops:right": () => {
        if (!selected) return;
        const reversed = [...groupRunsByCycle(selected.runHistory)].reverse();
        if (reversed.length > 0) {
          const run = reversed[Math.min(selectedRunIndex, reversed.length - 1)];
          handleOpenRunLog(run ?? reversed[0]!);
        }
        else editSelectedLoop();
      },
      "loops:left": editSelectedLoop,
    };

    const handlerKey = activeTab !== "loops" ? `${activeTab}:` : `loops:${focusedPanel}`;
    handlers[handlerKey]?.();
  }, [activeTab, focusedPanel, view, logModalRun, commandsBrowserOpen, confirmState, searchState,
      chordState, setChordState, selected, selectedRunIndex, selectedTask, selectedProjectEntity, tasks, push,
      setCloneMode, setEditTarget, setPendingTaskSelection, handleCommand, handleOpenRunLog,
      isBoardView]);

  return { handleContextualCopy, triggerContextualAction };
}

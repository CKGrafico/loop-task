import { useMemo } from "react";
import { t } from "../../../i18n/index.js";
import { resolveInputOwner } from "../../state.js";
import type { OverlayContext } from "../../types.js";

export function useOverlayStack(context: OverlayContext) {
  const {
    confirmState, setConfirmState,
    searchState, setSearchState, setSearchValue,
    logModalRun, setLogModalRun,
    logModalLoopId, setLogModalLoopId,
    commandsBrowserOpen, setCommandsBrowserOpen,
    exportModal, setExportModal,
    contextHelpOpen, setContextHelpOpen,
    view, pop, onQuit, exit,
    commandBarHasText, commandBarDropdownOpen,
  } = context;

  const popLayer = (): boolean => {
    if (confirmState) { setConfirmState(null); return true; }
    if (searchState?.active) {
      setSearchState(null);
      setSearchValue("");
      return true;
    }
    if (logModalRun) { setLogModalRun(null); setLogModalLoopId(null); return true; }
    if (commandsBrowserOpen) { setCommandsBrowserOpen(false); return true; }
    if (exportModal) { setExportModal(null); return true; }
    if (contextHelpOpen) { setContextHelpOpen(false); return true; }
    if (view !== "board") { pop(); return true; }
    setConfirmState({
      prompt: t("confirm.quit"),
      onConfirm: () => { onQuit(); exit(); },
    });
    return true;
  };

  const anyModalOpen = !!(logModalRun || commandsBrowserOpen || exportModal);
  const commandInputDisabled = anyModalOpen;

  const inputOwner = useMemo(
    () => resolveInputOwner({
      modalOpen: !!(logModalRun || commandsBrowserOpen || exportModal || contextHelpOpen || confirmState || searchState?.active),
      commandBarHasText,
      commandBarDropdownOpen,
    }),
    [logModalRun, commandsBrowserOpen, exportModal, contextHelpOpen, confirmState, searchState?.active, commandBarHasText, commandBarDropdownOpen],
  );

  return { popLayer, anyModalOpen, commandInputDisabled, inputOwner };
}

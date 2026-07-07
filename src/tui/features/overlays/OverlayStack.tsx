import React from "react";
import { LogModal } from "../../components/LogModal.js";
import { CommandsBrowserModal } from "../../components/CommandsBrowserModal.js";
import { ContextHelpModal } from "../../components/ContextHelpModal.js";
import { ExportModal } from "../../components/ExportModal.js";
import { ToastStack } from "../../components/Toast.js";
import type { OverlayStackProps } from "../../types.js";

export function OverlayStack(props: OverlayStackProps): React.ReactNode {
  return (
    <>
      {props.commandsBrowserOpen ? (
        <CommandsBrowserModal
          context={props.commandContext}
          onClose={props.onCommandsBrowserClose}
          onExecute={props.onCommandsBrowserExecute}
        />
      ) : null}
      {props.contextHelpOpen ? <ContextHelpModal onClose={props.onContextHelpClose} /> : null}
      {props.exportModal ? (
        <ExportModal
          json={props.exportModal.json}
          filePath={props.exportModal.filePath}
          error={props.exportModal.error}
          onClose={props.onExportModalClose}
          onCopy={props.onExportCopy}
        />
      ) : null}
      {props.logModalRun ? (
        <LogModal
          loopId={props.logModalLoopId}
          run={props.logModalRun}
          logLines={props.logModalLines}
          loading={props.logModalLoading}
          onClose={props.onLogModalClose}
          onCopy={props.onLogCopy}
        />
      ) : null}
      <ToastStack toasts={props.toasts} />
    </>
  );
}

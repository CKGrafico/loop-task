import React from "react";
import { LogModal } from "../../widgets/log-modal/LogModal.js";
import { CommandsBrowserModal } from "../../widgets/commands-browser/CommandsBrowserModal.js";
import { ContextHelpModal } from "./ContextHelpModal.js";
import { ExportModal } from "./ExportModal.js";
import { DiagramModal } from "./DiagramModal.js";
import { ToastStack } from "../../shared/ui/Toast.js";
import type { OverlayStackProps } from "../../app/types.js";

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
      {props.diagramModal ? (
        <DiagramModal
          diagramText={props.diagramModal}
          onClose={props.onDiagramModalClose}
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

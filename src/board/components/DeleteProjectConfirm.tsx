import { useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { deleteProject } from "../daemon.js";

export function DeleteProjectConfirm(props: {
  project: Project;
  loopCount: number;
  onDone: () => void;
  onCancel: () => void;
}): React.ReactNode {
  const { project, loopCount, onDone, onCancel } = props;
  const { width } = useTerminalDimensions();

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel();
    }
    if (key.name === "return" || key.name === "enter") {
      void handleDelete();
    }
  });

  async function handleDelete(): Promise<void> {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      setError("");
      await deleteProject(project.id);
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsDeleting(false);
    }
  }

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <box
        title={t("project.deleteTitle")}
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: Math.min(50, width - 4),
          backgroundColor: "#111827",
        }}
      >
        <text fg="#e5e7eb">{t("project.deleteConfirm", { name: project.name })}</text>
        {loopCount > 0 ? (
          <text fg="#f59e0b">{t("project.deleteWarning", { count: String(loopCount) })}</text>
        ) : null}
        {error ? <text fg="#f87171">{error}</text> : null}
        <text> </text>
        <box style={{ flexDirection: "row" }}>
          <box
            border
            onMouseDown={() => void handleDelete()}
            style={{
              paddingLeft: 1,
              paddingRight: 1,
              marginRight: 1,
              backgroundColor: "#7f1d1d",
            }}
          >
            <text fg="#fca5a5"><strong>{isDeleting ? "Deleting..." : t("project.moveToDefault")}</strong></text>
          </box>
          <box
            border
            onMouseDown={onCancel}
            style={{ paddingLeft: 1, paddingRight: 1, backgroundColor: "#0b0b0b" }}
          >
            <text fg="#e5e7eb"><strong>{t("board.cancel")}</strong></text>
          </box>
        </box>
      </box>
    </box>
  );
}

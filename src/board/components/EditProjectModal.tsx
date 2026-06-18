import { useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { updateProject } from "../daemon.js";

export function EditProjectModal(props: {
  project: Project;
  onDone: () => void;
  onCancel: () => void;
}): React.ReactNode {
  const { project, onDone, onCancel } = props;
  const { width } = useTerminalDimensions();

  const [name, setName] = useState(project.name);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusField, setFocusField] = useState<"name" | "save" | "cancel">("name");

  useKeyboard((key) => {
    if (key.name === "tab") {
      const order: Array<"name" | "save" | "cancel"> = ["name", "save", "cancel"];
      const idx = order.indexOf(focusField);
      const next = key.shift ? order[(idx - 1 + order.length) % order.length] : order[(idx + 1) % order.length];
      setFocusField(next ?? "name");
      return;
    }
    if (key.name === "escape") {
      onCancel();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      if (focusField === "cancel") {
        onCancel();
        return;
      }
      void submit();
    }
  });

  async function submit(): Promise<void> {
    if (isSubmitting) return;
    if (!name.trim()) {
      setError(t("project.error.nameEmpty"));
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      await updateProject(project.id, name.trim());
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
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
        title={t("project.editTitle")}
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: Math.min(44, width - 4),
          backgroundColor: "#111827",
        }}
      >
        <text fg={focusField === "name" ? "#38bdf8" : "#e5e7eb"}>{t("project.labelName")}</text>
        <text fg="#6b7280">{t("project.hintName")}</text>
        <box
          border
          borderColor={focusField === "name" ? "#38bdf8" : undefined}
          style={{ height: 3, backgroundColor: "#0b0b0b", marginBottom: 1 }}
        >
          <input
            focused={focusField === "name"}
            value={name}
            placeholder={project.name}
            onInput={(value: string) => setName(value)}
            onSubmit={() => setFocusField("save")}
          />
        </box>

        {error ? <text fg="#f87171">{error}</text> : null}

        <box style={{ flexDirection: "row", marginTop: 1 }}>
          <box
            border
            borderColor={focusField === "save" ? "#38bdf8" : undefined}
            onMouseDown={() => void submit()}
            style={{
              width: 12,
              justifyContent: "center",
              alignItems: "center",
              marginRight: 1,
              backgroundColor: focusField === "save" ? "#1e3a8a" : "#0b0b0b",
            }}
          >
            <text fg="#e5e7eb"><strong>{isSubmitting ? t("board.saving") : t("board.save")}</strong></text>
          </box>
          <box
            border
            borderColor={focusField === "cancel" ? "#38bdf8" : undefined}
            onMouseDown={onCancel}
            style={{
              width: 12,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: focusField === "cancel" ? "#1e3a8a" : "#0b0b0b",
            }}
          >
            <text fg="#e5e7eb"><strong>{t("board.cancel")}</strong></text>
          </box>
        </box>
      </box>
    </box>
  );
}

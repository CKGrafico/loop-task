import { useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { createProject } from "../daemon.js";
import { PROJECT_COLORS, PROJECT_COLOR_KEYS } from "../../config/constants.js";

export function CreateProjectModal(props: {
  onDone: (project: Project) => void;
  onCancel: () => void;
}): React.ReactNode {
  const { onDone, onCancel } = props;
  const { width } = useTerminalDimensions();

  const defaultColorKey = PROJECT_COLOR_KEYS.indexOf("cyan") >= 0 ? "cyan" : PROJECT_COLOR_KEYS[0] ?? "white";
  const [name, setName] = useState("");
  const [selectedColorKey, setSelectedColorKey] = useState<string>(defaultColorKey);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusField, setFocusField] = useState<"name" | "color" | "save" | "cancel">("name");

  useKeyboard((key) => {
    if (key.name === "tab") {
      const order: Array<"name" | "color" | "save" | "cancel"> = ["name", "color", "save", "cancel"];
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
      return;
    }
    if (focusField === "color") {
      if (key.name === "left") {
        const idx = PROJECT_COLOR_KEYS.indexOf(selectedColorKey);
        setSelectedColorKey(PROJECT_COLOR_KEYS[(idx - 1 + PROJECT_COLOR_KEYS.length) % PROJECT_COLOR_KEYS.length] ?? selectedColorKey);
        return;
      }
      if (key.name === "right") {
        const idx = PROJECT_COLOR_KEYS.indexOf(selectedColorKey);
        setSelectedColorKey(PROJECT_COLOR_KEYS[(idx + 1) % PROJECT_COLOR_KEYS.length] ?? selectedColorKey);
        return;
      }
    }
  });

  async function submit(): Promise<void> {
    if (isSubmitting) return;
    if (!name.trim()) {
      setError(t("project.error.nameRequired"));
      return;
    }
    try {
      setIsSubmitting(true);
      setError("");
      const color = PROJECT_COLORS[selectedColorKey] ?? "#ffffff";
      const project = await createProject(name.trim(), color);
      onDone(project);
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
        title={t("project.createTitle")}
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
            placeholder="My Project"
            onInput={(value: string) => setName(value)}
            onSubmit={() => setFocusField("color")}
          />
        </box>

        <text fg={focusField === "color" ? "#38bdf8" : "#e5e7eb"}>{t("project.labelColor")}</text>
        <text fg="#6b7280">{t("project.hintColor")}</text>
        <box
          border
          borderColor={focusField === "color" ? "#38bdf8" : undefined}
          style={{ height: 3, flexDirection: "row", backgroundColor: "#0b0b0b", alignItems: "center", marginBottom: 1 }}
        >
          {PROJECT_COLOR_KEYS.map((colorKey) => {
            const isActive = selectedColorKey === colorKey;
            return (
              <box
                key={colorKey}
                onMouseDown={() => { setFocusField("color"); setSelectedColorKey(colorKey); }}
                style={{
                  backgroundColor: isActive ? "#1e3a8a" : undefined,
                  paddingLeft: 1,
                  paddingRight: 1,
                  marginRight: 1,
                }}
              >
                <text>
                  <span fg={PROJECT_COLORS[colorKey] ?? "#ffffff"}>●</span>
                  {` ${colorKey}`}
                </text>
              </box>
            );
          })}
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
            <text fg="#e5e7eb"><strong>{isSubmitting ? t("board.saving") : t("board.create")}</strong></text>
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

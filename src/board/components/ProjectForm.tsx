import { useRef, useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { InputRenderable } from "@opentui/core";
import type { Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { createProject, updateProject } from "../daemon.js";
import { PROJECT_COLORS, PROJECT_COLOR_KEYS } from "../../config/constants.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { useInputShortcuts } from "../hooks/useInputShortcuts.js";
import { useTabNav } from "../hooks/useTabNav.js";
import { SearchSelect } from "./SearchSelect.js";
import { HOVER_BG } from "../../config/constants.js";

export const projectFields = ["name", "color"] as const;
export type ProjectField = (typeof projectFields)[number];

export function projectInitialValues(project: Project | null): Record<ProjectField, string> {
  if (!project) {
    const defaultColorKey = PROJECT_COLOR_KEYS.indexOf("cyan") >= 0 ? "cyan" : PROJECT_COLOR_KEYS[0] ?? "white";
    return { name: "", color: defaultColorKey };
  }
  const colorKey = PROJECT_COLOR_KEYS.find((k) => PROJECT_COLORS[k] === project.color) ?? "white";
  return { name: project.name, color: colorKey };
}

export function ProjectFormView(props: {
  mode: "create" | "edit";
  editProject: Project | null;
  onCancel: () => void;
  onDone: (updated: boolean, name: string) => void;
}): React.ReactNode {
  const { mode, editProject, onCancel, onDone } = props;

  const [values, setValues] = useState<Record<ProjectField, string>>(projectInitialValues(editProject));
  const valuesRef = useRef(values);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<InputRenderable | null>(null);

  const { width: termWidth } = useTerminalDimensions();
  const btnWidth = Math.max(10, Math.min(14, Math.floor(termWidth / 6)));

  const navItems: (ProjectField | "save" | "cancel")[] = [...projectFields, "save", "cancel"];
  const { focusedItem, isFocused } = useTabNav<string>(navItems);

  const focusedItemRef = useRef(focusedItem);
  focusedItemRef.current = focusedItem;

  useInputShortcuts(() => {
    const fi = focusedItemRef.current;
    if (fi === "save" || fi === "cancel" || fi === "color") return null;
    return inputRef.current;
  });

  function updateValues(next: Record<ProjectField, string>): void {
    valuesRef.current = next;
    setValues(next);
  }

  useKeyboard((key) => {
    if (key.name === "escape") {
      onCancel();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const fi = focusedItemRef.current;
      if (fi === "cancel") {
        onCancel();
        return;
      }
      void submit(valuesRef.current);
      return;
    }
    const fi = focusedItemRef.current;
    if (fi === "save") {
      void submit(valuesRef.current);
      key.preventDefault();
    } else if (fi === "cancel") {
      onCancel();
      key.preventDefault();
    }
  });

  async function submit(current: Record<ProjectField, string>): Promise<void> {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError("");

      if (!current.name.trim()) {
        setError(t("project.error.nameRequired"));
        return;
      }

      const color = PROJECT_COLORS[current.color] ?? PROJECT_COLORS.cyan;

      if (mode === "edit" && editProject) {
        await updateProject(editProject.id, current.name.trim(), color);
        onDone(true, current.name.trim());
      } else {
        await createProject(current.name.trim(), color);
        onDone(false, current.name.trim());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  const colorOptions = PROJECT_COLOR_KEYS.map((k) => ({
    name: k,
    value: k,
    color: PROJECT_COLORS[k],
  }));

  const title = mode === "edit" ? t("project.editTitle") : t("project.createTitle");

  return (
    <box title={title} border style={{ flexDirection: "column", flexGrow: 1, padding: 1, backgroundColor: "#0b0b0b" }}>
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        <box style={{ flexDirection: "row", marginBottom: 1 }}>
          <box style={{ width: "50%", paddingRight: 1, flexDirection: "column" }}>
            <text fg={isFocused("name") ? "#38bdf8" : "#e5e7eb"}>{t("project.labelName")}</text>
            <text fg="#6b7280">{t("project.hintName")}</text>
            <box
              border
              borderColor={isFocused("name") ? "#38bdf8" : undefined}
              style={{ height: 3, backgroundColor: "#0b0b0b" }}
            >
              <input
                ref={inputRef}
                focused={isFocused("name")}
                value={values.name}
                placeholder="My Project"
                onInput={(value: string) => updateValues({ ...valuesRef.current, name: value })}
                onSubmit={() => { void submit(valuesRef.current); }}
              />
            </box>
          </box>

          <box style={{ width: "50%", flexDirection: "column" }}>
            <text fg={isFocused("color") ? "#38bdf8" : "#e5e7eb"}>{t("project.labelColor")}</text>
            <text fg="#6b7280">{t("project.hintColor")}</text>
            <SearchSelect
              options={colorOptions}
              value={values.color}
              onChange={(v) => updateValues({ ...valuesRef.current, color: v })}
              focused={isFocused("color")}
            />
          </box>
        </box>
      </box>

      <box style={{ flexDirection: "row", height: 3, marginBottom: 1, backgroundColor: "#0b0b0b" }}>
        <HoverButton
          label={isSubmitting ? t("board.saving") : mode === "edit" ? t("board.save") : t("board.create")}
          onMouseDown={() => void submit(valuesRef.current)}
          selected={isFocused("save")}
          width={btnWidth}
          marginRight={1}
        />
        <HoverButton
          label={t("board.cancel")}
          onMouseDown={onCancel}
          selected={isFocused("cancel")}
          width={btnWidth}
        />
      </box>
      <text fg="#9ca3af">{t("board.formNav")}</text>
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

function HoverButton(props: {
  label: string;
  onMouseDown: () => void;
  selected: boolean;
  width: number;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.selected ? "#1e3a8a" : isHovered ? HOVER_BG : undefined;
  const borderColor = props.selected ? "#38bdf8" : undefined;
  return (
    <box
      border
      onMouseDown={props.onMouseDown}
      borderColor={borderColor}
      style={{ width: props.width, justifyContent: "center", alignItems: "center", marginRight: props.marginRight, backgroundColor: bg }}
      {...hoverProps}
    >
      <text fg="#e5e7eb"><strong>{props.label}</strong></text>
    </box>
  );
}

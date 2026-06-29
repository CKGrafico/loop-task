import { useRef, useState } from "react";
import crypto from "node:crypto";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { TaskDefinition } from "../../types.js";
import type { InputRenderable } from "@opentui/core";
import { t } from "../../i18n/index.js";
import { createTask, updateTask, listTasks } from "../daemon.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { useInputShortcuts } from "../hooks/useInputShortcuts.js";
import { useTabNav } from "../hooks/useTabNav.js";
import { copyToClipboard } from "../../shared/clipboard.js";
import { HOVER_BG } from "../../config/constants.js";
import { SearchSelect } from "./SearchSelect.js";

const taskFields = ["name", "command", "onSuccessTaskId", "onFailureTaskId"] as const;
type TaskField = (typeof taskFields)[number];

function taskInitialValues(task: TaskDefinition | null): Record<TaskField, string> {
  if (!task) {
    return { name: "", command: "", onSuccessTaskId: "", onFailureTaskId: "" };
  }
  return {
    name: task.name,
    command: [task.command, ...task.commandArgs].join(" "),
    onSuccessTaskId: task.onSuccessTaskId ?? "",
    onFailureTaskId: task.onFailureTaskId ?? "",
  };
}

export function TaskForm(props: {
  mode: "create" | "edit";
  editTask: TaskDefinition | null;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
  onCopy?: (text: string) => void;
}): React.ReactNode {
  const [values, setValues] = useState<Record<TaskField, string>>(taskInitialValues(props.editTask));
  const valuesRef = useRef(values);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allTasks, setAllTasks] = useState<TaskDefinition[]>([]);
  const inputRef = useRef<InputRenderable | null>(null);
  const { width: termWidth } = useTerminalDimensions();
  const btnWidth = Math.max(10, Math.min(14, Math.floor(termWidth / 6)));

  const navItems = [...taskFields, "save", "cancel"];
  const { setFocusIndex, focusedItem, isFocused } = useTabNav<string>(navItems);

  const focusedItemRef = useRef(focusedItem);
  focusedItemRef.current = focusedItem;

  useInputShortcuts(() => {
    const fi = focusedItemRef.current;
    if (fi != null && fi !== "save" && fi !== "cancel" && fi !== "onSuccessTaskId" && fi !== "onFailureTaskId") {
      return inputRef.current;
    }
    return null;
  });

  function updateValues(next: Record<TaskField, string>): void {
    valuesRef.current = next;
    setValues(next);
  }

  useState(() => {
    void listTasks().then(setAllTasks).catch(() => {});
  });

  useKeyboard((key) => {
    if (key.name === "return" || key.name === "enter") {
      const fi = focusedItemRef.current;
      if (fi === "save") { void submit(valuesRef.current); key.preventDefault(); }
      else if (fi === "cancel") { props.onCancel(); key.preventDefault(); }
    }
  });

  async function submit(current: Record<TaskField, string>): Promise<void> {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError("");

      const cmdLine = current.command.trim();
      if (!cmdLine) {
        setError(t("errors.commandEmpty"));
        return;
      }

      const tokens = cmdLine.split(/\s+/);
      const command = tokens[0] ?? "";
      const commandArgs = tokens.slice(1);
      const onSuccessTaskId = current.onSuccessTaskId || null;
      const onFailureTaskId = current.onFailureTaskId || null;

      if (props.mode === "edit" && props.editTask) {
        await updateTask(props.editTask.id, {
          name: current.name.trim() || command,
          command,
          commandArgs,
          onSuccessTaskId,
          onFailureTaskId,
        });
        props.onDone(true, props.editTask.id);
      } else {
        const id = crypto.randomUUID().slice(0, 8);
        await createTask({
          id,
          name: current.name.trim() || command,
          command,
          commandArgs,
          onSuccessTaskId,
          onFailureTaskId,
        });
        props.onDone(false, id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  const labels: Record<TaskField, string> = {
    name: t("board.taskLabelName"),
    command: t("board.taskLabelCommand"),
    onSuccessTaskId: t("board.taskLabelOnSuccess"),
    onFailureTaskId: t("board.taskLabelOnFailure"),
  };

  const hints: Record<TaskField, string> = {
    name: t("board.taskHintName"),
    command: t("board.hintCommand"),
    onSuccessTaskId: t("board.taskHintOnSuccess"),
    onFailureTaskId: t("board.taskHintOnFailure"),
  };

  const chainOptions = [
    { name: t("board.taskNone"), description: "", value: "" },
    ...allTasks
      .filter((t) => t.id !== props.editTask?.id)
      .map((t) => ({ name: `${t.id} ${t.name}`, description: "", value: t.id })),
  ];

  const title = props.mode === "edit" ? t("board.taskEditTitle") : t("board.taskCreateTitle");

  return (
    <box title={title} border style={{ flexDirection: "column", flexGrow: 1, padding: 1, backgroundColor: "#0b0b0b" }}>
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        {Array.from({ length: Math.ceil(taskFields.length / 2) }, (_, row) => {
          const leftField = taskFields[row * 2];
          const rightField = row * 2 + 1 < taskFields.length ? taskFields[row * 2 + 1] : null;
          return (
            <box key={row} style={{ flexDirection: "row", marginBottom: 1 }}>
              <TaskFormRow
                field={leftField}
                index={row * 2}
                focused={isFocused(leftField)}
                values={values}
                valuesRef={valuesRef}
                updateValues={updateValues}
                setFocusIndex={setFocusIndex}
                submit={submit}
                labels={labels}
                hints={hints}
                chainOptions={chainOptions}
                inputRef={inputRef}
                onCopy={props.onCopy}
                style={{ width: "50%", paddingRight: 1 }}
              />
              {rightField ? (
                <TaskFormRow
                  field={rightField}
                  index={row * 2 + 1}
                  focused={isFocused(rightField)}
                  values={values}
                  valuesRef={valuesRef}
                  updateValues={updateValues}
                  setFocusIndex={setFocusIndex}
                  submit={submit}
                  labels={labels}
                  hints={hints}
                  chainOptions={chainOptions}
                  inputRef={inputRef}
                  onCopy={props.onCopy}
                  style={{ width: "50%" }}
                />
              ) : (
                <box style={{ width: "50%" }} />
              )}
            </box>
          );
        })}
      </box>
      <box style={{ flexDirection: "row", height: 3, marginBottom: 1, backgroundColor: "#0b0b0b" }}>
        <HoverButton
          label={isSubmitting ? t("board.saving") : props.mode === "edit" ? t("board.save") : t("board.create")}
          onMouseDown={() => void submit(valuesRef.current)}
          selected={isFocused("save")}
          width={btnWidth}
          marginRight={1}
        />
        <HoverButton
          label={t("board.cancel")}
          onMouseDown={props.onCancel}
          selected={isFocused("cancel")}
          width={btnWidth}
        />
      </box>
      <text fg="#9ca3af">{t("board.formNav")}</text>
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

function TaskFormRow(props: {
  field: TaskField;
  index: number;
  focused: boolean;
  values: Record<TaskField, string>;
  valuesRef: React.MutableRefObject<Record<TaskField, string>>;
  updateValues: (next: Record<TaskField, string>) => void;
  setFocusIndex: (index: number) => void;
  submit: (current: Record<TaskField, string>) => Promise<void>;
  labels: Record<TaskField, string>;
  hints: Record<TaskField, string>;
  chainOptions: { name: string; description: string; value: string }[];
  inputRef: React.MutableRefObject<InputRenderable | null>;
  onCopy?: (text: string) => void;
  style?: { width?: number | `${number}%` | "auto"; flexGrow?: number; marginRight?: number; paddingRight?: number };
}): React.ReactNode {
  const { field, index, focused, values, valuesRef, updateValues, setFocusIndex, submit, labels, hints, chainOptions, inputRef, onCopy, style } = props;
  const isSelect = field === "onSuccessTaskId" || field === "onFailureTaskId";
  const selectOpts = isSelect ? chainOptions : [];
  const copyHover = useHoverState();

  return (
    <box style={{ flexDirection: "column", ...style }}>
      <text fg={focused ? "#38bdf8" : "#e5e7eb"}>{labels[field]}</text>
      <text fg="#6b7280">{hints[field]}</text>
      {isSelect ? (
        <SearchSelect
          options={selectOpts}
          value={values[field]}
          onChange={(v) => updateValues({ ...valuesRef.current, [field]: v })}
          focused={focused}
        />
      ) : (
        <box style={{ flexDirection: "row" }}>
          <box
            border
            borderColor={focused ? "#38bdf8" : undefined}
            style={{ height: 3, width: field === "command" ? "92%" : "100%", backgroundColor: "#0b0b0b" }}
          >
            <input
              ref={inputRef}
              focused={focused}
              value={values[field]}
              placeholder={field === "command" ? t("board.exampleCommand") : ""}
              onInput={(value: string) =>
                updateValues({ ...valuesRef.current, [field]: value })
              }
              onSubmit={() => {
                if (index < taskFields.length - 1) {
                  setFocusIndex(index + 1);
                } else {
                  void submit(valuesRef.current);
                }
              }}
            />
          </box>
          {field === "command" ? (
            <box
              border
              borderColor={copyHover.isHovered ? "#38bdf8" : "#374151"}
              onMouseDown={() => { copyToClipboard(valuesRef.current.command); onCopy?.(valuesRef.current.command); }}
              style={{ width: "8%", height: 3, justifyContent: "center", alignItems: "center", backgroundColor: copyHover.isHovered ? HOVER_BG : "#0b0b0b" }}
              {...copyHover.hoverProps}
            >
              <text fg={copyHover.isHovered ? "#38bdf8" : "#6b7280"}>{"\u2398"}</text>
            </box>
          ) : null}
        </box>
      )}
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

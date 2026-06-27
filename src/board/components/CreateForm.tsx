import { useRef, useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import fs from "node:fs";
import type { LoopMeta, Project } from "../../types.js";
import type { InputRenderable } from "@opentui/core";
import { buildLoopOptions, parseCommandLine } from "../../loop-config.js";
import { t } from "../../i18n/index.js";
import { commandLine } from "../format.js";
import { createLoop, updateLoop, listTasks } from "../daemon.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { useInputShortcuts } from "../hooks/useInputShortcuts.js";
import { SearchSelect } from "./SearchSelect.js";
import { HOVER_BG } from "../../config/constants.js";

export const TASK_MODE_INLINE = "inline";
export const TASK_MODE_EXISTING = "existing";
type TaskMode = typeof TASK_MODE_INLINE | typeof TASK_MODE_EXISTING;

export const createFields = ["interval", "taskMode", "command", "cwd", "taskId", "description", "runNow", "maxRuns", "project"] as const;
export type CreateField = (typeof createFields)[number];

export function createInitialValues(loop: LoopMeta | null, currentProjectId?: string): Record<CreateField, string> {
  if (!loop) {
    return {
      interval: "30m",
      taskMode: TASK_MODE_INLINE,
      command: "",
      cwd: process.cwd(),
      taskId: "",
      description: "",
      runNow: "n",
      maxRuns: "",
      project: currentProjectId ?? "default",
    };
  }
  return {
    interval: loop.intervalHuman,
    taskMode: loop.taskId ? TASK_MODE_EXISTING : TASK_MODE_INLINE,
    command: commandLine(loop.command, loop.commandArgs),
    cwd: loop.cwd ?? "",
    taskId: loop.taskId ?? "",
    description: loop.description ?? "",
    runNow: loop.immediate ? "y" : "n",
    maxRuns: loop.maxRuns !== null ? String(loop.maxRuns) : "",
    project: loop.projectId ?? currentProjectId ?? "default",
  };
}
export function CreateView(props: {
  mode: "create" | "edit";
  editId: string | null;
  initial: Record<CreateField, string>;
  selectedTaskId: string | null;
  selectedTaskName: string | null;
  projects?: Project[];
  currentProjectId?: string;
  onCancel: () => void;
  onDone: (updated: boolean, id: string, description: string) => void;
  onChooseTask: () => void;
}): React.ReactNode {
  const [values, setValues] = useState<Record<CreateField, string>>({
    ...props.initial,
    project: props.initial.project ?? props.currentProjectId ?? "default",
  });
  const valuesRef = useRef(values);
  const [focusIndex, setFocusIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskName, setSelectedTaskName] = useState<string | null>(props.selectedTaskName ?? null);
  const inputRef = useRef<InputRenderable | null>(null);

  useInputShortcuts(() => {
    if (focusIndex >= saveIndex) return null;
    return inputRef.current;
  });

  useState(() => {
    if (values.taskId && !selectedTaskName) {
      void listTasks().then((tasks) => {
        const found = tasks.find((t) => t.id === values.taskId);
        if (found) setSelectedTaskName(found.name);
      }).catch(() => {});
    }
  });
  const { width: termWidth } = useTerminalDimensions();
  const btnWidth = Math.max(10, Math.min(14, Math.floor(termWidth / 6)));

  const isInline = values.taskMode === TASK_MODE_INLINE;

  const visibleFields = props.mode === "edit"
    ? createFields.filter((f) => f !== "runNow")
    : [...createFields];

  const filteredFields = visibleFields.filter((f) => {
    if (f === "command") return isInline;
    if (f === "taskId") return !isInline;
    return true;
  });

  const chooseTaskIdx = filteredFields.indexOf("taskId");
  const saveIndex = filteredFields.length;
  const cancelIndex = filteredFields.length + 1;

  function updateValues(next: Record<CreateField, string>): void {
    valuesRef.current = next;
    setValues(next);
  }

  if (props.selectedTaskId && props.selectedTaskId !== values.taskId) {
    const next = { ...valuesRef.current, taskId: props.selectedTaskId, taskMode: TASK_MODE_EXISTING };
    valuesRef.current = next;
    setValues(next);
    setSelectedTaskName(props.selectedTaskName ?? props.selectedTaskId);
  }

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocusIndex((i) => {
        const next = key.shift ? i - 1 : i + 1;
        if (next < 0) return cancelIndex;
        if (next > cancelIndex) return 0;
        return next;
      });
      key.preventDefault();
      return;
    }

    const field = filteredFields[focusIndex];

    if (key.name === "up" || key.name === "down" || key.name === "left" || key.name === "right") {
      if (field === "project") return;
      if (key.name === "left" || key.name === "right") {
        key.preventDefault();
        return;
      }
      setFocusIndex((i) => {
        const next = key.name === "up" ? i - 1 : i + 1;
        if (next < 0) return cancelIndex;
        if (next > cancelIndex) return 0;
        return next;
      });
      key.preventDefault();
      return;
    }

    if (key.name === "return" || key.name === "enter" || key.name === " ") {
      if (field === "taskMode") {
        const next = valuesRef.current.taskMode === TASK_MODE_INLINE ? TASK_MODE_EXISTING : TASK_MODE_INLINE;
        updateValues({ ...valuesRef.current, taskMode: next });
        key.preventDefault();
        return;
      }
      if (field === "runNow") {
        const next = valuesRef.current.runNow === "y" ? "n" : "y";
        updateValues({ ...valuesRef.current, runNow: next });
        key.preventDefault();
        return;
      }
      if (focusIndex === chooseTaskIdx && !isInline) {
        props.onChooseTask();
        key.preventDefault();
        return;
      }
      if (focusIndex === saveIndex) {
        void submit(valuesRef.current);
        key.preventDefault();
      } else if (focusIndex === cancelIndex) {
        props.onCancel();
        key.preventDefault();
      }
    }
  });

  async function submit(current: Record<CreateField, string>): Promise<void> {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError("");

      if (current.taskMode === TASK_MODE_INLINE) {
        const cwd = current.cwd.trim();
        if (cwd && !fs.existsSync(cwd)) {
          setError(t("board.cwdMissing", { cwd }));
          return;
        }
        const tokens = parseCommandLine(current.command.trim());
        const [command, ...commandArgs] = tokens;
        if (!command) {
          setError(t("errors.commandEmpty"));
          return;
        }
        if (!current.description.trim()) {
          setError(t("errors.descriptionEmpty"));
          return;
        }
        const built = buildLoopOptions(current.interval.trim(), {
          now: props.mode === "create" && current.runNow === "y",
          maxRuns: current.maxRuns.trim() || null,
          verbose: false,
          description: current.description.trim(),
          command,
          commandArgs,
          cwd,
        });
        built.options.projectId = current.project || "default";

        const request =
          props.mode === "edit" && props.editId
            ? updateLoop(props.editId, built.options, built.intervalHuman)
            : createLoop(built.options, built.intervalHuman);

        const id = await request;
        props.onDone(props.mode === "edit", id, current.description.trim());
      } else {
        if (!current.taskId) {
          setError(t("errors.commandEmpty"));
          return;
        }
        if (!current.description.trim()) {
          setError(t("errors.descriptionEmpty"));
          return;
        }
        const cwd = current.cwd.trim();
        if (cwd && !fs.existsSync(cwd)) {
          setError(t("board.cwdMissing", { cwd }));
          return;
        }
        const built = buildLoopOptions(current.interval.trim(), {
          now: props.mode === "create" && current.runNow === "y",
          maxRuns: current.maxRuns.trim() || null,
          verbose: false,
          description: current.description.trim(),
          taskId: current.taskId,
          cwd,
        });
        built.options.projectId = current.project || "default";

        const request =
          props.mode === "edit" && props.editId
            ? updateLoop(props.editId, built.options, built.intervalHuman)
            : createLoop(built.options, built.intervalHuman);

        const id = await request;
        props.onDone(props.mode === "edit", id, current.description.trim());
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  const labels: Record<CreateField, string> = {
    interval: t("board.labelInterval"),
    taskMode: t("board.labelTaskMode"),
    command: t("board.labelCommand"),
    cwd: t("board.labelCwd"),
    taskId: t("board.labelTask"),
    description: t("board.labelDescription"),
    runNow: t("board.labelRunNow"),
    maxRuns: t("board.labelMaxRuns"),
    project: t("project.projectsLabel"),
  };

  const hints: Record<CreateField, string> = {
    interval: t("board.hintInterval"),
    taskMode: t("board.hintTaskMode"),
    command: t("board.hintCommand"),
    cwd: t("board.hintCwd"),
    taskId: t("board.hintTask"),
    description: t("board.hintDescription"),
    runNow: t("board.hintRunNow"),
    maxRuns: t("board.hintMaxRuns"),
    project: t("project.hintColor"),
  };

  const examples: Record<CreateField, string> = {
    interval: t("board.exampleInterval"),
    taskMode: "",
    command: t("board.exampleCommand"),
    cwd: "",
    taskId: "",
    description: t("board.exampleDescription"),
    runNow: "",
    maxRuns: "",
    project: "",
  };

  const taskModeOptions = [
    { name: t("board.taskModeInline"), description: "", value: TASK_MODE_INLINE },
    { name: t("board.taskModeExisting"), description: "", value: TASK_MODE_EXISTING },
  ];

  const runNowOptions = [
    { name: t("board.runNowNo"), description: "", value: "n" },
    { name: t("board.runNowYes"), description: "", value: "y" },
  ];

  const projectOptions = (props.projects ?? []).length > 0
    ? props.projects!.map((p) => ({ name: p.name, value: p.id, color: p.color }))
    : [{ name: "Default", value: "default", color: "#ffffff" }];

  const title = props.mode === "edit" ? t("board.editTitle") : t("board.createTitle");

  return (
    <box title={title} border style={{ flexDirection: "column", flexGrow: 1, padding: 1, backgroundColor: "#0b0b0b" }}>
      <box style={{ flexDirection: "column", marginBottom: 1 }}>
        <text fg="#9ca3af">{t("board.exampleHeading")}</text>
        <text fg="#d1d5db">{t("board.exampleFull")}</text>
      </box>
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        {Array.from({ length: Math.ceil(filteredFields.length / 2) }, (_, row) => {
          const leftField = filteredFields[row * 2];
          const rightField = row * 2 + 1 < filteredFields.length ? filteredFields[row * 2 + 1] : null;
          return (
            <box key={row} style={{ flexDirection: "row", marginBottom: 1 }}>
              <FormRow
                field={leftField}
                index={row * 2}
                focusIndex={focusIndex}
                values={values}
                valuesRef={valuesRef}
                updateValues={updateValues}
                setFocusIndex={setFocusIndex}
                submit={submit}
                labels={labels}
                hints={hints}
                examples={examples}
                taskModeOptions={taskModeOptions}
                runNowOptions={runNowOptions}
                projectOptions={projectOptions}
                selectedTaskName={selectedTaskName}
                fields={filteredFields}
                onChooseTask={props.onChooseTask}
                inputRef={inputRef}
                style={{ width: "50%", paddingRight: 1 }}
              />
              {rightField ? (
                <FormRow
                  field={rightField}
                  index={row * 2 + 1}
                  focusIndex={focusIndex}
                  values={values}
                  valuesRef={valuesRef}
                  updateValues={updateValues}
                  setFocusIndex={setFocusIndex}
                  submit={submit}
                  labels={labels}
                  hints={hints}
                  examples={examples}
                  taskModeOptions={taskModeOptions}
                  runNowOptions={runNowOptions}
                  projectOptions={projectOptions}
                  selectedTaskName={selectedTaskName}
                  fields={filteredFields}
                  onChooseTask={props.onChooseTask}
                  inputRef={inputRef}
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
          selected={focusIndex === saveIndex}
          width={btnWidth}
          marginRight={1}
        />
        <HoverButton
          label={t("board.cancel")}
          onMouseDown={props.onCancel}
          selected={focusIndex === cancelIndex}
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

function FormRow(props: {
  field: CreateField;
  index: number;
  focusIndex: number;
  values: Record<CreateField, string>;
  valuesRef: React.MutableRefObject<Record<CreateField, string>>;
  updateValues: (next: Record<CreateField, string>) => void;
  setFocusIndex: React.Dispatch<React.SetStateAction<number>>;
  submit: (current: Record<CreateField, string>) => Promise<void>;
  labels: Record<CreateField, string>;
  hints: Record<CreateField, string>;
  examples: Record<CreateField, string>;
  taskModeOptions: { name: string; description: string; value: string }[];
  runNowOptions: { name: string; description: string; value: string }[];
  projectOptions: { name: string; value: string; color: string }[];
  selectedTaskName: string | null;
  fields: readonly CreateField[];
  onChooseTask: () => void;
  inputRef: React.MutableRefObject<InputRenderable | null>;
  style?: { width?: number | `${number}%` | "auto"; flexGrow?: number; marginRight?: number; paddingRight?: number };
}): React.ReactNode {
  const { field, index, focusIndex, values, valuesRef, updateValues, setFocusIndex, submit, labels, hints, examples, taskModeOptions, runNowOptions, projectOptions, selectedTaskName, fields, onChooseTask, inputRef, style } = props;
  const { isHovered, hoverProps } = useHoverState();
  const isFocused = focusIndex === index;

  const isToggleField = field === "taskMode" || field === "runNow";
  const isTaskButton = field === "taskId";
  const isProjectField = field === "project";

  const toggleOptions = field === "taskMode" ? taskModeOptions : runNowOptions;
  const toggleValue = field === "taskMode" ? values.taskMode : values.runNow;

  return (
    <box style={{ flexDirection: "column", ...style }}>
      <text fg={isFocused ? "#38bdf8" : "#e5e7eb"}>{labels[field]}</text>
      <text fg="#6b7280">{hints[field]}</text>
      {isToggleField ? (
        <box
          border
          borderColor={isFocused ? "#38bdf8" : undefined}
          style={{ height: 3, flexDirection: "row", backgroundColor: "#0b0b0b", alignItems: "center" }}
        >
          {toggleOptions.map((opt) => {
            const isActive = toggleValue === opt.value;
            return (
              <box
                key={opt.value}
                onMouseDown={() => updateValues({ ...valuesRef.current, [field]: opt.value })}
                style={{ backgroundColor: isActive ? "#1e3a8a" : undefined, paddingLeft: 1, paddingRight: 1, marginRight: 1 }}
                {...hoverProps}
              >
                <text fg={isActive ? "#ffffff" : isHovered ? "#e5e7eb" : "#9ca3af"}><strong>{opt.name}</strong></text>
              </box>
            );
          })}
        </box>
      ) : isTaskButton ? (
        <box
          border
          borderColor={isFocused ? "#38bdf8" : undefined}
          style={{ height: 3, flexDirection: "row", backgroundColor: "#0b0b0b", alignItems: "center", paddingLeft: 1 }}
          onMouseDown={() => { setFocusIndex(index); onChooseTask(); }}
        >
          <text fg={values.taskId ? "#4ade80" : "#9ca3af"}>
            {values.taskId
              ? t("board.selectedTask", { name: selectedTaskName ?? values.taskId })
              : t("board.chooseTask")}
          </text>
        </box>
      ) : isProjectField ? (
        <SearchSelect
          options={projectOptions}
          value={values.project}
          onChange={(v) => updateValues({ ...valuesRef.current, project: v })}
          focused={isFocused}
        />
      ) : (
        <box
          border
          borderColor={isFocused ? "#38bdf8" : undefined}
          style={{ height: 3, backgroundColor: "#0b0b0b" }}
        >
          <input
            ref={inputRef}
            focused={isFocused}
            value={values[field]}
            placeholder={examples[field] ? t("board.placeholderExample", { example: examples[field] }) : t("board.placeholderBlank")}
            onInput={(value: string) =>
              updateValues({ ...valuesRef.current, [field]: value })
            }
            onSubmit={() => {
              if (index < fields.length - 1) {
                setFocusIndex(index + 1);
              } else {
                void submit(valuesRef.current);
              }
            }}
          />
        </box>
      )}
    </box>
  );
}

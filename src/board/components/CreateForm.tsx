import { useRef, useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import type { InputRenderable } from "@opentui/core";
import { buildLoopOptions, parseCommandLine } from "../../loop-config.js";
import { t } from "../../i18n/index.js";
import { commandLine } from "../format.js";
import { createLoop, updateLoop, listTasks } from "../daemon.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { useInputShortcuts } from "../hooks/useInputShortcuts.js";
import { useTabNav } from "../hooks/useTabNav.js";
import { SearchSelect } from "./SearchSelect.js";
import { HOVER_BG } from "../../config/constants.js";
import { useLoopFormValidation } from "../../hooks/useLoopFormValidation.js";
import { copyToClipboard } from "../../shared/clipboard.js";

export const TASK_MODE_INLINE = "inline";
export const TASK_MODE_EXISTING = "existing";

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
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskName, setSelectedTaskName] = useState<string | null>(props.selectedTaskName ?? null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { validateField, validateAll } = useLoopFormValidation();
  const inputRef = useRef<InputRenderable | null>(null);

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

  const navItems = [...filteredFields, "save", "cancel"];
  const { setFocusIndex, focusedItem, isFocused } = useTabNav<string>(navItems);

  const focusedItemRef = useRef(focusedItem);
  focusedItemRef.current = focusedItem;

  useInputShortcuts(() => {
    const fi = focusedItemRef.current;
    if (fi === "save" || fi === "cancel" || fi === "project") return null;
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

  function clearFieldError(key: string): void {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleFieldChange(field: CreateField, value: string): void {
    const next = { ...valuesRef.current, [field]: value };
    valuesRef.current = next;
    setValues(next);
    const error = validateField(field, next);
    setFieldErrors((prev) => {
      if (error) return { ...prev, [field]: error };
      if (!(field in prev)) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
  }

  function handleCopy(field: string, value: string): void {
    copyToClipboard(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

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
    if (key.name !== "return" && key.name !== "enter" && key.name !== " ") return;
    const fi = focusedItemRef.current;
    if (fi === "taskMode") {
      const next = valuesRef.current.taskMode === TASK_MODE_INLINE ? TASK_MODE_EXISTING : TASK_MODE_INLINE;
      const updates: Record<string, string> = { taskMode: next };
      if (next === TASK_MODE_EXISTING) updates.command = "";
      if (next === TASK_MODE_INLINE) updates.taskId = "";
      updateValues({ ...valuesRef.current, ...updates });
      key.preventDefault();
      return;
    }
    if (fi === "runNow") {
      const next = valuesRef.current.runNow === "y" ? "n" : "y";
      updateValues({ ...valuesRef.current, runNow: next });
      key.preventDefault();
      return;
    }
    if (fi === "taskId" && !isInline) {
      props.onChooseTask();
      key.preventDefault();
      return;
    }
    if (fi === "save") {
      void submit(valuesRef.current);
      key.preventDefault();
    } else if (fi === "cancel") {
      props.onCancel();
      key.preventDefault();
    }
  });

  function validateAll(current: Record<CreateField, string>): boolean {
    const errs: Record<string, string> = {};
    for (const f of createFields) {
      if (f === "taskMode" || f === "runNow" || f === "project") continue;
      const msg = validateField(f, current);
      if (msg) errs[f] = msg;
    }
    if (current.taskMode === TASK_MODE_EXISTING && !current.taskId.trim()) {
      errs.taskId = t("board.chooseTask");
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function submit(current: Record<CreateField, string>): Promise<void> {
    if (isSubmitting) return;
    if (!validateAll(current)) return;

    try {
      setIsSubmitting(true);
      setError("");

      if (current.taskMode === TASK_MODE_INLINE) {
        const cwd = current.cwd.trim();
        const tokens = parseCommandLine(current.command.trim());
        const [command, ...commandArgs] = tokens;
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
        const cwd = current.cwd.trim();
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
                isFocused={isFocused(leftField)}
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
                onChooseTask={props.onChooseTask}
                inputRef={inputRef}
                fieldErrors={fieldErrors}
                clearFieldError={clearFieldError}
                mode={props.mode}
                handleFieldChange={handleFieldChange}
                handleCopy={handleCopy}
                copiedField={copiedField}
                style={{ width: "50%", paddingRight: 1 }}
              />
              {rightField ? (
                <FormRow
                  field={rightField}
                  index={row * 2 + 1}
                  isFocused={isFocused(rightField)}
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
                  onChooseTask={props.onChooseTask}
                  inputRef={inputRef}
                  fieldErrors={fieldErrors}
                  clearFieldError={clearFieldError}
                  mode={props.mode}
                  handleFieldChange={handleFieldChange}
                  handleCopy={handleCopy}
                  copiedField={copiedField}
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
  isFocused: boolean;
  values: Record<CreateField, string>;
  valuesRef: React.MutableRefObject<Record<CreateField, string>>;
  updateValues: (next: Record<CreateField, string>) => void;
  setFocusIndex: (i: number) => void;
  submit: (current: Record<CreateField, string>) => Promise<void>;
  labels: Record<CreateField, string>;
  hints: Record<CreateField, string>;
  examples: Record<CreateField, string>;
  taskModeOptions: { name: string; description: string; value: string }[];
  runNowOptions: { name: string; description: string; value: string }[];
  projectOptions: { name: string; value: string; color: string }[];
  selectedTaskName: string | null;
  onChooseTask: () => void;
  inputRef: React.MutableRefObject<InputRenderable | null>;
  fieldErrors: Record<string, string>;
  clearFieldError: (key: string) => void;
  mode: "create" | "edit";
  handleFieldChange: (field: CreateField, value: string) => void;
  handleCopy: (field: string, value: string) => void;
  copiedField: string | null;
  style?: { width?: number | `${number}%` | "auto"; flexGrow?: number; marginRight?: number; paddingRight?: number };
}): React.ReactNode {
  const { field, index, isFocused, values, valuesRef, updateValues, setFocusIndex, submit, labels, hints, examples, taskModeOptions, runNowOptions, projectOptions, selectedTaskName, onChooseTask, inputRef, style, fieldErrors, clearFieldError, mode, handleFieldChange, handleCopy, copiedField } = props;
  const { isHovered, hoverProps } = useHoverState();
  const copyBtnHover = useHoverState();

  const isToggleField = field === "taskMode" || field === "runNow";
  const isTaskButton = field === "taskId";
  const isProjectField = field === "project";
  const error = fieldErrors[field];
  const isCopyableField = mode === "edit" && (field === "command" || field === "cwd");

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
                onMouseDown={() => {
                  if (field === "taskMode") {
                    const updates: Record<string, string> = { [field]: opt.value };
                    if (opt.value === TASK_MODE_EXISTING) updates.command = "";
                    if (opt.value === TASK_MODE_INLINE) updates.taskId = "";
                    updateValues({ ...valuesRef.current, ...updates });
                  } else {
                    updateValues({ ...valuesRef.current, [field]: opt.value });
                  }
                }}
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
        <box style={{ flexDirection: "row", alignItems: "center" }}>
          <box
            border
            borderColor={error ? "#f87171" : isFocused ? "#38bdf8" : undefined}
            style={{ height: 3, flexGrow: 1, backgroundColor: "#0b0b0b" }}
          >
            <input
              ref={inputRef}
              focused={isFocused}
              value={values[field]}
              placeholder={examples[field] ? t("board.placeholderExample", { example: examples[field] }) : t("board.placeholderBlank")}
              onInput={(value: string) => {
                clearFieldError(field);
                handleFieldChange(field, value);
              }}
              onSubmit={() => { void submit(valuesRef.current); }}
            />
          </box>
          {isCopyableField ? (
            <box
              onMouseDown={() => { handleCopy(field, values[field]); }}
              style={{ paddingLeft: 1, paddingRight: 1 }}
              {...copyBtnHover.hoverProps}
            >
              <text fg={copyBtnHover.isHovered ? "#38bdf8" : copiedField === field ? "#4ade80" : "#6b7280"}>
                {copiedField === field ? t("board.toastCopied") : t("board.copyCommand")}
              </text>
            </box>
          ) : null}
        </box>
      )}
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

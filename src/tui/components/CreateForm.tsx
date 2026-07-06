import React, { useMemo, useCallback, useState, useRef } from "react";

import type { Project, LoopOptions, TaskDefinition } from "../../types.js";
import { createLoop, updateLoop } from "../daemon.js";
import { t } from "../../i18n/index.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { TaskPickerModal } from "./TaskPickerModal.js";
import { SelectModal, SelectValueField, type SelectOption } from "./SelectModal.js";
import { CodeEditorPreview } from "./CodeEditorPreview.js";
import { CodeEditorModal } from "./CodeEditorModal.js";
import { parseDuration } from "../../duration.js";
import { parseCommandLine, joinCommandLines } from "../../loop-config.js";


// ── Props ───────────────────────────────────────────────────────────

interface CreateViewProps {
  mode: "create" | "edit";
  editId: string | null;
  initial: Record<string, string>;
  selectedTaskId: string | null;
  selectedTaskName: string | null;
  tasks: TaskDefinition[];
  projects: Project[];
  currentProjectId: string;
  onCancel: () => void;
  onDone: (updated: boolean, id: string, desc: string) => void;
  onChooseTask: (task: { id: string; name: string }) => void;
}

// ── Component ───────────────────────────────────────────────────────

export function CreateView(props: CreateViewProps): React.ReactNode {
  const {
    mode,
    editId,
    initial,
    selectedTaskId,
    selectedTaskName,
    tasks,
    currentProjectId,
    onCancel,
    onDone,
    onChooseTask,
  } = props;

  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [openSelect, setOpenSelect] = useState<"taskMode" | "runNow" | "project" | null>(null);
  const [commandEditorOpen, setCommandEditorOpen] = useState(false);
  const [commandValue, setCommandValue] = useState(initial.command ?? "");

  // renderCustom is invoked on every WizardForm render for every field, so this
  // ref always holds the latest onChange/onAdvance closures per field key —
  // letting the modal (rendered outside WizardForm) drive a field's value.
  const fieldCallbacksRef = useRef<Record<string, { value: string; onChange: (v: string) => void; onAdvance: () => void }>>({});

  const taskModeInitial = initial.taskMode === "existing" ? "Existing task" : "Inline command";

  // Resolve task display name on edit mode: if the user hasn't picked a task
  // via the picker (selectedTaskName is null), look it up from the tasks list.
  // Always format as "<name> (<short id>)" for consistency.
  const resolvedTaskName = useMemo(() => {
    const tid = selectedTaskId ?? initial.taskId;
    if (!tid) return null;
    const displayName = selectedTaskName ?? tasks.find((t) => t.id === tid)?.name;
    if (displayName) return `${displayName} (${tid.slice(0, 8)})`;
    return `${tid.slice(0, 8)}`;
  }, [selectedTaskName, selectedTaskId, initial.taskId, tasks]);

  const steps = useMemo<WizardStepConfig[]>(() => {
    const list: WizardStepConfig[] = [
      {
        key: "interval",
        prompt: t("wizard.intervalPrompt"),
        hint: t("wizard.intervalHint"),
        required: true,
        inputType: "text",
        defaultValue: initial.interval ?? undefined,
      },
      {
        key: "taskMode",
        prompt: t("wizard.taskModePrompt"),
        hint: t("board.hintTaskMode"),
        required: true,
        defaultValue: taskModeInitial,
        onActivate: () => setOpenSelect("taskMode"),
        renderCustom: ({ value, isActive, onChange, onAdvance }) => {
          fieldCallbacksRef.current.taskMode = { value, onChange, onAdvance };
          return (
            <SelectValueField
              label={value || null}
              placeholder={t("wizard.taskModePrompt")}
              isActive={isActive}
            />
          );
        },
      },
      {
        key: "taskId",
        prompt: resolvedTaskName
          ? t("board.selectedTask", { name: resolvedTaskName })
          : t("board.chooseTask"),
        hint: t("board.hintTask"),
        required: true,
        inputType: "text",
        defaultValue: selectedTaskId ?? initial.taskId ?? undefined,
        skip: (values) => !values.taskMode?.includes("Existing"),
        onActivate: () => setTaskPickerOpen(true),
        renderCustom: ({ isActive }) => (
          <SelectValueField
            label={resolvedTaskName}
            placeholder={t("board.chooseTask")}
            isActive={isActive}
          />
        ),
      },
      {
        key: "command",
        prompt: t("wizard.commandPrompt"),
        hint: t("wizard.commandHint"),
        required: true,
        inputType: "text",
        defaultValue: commandValue || undefined,
        skip: (values) => !!values.taskMode?.includes("Existing"),
        onActivate: () => setCommandEditorOpen(true),
        renderCustom: ({ isActive }) => (
          <CodeEditorPreview
            value={commandValue}
            hint={t("wizard.commandHint")}
            isActive={isActive}
            onActivate={() => setCommandEditorOpen(true)}
          />
        ),
      },
      {
        key: "runNow",
        prompt: t("wizard.runNowPrompt"),
        hint: t("board.hintRunNow"),
        required: true,
        defaultValue: initial.runNow === "true" || initial.runNow === "yes"
          ? t("wizard.runNowNow")
          : t("wizard.runNowWait"),
        onActivate: () => setOpenSelect("runNow"),
        renderCustom: ({ value, isActive, onChange, onAdvance }) => {
          fieldCallbacksRef.current.runNow = { value, onChange, onAdvance };
          return (
            <SelectValueField
              label={value || null}
              placeholder={t("wizard.runNowPrompt")}
              isActive={isActive}
            />
          );
        },
      },
      {
        key: "cwd",
        prompt: t("wizard.cwdPrompt"),
        hint: t("wizard.cwdHint"),
        required: false,
        inputType: "text",
        defaultValue: initial.cwd ?? undefined,
      },
      {
        key: "description",
        prompt: t("wizard.descriptionPrompt"),
        hint: t("wizard.descriptionHint"),
        required: true,
        inputType: "text",
        defaultValue: initial.description ?? undefined,
      },
      {
        key: "maxRuns",
        prompt: t("wizard.maxRunsPrompt"),
        hint: t("wizard.maxRunsHint"),
        required: false,
        inputType: "text",
        defaultValue: initial.maxRuns ?? undefined,
      },
      {
        key: "project",
        prompt: t("wizard.projectPrompt"),
        hint: t("wizard.projectHint"),
        required: false,
        defaultValue: props.projects.find((p) => p.id === (initial.project ?? "default"))?.name ?? props.projects[0]?.name,
        onActivate: () => setOpenSelect("project"),
        renderCustom: ({ value, isActive, onChange, onAdvance }) => {
          fieldCallbacksRef.current.project = { value, onChange, onAdvance };
          return (
            <SelectValueField
              label={value || null}
              placeholder={t("wizard.projectPrompt")}
              isActive={isActive}
            />
          );
        },
      },
    ];
    return list;
  }, [taskModeInitial, selectedTaskId, resolvedTaskName, initial, commandValue, props.projects]);

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const intervalInput = values.interval ?? "";
      if (!intervalInput.trim()) return;

      let interval: number;
      try {
        interval = parseDuration(intervalInput.trim());
      } catch {
        return;
      }

      const intervalHuman = intervalInput.trim();
      const isExistingTask = !!values.taskMode?.includes("Existing");

      if (isExistingTask && !selectedTaskId && !values.taskId?.trim()) return;
      const cmdValue = values.command ?? commandValue;
      if (!isExistingTask && !cmdValue.trim()) return;

      const cmd = isExistingTask
        ? ""
        : joinCommandLines(cmdValue);
      let cmdOnly = "";
      let args: string[] = [];
      if (cmd.trim()) {
        try {
          const tokens = parseCommandLine(cmd.trim());
          cmdOnly = tokens[0] ?? "";
          args = tokens.slice(1);
        } catch {
          return;
        }
      }

      const runNowValue = values.runNow === t("wizard.runNowNow");

      const projectName = values.project ?? "";
      const project = props.projects.find((p) => p.name === projectName);
      const projectId = project?.id ?? currentProjectId;

      const options: LoopOptions = {
        interval,
        taskId: isExistingTask
          ? (selectedTaskId ?? values.taskId?.trim() ?? null)
          : null,
        command: cmdOnly,
        commandArgs: args,
        commandRaw: isExistingTask ? undefined : cmdValue,
        cwd: (values.cwd ?? "").trim() || process.cwd(),
        immediate: runNowValue,
        maxRuns: (values.maxRuns ?? "").trim()
          ? parseInt(values.maxRuns, 10)
          : null,
        verbose: false,
        description: (values.description ?? "").trim(),
        projectId,
        offset: null,
      };

      const desc = (values.description ?? "").trim() || [cmdOnly, ...args].join(" ").trim();

      if (mode === "edit" && editId) {
        updateLoop(editId, options, intervalHuman)
          .then((id) => onDone(true, id, desc))
          .catch(() => { /* error handled silently */ });
      } else {
        createLoop(options, intervalHuman)
          .then((id) => onDone(false, id, desc))
          .catch(() => { /* error handled silently */ });
      }
    },
    [selectedTaskId, mode, editId, currentProjectId, onDone, commandValue, props.projects],
  );

  const selectOptionsFor = useCallback(
    (field: "taskMode" | "runNow" | "project"): SelectOption[] => {
      if (field === "taskMode") {
        return [t("wizard.taskModeInline"), t("wizard.taskModeExisting")].map((v) => ({ value: v, label: v }));
      }
      if (field === "runNow") {
        return [t("wizard.runNowWait"), t("wizard.runNowNow")].map((v) => ({ value: v, label: v }));
      }
      return props.projects.map((p) => ({ value: p.name, label: p.name }));
    },
    [props.projects],
  );

  const selectTitleFor = (field: "taskMode" | "runNow" | "project"): string =>
    field === "taskMode" ? t("wizard.taskModePrompt")
      : field === "runNow" ? t("wizard.runNowPrompt")
      : t("wizard.projectPrompt");

  return (
    <>
      <WizardForm
        title={mode === "edit" ? t("wizard.editLoop") : t("wizard.newLoop")}
        steps={steps}
        onComplete={handleComplete}
        onCancel={onCancel}
        disabled={taskPickerOpen || openSelect !== null || commandEditorOpen}
      />
      {taskPickerOpen ? (
        <TaskPickerModal
          tasks={tasks}
          onSelect={(task) => {
            onChooseTask({ id: task.id, name: task.name });
            setTaskPickerOpen(false);
          }}
          onClose={() => setTaskPickerOpen(false)}
        />
      ) : null}
      {openSelect ? (
        <SelectModal
          title={selectTitleFor(openSelect)}
          options={selectOptionsFor(openSelect)}
          initialValue={fieldCallbacksRef.current[openSelect]?.value}
          onSelect={(option) => {
            fieldCallbacksRef.current[openSelect]?.onChange(option.value);
            fieldCallbacksRef.current[openSelect]?.onAdvance();
            setOpenSelect(null);
          }}
          onClose={() => setOpenSelect(null)}
        />
      ) : null}
      {commandEditorOpen ? (
        <CodeEditorModal
          initialValue={commandValue}
          onSave={(v) => {
            setCommandValue(v);
            setCommandEditorOpen(false);
          }}
          onCancel={() => setCommandEditorOpen(false)}
        />
      ) : null}
    </>
  );
}
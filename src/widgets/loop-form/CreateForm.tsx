import React, { useMemo, useCallback, useState, useRef } from "react";

import type { Project, TaskDefinition } from "../../types.js";
import { useInject } from "../../shared/hooks/useInject.js";
import { TYPES } from "../../shared/services/types.js";
import type { LoopService } from "../../shared/services/types.js";
import { t } from "../../shared/i18n/index.js";
import { WizardForm } from "./WizardForm.js";
import { TaskPickerModal } from "../../features/overlays/TaskPickerModal.js";
import { SelectModal, type SelectOption } from "../../shared/ui/SelectModal.js";
import { CodeEditorModal } from "../../features/code-editor/CodeEditorModal.js";
import { useCreateSteps } from "./useCreateSteps.js";
import { useHandleComplete } from "./useHandleComplete.js";


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

  const loopService = useInject<LoopService>(TYPES.LoopService);
  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [openSelect, setOpenSelect] = useState<"taskMode" | "runNow" | "project" | null>(null);
  const [commandEditorOpen, setCommandEditorOpen] = useState(false);
  const [commandValue, setCommandValue] = useState(initial.command ?? "");

  const fieldCallbacksRef = useRef<Record<string, { value: string; onChange: (v: string) => void; onAdvance: () => void }>>({});

  const taskModeInitial = initial.taskMode === "existing" ? "Existing task" : "Inline command";

  const resolvedTaskName = useMemo(() => {
    const tid = selectedTaskId ?? initial.taskId;
    if (!tid) return null;
    const displayName = selectedTaskName ?? tasks.find((t) => t.id === tid)?.name;
    if (displayName) return `${displayName} (${tid.slice(0, 8)})`;
    return `${tid.slice(0, 8)}`;
  }, [selectedTaskName, selectedTaskId, initial.taskId, tasks]);

  const steps = useCreateSteps({
    initial,
    selectedTaskId,
    resolvedTaskName,
    commandValue,
    projects: props.projects,
    setOpenSelect,
    setTaskPickerOpen,
    setCommandEditorOpen,
    fieldCallbacksRef,
    taskModeInitial,
  });

  const handleComplete = useHandleComplete({
    selectedTaskId,
    mode,
    editId,
    currentProjectId,
    onDone,
    commandValue,
    projects: props.projects,
    loopService,
  });

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

import { useMemo } from "react";
import type React from "react";

import type { Project } from "../../types.js";
import { t } from "../../shared/i18n/index.js";
import { type WizardStepConfig } from "./WizardForm.js";
import { SelectValueField } from "../../shared/ui/SelectModal.js";
import { CodeEditorPreview } from "../../features/code-editor/CodeEditorPreview.js";

interface FieldCallbacks {
  value: string;
  onChange: (v: string) => void;
  onAdvance: () => void;
}

interface UseCreateStepsParams {
  initial: Record<string, string>;
  selectedTaskId: string | null;
  resolvedTaskName: string | null;
  commandValue: string;
  projects: Project[];
  setOpenSelect: (v: "taskMode" | "runNow" | "project" | null) => void;
  setTaskPickerOpen: (v: boolean) => void;
  setCommandEditorOpen: (v: boolean) => void;
  fieldCallbacksRef: React.RefObject<Record<string, FieldCallbacks>>;
  taskModeInitial: string;
}

export function useCreateSteps(params: UseCreateStepsParams): WizardStepConfig[] {
  const {
    initial,
    selectedTaskId,
    resolvedTaskName,
    commandValue,
    projects,
    setOpenSelect,
    setTaskPickerOpen,
    setCommandEditorOpen,
    fieldCallbacksRef,
    taskModeInitial,
  } = params;

  return useMemo<WizardStepConfig[]>(() => {
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
        defaultValue: projects.find((p) => p.id === (initial.project ?? "default"))?.name ?? projects[0]?.name,
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
  }, [taskModeInitial, selectedTaskId, resolvedTaskName, initial, commandValue, projects]);
}

import React, { useMemo, useCallback } from "react";

import type { Project } from "../../types.js";
import { createProject, updateProject } from "../daemon.js";
import { t } from "../../i18n/index.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { PROJECT_COLORS, PROJECT_COLOR_KEYS } from "../../config/constants.js";


interface ProjectFormViewProps {
  mode: "create" | "edit";
  editProject: Project | null;
  onCancel: () => void;
  onDone: (updated: boolean, name: string) => void;
}

export function ProjectFormView(props: ProjectFormViewProps): React.ReactNode {
  const { mode, editProject, onCancel, onDone } = props;

  const colorKeyFor = (color: string | undefined): string => {
    const found = PROJECT_COLOR_KEYS.find((k) => PROJECT_COLORS[k] === color);
    return found ?? "cyan";
  };

  const steps = useMemo<WizardStepConfig[]>(() => [
    {
      key: "name",
      prompt: t("project.wizard.namePrompt"),
      hint: t("project.wizard.nameHint"),
      required: true,
      inputType: "text",
      defaultValue: editProject?.name ?? undefined,
    },
    {
      key: "color",
      prompt: t("project.wizard.colorPrompt"),
      hint: t("project.wizard.colorHint"),
      required: true,
      suggestions: PROJECT_COLOR_KEYS,
      inputType: "select",
      defaultValue: colorKeyFor(editProject?.color),
    },
  ], [editProject]);

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const name = (values.name ?? "").trim();
      if (!name) return;

      const colorKey = values.color ?? "cyan";
      const color = PROJECT_COLORS[colorKey] ?? PROJECT_COLORS.cyan;

      if (mode === "edit" && editProject) {
        updateProject(editProject.id, name, color)
          .then(() => onDone(true, name))
          .catch(() => { /* error handled silently */ });
      } else {
        createProject(name, color)
          .then(() => onDone(false, name))
          .catch(() => { /* error handled silently */ });
      }
    },
    [mode, editProject, onDone],
  );

  const title = mode === "edit"
    ? t("project.editTitle")
    : t("project.createTitle");

  return (
    <WizardForm
      title={title}
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}

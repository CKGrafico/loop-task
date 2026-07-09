import React, { useMemo, useCallback, useState, useRef } from "react";

import type { Project } from "../../types.js";
import { useInject } from "../../shared/hooks/useInject.js";
import { TYPES } from "../../shared/services/types.js";
import type { ProjectService } from "../../shared/services/types.js";
import { t } from "../../shared/i18n/index.js";
import { WizardForm, type WizardStepConfig } from "../loop-form/WizardForm.js";
import { SelectModal, SelectValueField, type SelectOption } from "../../shared/ui/SelectModal.js";
import { PROJECT_COLORS, PROJECT_COLOR_KEYS } from "../../shared/config/constants.js";


interface ProjectFormViewProps {
  mode: "create" | "edit";
  editProject: Project | null;
  onCancel: () => void;
  onDone: (updated: boolean, name: string) => void;
}

export function ProjectFormView(props: ProjectFormViewProps): React.ReactNode {
  const { mode, editProject, onCancel, onDone } = props;
  const projectService = useInject<ProjectService>(TYPES.ProjectService);

  const colorKeyFor = (color: string | undefined): string => {
    const found = PROJECT_COLOR_KEYS.find((k) => PROJECT_COLORS[k] === color);
    return found ?? "cyan";
  };

  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const colorFieldRef = useRef<{ value: string; onChange: (v: string) => void; onAdvance: () => void } | null>(null);

  const colorOptions: SelectOption[] = useMemo(
    () => PROJECT_COLOR_KEYS.map((k) => ({ value: k, label: k })),
    [],
  );

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
      defaultValue: colorKeyFor(editProject?.color),
      onActivate: () => setColorPickerOpen(true),
      renderCustom: ({ value, isActive, onChange, onAdvance }) => {
        colorFieldRef.current = { value, onChange, onAdvance };
        return (
          <SelectValueField
            label={value || null}
            placeholder={t("project.wizard.colorPrompt")}
            isActive={isActive}
          />
        );
      },
    },
    {
      key: "directory",
      prompt: t("project.wizard.directoryPrompt"),
      hint: t("project.wizard.directoryHint"),
      required: false,
      inputType: "text",
      defaultValue: mode === "create" ? process.cwd() : (editProject?.directory || undefined),
    },
    {
      key: "githubSource",
      prompt: t("project.wizard.githubSourcePrompt"),
      hint: t("project.wizard.githubSourceHint"),
      required: false,
      inputType: "text",
      defaultValue: editProject?.githubSource || undefined,
    },
  ], [editProject, mode]);

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const name = (values.name ?? "").trim();
      if (!name) return;

      const colorKey = values.color ?? "cyan";
      const color = PROJECT_COLORS[colorKey] ?? PROJECT_COLORS.cyan;
      const githubSource = values.githubSource?.trim() || undefined;

      if (mode === "edit" && editProject) {
        projectService.update(editProject.id, name, color, values.directory?.trim() || undefined, githubSource)
          .then(() => onDone(true, name))
          .catch(() => { /* error handled silently */ });
      } else {
        projectService.create(name, color, values.directory?.trim() || undefined, githubSource)
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
    <>
      <WizardForm
        title={title}
        steps={steps}
        onComplete={handleComplete}
        onCancel={onCancel}
        disabled={colorPickerOpen}
      />
      {colorPickerOpen ? (
        <SelectModal
          title={t("project.wizard.colorPrompt")}
          options={colorOptions}
          initialValue={colorFieldRef.current?.value}
          onSelect={(option) => {
            colorFieldRef.current?.onChange(option.value);
            colorFieldRef.current?.onAdvance();
            setColorPickerOpen(false);
          }}
          onClose={() => setColorPickerOpen(false)}
        />
      ) : null}
    </>
  );
}

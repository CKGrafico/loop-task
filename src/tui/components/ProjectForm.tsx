import React, { useState, useMemo, useCallback } from "react";

import type { Project } from "../../types.js";
import { createProject, updateProject } from "../daemon.js";
import { t } from "../../i18n/index.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { PatchEditForm } from "./PatchEditForm.js";
import { PROJECT_COLORS, PROJECT_COLOR_KEYS } from "../../config/constants.js";
import { validateField } from "../utils/validation.js";


interface ProjectFormViewProps {
  mode: "create" | "edit";
  editProject: Project | null;
  onCancel: () => void;
  onDone: (updated: boolean, name: string) => void;
  onCopy: (value: string) => void;
}

export function ProjectFormView(props: ProjectFormViewProps): React.ReactNode {
  const { mode, editProject, onCancel, onDone, onCopy } = props;

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
      defaultValue: (() => {
        const found = PROJECT_COLOR_KEYS.find((k) => PROJECT_COLORS[k] === editProject?.color);
        return found ?? "cyan";
      })(),
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

  const [activeField, setActiveField] = useState<string | null>(null);
  const [activeFieldValue, setActiveFieldValue] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const editFields = useMemo(
    () => {
      const colorKey = (() => {
        const found = PROJECT_COLOR_KEYS.find((k) => PROJECT_COLORS[k] === editProject?.color);
        return found ?? "white";
      })();
      return [
        { key: "name", label: t("project.labelName"), value: editProject?.name ?? "" },
        { key: "color", label: t("project.labelColor"), value: colorKey },
      ];
    },
    [editProject],
  );

  const handleActiveFieldChange = useCallback((value: string) => {
    setActiveFieldValue(value);
  }, []);

  const handleActiveFieldCommit = useCallback(() => {
    if (activeField !== null) {
      const error = validateField(activeField, activeFieldValue);
      if (error) {
        setValidationErrors((prev) => ({ ...prev, [activeField]: error }));
      } else {
        setValidationErrors((prev) => {
          const next = { ...prev };
          delete next[activeField];
          return next;
        });
      }
      setPendingChanges((prev) => ({ ...prev, [activeField]: activeFieldValue }));
      setActiveField(null);
      setActiveFieldValue("");
    }
  }, [activeField, activeFieldValue]);

  const handleActiveFieldCancel = useCallback(() => {
    setActiveField(null);
    setActiveFieldValue("");
  }, []);

  const handleActiveFieldActivate = useCallback((key: string, value: string) => {
    setActiveField(key);
    setActiveFieldValue(value);
  }, []);

  const handleValidationError = useCallback((key: string, error: string | null) => {
    setValidationErrors((prev) => {
      if (error === null) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: error };
    });
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editProject) return;

    const merged = { name: editProject.name, color: (() => {
      const found = PROJECT_COLOR_KEYS.find((k) => PROJECT_COLORS[k] === editProject.color);
      return found ?? "white";
    })() };
    const finalName = "name" in pendingChanges ? pendingChanges.name! : merged.name;
    const finalColorKey = "color" in pendingChanges ? pendingChanges.color! : merged.color;

    if (!finalName.trim()) {
      setValidationErrors({ name: t("project.error.nameEmpty") });
      return;
    }

    const color = PROJECT_COLORS[finalColorKey] ?? editProject.color;

    updateProject(editProject.id, finalName.trim(), color)
      .then(() => onDone(true, finalName.trim()))
      .catch(() => { /* error handled silently */ });
  }, [editProject, pendingChanges, onDone]);

  if (mode === "edit") {
    return (
      <PatchEditForm
        title={t("project.editTitle")}
        fields={editFields}
        activeField={activeField}
        activeFieldValue={activeFieldValue}
        onActiveFieldChange={handleActiveFieldChange}
        onActiveFieldCommit={handleActiveFieldCommit}
        onActiveFieldCancel={handleActiveFieldCancel}
        onActiveFieldActivate={handleActiveFieldActivate}
        pendingChanges={pendingChanges}
        focusedRowIndex={focusedRowIndex}
        onFocusedRowChange={setFocusedRowIndex}
        validationErrors={validationErrors}
        onValidationError={handleValidationError}
        onSave={handleEditSave}
        onCancel={onCancel}
        onCopy={onCopy}
      />
    );
  }

  return (
    <WizardForm
      title={t("project.createTitle")}
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}

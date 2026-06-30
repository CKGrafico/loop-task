import React, { useState, useMemo, useCallback } from "react";

import type { Project, LoopOptions } from "../../types.js";
import { createLoop, updateLoop } from "../daemon.js";
import { t } from "../../i18n/index.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { PatchEditForm } from "./PatchEditForm.js";

// ── Props ───────────────────────────────────────────────────────────

interface CreateViewProps {
  mode: "create" | "edit";
  editId: string | null;
  initial: Record<string, string>;
  selectedTaskId: string | null;
  selectedTaskName: string | null;
  projects: Project[];
  currentProjectId: string;
  onCancel: () => void;
  onDone: (updated: boolean, id: string, desc: string) => void;
  onChooseTask: () => void;
}

// ── Utility functions (kept from original) ──────────────────────────

function parseArgs(cmd: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cmd)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return tokens;
}

function parseInterval(input: string): { interval: number; intervalHuman: string } | null {
  const match = input.trim().match(/^(\d+)\s*(s|m|h|d|w)$/i);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return { interval: num * multipliers[unit], intervalHuman: input.trim() };
}

function commandLine(command: string, args: string[]): string {
  return [command, ...args].join(" ").trim();
}

// ── Component ───────────────────────────────────────────────────────

export function CreateView(props: CreateViewProps): React.ReactNode {
  const {
    mode,
    editId,
    initial,
    selectedTaskId,
    selectedTaskName,
    currentProjectId,
    onCancel,
    onDone,
  } = props;

  // Track task mode so steps can be conditional
  const taskMode = initial.taskMode === "existing" ? "Existing task" : "Inline command";

  // ── Build wizard steps ──────────────────────────────────────────

  const steps = useMemo<WizardStepConfig[]>(() => {
    const list: WizardStepConfig[] = [
      {
        key: "interval",
        prompt: t("wizard.intervalPrompt"),
        hint: t("wizard.intervalHint"),
        required: true,
        suggestions: ["30s", "5m", "30m", "1h", "1d"],
        inputType: "text",
        defaultValue: initial.interval ?? undefined,
      },
      {
        key: "taskMode",
        prompt: t("wizard.taskModePrompt"),
        hint: t("board.hintTaskMode"),
        required: true,
        suggestions: [t("wizard.taskModeInline"), t("wizard.taskModeExisting")],
        inputType: "select",
        defaultValue: taskMode,
      },
    ];

    // Conditional step based on task mode
    if (taskMode === "Existing task") {
      list.push({
        key: "taskId",
        prompt: selectedTaskName
          ? t("board.selectedTask", { name: selectedTaskName })
          : t("board.chooseTask"),
        hint: t("board.hintTask"),
        required: true,
        inputType: "text",
        defaultValue: selectedTaskName ?? selectedTaskId ?? initial.taskId ?? undefined,
      });
    } else {
      list.push({
        key: "command",
        prompt: t("wizard.commandPrompt"),
        hint: t("wizard.commandHint"),
        required: true,
        inputType: "text",
        defaultValue: initial.command ?? undefined,
      });
    }

    list.push({
      key: "runNow",
      prompt: t("wizard.runNowPrompt"),
      hint: t("board.hintRunNow"),
      required: true,
      suggestions: [t("wizard.runNowWait"), t("wizard.runNowNow")],
      inputType: "select",
      defaultValue: initial.runNow === "true" || initial.runNow === "yes"
        ? t("wizard.runNowNow")
        : t("wizard.runNowWait"),
    });

    // Optional steps
    list.push({
      key: "cwd",
      prompt: t("wizard.cwdPrompt"),
      hint: t("wizard.cwdHint"),
      required: false,
      inputType: "text",
      defaultValue: initial.cwd ?? undefined,
    });

    list.push({
      key: "description",
      prompt: t("wizard.descriptionPrompt"),
      hint: t("wizard.descriptionHint"),
      required: false,
      inputType: "text",
      defaultValue: initial.description ?? undefined,
    });

    list.push({
      key: "maxRuns",
      prompt: t("wizard.maxRunsPrompt"),
      hint: t("wizard.maxRunsHint"),
      required: false,
      inputType: "text",
      defaultValue: initial.maxRuns ?? undefined,
    });

    return list;
  }, [taskMode, selectedTaskId, selectedTaskName, initial]);

  // ── Handle wizard completion ────────────────────────────────────

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const intervalInput = values.interval ?? "";
      if (!intervalInput.trim()) return;
      const parsed = parseInterval(intervalInput);
      if (!parsed) return;

      const isExistingTask = taskMode === "Existing task";

      if (isExistingTask && !selectedTaskId && !values.taskId?.trim()) return;
      if (!isExistingTask && !(values.command ?? "").trim()) return;

      const cmd = isExistingTask ? "" : (values.command ?? "");
      const tokens = cmd.trim() ? parseArgs(cmd.trim()) : [];
      const cmdOnly = tokens[0] ?? "";
      const args = tokens.slice(1);

      const runNowValue = values.runNow === t("wizard.runNowNow");

      const options: LoopOptions = {
        interval: parsed.interval,
        taskId: isExistingTask
          ? (selectedTaskId ?? values.taskId?.trim() ?? null)
          : null,
        command: cmdOnly,
        commandArgs: args,
        cwd: (values.cwd ?? "").trim() || process.cwd(),
        immediate: runNowValue,
        maxRuns: (values.maxRuns ?? "").trim()
          ? parseInt(values.maxRuns, 10)
          : null,
        verbose: false,
        description: (values.description ?? "").trim(),
        projectId: currentProjectId,
        offset: null,
      };

      const desc = (values.description ?? "").trim() || commandLine(cmdOnly, args);

      if (mode === "edit" && editId) {
        updateLoop(editId, options, parsed.intervalHuman)
          .then((id) => onDone(true, id, desc))
          .catch(() => { /* error handled silently */ });
      } else {
        createLoop(options, parsed.intervalHuman)
          .then((id) => onDone(false, id, desc))
          .catch(() => { /* error handled silently */ });
      }
    },
    [taskMode, selectedTaskId, mode, editId, currentProjectId, onDone],
  );

  // ── Edit mode: PatchEditForm ────────────────────────────────────

  const [activeField, setActiveField] = useState<string | null>(null);
  const [activeFieldValue, setActiveFieldValue] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});

  const editFields = useMemo(
    () => [
      { key: "interval", label: t("board.labelInterval"), value: initial.interval ?? "" },
      { key: "command", label: t("board.labelCommand"), value: initial.command ?? "" },
      { key: "cwd", label: t("board.labelCwd"), value: initial.cwd ?? "" },
      { key: "description", label: t("board.labelDescription"), value: initial.description ?? "" },
      { key: "runNow", label: t("board.labelRunNow"), value: initial.runNow ?? "" },
      { key: "maxRuns", label: t("board.labelMaxRuns"), value: initial.maxRuns ?? "" },
      { key: "project", label: t("board.labelTaskMode"), value: initial.project ?? "" },
    ],
    [initial],
  );

  const handleActiveFieldChange = useCallback((value: string) => {
    setActiveFieldValue(value);
  }, []);

  const handleActiveFieldCommit = useCallback(() => {
    if (activeField !== null) {
      setPendingChanges((prev) => ({ ...prev, [activeField]: activeFieldValue }));
      setActiveField(null);
      setActiveFieldValue("");
    }
  }, [activeField, activeFieldValue]);

  const handleActiveFieldCancel = useCallback(() => {
    setActiveField(null);
    setActiveFieldValue("");
  }, []);

  const handleEditSave = useCallback(() => {
    if (!editId) return;

    const merged = { ...initial, ...pendingChanges };
    const intervalInput = merged.interval ?? "";
    const parsed = parseInterval(intervalInput);
    if (!parsed) return;

    const cmd = merged.command ?? "";
    const tokens = cmd.trim() ? parseArgs(cmd.trim()) : [];
    const cmdOnly = tokens[0] ?? "";
    const args = tokens.slice(1);

    const options: LoopOptions = {
      interval: parsed.interval,
      taskId: merged.taskId?.trim() || null,
      command: cmdOnly,
      commandArgs: args,
      cwd: (merged.cwd ?? "").trim() || process.cwd(),
      immediate: merged.runNow === "true" || merged.runNow === "yes",
      maxRuns: (merged.maxRuns ?? "").trim() ? parseInt(merged.maxRuns, 10) : null,
      verbose: false,
      description: (merged.description ?? "").trim(),
      projectId: merged.project ?? currentProjectId,
      offset: null,
    };

    const desc = (merged.description ?? "").trim() || commandLine(cmdOnly, args);

    updateLoop(editId, options, parsed.intervalHuman)
      .then((id) => onDone(true, id, desc))
      .catch(() => { /* error handled silently */ });
  }, [editId, initial, pendingChanges, currentProjectId, onDone]);

  if (mode === "edit") {
    return (
      <PatchEditForm
        title={t("board.editTitle")}
        fields={editFields}
        activeField={activeField}
        activeFieldValue={activeFieldValue}
        onActiveFieldChange={handleActiveFieldChange}
        onActiveFieldCommit={handleActiveFieldCommit}
        onActiveFieldCancel={handleActiveFieldCancel}
        pendingChanges={pendingChanges}
        onSave={handleEditSave}
        onCancel={onCancel}
      />
    );
  }

  // ── Create mode: wizard ─────────────────────────────────────────

  return (
    <WizardForm
      title={t("wizard.newLoop")}
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}

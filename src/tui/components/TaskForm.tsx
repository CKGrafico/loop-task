import React, { useEffect, useMemo, useCallback, useState } from "react";

import type { TaskDefinition } from "../../types.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { InlineCommandEditor } from "./InlineCommandEditor.js";
import { createTask, updateTask, listTasks } from "../daemon.js";
import crypto from "node:crypto";
import { t } from "../../i18n/index.js";

// ── Props ───────────────────────────────────────────────────────────

interface TaskFormProps {
  mode: "create" | "edit";
  editTask: TaskDefinition | null;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
}

// ── Utility ─────────────────────────────────────────────────────────

function parseArgs(cmd: string): string[] {
  const tokens: string[] = [];
  const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cmd)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
  }
  return tokens.slice(1);
}

function joinCommand(task: TaskDefinition): string {
  return [task.command, ...task.commandArgs].join(" ");
}

// ── Component ───────────────────────────────────────────────────────

export function TaskForm(props: TaskFormProps): React.ReactNode {
  const { mode, editTask, onCancel, onDone } = props;

  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [commandValue, setCommandValue] = useState(
    editTask ? (editTask.commandRaw ?? joinCommand(editTask)) : "",
  );

  useEffect(() => {
    listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);

  const chainOptions = useMemo(
    () => [t("wizard.chainNone"), ...tasks.map((task) => task.name)],
    [tasks],
  );

  const resolveChainId = useCallback(
    (val: string): string | null => {
      if (!val || val === t("wizard.chainNone")) return null;
      const found = tasks.find((task) => task.name === val || task.id === val);
      return found?.id ?? val;
    },
    [tasks],
  );

  const resolveChainName = useCallback(
    (id: string | null): string => {
      if (!id) return t("wizard.chainNone");
      const found = tasks.find((task) => task.id === id);
      return found?.name ?? id;
    },
    [tasks],
  );

  const steps = useMemo<WizardStepConfig[]>(() => {
    const list: WizardStepConfig[] = [
      {
        key: "name",
        prompt: t("wizard.taskNamePrompt"),
        hint: t("wizard.taskNameHint"),
        required: true,
        inputType: "text",
        defaultValue: editTask?.name ?? undefined,
      },
      {
        key: "command",
        prompt: t("wizard.taskCommandPrompt"),
        hint: t("wizard.commandHint"),
        required: true,
        inputType: "text",
        defaultValue: commandValue || undefined,
        renderCustom: ({ isActive, onChange }) => (
          <InlineCommandEditor
            value={commandValue}
            hint={t("wizard.commandHint")}
            isActive={isActive}
            onChange={(v) => {
              setCommandValue(v);
              onChange(v);
            }}
          />
        ),
      },
      {
        key: "onSuccess",
        prompt: t("wizard.onSuccessPrompt"),
        hint: t("board.taskHintOnSuccess"),
        required: false,
        inputType: "select",
        suggestions: chainOptions,
        defaultValue: editTask ? resolveChainName(editTask.onSuccessTaskId) : undefined,
      },
      {
        key: "onFailure",
        prompt: t("wizard.onFailurePrompt"),
        hint: t("board.taskHintOnFailure"),
        required: false,
        inputType: "select",
        suggestions: chainOptions,
        defaultValue: editTask ? resolveChainName(editTask.onFailureTaskId) : undefined,
      },
    ];
    return list;
  }, [commandValue, chainOptions, editTask, resolveChainName]);

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const name = values.name?.trim() ?? "";
      const rawCommand = commandValue
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .join(" ");
      if (!name || !rawCommand) return;

      const onSuccessTaskId = resolveChainId(values.onSuccess ?? "");
      const onFailureTaskId = resolveChainId(values.onFailure ?? "");

      const payload = {
        name,
        command: rawCommand.split(" ")[0] ?? "",
        commandArgs: parseArgs(rawCommand),
        commandRaw: commandValue,
        onSuccessTaskId,
        onFailureTaskId,
      };

      if (mode === "edit" && editTask) {
        updateTask(editTask.id, payload)
          .then(() => onDone(true, editTask.id))
          .catch(() => { /* error handled silently */ });
      } else {
        const id = crypto.randomUUID().slice(0, 8);
        createTask({ id, ...payload })
          .then((result) => onDone(false, result.id))
          .catch(() => { /* error handled silently */ });
      }
    },
    [commandValue, resolveChainId, mode, editTask, onDone],
  );

  const title = mode === "edit"
    ? t("board.taskEditTitle")
    : t("board.taskCreateTitle");

  return (
    <WizardForm
      title={title}
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}

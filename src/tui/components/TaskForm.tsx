import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Box, Text } from "ink";
import type { TaskDefinition } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { createTask, listTasks } from "../daemon.js";
import crypto from "node:crypto";
import { t } from "../../i18n/index.js";

// ── Props ───────────────────────────────────────────────────────────

interface TaskFormProps {
  mode: "create" | "edit";
  editTask: TaskDefinition | null;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
  onCopy?: (text: string) => void;
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

// ── Component ───────────────────────────────────────────────────────

export function TaskForm(props: TaskFormProps): React.ReactNode {
  const { mode, onCancel, onDone } = props;

  const [tasks, setTasks] = useState<TaskDefinition[]>([]);

  useEffect(() => {
    listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);

  // ── Wizard step definitions ──────────────────────────────────────

  const steps = useMemo<WizardStepConfig[]>(
    () => [
      {
        key: "command",
        prompt: t("wizard.taskCommandPrompt"),
        hint: t("wizard.commandHint"),
        required: true,
        inputType: "text",
      },
      {
        key: "name",
        prompt: t("wizard.taskNamePrompt"),
        hint: t("wizard.taskNameHint"),
        required: true,
        inputType: "text",
      },
      {
        key: "onSuccess",
        prompt: t("wizard.onSuccessPrompt"),
        hint: "Leave blank for none",
        required: false,
        inputType: "text",
      },
      {
        key: "onFailure",
        prompt: t("wizard.onFailurePrompt"),
        hint: "Leave blank for none",
        required: false,
        inputType: "text",
      },
    ],
    [],
  );

  // ── Resolve a chain value (name or id) to a task id ─────────────

  const resolveChainId = useCallback(
    (val: string): string | null => {
      if (!val) return null;
      const found = tasks.find(
        (task) => task.name === val || task.id === val,
      );
      return found?.id ?? val;
    },
    [tasks],
  );

  // ── Wizard complete handler ──────────────────────────────────────

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const name = values.name?.trim() ?? "";
      const command = values.command?.trim() ?? "";
      const onSuccessVal = values.onSuccess?.trim() ?? "";
      const onFailureVal = values.onFailure?.trim() ?? "";

      if (!name || !command) return;

      const payload = {
        name,
        command,
        commandArgs: parseArgs(command),
        onSuccessTaskId: resolveChainId(onSuccessVal),
        onFailureTaskId: resolveChainId(onFailureVal),
      };

      const id = crypto.randomUUID().slice(0, 8);
      createTask({ id, ...payload })
        .then((result) => onDone(false, result.id))
        .catch(() => {
          /* surface error later */
        });
    },
    [resolveChainId, onDone],
  );

  // ── Edit mode placeholder (task 7.3) ────────────────────────────

  if (mode === "edit") {
    return (
      <Box paddingX={2} paddingY={1}>
        <Text color={theme.text.muted}>Edit mode coming in task 7.3</Text>
      </Box>
    );
  }

  // ── Create mode: wizard ──────────────────────────────────────────

  return (
    <WizardForm
      title={t("wizard.newTask")}
      steps={steps}
      onComplete={handleComplete}
      onCancel={onCancel}
    />
  );
}

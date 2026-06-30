import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import type { TaskDefinition } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { FocusableInput } from "./FocusableInput.js";
import {
  FocusableSearchSelect,
  type FocusableSearchSelectOption,
} from "./FocusableSearchSelect.js";
import { FocusableButton } from "./FocusableButton.js";
import { createTask, updateTask, listTasks } from "../daemon.js";
import crypto from "node:crypto";
import { t } from "../../i18n/index.js";
import { copyToClipboard } from "../../shared/clipboard.js";

interface TaskFormProps {
  mode: "create" | "edit";
  editTask: TaskDefinition | null;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
  onCopy?: (text: string) => void;
}

export function TaskForm(props: TaskFormProps): React.ReactNode {
  const { mode, editTask, onCancel, onDone, onCopy } = props;

  const [name, setName] = useState(editTask?.name ?? "");
  const [command, setCommand] = useState(editTask?.command ?? "");
  const [onSuccessTaskId, setOnSuccessTaskId] = useState(
    editTask?.onSuccessTaskId ?? ""
  );
  const [onFailureTaskId, setOnFailureTaskId] = useState(
    editTask?.onFailureTaskId ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);

  useEffect(() => {
    listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);

  const chainOptions = useMemo<FocusableSearchSelectOption[]>(() => {
    const others = tasks.filter((task) => task.id !== editTask?.id);
    return [
      { name: t("board.taskNone"), value: "" },
      ...others.map((task) => ({ name: task.name, value: task.id })),
    ];
  }, [tasks, editTask]);

  useInput((_input, key) => {
    if (saving) return;
    if (key.escape) {
      onCancel();
      return;
    }
  });

  async function submit(): Promise<void> {
    const payload = {
      name: name.trim(),
      command: command.trim(),
      commandArgs: parseArgs(command.trim()),
      onSuccessTaskId: onSuccessTaskId || null,
      onFailureTaskId: onFailureTaskId || null,
    };
    if (!payload.name || !payload.command) return;
    setSaving(true);
    try {
      if (mode === "edit" && editTask) {
        await updateTask(editTask.id, payload);
        onDone(true, editTask.id);
      } else {
        const id = crypto.randomUUID().slice(0, 8);
        const result = await createTask({ id, ...payload });
        onDone(false, result.id);
      }
    } catch {
      setSaving(false);
    }
  }

  function parseArgs(cmd: string): string[] {
    const tokens: string[] = [];
    const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cmd)) !== null) {
      tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
    }
    return tokens.slice(1);
  }

  function renderField(
    label: string,
    hint: string,
    children: React.ReactNode
  ): React.ReactNode {
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={theme.text.secondary}>
            {label}
          </Text>
        </Box>
        {children}
        <Text color={theme.text.muted}>  {hint}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.accent.task}>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>
          {mode === "edit" ? t("board.taskEditTitle") : t("board.taskCreateTitle")}
        </Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {renderField(
          t("board.taskLabelName"),
          t("board.taskHintName"),
          <FocusableInput
            value={name}
            onChange={setName}
            placeholder={t("board.taskHintName")}
          />
        )}

        {renderField(
          t("board.taskLabelCommand"),
          t("board.hintCommand"),
          <Box flexDirection="row">
            <Box flexGrow={1}>
              <FocusableInput
                value={command}
                onChange={setCommand}
                placeholder={t("board.exampleCommand")}
              />
            </Box>
            {command.trim() ? (
              <FocusableButton
                label={"\u2398"}
                color={theme.accent.focus}
                onPress={() => {
                  copyToClipboard(command.trim());
                  onCopy?.(command.trim());
                }}
              />
            ) : null}
          </Box>
        )}

        {renderField(
          t("board.taskLabelOnSuccess"),
          t("board.taskHintOnSuccess"),
          <FocusableSearchSelect
            options={chainOptions}
            value={onSuccessTaskId}
            onChange={setOnSuccessTaskId}
            placeholder={t("board.taskHintOnSuccess")}
          />
        )}

        {renderField(
          t("board.taskLabelOnFailure"),
          t("board.taskHintOnFailure"),
          <FocusableSearchSelect
            options={chainOptions}
            value={onFailureTaskId}
            onChange={setOnFailureTaskId}
            placeholder={t("board.taskHintOnFailure")}
          />
        )}
      </Box>

      <Box flexDirection="row" paddingX={1} marginBottom={1}>
        <FocusableButton
          label={
            saving
              ? t("board.saving")
              : mode === "edit"
                ? t("board.save")
                : t("board.create")
          }
          color={theme.accent.focus}
          onPress={submit}
        />
        <FocusableButton
          label={t("board.cancel")}
          color={theme.text.secondary}
          onPress={onCancel}
        />
      </Box>

      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.formNav")}</Text>
      </Box>

      {onCopy && command.trim() ? (
        <Box paddingLeft={1} marginBottom={1}>
          <Text color={theme.text.muted}>
            {t("board.copyCommand")}: {command.trim()}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

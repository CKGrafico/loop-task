import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { TaskDefinition } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { SearchSelect, type SearchSelectOption } from "./SearchSelect.js";
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

interface FieldConfig {
  key: string;
  label: string;
  hint: string;
}

export function TaskForm(props: TaskFormProps): React.ReactNode {
  const { mode, editTask, onCancel, onDone, onCopy } = props;

  const [name, setName] = useState(editTask?.name ?? "");
  const [command, setCommand] = useState(editTask?.command ?? "");
  const [onSuccessTaskId, setOnSuccessTaskId] = useState(editTask?.onSuccessTaskId ?? "");
  const [onFailureTaskId, setOnFailureTaskId] = useState(editTask?.onFailureTaskId ?? "");
  const [focusIndex, setFocusIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);

  useEffect(() => {
    listTasks().then(setTasks).catch(() => setTasks([]));
  }, []);

  const fields: FieldConfig[] = useMemo(
    () => [
      { key: "name", label: t("board.taskLabelName"), hint: t("board.taskHintName") },
      { key: "command", label: t("board.taskLabelCommand"), hint: t("board.hintCommand") },
      { key: "onSuccessTaskId", label: t("board.taskLabelOnSuccess"), hint: t("board.taskHintOnSuccess") },
      { key: "onFailureTaskId", label: t("board.taskLabelOnFailure"), hint: t("board.taskHintOnFailure") },
    ],
    []
  );

  const focusOrder = useMemo(() => [...fields.map((f) => f.key), "save", "cancel"], [fields]);

  const currentField = focusOrder[focusIndex];

  const chainOptions = useMemo<SearchSelectOption[]>(() => {
    const others = tasks.filter((task) => task.id !== editTask?.id);
    return [
      { name: t("board.taskNone"), value: "" },
      ...others.map((task) => ({ name: task.name, value: task.id })),
    ];
  }, [tasks, editTask]);

  function clampFocus(idx: number): number {
    const max = focusOrder.length - 1;
    if (idx < 0) return max;
    if (idx > max) return 0;
    return idx;
  }

  useInput((input, key) => {
    if (saving) return;
    if (key.tab) {
      const dir = key.shift ? -1 : 1;
      setFocusIndex((prev) => clampFocus(prev + dir));
      return;
    }
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.return) {
      if (currentField === "save") {
        submit();
        return;
      }
      if (currentField === "cancel") {
        onCancel();
        return;
      }
      setFocusIndex((prev) => clampFocus(prev + 1));
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

  useInput((input, key) => {
    if (!currentField || currentField === "command") return;
    if (currentField === "name") return;
  });

  function parseArgs(cmd: string): string[] {
    const tokens: string[] = [];
    const regex = /"([^"]*)"|'([^']*)'|(\S+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cmd)) !== null) {
      tokens.push(match[1] ?? match[2] ?? match[3] ?? "");
    }
    return tokens.slice(1);
  }

  function renderField(field: FieldConfig, children: React.ReactNode): React.ReactNode {
    const idx = fields.indexOf(field);
    const isFocused = focusIndex === idx && !saving;
    return (
      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={isFocused ? theme.accent.focus : theme.text.secondary}>
            {field.label}
          </Text>
        </Box>
        {children}
        <Text color={theme.text.muted}>  {field.hint}</Text>
      </Box>
    );
  }

  function renderCopyButton(): React.ReactNode {
    const isFocused = focusIndex === 1;
    return (
      <Box
        width="8%"
        borderStyle="single"
        borderColor={isFocused ? theme.accent.focus : theme.border.dim}
        backgroundColor={isFocused ? theme.bg.active : theme.bg.surface}
        justifyContent="center"
      >
        <Text color={isFocused ? theme.text.inverse : theme.text.secondary}>{"\u2398"}</Text>
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
        {renderField(fields[0], (
          <Box>
            <Box flexGrow={1}>
              <TextInput
                value={name}
                onChange={setName}
                placeholder={t("board.taskHintName")}
              />
            </Box>
          </Box>
        ))}

        {renderField(fields[1], (
          <Box flexDirection="row">
            <Box flexGrow={1}>
              <TextInput
                value={command}
                onChange={setCommand}
                placeholder={t("board.exampleCommand")}
              />
            </Box>
            {renderCopyButton()}
          </Box>
        ))}

        {renderField(fields[2], (
          <SearchSelect
            options={chainOptions}
            value={onSuccessTaskId}
            onChange={setOnSuccessTaskId}
            focused={focusIndex === 2 && !saving}
            placeholder={t("board.taskHintOnSuccess")}
          />
        ))}

        {renderField(fields[3], (
          <SearchSelect
            options={chainOptions}
            value={onFailureTaskId}
            onChange={setOnFailureTaskId}
            focused={focusIndex === 3 && !saving}
            placeholder={t("board.taskHintOnFailure")}
          />
        ))}
      </Box>

      <Box flexDirection="row" paddingX={1} marginBottom={1}>
        <Box marginRight={2}>
          {(() => {
            const isFocused = focusIndex === fields.length && !saving;
            return (
              <Box
                borderStyle="single"
                borderColor={isFocused ? theme.accent.focus : theme.border.dim}
                backgroundColor={isFocused ? theme.bg.active : undefined}
                paddingX={2}
              >
                <Text bold color={isFocused ? theme.text.inverse : theme.text.secondary}>
                  {saving ? t("board.saving") : mode === "edit" ? t("board.save") : t("board.create")}
                </Text>
              </Box>
            );
          })()}
        </Box>
        <Box>
          {(() => {
            const isFocused = focusIndex === fields.length + 1 && !saving;
            return (
              <Box
                borderStyle="single"
                borderColor={isFocused ? theme.accent.focus : theme.border.dim}
                backgroundColor={isFocused ? theme.bg.active : undefined}
                paddingX={2}
              >
                <Text bold color={isFocused ? theme.text.inverse : theme.text.secondary}>
                  {t("board.cancel")}
                </Text>
              </Box>
            );
          })()}
        </Box>
      </Box>

      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.formNav")}</Text>
      </Box>

      {onCopy && command.trim() && (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>
            {t("board.copyCommand")}: {command.trim()}
          </Text>
        </Box>
      )}
    </Box>
  );
}

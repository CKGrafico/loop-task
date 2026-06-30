import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import type { Project, LoopOptions } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { SearchSelect, type SearchSelectOption } from "./SearchSelect.js";
import { createLoop, updateLoop } from "../daemon.js";
import { t } from "../../i18n/index.js";

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

interface FieldConfig {
  key: string;
  label: string;
  hint: string;
}

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

export function CreateView(props: CreateViewProps): React.ReactNode {
  const {
    mode,
    editId,
    initial,
    selectedTaskId,
    selectedTaskName,
    projects,
    currentProjectId,
    onCancel,
    onDone,
    onChooseTask,
  } = props;

  const [interval, setIntervalValue] = useState(initial.interval ?? "");
  const [taskMode, setTaskMode] = useState<"inline" | "existing">((initial.taskMode as "inline" | "existing") ?? "inline");
  const [command, setCommand] = useState(initial.command ?? "");
  const [cwd, setCwd] = useState(initial.cwd ?? "");
  const [taskId, setTaskId] = useState(selectedTaskId ?? initial.taskId ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [runNow, setRunNow] = useState(initial.runNow === "true" || initial.runNow === "yes");
  const [maxRuns, setMaxRuns] = useState(initial.maxRuns ?? "");
  const [project, setProject] = useState(currentProjectId || initial.project || "");
  const [saving, setSaving] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);

  const fields: FieldConfig[] = useMemo(() => {
    const list = [
      { key: "interval", label: t("board.labelInterval"), hint: t("board.hintInterval") },
      { key: "taskMode", label: t("board.labelTaskMode"), hint: t("board.hintTaskMode") },
    ];
    if (taskMode === "inline") {
      list.push({ key: "command", label: t("board.labelCommand"), hint: t("board.hintCommand") });
    } else {
      list.push({ key: "taskId", label: t("board.labelTask"), hint: t("board.hintTask") });
    }
    list.push({ key: "cwd", label: t("board.labelCwd"), hint: t("board.hintCwd") });
    list.push({ key: "description", label: t("board.labelDescription"), hint: t("board.hintDescription") });
    list.push({ key: "runNow", label: t("board.labelRunNow"), hint: t("board.hintRunNow") });
    list.push({ key: "maxRuns", label: t("board.labelMaxRuns"), hint: t("board.hintMaxRuns") });
    list.push({ key: "project", label: t("project.labelName"), hint: t("project.hintName") });
    return list;
  }, [taskMode]);

  const focusOrder = useMemo(() => [...fields.map((f) => f.key), "save", "cancel"], [fields]);
  const currentField = focusOrder[focusIndex];

  function clampFocus(idx: number): number {
    const max = focusOrder.length - 1;
    if (idx < 0) return max;
    if (idx > max) return 0;
    return idx;
  }

  const projectOptions = useMemo<SearchSelectOption[]>(() => {
    return projects.map((p) => ({ name: p.name, value: p.id, color: p.color }));
  }, [projects]);

  function submit(): void {
    if (!interval.trim()) return;
    const parsed = parseInterval(interval);
    if (!parsed) return;
    if (taskMode === "inline" && !command.trim()) return;

    setSaving(true);
    const tokens = command.trim() ? parseArgs(command.trim()) : [];
    const cmd = tokens[0] ?? "";
    const args = tokens.slice(1);
    const options: LoopOptions = {
      interval: parsed.interval,
      taskId: taskMode === "existing" ? taskId : null,
      command: cmd,
      commandArgs: args,
      cwd: cwd.trim() || process.cwd(),
      immediate: runNow,
      maxRuns: maxRuns.trim() ? parseInt(maxRuns, 10) : null,
      verbose: false,
      description: description.trim(),
      projectId: project || currentProjectId,
      offset: null,
    };
    const desc = description.trim() || commandLine(cmd, args);

    if (mode === "edit" && editId) {
      updateLoop(editId, options, parsed.intervalHuman)
        .then((id) => onDone(true, id, desc))
        .catch(() => setSaving(false));
    } else {
      createLoop(options, parsed.intervalHuman)
        .then((id) => onDone(false, id, desc))
        .catch(() => setSaving(false));
    }
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
    if (input === " " && currentField === "taskMode") {
      setTaskMode((prev) => (prev === "inline" ? "existing" : "inline"));
      return;
    }
    if (input === " " && currentField === "runNow") {
      setRunNow((prev) => !prev);
      return;
    }
  });

  function commandLine(command: string, args: string[]): string {
    return [command, ...args].join(" ").trim();
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

  const intervalField = fields.find((f) => f.key === "interval");
  const taskModeField = fields.find((f) => f.key === "taskMode");
  const commandField = fields.find((f) => f.key === "command");
  const taskIdField = fields.find((f) => f.key === "taskId");
  const cwdField = fields.find((f) => f.key === "cwd");
  const descriptionField = fields.find((f) => f.key === "description");
  const runNowField = fields.find((f) => f.key === "runNow");
  const maxRunsField = fields.find((f) => f.key === "maxRuns");
  const projectField = fields.find((f) => f.key === "project");

  return (
    <Box flexDirection="column" borderStyle="single" borderColor={theme.accent.loop}>
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>
          {mode === "edit" ? t("board.editTitle") : t("board.createTitle")}
        </Text>
      </Box>
      <Box flexDirection="column" paddingX={1}>
        {intervalField && renderField(intervalField, (
          <Box>
            <Box flexGrow={1}>
              <TextInput
                value={interval}
                onChange={setIntervalValue}
                placeholder={t("board.placeholderExample", { example: t("board.exampleInterval") })}
              />
            </Box>
          </Box>
        ))}

        {taskModeField && renderField(taskModeField, (
          <Box flexDirection="row">
            <Box marginRight={2}>
              <Box
                borderStyle="single"
                borderColor={taskMode === "inline" ? theme.accent.focus : theme.border.dim}
                backgroundColor={taskMode === "inline" ? theme.bg.active : undefined}
                paddingX={1}
              >
                <Text bold color={taskMode === "inline" ? theme.text.inverse : theme.text.secondary}>
                  {t("board.taskModeInline")}
                </Text>
              </Box>
            </Box>
            <Box>
              <Box
                borderStyle="single"
                borderColor={taskMode === "existing" ? theme.accent.focus : theme.border.dim}
                backgroundColor={taskMode === "existing" ? theme.bg.active : undefined}
                paddingX={1}
              >
                <Text bold color={taskMode === "existing" ? theme.text.inverse : theme.text.secondary}>
                  {t("board.taskModeExisting")}
                </Text>
              </Box>
            </Box>
          </Box>
        ))}

        {commandField && renderField(commandField, (
          <Box flexGrow={1}>
            <TextInput
              value={command}
              onChange={setCommand}
              placeholder={t("board.placeholderExample", { example: t("board.exampleCommand") })}
            />
          </Box>
        ))}

        {taskIdField && renderField(taskIdField, (
          <Box
            borderStyle="single"
            borderColor={focusIndex === fields.indexOf(taskIdField) && !saving ? theme.accent.focus : theme.border.dim}
            backgroundColor={theme.bg.input}
            paddingX={1}
            >
            <Text color={selectedTaskName ? theme.text.primary : theme.text.muted}>
              {selectedTaskName ?? t("board.chooseTask")}
            </Text>
          </Box>
        ))}

        {cwdField && renderField(cwdField, (
          <Box flexGrow={1}>
            <TextInput
              value={cwd}
              onChange={setCwd}
              placeholder={t("board.hintCwd")}
            />
          </Box>
        ))}

        {descriptionField && renderField(descriptionField, (
          <Box flexGrow={1}>
            <TextInput
              value={description}
              onChange={setDescription}
              placeholder={t("board.placeholderExample", { example: t("board.exampleDescription") })}
            />
          </Box>
        ))}

        {runNowField && renderField(runNowField, (
          <Box flexDirection="row">
            <Box marginRight={2}>
              <Box
                borderStyle="single"
                borderColor={!runNow ? theme.accent.focus : theme.border.dim}
                backgroundColor={!runNow ? theme.bg.active : undefined}
                paddingX={1}
              >
                <Text bold color={!runNow ? theme.text.inverse : theme.text.secondary}>
                  {t("board.runNowNo")}
                </Text>
              </Box>
            </Box>
            <Box>
              <Box
                borderStyle="single"
                borderColor={runNow ? theme.accent.focus : theme.border.dim}
                backgroundColor={runNow ? theme.bg.active : undefined}
                paddingX={1}
              >
                <Text bold color={runNow ? theme.text.inverse : theme.text.secondary}>
                  {t("board.runNowYes")}
                </Text>
              </Box>
            </Box>
          </Box>
        ))}

        {maxRunsField && renderField(maxRunsField, (
          <Box flexGrow={1}>
            <TextInput
              value={maxRuns}
              onChange={setMaxRuns}
              placeholder={t("board.placeholderBlank")}
            />
          </Box>
        ))}

        {projectField && renderField(projectField, (
          <SearchSelect
            options={projectOptions}
            value={project}
            onChange={setProject}
            focused={focusIndex === fields.indexOf(projectField) && !saving}
            placeholder={t("project.hintName")}
          />
        ))}
      </Box>

      <Box flexDirection="row" paddingX={1} marginBottom={1}>
        {(() => {
          const isFocused = focusIndex === focusOrder.length - 2 && !saving;
          return (
            <Box
              marginRight={2}
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
        {(() => {
          const isFocused = focusIndex === focusOrder.length - 1 && !saving;
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

      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.formNav")}</Text>
      </Box>

      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.exampleHeading")}</Text>
      </Box>
      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.exampleFull")}</Text>
      </Box>
    </Box>
  );
}

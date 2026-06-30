import React, { useState, useMemo } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import type { Project, LoopOptions } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { FocusableInput } from "./FocusableInput.js";
import { FocusableSearchSelect, type FocusableSearchSelectOption } from "./FocusableSearchSelect.js";
import { FocusableButton } from "./FocusableButton.js";
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

function Toggle(props: {
  label: string;
  isActive: boolean;
  onActivate: () => void;
}): React.ReactNode {
  const { isFocused } = useFocus();

  const borderColor = isFocused || props.isActive
    ? theme.accent.focus
    : theme.border.dim;
  const backgroundColor = props.isActive
    ? theme.bg.active
    : isFocused
      ? theme.bg.hover
      : theme.bg.surface;
  const textColor = props.isActive || isFocused
    ? theme.text.inverse
    : theme.text.secondary;

  useInput(
    (input, key) => {
      if (key.return || input === " ") {
        props.onActivate();
      }
    },
    { isActive: isFocused },
  );

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      paddingX={1}
      marginRight={1}
    >
      <Text bold color={textColor}>{props.label}</Text>
    </Box>
  );
}

function renderField(field: FieldConfig, children: React.ReactNode): React.ReactNode {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box>
        <Text bold color={theme.text.secondary}>{field.label}</Text>
      </Box>
      {children}
      <Text color={theme.text.muted}>  {field.hint}</Text>
    </Box>
  );
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
  const taskId = selectedTaskId ?? initial.taskId ?? "";
  const [description, setDescription] = useState(initial.description ?? "");
  const [runNow, setRunNow] = useState(initial.runNow === "true" || initial.runNow === "yes");
  const [maxRuns, setMaxRuns] = useState(initial.maxRuns ?? "");
  const [project, setProject] = useState(currentProjectId || initial.project || "");
  const [saving, setSaving] = useState(false);

  const fields: FieldConfig[] = useMemo(() => {
    const list: FieldConfig[] = [
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

  const projectOptions = useMemo<FocusableSearchSelectOption[]>(() => {
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

  useInput((_input, key) => {
    if (saving) return;
    if (key.escape) {
      onCancel();
      return;
    }
  });

  function commandLine(command: string, args: string[]): string {
    return [command, ...args].join(" ").trim();
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
          <FocusableInput
            value={interval}
            onChange={setIntervalValue}
            placeholder={t("board.placeholderExample", { example: t("board.exampleInterval") })}
          />
        ))}

        {taskModeField && renderField(taskModeField, (
          <Box flexDirection="row">
            <Toggle
              label={t("board.taskModeInline")}
              isActive={taskMode === "inline"}
              onActivate={() => setTaskMode("inline")}
            />
            <Toggle
              label={t("board.taskModeExisting")}
              isActive={taskMode === "existing"}
              onActivate={() => setTaskMode("existing")}
            />
          </Box>
        ))}

        {commandField && renderField(commandField, (
          <Box flexDirection="row">
            <Box flexGrow={1}>
              <FocusableInput
                value={command}
                onChange={setCommand}
                placeholder={t("board.placeholderExample", { example: t("board.exampleCommand") })}
              />
            </Box>
            <FocusableButton
              label={"\u2398"}
              color={theme.text.secondary}
              onPress={() => {}}
            />
          </Box>
        ))}

        {taskIdField && renderField(taskIdField, (
          <FocusableButton
            label={selectedTaskName ?? t("board.chooseTask")}
            color={theme.accent.task}
            onPress={onChooseTask}
          />
        ))}

        {cwdField && renderField(cwdField, (
          <FocusableInput
            value={cwd}
            onChange={setCwd}
            placeholder={t("board.hintCwd")}
          />
        ))}

        {descriptionField && renderField(descriptionField, (
          <FocusableInput
            value={description}
            onChange={setDescription}
            placeholder={t("board.placeholderExample", { example: t("board.exampleDescription") })}
          />
        ))}

        {runNowField && renderField(runNowField, (
          <Box flexDirection="row">
            <Toggle
              label={t("board.runNowNo")}
              isActive={!runNow}
              onActivate={() => setRunNow(false)}
            />
            <Toggle
              label={t("board.runNowYes")}
              isActive={runNow}
              onActivate={() => setRunNow(true)}
            />
          </Box>
        ))}

        {maxRunsField && renderField(maxRunsField, (
          <FocusableInput
            value={maxRuns}
            onChange={setMaxRuns}
            placeholder={t("board.placeholderBlank")}
          />
        ))}

        {projectField && renderField(projectField, (
          <FocusableSearchSelect
            options={projectOptions}
            value={project}
            onChange={setProject}
            placeholder={t("project.hintName")}
          />
        ))}
      </Box>

      <Box flexDirection="row" paddingX={1} marginBottom={1}>
        <FocusableButton
          label={saving ? t("board.saving") : mode === "edit" ? t("board.save") : t("board.create")}
          color={theme.accent.loop}
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

      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.exampleHeading")}</Text>
      </Box>
      <Box paddingLeft={1} marginBottom={1}>
        <Text color={theme.text.muted}>{t("board.exampleFull")}</Text>
      </Box>
    </Box>
  );
}

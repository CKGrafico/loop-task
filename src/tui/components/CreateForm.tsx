import React, { useMemo, useCallback, useState, useRef } from "react";
import { Box, Text } from "ink";

import type { Project, LoopOptions, TaskDefinition } from "../../types.js";
import { createLoop, updateLoop } from "../daemon.js";
import { t } from "../../i18n/index.js";
import { WizardForm, type WizardStepConfig } from "./WizardForm.js";
import { TaskPickerModal } from "./TaskPickerModal.js";
import { CommandEditorModal } from "./CommandEditorModal.js";
import { parseDuration } from "../../duration.js";
import { parseCommandLine } from "../../loop-config.js";
import { darkTheme as theme } from "../theme.js";


// ── Props ───────────────────────────────────────────────────────────

interface CreateViewProps {
  mode: "create" | "edit";
  editId: string | null;
  initial: Record<string, string>;
  selectedTaskId: string | null;
  selectedTaskName: string | null;
  tasks: TaskDefinition[];
  projects: Project[];
  currentProjectId: string;
  onCancel: () => void;
  onDone: (updated: boolean, id: string, desc: string) => void;
  onChooseTask: (task: { id: string; name: string }) => void;
}

// ── Component ───────────────────────────────────────────────────────

export function CreateView(props: CreateViewProps): React.ReactNode {
  const {
    mode,
    editId,
    initial,
    selectedTaskId,
    selectedTaskName,
    tasks,
    currentProjectId,
    onCancel,
    onDone,
    onChooseTask,
  } = props;

  const [taskPickerOpen, setTaskPickerOpen] = useState(false);
  const [cmdEditorOpen, setCmdEditorOpen] = useState(false);
  const [commandValue, setCommandValue] = useState(initial.command ?? "");
  const cmdOnChangeRef = useRef<((v: string) => void) | null>(null);

  const taskModeInitial = initial.taskMode === "existing" ? "Existing task" : "Inline command";

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
        defaultValue: taskModeInitial,
      },
      {
        key: "taskId",
        prompt: selectedTaskName
          ? t("board.selectedTask", { name: selectedTaskName })
          : t("board.chooseTask"),
        hint: t("board.hintTask"),
        required: true,
        inputType: "text",
        defaultValue: selectedTaskName ?? selectedTaskId ?? initial.taskId ?? undefined,
        skip: (values) => !values.taskMode?.includes("Existing"),
        onActivate: () => setTaskPickerOpen(true),
        renderCustom: ({ isActive }) => (
          <TaskPickerField
            taskName={selectedTaskName}
            hint={t("board.hintTask")}
            isActive={isActive}
          />
        ),
      },
      {
        key: "command",
        prompt: t("wizard.commandPrompt"),
        hint: t("wizard.commandHint"),
        required: true,
        inputType: "text",
        defaultValue: commandValue || undefined,
        skip: (values) => !!values.taskMode?.includes("Existing"),
        onActivate: () => setCmdEditorOpen(true),
        renderCustom: ({ isActive, onChange }) => {
          cmdOnChangeRef.current = onChange;
          return (
            <CommandPreviewField
              value={commandValue}
              hint={t("wizard.commandHint")}
              isActive={isActive}
            />
          );
        },
      },
      {
        key: "runNow",
        prompt: t("wizard.runNowPrompt"),
        hint: t("board.hintRunNow"),
        required: true,
        suggestions: [t("wizard.runNowWait"), t("wizard.runNowNow")],
        inputType: "select",
        defaultValue: initial.runNow === "true" || initial.runNow === "yes"
          ? t("wizard.runNowNow")
          : t("wizard.runNowWait"),
      },
      {
        key: "cwd",
        prompt: t("wizard.cwdPrompt"),
        hint: t("wizard.cwdHint"),
        required: false,
        inputType: "text",
        defaultValue: initial.cwd ?? undefined,
      },
      {
        key: "description",
        prompt: t("wizard.descriptionPrompt"),
        hint: t("wizard.descriptionHint"),
        required: false,
        inputType: "text",
        defaultValue: initial.description ?? undefined,
      },
      {
        key: "maxRuns",
        prompt: t("wizard.maxRunsPrompt"),
        hint: t("wizard.maxRunsHint"),
        required: false,
        inputType: "text",
        defaultValue: initial.maxRuns ?? undefined,
      },
    ];
    return list;
  }, [taskModeInitial, selectedTaskId, selectedTaskName, initial]);

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const intervalInput = values.interval ?? "";
      if (!intervalInput.trim()) return;

      let interval: number;
      try {
        interval = parseDuration(intervalInput.trim());
      } catch {
        return;
      }

      const intervalHuman = intervalInput.trim();
      const isExistingTask = !!values.taskMode?.includes("Existing");

      if (isExistingTask && !selectedTaskId && !values.taskId?.trim()) return;
      const cmdValue = values.command ?? commandValue;
      if (!isExistingTask && !cmdValue.trim()) return;

      const cmd = isExistingTask
        ? ""
        : cmdValue.split("\n").map((l) => l.trim()).filter(Boolean).join(" ");
      let cmdOnly = "";
      let args: string[] = [];
      if (cmd.trim()) {
        try {
          const tokens = parseCommandLine(cmd.trim());
          cmdOnly = tokens[0] ?? "";
          args = tokens.slice(1);
        } catch {
          return;
        }
      }

      const runNowValue = values.runNow === t("wizard.runNowNow");

      const options: LoopOptions = {
        interval,
        taskId: isExistingTask
          ? (selectedTaskId ?? values.taskId?.trim() ?? null)
          : null,
        command: cmdOnly,
        commandArgs: args,
        commandRaw: isExistingTask ? undefined : cmdValue,
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

      const desc = (values.description ?? "").trim() || [cmdOnly, ...args].join(" ").trim();

      if (mode === "edit" && editId) {
        updateLoop(editId, options, intervalHuman)
          .then((id) => onDone(true, id, desc))
          .catch(() => { /* error handled silently */ });
      } else {
        createLoop(options, intervalHuman)
          .then((id) => onDone(false, id, desc))
          .catch(() => { /* error handled silently */ });
      }
    },
    [selectedTaskId, mode, editId, currentProjectId, onDone, commandValue],
  );

  return (
    <>
      <WizardForm
        title={mode === "edit" ? t("wizard.editLoop") : t("wizard.newLoop")}
        steps={steps}
        onComplete={handleComplete}
        onCancel={onCancel}
        disabled={taskPickerOpen || cmdEditorOpen}
      />
      {taskPickerOpen ? (
        <TaskPickerModal
          tasks={tasks}
          onSelect={(task) => {
            onChooseTask({ id: task.id, name: task.name });
            setTaskPickerOpen(false);
          }}
          onClose={() => setTaskPickerOpen(false)}
        />
      ) : null}
      {cmdEditorOpen ? (
        <CommandEditorModal
          initial={commandValue}
          onSelect={(value) => {
            setCommandValue(value);
            cmdOnChangeRef.current?.(value);
            setCmdEditorOpen(false);
          }}
          onClose={() => setCmdEditorOpen(false)}
        />
      ) : null}
    </>
  );
}

// ── Task picker field ───────────────────────────────────────────────

function TaskPickerField({
  taskName,
  hint,
  isActive,
}: {
  taskName: string | null;
  hint: string;
  isActive: boolean;
}): React.ReactNode {
  return (
    <Box flexDirection="column" width="100%">
      <Box
        borderStyle="single"
        borderColor={isActive ? theme.accent.brand : theme.border.dim}
        backgroundColor={isActive ? theme.bg.input : undefined}
        paddingLeft={1}
        overflow="hidden"
        width="100%"
      >
        {taskName ? (
          <Text color={theme.text.primary}>{taskName}</Text>
        ) : (
          <Text color={theme.text.muted}>{hint}</Text>
        )}
      </Box>
      {isActive ? (
        <Box marginTop={0}>
          <Text color={theme.accent.brand}>{"\u203a "}</Text>
          <Text color={theme.text.muted}>
            {t("wizard.taskPickerHint", { action: "enter" })}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

// ── Command preview field ───────────────────────────────────────────

function CommandPreviewField({
  value,
  hint,
  isActive,
}: {
  value: string;
  hint: string;
  isActive: boolean;
}): React.ReactNode {
  const firstLine = value.split("\n")[0] ?? "";
  const hasMore = value.includes("\n");
  const display = firstLine || hint;
  const showHint = !firstLine;
  return (
    <Box flexDirection="column" width="100%">
      <Box
        borderStyle="single"
        borderColor={isActive ? theme.accent.brand : theme.border.dim}
        backgroundColor={isActive ? theme.bg.input : undefined}
        paddingLeft={1}
        overflow="hidden"
        width="100%"
      >
        <Text color={showHint ? theme.text.muted : theme.text.primary}>
          {display}
        </Text>
        {hasMore ? (
          <Text color={theme.text.muted}> {"\u2026"}</Text>
        ) : null}
      </Box>
      {isActive ? (
        <Box marginTop={0}>
          <Text color={theme.accent.brand}>{"\u203a "}</Text>
          <Text color={theme.text.muted}>
            {t("wizard.cmdEditorHint", { action: "enter" })}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

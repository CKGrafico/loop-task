import React, { useEffect, useMemo, useCallback, useState, useRef } from "react";

import type { TaskDefinition, TaskStep } from "../../types.js";
import { WizardForm, type WizardStepConfig } from "../loop-form/WizardForm.js";
import { SelectModal, SelectValueField, type SelectOption } from "../../shared/ui/SelectModal.js";
import { CodeEditorPreview } from "../../features/code-editor/CodeEditorPreview.js";
import { CodeEditorModal } from "../../features/code-editor/CodeEditorModal.js";
import { useInject } from "../../shared/hooks/useInject.js";
import { TYPES } from "../../shared/services/types.js";
import type { TaskService } from "../../shared/services/types.js";
import { validateContext } from "../../core/context/validate-context.js";
import crypto from "node:crypto";
import { t } from "../../shared/i18n/index.js";
import { joinCommandLines, parseCommandLine } from "../../loop-config.js";



interface TaskFormProps {
  mode: "create" | "edit";
  editTask: TaskDefinition | null;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
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

function joinCommand(task: TaskDefinition): string {
  return [task.command, ...task.commandArgs].join(" ");
}



export function TaskForm(props: TaskFormProps): React.ReactNode {
  const { mode, editTask, onCancel, onDone } = props;

  const taskService = useInject<TaskService>(TYPES.TaskService);
  const [tasks, setTasks] = useState<TaskDefinition[]>([]);
  const [commandValue, setCommandValue] = useState(
    editTask
      ? (editTask.steps?.length
        ? editTask.steps.map(step =>
            step.commands.map(c => c.commandRaw ?? [c.command, ...c.commandArgs].join(" ")).join("\n||\n")
          ).join("\n&&\n")
        : (editTask.commandRaw ?? joinCommand(editTask)))
      : "",
  );

  useEffect(() => {
    taskService.list().then(setTasks).catch(() => setTasks([]));
  }, []);

  const chainOptions = useMemo(
    () => [t("wizard.chainNone"), ...tasks.map((task) => task.name)],
    [tasks],
  );

  const chainSelectOptions: SelectOption[] = useMemo(
    () => chainOptions.map((v) => ({ value: v, label: v })),
    [chainOptions],
  );

  const [commandEditorOpen, setCommandEditorOpen] = useState(false);
  const [contextEditorOpen, setContextEditorOpen] = useState(false);
  const [contextValue, setContextValue] = useState(
    editTask?.context ? JSON.stringify(editTask.context) : "",
  );
  const [silentChainValue, setSilentChainValue] = useState(
    editTask?.silentChain ? t("board.silentChainYes") : "",
  );
  const [openChainField, setOpenChainField] = useState<"onSuccess" | "onFailure" | null>(null);
  const [openSilentChain, setOpenSilentChain] = useState(false);
  const chainFieldsRef = useRef<Record<string, { value: string; onChange: (v: string) => void; onAdvance: () => void }>>({});

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
        onActivate: () => setCommandEditorOpen(true),
        renderCustom: ({ isActive }) => (
          <CodeEditorPreview
            value={commandValue}
            hint={t("wizard.commandHint")}
            isActive={isActive}
            onActivate={() => setCommandEditorOpen(true)}
          />
        ),
      },
      {
        key: "onSuccess",
        prompt: t("wizard.onSuccessPrompt"),
        hint: t("board.taskHintOnSuccess"),
        required: false,
        defaultValue: editTask ? resolveChainName(editTask.onSuccessTaskId) : undefined,
        onActivate: () => setOpenChainField("onSuccess"),
        renderCustom: ({ value, isActive, onChange, onAdvance }) => {
          chainFieldsRef.current.onSuccess = { value, onChange, onAdvance };
          return (
            <SelectValueField
              label={value || null}
              placeholder={t("wizard.onSuccessPrompt")}
              isActive={isActive}
            />
          );
        },
      },
      {
        key: "onFailure",
        prompt: t("wizard.onFailurePrompt"),
        hint: t("board.taskHintOnFailure"),
        required: false,
        defaultValue: editTask ? resolveChainName(editTask.onFailureTaskId) : undefined,
        onActivate: () => setOpenChainField("onFailure"),
        renderCustom: ({ value, isActive, onChange, onAdvance }) => {
          chainFieldsRef.current.onFailure = { value, onChange, onAdvance };
          return (
            <SelectValueField
              label={value || null}
              placeholder={t("wizard.onFailurePrompt")}
              isActive={isActive}
            />
          );
        },
      },
      {
        key: "silentChain",
        prompt: t("wizard.silentChainPrompt"),
        hint: t("wizard.silentChainHint"),
        required: false,
        defaultValue: silentChainValue || undefined,
        onActivate: () => setOpenSilentChain(true),
        renderCustom: ({ value, isActive }) => (
          <SelectValueField
            label={value || null}
            placeholder={t("wizard.silentChainPrompt")}
            isActive={isActive}
          />
        ),
      },
      {
        key: "context",
        prompt: t("wizard.contextPrompt"),
        hint: t("wizard.contextHint"),
        required: false,
        inputType: "text",
        defaultValue: contextValue || undefined,
        onActivate: () => setContextEditorOpen(true),
        validate: (value: string) => {
          if (!value?.trim()) return true;
          try {
            const parsed = JSON.parse(value);
            const result = validateContext(parsed);
            return result.valid;
          } catch {
            return false;
          }
        },
        validationError: t("wizard.contextInvalid"),
        renderCustom: ({ isActive }) => (
          <CodeEditorPreview
            value={contextValue}
            hint={t("wizard.contextHint")}
            isActive={isActive}
            onActivate={() => setContextEditorOpen(true)}
          />
        ),
      },
    ];
    return list;
  }, [commandValue, chainOptions, editTask, resolveChainName, contextValue, silentChainValue]);

  const handleComplete = useCallback(
    (values: Record<string, string>) => {
      const name = values.name?.trim() ?? "";
      const rawCommand = joinCommandLines(commandValue);
      if (!name || !rawCommand) return;

      const onSuccessTaskId = resolveChainId(values.onSuccess ?? "");
      const onFailureTaskId = resolveChainId(values.onFailure ?? "");
      const silentChain = values.silentChain === t("board.silentChainYes");

      let context: Record<string, unknown> | undefined;
      const contextStr = contextValue?.trim();
      if (contextStr) {
        try {
          const parsed = JSON.parse(contextStr);
          const result = validateContext(parsed);
          if (result.valid) {
            context = result.context;
          }
        } catch {
          // invalid context, skip
        }
      }

      const commandSegments = commandValue
        .split(/\n&&\n|\n&&|&&\n|&&/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      let payload;

      if (commandSegments.length > 1 || commandValue.includes("||")) {
        const steps: TaskStep[] = commandSegments.slice(0, 8).map(seg => {
          const parallelCmds = seg
            .split(/\n\|\|\n|\n\|\||\|\|\n|\|\|/)
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .slice(0, 4)
            .map(cmdSeg => {
              const joined = joinCommandLines(cmdSeg);
              const tokens = parseCommandLine(joined);
              return {
                command: tokens[0] ?? "",
                commandArgs: tokens.slice(1),
                commandRaw: cmdSeg,
              };
            });
          return { commands: parallelCmds };
        });
        const firstCmd = steps[0]!.commands[0]!;
        payload = {
          name,
          command: firstCmd.command,
          commandArgs: firstCmd.commandArgs,
          commandRaw: firstCmd.commandRaw,
          steps,
          onSuccessTaskId,
          onFailureTaskId,
          silentChain: silentChain || undefined,
          context,
        };
      } else {
        payload = {
          name,
          command: rawCommand.split(" ")[0] ?? "",
          commandArgs: parseArgs(rawCommand),
          commandRaw: commandValue,
          onSuccessTaskId,
          onFailureTaskId,
          silentChain: silentChain || undefined,
          context,
        };
      }

      if (mode === "edit" && editTask) {
        taskService.update(editTask.id, payload)
          .then(() => onDone(true, editTask.id))
          .catch(() => { /* error handled silently */ });
      } else {
        const id = crypto.randomUUID().slice(0, 8);
        taskService.create({ id, ...payload })
          .then((result) => onDone(false, result.id))
          .catch(() => { /* error handled silently */ });
      }
    },
    [commandValue, resolveChainId, mode, editTask, onDone, contextValue, silentChainValue],
  );

  const title = mode === "edit"
    ? t("board.taskEditTitle")
    : t("board.taskCreateTitle");

  return (
    <>
      <WizardForm
        title={title}
        steps={steps}
        onComplete={handleComplete}
        onCancel={onCancel}
        disabled={openChainField !== null || commandEditorOpen || contextEditorOpen || openSilentChain}
      />
      {openChainField ? (
        <SelectModal
          title={openChainField === "onSuccess" ? t("wizard.onSuccessPrompt") : t("wizard.onFailurePrompt")}
          options={chainSelectOptions}
          initialValue={chainFieldsRef.current[openChainField]?.value}
          onSelect={(option) => {
            chainFieldsRef.current[openChainField]?.onChange(option.value);
            chainFieldsRef.current[openChainField]?.onAdvance();
            setOpenChainField(null);
          }}
          onClose={() => setOpenChainField(null)}
        />
      ) : null}
      {commandEditorOpen ? (
        <CodeEditorModal
          initialValue={commandValue}
          onSave={(v) => {
            setCommandValue(v);
            setCommandEditorOpen(false);
          }}
          onCancel={() => setCommandEditorOpen(false)}
        />
      ) : null}
      {contextEditorOpen ? (
        <CodeEditorModal
          initialValue={contextValue}
          onSave={(v) => {
            setContextValue(v);
            setContextEditorOpen(false);
          }}
          onCancel={() => setContextEditorOpen(false)}
        />
      ) : null}
      {openSilentChain ? (
        <SelectModal
          title={t("wizard.silentChainPrompt")}
          options={[
            { value: t("board.silentChainNo"), label: t("board.silentChainNo") },
            { value: t("board.silentChainYes"), label: t("board.silentChainYes") },
          ]}
          initialValue={silentChainValue || t("board.silentChainNo")}
          onSelect={(option) => {
            setSilentChainValue(option.value === t("board.silentChainNo") ? "" : option.value);
            setOpenSilentChain(false);
          }}
          onClose={() => setOpenSilentChain(false)}
        />
      ) : null}
    </>
  );
}

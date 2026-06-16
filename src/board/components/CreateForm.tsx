import { useRef, useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import fs from "node:fs";
import type { LoopMeta } from "../../types.js";
import { buildLoopOptions, parseCommandLine } from "../../loop-config.js";
import { t } from "../../i18n/index.js";
import { commandLine } from "../format.js";
import { createLoop, updateLoop } from "../daemon.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG } from "../../config/constants.js";

export const createFields = ["interval", "command", "description", "cwd", "runNow", "maxRuns"] as const;
export type CreateField = (typeof createFields)[number];

export function createInitialValues(loop: LoopMeta | null): Record<CreateField, string> {
  if (!loop) {
    return {
      interval: "30m",
      command: "",
      description: "",
      cwd: process.cwd(),
      runNow: "n",
      maxRuns: "",
    };
  }
  return {
    interval: loop.intervalHuman,
    command: commandLine(loop.command, loop.commandArgs),
    description: loop.description ?? "",
    cwd: loop.cwd ?? "",
    runNow: loop.immediate ? "y" : "n",
    maxRuns: loop.maxRuns !== null ? String(loop.maxRuns) : "",
  };
}

export function CreateView(props: {
  mode: "create" | "edit";
  editId: string | null;
  initial: Record<CreateField, string>;
  onCancel: () => void;
  onDone: (updated: boolean, id: string) => void;
}): React.ReactNode {
  const fields = props.mode === "edit"
    ? createFields.filter((field) => field !== "runNow")
    : createFields;
  const saveIndex = fields.length;
  const cancelIndex = fields.length + 1;
  type Field = CreateField;

  const labels: Record<Field, string> = {
    interval: t("board.labelInterval"),
    command: t("board.labelCommand"),
    description: t("board.labelDescription"),
    cwd: t("board.labelCwd"),
    runNow: t("board.labelRunNow"),
    maxRuns: t("board.labelMaxRuns"),
  };

  const hints: Record<Field, string> = {
    interval: t("board.hintInterval"),
    command: t("board.hintCommand"),
    description: t("board.hintDescription"),
    cwd: t("board.hintCwd"),
    runNow: t("board.hintRunNow"),
    maxRuns: t("board.hintMaxRuns"),
  };

  const examples: Record<Field, string> = {
    interval: t("board.exampleInterval"),
    command: t("board.exampleCommand"),
    description: t("board.exampleDescription"),
    cwd: "",
    runNow: "",
    maxRuns: "",
  };

  const runNowOptions = [
    { name: t("board.runNowNo"), description: "", value: "n" },
    { name: t("board.runNowYes"), description: "", value: "y" },
  ];

  const [values, setValues] = useState<Record<Field, string>>(props.initial);
  const valuesRef = useRef(values);
  const [focusIndex, setFocusIndex] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { width: termWidth } = useTerminalDimensions();
  const btnWidth = Math.max(10, Math.min(14, Math.floor(termWidth / 6)));

  function updateValues(next: Record<Field, string>): void {
    valuesRef.current = next;
    setValues(next);
  }

  useKeyboard((key) => {
    if (key.name === "tab") {
      setFocusIndex((i) => {
        const next = key.shift ? i - 1 : i + 1;
        return Math.max(0, Math.min(cancelIndex, next));
      });
      return;
    }

    if ((key.name === "left" || key.name === "right") && focusIndex >= saveIndex) {
      setFocusIndex(key.name === "left" ? saveIndex : cancelIndex);
      return;
    }

    if (key.name === "return" || key.name === "enter") {
      if (focusIndex === saveIndex) {
        void submit(valuesRef.current);
      } else if (focusIndex === cancelIndex) {
        props.onCancel();
      }
    }
  });

  async function submit(current: Record<Field, string>): Promise<void> {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      const cwd = current.cwd.trim();
      if (cwd && !fs.existsSync(cwd)) {
        setError(t("board.cwdMissing", { cwd }));
        return;
      }
      const tokens = parseCommandLine(current.command.trim());
      const [command, ...commandArgs] = tokens;
      const built = buildLoopOptions(
        current.interval.trim(),
        command ?? "",
        commandArgs,
        {
          now: props.mode === "create" && current.runNow === "y",
          maxRuns: current.maxRuns.trim() || null,
          verbose: false,
          cwd,
          description: current.description.trim(),
        }
      );
      const request =
        props.mode === "edit" && props.editId
          ? updateLoop(props.editId, built.options, built.intervalHuman)
          : createLoop(built.options, built.intervalHuman);

      const id = await request;
      props.onDone(props.mode === "edit", id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = props.mode === "edit" ? t("board.editTitle") : t("board.createTitle");

   return (
    <box title={title} border style={{ flexDirection: "column", flexGrow: 1, padding: 1, backgroundColor: "#0b0b0b" }}>
      <box style={{ flexDirection: "column", marginBottom: 1 }}>
        <text fg="#9ca3af">{t("board.exampleHeading")}</text>
        <text fg="#d1d5db">{t("board.exampleFull")}</text>
      </box>
      <box style={{ flexDirection: "column", flexGrow: 1 }}>
        {Array.from({ length: Math.ceil(fields.length / 2) }, (_, row) => {
          const leftField = fields[row * 2];
          const rightField = row * 2 + 1 < fields.length ? fields[row * 2 + 1] : null;
          return (
            <box key={row} style={{ flexDirection: "row", marginBottom: 1 }}>
              <FormField
                field={leftField}
                index={row * 2}
                focusIndex={focusIndex}
                values={values}
                valuesRef={valuesRef}
                updateValues={updateValues}
                setFocusIndex={setFocusIndex}
                submit={submit}
                labels={labels}
                hints={hints}
                examples={examples}
                runNowOptions={runNowOptions}
                fields={fields}
                style={{ width: "50%", paddingRight: 1 }}
              />
              {rightField ? (
                <FormField
                  field={rightField}
                  index={row * 2 + 1}
                  focusIndex={focusIndex}
                  values={values}
                  valuesRef={valuesRef}
                  updateValues={updateValues}
                  setFocusIndex={setFocusIndex}
                  submit={submit}
                  labels={labels}
                  hints={hints}
                  examples={examples}
                  runNowOptions={runNowOptions}
                  fields={fields}
                  style={{ width: "50%" }}
                />
              ) : (
                <box style={{ width: "50%" }} />
              )}
            </box>
          );
        })}
      </box>
      <box style={{ flexDirection: "row", height: 3, marginBottom: 1, backgroundColor: "#0b0b0b" }}>
      <HoverButton
        label={isSubmitting ? t("board.saving") : props.mode === "edit" ? t("board.save") : t("board.create")}
        onMouseDown={() => void submit(valuesRef.current)}
        borderColor={focusIndex === saveIndex ? "#38bdf8" : undefined}
        bgColor={focusIndex === saveIndex ? "#1e3a8a" : undefined}
        restBg="#1e3a5f"
        width={btnWidth}
        marginRight={1}
      />
      <HoverButton
        label={t("board.cancel")}
        onMouseDown={props.onCancel}
        borderColor={focusIndex === cancelIndex ? "#38bdf8" : undefined}
        bgColor={focusIndex === cancelIndex ? "#374151" : undefined}
        width={btnWidth}
      />
      </box>
      <text fg="#9ca3af">{t("board.formNav")}</text>
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

function HoverButton(props: {
  label: string;
  onMouseDown: () => void;
  borderColor?: string;
  bgColor?: string;
  restBg?: string;
  width: number;
  marginRight?: number;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.bgColor ?? (isHovered ? HOVER_BG : props.restBg ?? "#0b0b0b");
  return (
    <box
      border
      onMouseDown={props.onMouseDown}
      borderColor={props.borderColor}
      style={{ width: props.width, justifyContent: "center", alignItems: "center", marginRight: props.marginRight, backgroundColor: bg }}
      {...hoverProps}
    >
      <text fg="#e5e7eb"><strong>{props.label}</strong></text>
    </box>
  );
}

function FormField(props: {
  field: CreateField;
  index: number;
  focusIndex: number;
  values: Record<CreateField, string>;
  valuesRef: React.MutableRefObject<Record<CreateField, string>>;
  updateValues: (next: Record<CreateField, string>) => void;
  setFocusIndex: React.Dispatch<React.SetStateAction<number>>;
  submit: (current: Record<CreateField, string>) => Promise<void>;
  labels: Record<CreateField, string>;
  hints: Record<CreateField, string>;
  examples: Record<CreateField, string>;
  runNowOptions: { name: string; description: string; value: string }[];
  fields: readonly CreateField[];
  style?: { width?: number | `${number}%` | "auto"; flexGrow?: number; marginRight?: number; paddingRight?: number };
}): React.ReactNode {
  const { field, index, focusIndex, values, valuesRef, updateValues, setFocusIndex, submit, labels, hints, examples, runNowOptions, fields, style } = props;
  return (
    <box style={{ flexDirection: "column", ...style }}>
      <text fg={focusIndex === index ? "#38bdf8" : "#e5e7eb"}>{labels[field]}</text>
      <text fg="#6b7280">{hints[field]}</text>
      {field === "runNow" ? (
        <box
          border
          borderColor={focusIndex === index ? "#38bdf8" : undefined}
          style={{ height: runNowOptions.length + 2, backgroundColor: "#0b0b0b" }}
        >
          <select
            focused={focusIndex === index}
            options={runNowOptions}
            selectedIndex={values.runNow === "y" ? 1 : 0}
            showDescription={false}
            style={{ flexGrow: 1 }}
            onChange={(_index: number, option: { value?: string } | null) =>
              updateValues({ ...valuesRef.current, runNow: option?.value ?? "n" })
            }
          />
        </box>
      ) : (
        <box
          border
          borderColor={focusIndex === index ? "#38bdf8" : undefined}
          style={{ height: 3, backgroundColor: "#0b0b0b" }}
        >
          <input
            focused={focusIndex === index}
            value={values[field]}
            placeholder={examples[field] ? t("board.placeholderExample", { example: examples[field] }) : t("board.placeholderBlank")}
            onInput={(value: string) =>
              updateValues({ ...valuesRef.current, [field]: value })
            }
            onSubmit={() => {
              if (index < fields.length - 1) {
                setFocusIndex(index + 1);
              } else {
                void submit(valuesRef.current);
              }
            }}
          />
        </box>
      )}
    </box>
  );
}

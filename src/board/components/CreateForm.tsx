import { useRef, useState } from "react";
import { useKeyboard } from "@opentui/react";
import fs from "node:fs";
import type { LoopMeta } from "../../types.js";
import { buildLoopOptions, parseCommandLine } from "../../loop-config.js";
import { t } from "../../i18n/index.js";
import { commandLine } from "../format.js";
import { createLoop, updateLoop } from "../daemon.js";

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
      {fields.map((field, index) => (
        <box key={field} style={{ flexDirection: "column", marginBottom: 1 }}>
          <box style={{ height: 1, width: "100%", backgroundColor: "#0b0b0b" }}>
            <text fg={focusIndex === index ? "#38bdf8" : "#e5e7eb"}>{labels[field]}</text>
          </box>
          <box style={{ height: 1, width: "100%", backgroundColor: "#0b0b0b" }}>
            <text fg="#6b7280">{hints[field]}</text>
          </box>
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
      ))}
      <box style={{ flexDirection: "row", height: 3, marginBottom: 1, backgroundColor: "#0b0b0b" }}>
        <box
          border
          onMouseDown={() => void submit(valuesRef.current)}
          borderColor={focusIndex === saveIndex ? "#38bdf8" : undefined}
          style={{ width: 14, justifyContent: "center", alignItems: "center", marginRight: 1, backgroundColor: focusIndex === saveIndex ? "#1e3a8a" : "#0b0b0b" }}
        >
          <text fg="#e5e7eb"><strong>{isSubmitting ? t("board.saving") : props.mode === "edit" ? t("board.save") : t("board.create")}</strong></text>
        </box>
        <box
          border
          onMouseDown={props.onCancel}
          borderColor={focusIndex === cancelIndex ? "#38bdf8" : undefined}
          style={{ width: 14, justifyContent: "center", alignItems: "center", backgroundColor: focusIndex === cancelIndex ? "#374151" : "#0b0b0b" }}
        >
          <text fg="#e5e7eb"><strong>{t("board.cancel")}</strong></text>
        </box>
      </box>
      <text fg="#9ca3af">{t("board.formNav")}</text>
      {error ? <text fg="#f87171">{error}</text> : null}
    </box>
  );
}

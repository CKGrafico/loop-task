import React, { useState, useCallback, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { validateField } from "../utils/validation.js";
import { copyToClipboard } from "../../shared/clipboard.js";

export interface WizardStepConfig {
  key: string;
  prompt: string;
  hint: string;
  required: boolean;
  suggestions?: string[];
  inputType: "text" | "select";
  defaultValue?: string;
  skip?: (values: Record<string, string>) => boolean;
  onActivate?: () => void;
  renderCustom?: (props: {
    value: string;
    isActive: boolean;
    onChange: (value: string) => void;
    onAdvance: () => void;
    onActivate?: () => void;
  }) => React.ReactNode;
}

export interface WizardFormProps {
  title: string;
  steps: WizardStepConfig[];
  onComplete: (values: Record<string, string>) => void;
  onCancel: () => void;
  disabled?: boolean;
}

function TextField({
  value,
  hint,
  isActive,
}: {
  value: string;
  hint: string;
  isActive: boolean;
}): React.ReactNode {
  const borderColor = isActive ? theme.accent.brand : theme.border.dim;
  const backgroundColor = isActive ? theme.bg.input : undefined;
  const showHint = value.length === 0;

  return (
    <Box
      borderStyle="single"
      borderColor={borderColor}
      backgroundColor={backgroundColor}
      paddingLeft={1}
      overflow="hidden"
      width="100%"
    >
      <Text color={showHint ? theme.text.muted : theme.text.primary}>
        {showHint ? hint : value}
      </Text>
      {isActive ? <Text inverse> </Text> : null}
    </Box>
  );
}

function SelectField({
  suggestions,
  selectedIndex,
  isActive,
}: {
  suggestions: string[];
  selectedIndex: number;
  isActive: boolean;
}): React.ReactNode {
  if (!isActive) {
    return (
      <Text color={theme.text.secondary}>
        {suggestions[selectedIndex] ?? suggestions[0] ?? ""}
      </Text>
    );
  }
  return (
    <Box flexDirection="column">
      {suggestions.map((s, i) => {
        const isSel = i === selectedIndex;
        return (
          <Box key={s}>
            <Text color={isSel ? theme.accent.brand : theme.text.muted}>
              {isSel ? "\u276F " : "  "}
            </Text>
            <Text color={isSel ? theme.accent.brand : theme.text.secondary}>
              {s}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

export function WizardForm(props: WizardFormProps): React.ReactNode {
  const { title, steps, onComplete, onCancel, disabled = false } = props;

  const [values, setValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState(0);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const step = steps[activeField];

  const valueFor = useCallback(
    (s: WizardStepConfig): string => values[s.key] ?? s.defaultValue ?? "",
    [values],
  );

  // Resolved values: raw values with defaults filled in.
  // skip() functions must receive these so they work before the user touches a field.
  const resolvedValues = useMemo(() => {
    const result: Record<string, string> = {};
    for (const s of steps) result[s.key] = values[s.key] ?? s.defaultValue ?? "";
    return result;
  }, [steps, values]);

  const setValue = useCallback((key: string, next: string) => {
    setValues((prev) => ({ ...prev, [key]: next }));
  }, []);

  const clearError = useCallback((key: string) => {
    setValidationErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const setError = useCallback((key: string, msg: string) => {
    setValidationErrors((prev) => ({ ...prev, [key]: msg }));
  }, []);

  const getTaskMode = useCallback((): string => {
    const modeVal = resolvedValues["taskMode"] ?? "";
    return modeVal.includes("Existing") ? "existing" : "inline";
  }, [values]);

  const submit = useCallback(() => {
    const errors: Record<string, string> = {};

    for (const s of steps) {
      if (s.skip && s.skip(resolvedValues)) continue;
      const err = validateField(s.key, valueFor(s), {
        taskMode: getTaskMode(),
        allValues: values,
      });
      if (err) errors[s.key] = err;
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const firstErrorIdx = steps.findIndex((s) => s.key in errors);
      if (firstErrorIdx >= 0) setActiveField(firstErrorIdx);
      return;
    }

    const missing = steps.find(
      (s) => !s.skip?.(values) && s.required && !valueFor(s).trim(),
    );
    if (missing) {
      setActiveField(steps.indexOf(missing));
      return;
    }
    const result: Record<string, string> = {};
    for (const s of steps) {
      if (s.skip && s.skip(resolvedValues)) continue;
      result[s.key] = valueFor(s);
    }
    onComplete(result);
  }, [steps, valueFor, onComplete, values, getTaskMode]);

  const findNextField = useCallback(
    (from: number, delta: number): number => {
      let next = from + delta;
      const len = steps.length;
      while (next >= 0 && next < len) {
        const candidate = steps[next];
        if (!candidate.skip || !candidate.skip(resolvedValues)) return next;
        next += delta;
      }
      return from;
    },
    [steps, values],
  );

  const moveField = useCallback(
    (delta: number) => {
      if (step) {
        const err = validateField(step.key, valueFor(step), {
          taskMode: getTaskMode(),
          allValues: values,
        });
        if (err) {
          setError(step.key, err);
          return;
        }
        clearError(step.key);
      }

      const next = findNextField(activeField, delta);
      if (next !== activeField) setActiveField(next);
    },
    [step, valueFor, getTaskMode, values, activeField, findNextField, setError, clearError],
  );

  const visibleSteps = steps.filter((s) => !s.skip || !s.skip(resolvedValues));

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.ctrl && input === "s") {
      submit();
      return;
    }
    if (key.ctrl && input === "y") {
      if (step) {
        copyToClipboard(valueFor(step));
      }
      return;
    }
    if (key.tab) {
      moveField(key.shift ? -1 : 1);
      return;
    }
    if (!step) return;

    if (step.renderCustom) {
      // If onActivate is set, this is a "launch modal" field:
      // Enter opens the modal, everything else is blocked.
      if (step.onActivate) {
        if (key.return) step.onActivate();
      }
      // If no onActivate, the renderCustom component owns its own useInput
      // for text editing (Enter, arrows, backspace). WizardForm only handles
      // Esc / Ctrl+S / Tab which are already caught above.
      return;
    }

    if (step.inputType === "select" && step.suggestions) {
      const options = step.suggestions;
      const current = options.indexOf(valueFor(step));
      const idx = current >= 0 ? current : 0;
      if (key.upArrow) {
        const newVal = options[idx > 0 ? idx - 1 : options.length - 1]!;
        setValue(step.key, newVal);

        if (step.key === "taskMode") {
          if (newVal.includes("Existing")) {
            setValue("command", "");
            clearError("command");
          } else {
            setValue("taskId", "");
            clearError("taskId");
          }
        }
        return;
      }
      if (key.downArrow) {
        const newVal = options[idx < options.length - 1 ? idx + 1 : 0]!;
        setValue(step.key, newVal);

        if (step.key === "taskMode") {
          if (newVal.includes("Existing")) {
            setValue("command", "");
            clearError("command");
          } else {
            setValue("taskId", "");
            clearError("taskId");
          }
        }
        return;
      }
      if (key.return) {
        if (current < 0) setValue(step.key, options[0]!);

        if (step.key === "taskMode") {
          const selectedVal = current < 0 ? options[0]! : options[current]!;
          if (selectedVal.includes("Existing")) {
            setValue("command", "");
            clearError("command");
          } else {
            setValue("taskId", "");
            clearError("taskId");
          }
        }

        moveField(1);
      }
      return;
    }

    // Text field editing
    if (key.return) {
      moveField(1);
      return;
    }
    if (key.delete || key.backspace) {
      setValue(step.key, valueFor(step).slice(0, -1));
      return;
    }
    if (input.length === 1 && input >= " " && input <= "~") {
      setValue(step.key, valueFor(step) + input);
    }
  }, { isActive: !disabled });

  const mid = Math.ceil(steps.length / 2);
  const columns: [WizardStepConfig[], number][] = [
    [steps.slice(0, mid), 0],
    [steps.slice(mid), mid],
  ];

  const filledCount = visibleSteps.filter((s) => valueFor(s).trim().length > 0).length;

  function renderField(s: WizardStepConfig, fieldIdx: number): React.ReactNode {
    const isActive = fieldIdx === activeField;
    const val = valueFor(s);
    if (s.skip && s.skip(resolvedValues)) return null;
    return (
      <Box key={s.key} flexDirection="column" marginBottom={1}>
        <Box>
          <Text color={isActive ? theme.accent.brand : theme.text.muted} bold>
            {isActive ? "\u203a " : "  "}
          </Text>
          <Text
            color={isActive ? theme.accent.brand : theme.text.secondary}
            bold
          >
            {s.prompt}
          </Text>
          {s.required ? <Text color={theme.semantic.danger}>*</Text> : null}
        </Box>
        <Box paddingLeft={2} width="100%">
          {s.renderCustom ? (
            s.renderCustom({
              value: val,
              isActive,
              onChange: (next: string) => setValue(s.key, next),
              onAdvance: () => moveField(1),
            })
          ) : s.inputType === "select" && s.suggestions ? (
            <SelectField
              suggestions={s.suggestions}
              selectedIndex={Math.max(0, s.suggestions.indexOf(val))}
              isActive={isActive}
            />
          ) : (
            <TextField value={val} hint={s.hint} isActive={isActive} />
          )}
        </Box>
        {validationErrors[s.key] ? (
          <Box paddingLeft={2}>
            <Text color={theme.semantic.danger}>{validationErrors[s.key]}</Text>
          </Box>
        ) : null}
      </Box>
    );
  }

  return (
    <Box
      flexDirection="column"
      backgroundColor={theme.bg.surface}
      paddingY={1}
      paddingX={2}
      flexGrow={1}
    >
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color={theme.accent.loop} bold>
          {title}
        </Text>
        <Text color={theme.text.muted}>
          {t("wizard.filled", { filled: filledCount, total: visibleSteps.length })}
          {" . "}
          {t("wizard.footerHints")}
        </Text>
      </Box>

      <Box flexDirection="row" gap={4}>
        {columns.map(([col, offset]) => (
          <Box key={offset} flexDirection="column" width="50%">
            {col.map((s, i) => renderField(s, i + offset))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

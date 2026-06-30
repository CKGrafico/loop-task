import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";

export interface WizardStepConfig {
  key: string;
  prompt: string;
  hint: string;
  required: boolean;
  suggestions?: string[];
  inputType: "text" | "select";
  defaultValue?: string;
}

export interface WizardFormProps {
  title: string;
  steps: WizardStepConfig[];
  onComplete: (values: Record<string, string>) => void;
  onCancel: () => void;
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
  const { title, steps, onComplete, onCancel } = props;

  const [values, setValues] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState(0);

  const step = steps[activeField];

  const valueFor = useCallback(
    (s: WizardStepConfig): string => values[s.key] ?? s.defaultValue ?? "",
    [values],
  );

  const setValue = useCallback((key: string, next: string) => {
    setValues((prev) => ({ ...prev, [key]: next }));
  }, []);

  const submit = useCallback(() => {
    const missing = steps.find(
      (s) => s.required && !valueFor(s).trim(),
    );
    if (missing) {
      setActiveField(steps.indexOf(missing));
      return;
    }
    const result: Record<string, string> = {};
    for (const s of steps) result[s.key] = valueFor(s);
    onComplete(result);
  }, [steps, valueFor, onComplete]);

  const moveField = useCallback(
    (delta: number) => {
      setActiveField((prev) => {
        const next = prev + delta;
        if (next < 0) return steps.length - 1;
        if (next >= steps.length) return 0;
        return next;
      });
    },
    [steps.length],
  );

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.ctrl && input === "s") {
      submit();
      return;
    }
    if (key.tab) {
      moveField(key.shift ? -1 : 1);
      return;
    }
    if (!step) return;

    if (step.inputType === "select" && step.suggestions) {
      const options = step.suggestions;
      const current = options.indexOf(valueFor(step));
      const idx = current >= 0 ? current : 0;
      if (key.upArrow) {
        setValue(step.key, options[idx > 0 ? idx - 1 : options.length - 1]!);
        return;
      }
      if (key.downArrow) {
        setValue(step.key, options[idx < options.length - 1 ? idx + 1 : 0]!);
        return;
      }
      if (key.return) {
        if (current < 0) setValue(step.key, options[0]!);
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
  });

  const mid = Math.ceil(steps.length / 2);
  const columns: [WizardStepConfig[], number][] = [
    [steps.slice(0, mid), 0],
    [steps.slice(mid), mid],
  ];

  const filledCount = steps.filter((s) => valueFor(s).trim().length > 0).length;

  function renderField(s: WizardStepConfig, fieldIdx: number): React.ReactNode {
    const isActive = fieldIdx === activeField;
    const val = valueFor(s);
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
        <Box paddingLeft={2}>
          {s.inputType === "select" && s.suggestions ? (
            <SelectField
              suggestions={s.suggestions}
              selectedIndex={Math.max(0, s.suggestions.indexOf(val))}
              isActive={isActive}
            />
          ) : (
            <TextField value={val} hint={s.hint} isActive={isActive} />
          )}
        </Box>
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
          {t("wizard.filled", { filled: filledCount, total: steps.length })}
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

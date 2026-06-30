import React, { useState, useCallback } from "react";
import { Box, Text, useInput, useFocus } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { FocusableInput } from "./FocusableInput.js";

// ── Step config ─────────────────────────────────────────────────────

export interface WizardStepConfig {
  key: string;
  prompt: string;
  hint: string;
  required: boolean;
  suggestions?: string[];
  inputType: "text" | "select";
  defaultValue?: string;
}

// ── Props ───────────────────────────────────────────────────────────

export interface WizardFormProps {
  title: string;
  steps: WizardStepConfig[];
  onComplete: (values: Record<string, string>) => void;
  onCancel: () => void;
}

// ── Select step (suggestions picker) ────────────────────────────────

function WizardSelect({
  suggestions,
  focusedIndex,
}: {
  suggestions: string[];
  focusedIndex: number;
}): React.ReactNode {
  return (
    <Box flexDirection="column">
      {suggestions.map((s, i) => {
        const isFocused = i === focusedIndex;
        const pointer = isFocused ? "\u276F" : " ";
        return (
          <Box key={s}>
            <Text color={isFocused ? theme.accent.brand : undefined}>
              {pointer}{" "}
            </Text>
            <Text color={isFocused ? theme.accent.brand : theme.text.secondary}>
              {s}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function WizardForm(props: WizardFormProps): React.ReactNode {
  const { title, steps, onComplete, onCancel } = props;

  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectIndex, setSelectIndex] = useState(0);

  // Focus the input so FocusableInput picks it up
  useFocus();
  const step = steps[currentStep];
  const currentValue = values[step?.key] ?? "";
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  // Build the final values map, filling remaining steps with defaults
  const buildFinalValues = useCallback(
    (collected: Record<string, string>): Record<string, string> => {
      const result: Record<string, string> = {};
      for (const s of steps) {
        result[s.key] = collected[s.key] ?? s.defaultValue ?? "";
      }
      return result;
    },
    [steps],
  );

  const advance = useCallback(() => {
    const stepConfig = steps[currentStep];
    // Required step: block advance on empty value
    if (stepConfig.required && currentValue.trim().length === 0) {
      return;
    }

    if (isLastStep) {
      onComplete(buildFinalValues(values));
      return;
    }

    setCurrentStep((prev) => prev + 1);
    setSelectIndex(0);
  }, [currentStep, currentValue, isLastStep, onComplete, values, steps, buildFinalValues]);

  const goBack = useCallback(() => {
    if (isFirstStep) {
      onCancel();
      return;
    }
    setCurrentStep((prev) => prev - 1);
    setSelectIndex(0);
  }, [isFirstStep, onCancel]);

  const skipToSave = useCallback(() => {
    onComplete(buildFinalValues(values));
  }, [onComplete, values, buildFinalValues]);

  // ── Keyboard handling ────────────────────────────────────────────
  useInput(
    (input, key) => {
      // Ctrl+S: skip to save
      if (input === "s" && key.ctrl) {
        skipToSave();
        return;
      }

      // Esc: go back or cancel
      if (key.escape) {
        goBack();
        return;
      }

      // Enter: advance
      if (key.return) {
        if (step.inputType === "select") {
          // For select steps, pick the focused suggestion on Enter
          const selected = step.suggestions?.[selectIndex];
          if (selected !== undefined) {
            const next = { ...values, [step.key]: selected };
            setValues(next);
            // Check if this completes the wizard
            if (isLastStep) {
              onComplete(buildFinalValues(next));
              return;
            }
            setCurrentStep((prev) => prev + 1);
            setSelectIndex(0);
          }
        } else {
          advance();
        }
        return;
      }

      // Select navigation (up/down arrows)
      if (step.inputType === "select" && step.suggestions) {
        if (key.upArrow) {
          setSelectIndex((prev) =>
            prev > 0 ? prev - 1 : step.suggestions!.length - 1,
          );
          return;
        }
        if (key.downArrow) {
          setSelectIndex((prev) =>
            prev < step.suggestions!.length - 1 ? prev + 1 : 0,
          );
          return;
        }
      }

      // For text input, let FocusableInput handle regular keys
      // Text input changes happen through FocusableInput's onChange
    },
    { isActive: true },
  );

  // ── Handle text input change ─────────────────────────────────────
  const handleInputChange = useCallback(
    (newValue: string) => {
      setValues((prev) => ({ ...prev, [step.key]: newValue }));
    },
    [step.key],
  );

  // ── Breadcrumb line ──────────────────────────────────────────────
  const breadcrumbParts: React.ReactNode[] = [];
  // Title
  breadcrumbParts.push(
    <Text key="title" color={theme.accent.loop} bold>
      {title}
    </Text>,
  );
  // Completed step values
  for (let i = 0; i < currentStep; i++) {
    const s = steps[i];
    const val = values[s.key];
    if (val) {
      breadcrumbParts.push(
        <Text key={`sep-${i}`} color={theme.text.muted}>
          {" . "}
        </Text>,
      );
      breadcrumbParts.push(
        <Text key={`val-${i}`} color={theme.text.secondary}>
          {val}
        </Text>,
      );
    }
  }

  // ── Step counter ─────────────────────────────────────────────────
  const stepOf = t("wizard.stepOf", {
    current: String(currentStep + 1),
    total: String(steps.length),
  });

  // ── Navigation hints ─────────────────────────────────────────────
  const ctrlSaveHint = t("wizard.ctrlSave");
  const escBackHint = t("wizard.escBack");

  return (
    <Box
      flexDirection="column"
      backgroundColor={theme.bg.surface}
      paddingY={1}
      paddingX={2}
      flexGrow={1}
    >
      {/* Top: breadcrumb + step counter */}
      <Box justifyContent="space-between">
        <Box>{breadcrumbParts}</Box>
        <Text color={theme.text.muted}>{stepOf}</Text>
      </Box>

      {/* Spacer */}
      <Box height={1} />

      {/* Center: prompt + input + hint */}
      <Box flexDirection="column" flexGrow={1} justifyContent="center">
        {/* Prompt */}
        <Text bold color={theme.text.primary}>
          {step.prompt}
        </Text>

        <Box height={1} />

        {/* Input area */}
        {step.inputType === "select" && step.suggestions ? (
          <WizardSelect
            suggestions={step.suggestions}
            focusedIndex={selectIndex}
          />
        ) : (
          <FocusableInput
            value={currentValue}
            onChange={handleInputChange}
            placeholder={step.defaultValue ?? ""}
          />
        )}

        <Box height={1} />

        {/* Hint */}
        <Text color={theme.text.muted}>{step.hint}</Text>
      </Box>

      {/* Bottom: navigation hints */}
      <Box>
        <Text color={theme.text.muted}>
          Enter to continue{" "}
          <Text color={theme.text.muted}>{" . "}</Text>
          {escBackHint}
          <Text color={theme.text.muted}>{" . "}</Text>
          {ctrlSaveHint}
        </Text>
      </Box>
    </Box>
  );
}

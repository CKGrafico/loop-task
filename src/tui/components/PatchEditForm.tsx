import React from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { FocusableInput } from "./FocusableInput.js";
import { t } from "../../i18n/index.js";
import { copyToClipboard } from "../../shared/clipboard.js";
import { validateField } from "../utils/validation.js";

export interface PatchEditFormProps {
  title: string;
  fields: { key: string; label: string; value: string }[];
  activeField: string | null;
  activeFieldValue: string;
  onActiveFieldChange: (value: string) => void;
  onActiveFieldCommit: () => void;
  onActiveFieldCancel: () => void;
  onActiveFieldActivate: (key: string, value: string) => void;
  pendingChanges: Record<string, string>;
  focusedRowIndex: number;
  onFocusedRowChange: (index: number) => void;
  validationErrors: Record<string, string>;
  onValidationError: (key: string, error: string | null) => void;
  onSave: () => void;
  onCancel: () => void;
  onCopy: (value: string) => void;
}

const LABEL_WIDTH = 15;
const DIVIDER_CHAR = "\u2500";
const FOCUSED_MARKER = "\u203A";

export function PatchEditForm(props: PatchEditFormProps): React.ReactNode {
  const {
    title,
    fields,
    activeField,
    activeFieldValue,
    onActiveFieldChange,
    onActiveFieldCommit,
    onActiveFieldCancel,
    onActiveFieldActivate,
    pendingChanges,
    focusedRowIndex,
    onFocusedRowChange,
    validationErrors,
    onValidationError,
    onSave,
    onCancel,
    onCopy,
  } = props;

  useInput((_input, key) => {
    if (activeField === null) {
      if (key.upArrow) {
        onFocusedRowChange(Math.max(0, focusedRowIndex - 1));
        return;
      }
      if (key.downArrow) {
        onFocusedRowChange(Math.min(fields.length - 1, focusedRowIndex + 1));
        return;
      }
      if (key.return) {
        const field = fields[focusedRowIndex];
        if (field) {
          const shown = displayValue(field.key, field.value);
          onActiveFieldActivate(field.key, shown);
        }
        return;
      }
      if (key.ctrl && _input === "y") {
        const field = fields[focusedRowIndex];
        if (field) {
          const shown = displayValue(field.key, field.value);
          copyToClipboard(shown);
          onCopy(shown);
        }
        return;
      }
      if (key.ctrl && _input === "s") {
        onSave();
        return;
      }
      if (key.escape) {
        onCancel();
        return;
      }
    } else {
      if (key.escape) {
        onActiveFieldCancel();
        return;
      }
    }
  });

  const pendingCount = Object.keys(pendingChanges).length;
  const divider = DIVIDER_CHAR.repeat(50);

  function displayValue(fieldKey: string, originalValue: string): string {
    if (fieldKey in pendingChanges) {
      return pendingChanges[fieldKey];
    }
    return originalValue;
  }

  const hintText = activeField !== null
    ? t("patch.hintEditing")
    : pendingCount > 0
      ? `${t("patch.hintNavPending")} . Ctrl+Y ${t("patch.hintCopy").toLowerCase()}`
      : `${t("patch.hintNavIdle")}`;

  return (
    <Box flexDirection="column">
      <Box paddingLeft={1}>
        <Text bold color={theme.accent.loop}>
          {title}
        </Text>
      </Box>

      {pendingCount > 0 ? (
        <Box paddingLeft={1}>
          <Text color={theme.semantic.warning}>
            {t("patch.pendingChanges", { count: String(pendingCount) })}
          </Text>
        </Box>
      ) : (
        <Box paddingLeft={1}>
          <Text color={theme.text.muted}>{t("patch.noChanges")}</Text>
        </Box>
      )}

      <Box>
        <Text color={theme.border.dim}>{divider}</Text>
      </Box>

      {fields.map((field, index) => {
        const isActive = activeField === field.key;
        const hasPending = field.key in pendingChanges;
        const shownValue = displayValue(field.key, field.value);
        const isFocused = activeField === null && index === focusedRowIndex;
        const marker = isFocused ? FOCUSED_MARKER : " ";
        const markerColor = isFocused ? theme.accent.brand : theme.text.muted;
        const fieldError = validationErrors[field.key];

        return (
          <Box key={field.key} flexDirection="column" paddingLeft={1} paddingRight={1}>
            <Box flexDirection="row">
              <Box width={1} flexShrink={0}>
                <Text color={markerColor}>{marker}</Text>
              </Box>
              <Box width={LABEL_WIDTH} flexShrink={0}>
                <Text color={theme.text.muted}>{field.label}</Text>
              </Box>
              <Box flexGrow={1}>
                {isActive ? (
                  <FocusableInput
                    value={activeFieldValue}
                    onChange={onActiveFieldChange}
                    onSubmit={onActiveFieldCommit}
                  />
                ) : (
                  <Box flexDirection="row">
                    <Text color={theme.text.primary}>{shownValue}</Text>
                    {hasPending ? (
                      <Text color={theme.semantic.warning}>{" \u25CF"}</Text>
                    ) : null}
                  </Box>
                )}
              </Box>
            </Box>
            {fieldError ? (
              <Box flexDirection="row">
                <Box width={1} flexShrink={0}><Text>{" "}</Text></Box>
                <Box width={LABEL_WIDTH} flexShrink={0}><Text>{" "}</Text></Box>
                <Box flexGrow={1}>
                  <Text color={theme.semantic.danger}>{fieldError}</Text>
                </Box>
              </Box>
            ) : null}
          </Box>
        );
      })}

      <Box>
        <Text color={theme.border.dim}>{divider}</Text>
      </Box>

      {pendingCount > 0 ? (
        <Box paddingLeft={1} flexDirection="row">
          <Text color={theme.accent.brand}>{"[Save] Ctrl+S  "}</Text>
          <Text color={theme.text.muted}>{"[Cancel] Esc"}</Text>
        </Box>
      ) : null}

      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>{hintText}</Text>
      </Box>
    </Box>
  );
}

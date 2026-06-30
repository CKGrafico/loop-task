import React from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { FocusableInput } from "./FocusableInput.js";
import { t } from "../../i18n/index.js";

export interface PatchEditFormProps {
  title: string;
  fields: { key: string; label: string; value: string }[];
  activeField: string | null;
  activeFieldValue: string;
  onActiveFieldChange: (value: string) => void;
  onActiveFieldCommit: () => void;
  onActiveFieldCancel: () => void;
  pendingChanges: Record<string, string>;
  onSave: () => void;
  onCancel: () => void;
}

const LABEL_WIDTH = 15;
const DIVIDER_CHAR = "\u2500";

export function PatchEditForm(props: PatchEditFormProps): React.ReactNode {
  const {
    title,
    fields,
    activeField,
    activeFieldValue,
    onActiveFieldChange,
    onActiveFieldCommit,
    onActiveFieldCancel,
    pendingChanges,
    onCancel,
  } = props;

  useInput((_input, key) => {
    if (key.escape) {
      if (activeField !== null) {
        onActiveFieldCancel();
      } else {
        onCancel();
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

  return (
    <Box flexDirection="column">
      {/* Title */}
      <Box paddingLeft={1}>
        <Text bold color={theme.accent.loop}>
          {title}
        </Text>
      </Box>

      {/* Pending changes count */}
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

      {/* Divider */}
      <Box>
        <Text color={theme.border.dim}>{divider}</Text>
      </Box>

      {/* Field table */}
      {fields.map((field) => {
        const isActive = activeField === field.key;
        const hasPending = field.key in pendingChanges;
        const shownValue = displayValue(field.key, field.value);

        return (
          <Box key={field.key} flexDirection="row" paddingLeft={1} paddingRight={1}>
            {/* Label column */}
            <Box width={LABEL_WIDTH} flexShrink={0}>
              <Text color={theme.text.muted}>{field.label}</Text>
            </Box>

            {/* Value column */}
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
        );
      })}

      {/* Bottom divider */}
      <Box>
        <Text color={theme.border.dim}>{divider}</Text>
      </Box>

      {/* Hints */}
      <Box paddingLeft={1}>
        <Text color={theme.text.muted}>
          type &apos;change &lt;field&gt;&apos; to edit . &apos;save&apos; to commit . &apos;cancel&apos; to discard
        </Text>
      </Box>
    </Box>
  );
}

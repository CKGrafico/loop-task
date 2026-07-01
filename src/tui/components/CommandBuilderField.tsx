import React, { useState, useCallback } from "react";
import { Box, Text, useInput } from "ink";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { copyToClipboard } from "../../shared/clipboard.js";
import { COMMAND_TEMPLATES } from "../../config/constants.js";

type SubField = "executable" | "args" | "templates";

interface CommandBuilderFieldProps {
  value: string;
  isActive: boolean;
  onChange: (value: string) => void;
  onAdvance: () => void;
}

function hasUnbalancedQuotes(text: string): boolean {
  let single = 0;
  let double = 0;
  for (const ch of text) {
    if (ch === "'") single++;
    if (ch === '"') double++;
  }
  return single % 2 !== 0 || double % 2 !== 0;
}

function parseParts(command: string): { executable: string; args: string } {
  const trimmed = command.trim();
  if (!trimmed) return { executable: "", args: "" };
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) return { executable: trimmed, args: "" };
  return { executable: trimmed.slice(0, firstSpace), args: trimmed.slice(firstSpace + 1) };
}

export function CommandBuilderField(props: CommandBuilderFieldProps): React.ReactNode {
  const { isActive, onChange, onAdvance } = props;

  const initial = parseParts(props.value);
  const [executable, setExecutable] = useState(initial.executable);
  const [args, setArgs] = useState(initial.args);
  const [activeSub, setActiveSub] = useState<SubField>(initial.executable ? "args" : "executable");
  const [templateIdx, setTemplateIdx] = useState(0);
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  const assembled = [executable, args].filter(Boolean).join(" ");

  const commitValue = useCallback(() => {
    onChange(assembled);
  }, [assembled, onChange]);

  const handleTemplateSelect = useCallback(() => {
    const tmpl = COMMAND_TEMPLATES[templateIdx];
    if (!tmpl) return;
    setExecutable(tmpl.command);
    setArgs(tmpl.args);
    setActiveSub("args");
    const next = [tmpl.command, tmpl.args].filter(Boolean).join(" ");
    onChange(next);
  }, [templateIdx, onChange]);

  useInput(
    (input, key) => {
      if (!isActive) return;

      if (activeSub === "templates") {
        if (key.upArrow) {
          setTemplateIdx((prev) => (prev > 0 ? prev - 1 : COMMAND_TEMPLATES.length - 1));
          return;
        }
        if (key.downArrow) {
          setTemplateIdx((prev) => (prev < COMMAND_TEMPLATES.length - 1 ? prev + 1 : 0));
          return;
        }
        if (key.return) {
          handleTemplateSelect();
          return;
        }
        if (key.escape) {
          setActiveSub("executable");
          return;
        }
        return;
      }

      if (key.ctrl && input === "y") {
        copyToClipboard(assembled);
        return;
      }

      if (key.escape) {
        commitValue();
        return;
      }

      if (activeSub === "executable") {
        if (key.return || key.tab) {
          if (!executable.trim()) {
            setValidationMsg(t("errors.commandEmpty"));
            return;
          }
          setValidationMsg(null);
          setActiveSub("args");
          commitValue();
          return;
        }
        if (key.delete || key.backspace) {
          const next = executable.slice(0, -1);
          setExecutable(next);
          if (next.trim()) setValidationMsg(null);
          onChange([next, args].filter(Boolean).join(" "));
          return;
        }
        if (input.length === 1 && input >= " " && input <= "~") {
          const next = executable + input;
          setExecutable(next);
          if (next.trim()) setValidationMsg(null);
          if (!next.trim()) setActiveSub("templates");
          onChange([next, args].filter(Boolean).join(" "));
        }
        return;
      }

      if (activeSub === "args") {
        if (key.return) {
          if (hasUnbalancedQuotes(args)) {
            setValidationMsg(t("errors.unbalancedQuote"));
            return;
          }
          setValidationMsg(null);
          commitValue();
          onAdvance();
          return;
        }
        if (key.delete || key.backspace) {
          const next = args.slice(0, -1);
          setArgs(next);
          onChange([executable, next].filter(Boolean).join(" "));
          return;
        }
        if (input.length === 1 && input >= " " && input <= "~") {
          const next = args + input;
          setArgs(next);
          onChange([executable, next].filter(Boolean).join(" "));
        }
      }
    },
    { isActive },
  );

  const execBorderColor = isActive && activeSub === "executable" ? theme.accent.brand : theme.border.dim;
  const execBgColor = isActive && activeSub === "executable" ? theme.bg.input : undefined;
  const argsBorderColor = isActive && activeSub === "args" ? theme.accent.brand : theme.border.dim;
  const argsBgColor = isActive && activeSub === "args" ? theme.bg.input : undefined;

  const showTemplates = isActive && activeSub === "executable" && !executable.trim();

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        <Box flexDirection="column" flexGrow={1}>
          <Text color={theme.text.muted}>{t("commandBuilder.executableLabel")}</Text>
          <Box borderStyle="single" borderColor={execBorderColor} backgroundColor={execBgColor} paddingLeft={1}>
            <Text color={executable ? theme.text.primary : theme.text.muted}>
              {executable || t("commandBuilder.executableHint")}
            </Text>
            {isActive && activeSub === "executable" ? <Text inverse> </Text> : null}
          </Box>
        </Box>
        <Box flexDirection="column" flexGrow={2}>
          <Text color={theme.text.muted}>{t("commandBuilder.argsLabel")}</Text>
          <Box borderStyle="single" borderColor={argsBorderColor} backgroundColor={argsBgColor} paddingLeft={1}>
            <Text color={args ? theme.text.primary : theme.text.muted}>
              {args || t("commandBuilder.argsHint")}
            </Text>
            {isActive && activeSub === "args" ? <Text inverse> </Text> : null}
          </Box>
        </Box>
      </Box>

      {assembled ? (
        <Box marginTop={1}>
          <Text color={theme.text.muted}>{t("commandBuilder.previewLabel")} </Text>
          <Text color={theme.accent.task} bold>{assembled}</Text>
        </Box>
      ) : null}

      {isActive ? (
        <Box marginTop={1}>
          <Text color={theme.text.muted}>
            {t("commandBuilder.copyHint")} . {t("commandBuilder.navHint")}
          </Text>
        </Box>
      ) : null}

      {validationMsg ? (
        <Box marginTop={1}>
          <Text color={theme.semantic.danger}>{validationMsg}</Text>
        </Box>
      ) : null}

      {showTemplates ? (
        <Box flexDirection="column" marginTop={1}>
          <Text color={theme.text.muted}>{t("commandBuilder.templatesLabel")}</Text>
          {COMMAND_TEMPLATES.map((tmpl, i) => {
            const isSel = i === templateIdx;
            return (
              <Box key={tmpl.label}>
                <Text color={isSel ? theme.accent.brand : theme.text.muted}>
                  {isSel ? "\u276F " : "  "}
                </Text>
                <Text color={isSel ? theme.accent.brand : theme.text.secondary}>
                  {tmpl.label}
                </Text>
                <Text color={theme.text.muted}> — {tmpl.command} {tmpl.args}</Text>
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Box>
  );
}

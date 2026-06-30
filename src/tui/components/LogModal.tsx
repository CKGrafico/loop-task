import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { streamRunLog } from "../daemon.js";

function colorForLine(line: string, run: RunRecord): string {
  if (line.includes("[Run #")) return theme.semantic.info;
  if (line.includes("--- Chain:")) return theme.accent.task;
  if (line.trimStart().startsWith("[exit")) {
    const match = /\[exit\s+(\d+)/.exec(line);
    const code = match ? Number(match[1]) : run.exitCode;
    return code === 0 ? theme.semantic.success : theme.semantic.danger;
  }
  return theme.text.primary;
}

export function LogModal(props: {
  loopId: string | null;
  run: RunRecord;
  logLines: string[];
  loading: boolean;
  onClose: () => void;
}): React.ReactNode {
  const [lines, setLines] = useState<string[]>(props.logLines);
  const [streaming, setStreaming] = useState(false);

  useEffect(() => {
    setLines(props.logLines);
  }, [props.logLines]);

  useEffect(() => {
    if (!props.loopId) return;
    setStreaming(true);
    const socket = streamRunLog(
      props.loopId,
      props.run.runNumber,
      (line) => setLines((prev) => [...prev, line]),
      () => setStreaming(false),
      () => setStreaming(false)
    );
    return () => {
      socket.destroy();
    };
  }, [props.loopId, props.run.runNumber]);

  useInput((input, key) => {
    if (key.escape || input === "q") {
      props.onClose();
    }
  });

  const isLoading = props.loading || streaming;
  const visible = lines.slice(-20);
  const statusText = isLoading
    ? t("board.logModalLoading")
    : props.run.status === "running"
      ? t("board.logModalRunning")
      : `exit ${props.run.exitCode}`;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.accent.focus}
      backgroundColor={theme.bg.elevated}
      paddingX={1}
    >
      <Box marginBottom={1}>
        <Text color={theme.accent.focus} bold>
          {` Run #${props.run.runNumber} - ${props.run.startedAt} `}
        </Text>
      </Box>

      <Box flexDirection="column">
        {visible.length === 0 ? (
          <Text color={theme.text.muted}>
            {isLoading ? t("board.logModalLoading") : t("board.logModalEmpty")}
          </Text>
        ) : (
          visible.map((line, i) => (
            <Text key={i} color={colorForLine(line, props.run)} wrap="truncate">
              {line}
            </Text>
          ))
        )}
      </Box>

      <Box marginTop={1}>
        <Text color={theme.text.secondary}>{statusText} </Text>
        <Text color={theme.text.muted}> {t("board.logModalEscClose")}</Text>
      </Box>
    </Box>
  );
}

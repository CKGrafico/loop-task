import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { useInject } from "../../shared/hooks/useInject.js";
import { TYPES } from "../../shared/services/types.js";
import type { LogService } from "../../shared/services/types.js";
import { formatDate } from "../format.js";
import { copyToClipboard } from "../../shared/clipboard.js";

const MAX_VISIBLE_LINES = 20;

function colorForLine(line: string, run: RunRecord): string {
  if (line.includes("[Run #")) return theme.accent.loop;
  if (line.startsWith("$ ")) return "#f0abfc";
  if (line.startsWith("  cwd:")) return theme.text.muted;
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
  onCopy?: () => void;
}): React.ReactNode {
  const [lines, setLines] = useState<string[]>(props.logLines);
  const [streaming, setStreaming] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [follow, setFollow] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const logService = useInject<LogService>(TYPES.LogService);

  useEffect(() => {
    setLines(props.logLines);
  }, [props.logLines]);

  useEffect(() => {
    if (!props.loopId) return;
    if (props.run.status !== "running") return;
    setStreaming(true);
    const socket = logService.streamRunLog(
      props.loopId,
      props.run.runNumber,
      (line) => setLines((prev) => [...prev, line]),
      () => setStreaming(false),
      () => setStreaming(false)
    );
    return () => {
      socket.destroy();
    };
  }, [props.loopId, props.run.runNumber, props.run.status, logService]);

  const filtered = searchQuery
    ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;

  const totalLines = filtered.length;
  const startIdx = follow
    ? Math.max(0, totalLines - MAX_VISIBLE_LINES)
    : scrollOffset;
  const endIdx = startIdx + MAX_VISIBLE_LINES;
  const visible = filtered.slice(startIdx, endIdx);

  useInput((input, key) => {
    // Bracketed paste: content wrapped in ESC[200~ ... ESC[201~. Must come
    // before the escape check — the leading ESC trips key.escape and would
    // close the modal before the paste is acknowledged. LogModal doesn't
    // insert pastes, so just swallow the sequence.
    if (input.includes("\x1b[200~")) {
      return;
    }

    if (searchMode) {
      if (key.escape || key.return) {
        setSearchMode(false);
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && input.length === 1 && input >= " " && input <= "~") {
        setSearchQuery((q) => q + input);
        return;
      }
      return;
    }

    if (key.escape) {
      props.onClose();
      return;
    }
    if (input === "/") {
      setSearchMode(true);
      setSearchQuery("");
      return;
    }
    if (key.ctrl && input === "x") {
      copyToClipboard(lines.join("\n"));
      props.onCopy?.();
      return;
    }
    if (key.downArrow) {
      setFollow(false);
      setScrollOffset((o) => Math.min(o + 1, Math.max(0, totalLines - MAX_VISIBLE_LINES)));
      return;
    }
    if (key.upArrow) {
      setFollow(false);
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
  });

  const isLoading = props.loading || streaming;
  const statusIcon =
    props.run.status === "running"
      ? "\u21bb"
      : props.run.exitCode === 0
        ? "\u2713"
        : "\u2717";
  const statusColor =
    props.run.status === "running"
      ? theme.semantic.warning
      : props.run.exitCode === 0
        ? theme.semantic.success
        : theme.semantic.danger;

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      width="100%"
      height="100%"
      justifyContent="center"
      alignItems="center"
    >
      <Box
        borderStyle="round"
        borderColor={theme.accent.brand}
        backgroundColor={theme.bg.elevated}
        paddingX={2}
        paddingY={1}
        flexDirection="column"
        width="95%"
        height="70%"
      >
        <Text color={theme.accent.brand} bold>
          {`Run #${props.run.runNumber} - ${formatDate(props.run.startedAt)}`}
        </Text>

        <Box flexDirection="column" marginTop={1} flexGrow={1}>
          <Box marginBottom={1} justifyContent="space-between">
            <Text color={statusColor}>
              {statusIcon}{" "}
              {props.run.status === "running"
                ? t("board.logModalRunning")
                : t("board.logModalExit", { code: props.run.exitCode })}
            </Text>
            {props.run.duration > 0 ? (
              <Text color={theme.text.muted}> {t("board.logModalDuration")} {props.run.duration}ms</Text>
            ) : null}
            <Text color={theme.text.muted}>
              {searchMode
                ? `/${searchQuery}`
                : `[${startIdx}-${endIdx}/${totalLines}]`}
            </Text>
          </Box>

          {searchMode ? (
            <Box marginBottom={1}>
              <Text color={theme.text.muted}>Search: </Text>
              <Text color={theme.text.primary}>{searchQuery}_</Text>
            </Box>
          ) : null}

          <Box flexDirection="column" flexGrow={1}>
            {visible.length === 0 ? (
              <Text color={theme.text.muted}>
                {isLoading
                  ? t("board.logModalLoading")
                  : searchQuery
                    ? t("board.logModalNoMatches")
                    : t("board.logModalEmpty")}
              </Text>
            ) : (
              visible.map((line, i) => {
                const realIdx = startIdx + i;
                return (
                  <Text
                    key={realIdx}
                    color={colorForLine(line, props.run)}
                    wrap="truncate"
                  >
                    {line}
                  </Text>
                );
              })
            )}
          </Box>

          <Box marginTop={1} justifyContent="space-between">
            <Text color={theme.text.muted}>
              {searchMode
                ? t("board.logModalSearchHint")
                : t("board.logModalFooterHints")}
            </Text>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { Modal } from "./Modal.js";
import { t } from "../../i18n/index.js";
import { streamRunLog } from "../daemon.js";
import { formatDate } from "../format.js";
import { copyToClipboard } from "../../shared/clipboard.js";

const MAX_VISIBLE_LINES = 20;

function colorForLine(line: string, run: RunRecord): string {
  if (line.includes("[Run #")) return theme.accent.loop;
  if (line.startsWith("$ ")) return "#f0abfc";
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

  useEffect(() => {
    setLines(props.logLines);
  }, [props.logLines]);

  useEffect(() => {
    if (!props.loopId) return;
    if (props.run.status !== "running") return;
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
  }, [props.loopId, props.run.runNumber, props.run.status]);

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
      // Escape handled by App's global popLayer(); no-op here to avoid double-fire
      return;
    }
    if (input === "/") {
      setSearchMode(true);
      setSearchQuery("");
      return;
    }
    if (input === "c" && !key.ctrl) {
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
    <Modal
      title={`Run #${props.run.runNumber} - ${formatDate(props.run.startedAt)}`}
      onClose={props.onClose}
      width="95%"
      height="70%"
    >
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
            : follow
              ? "f follow"
              : `[${startIdx}-${endIdx}/${totalLines}]`}
        </Text>
      </Box>

      {searchMode ? (
        <Box marginBottom={1}>
          <Text color={theme.text.muted}>Search: </Text>
          <Text color={theme.text.primary}>{searchQuery}_</Text>
        </Box>
      ) : null}

      <Box flexDirection="column">
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
    </Modal>
  );
}

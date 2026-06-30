import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import type { RunRecord } from "../../types.js";
import { darkTheme as theme } from "../theme.js";
import { t } from "../../i18n/index.js";
import { streamRunLog } from "../daemon.js";
import { copyToClipboard } from "../../shared/clipboard.js";

const MAX_VISIBLE_LINES = 20;

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

function isChainHeader(line: string): boolean {
  return line.includes("--- Chain:");
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
  const [searchMode, setSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [follow, setFollow] = useState(true);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [foldedChains, setFoldedChains] = useState<Set<number>>(new Set());

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

  const filtered = searchQuery
    ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;

  const displayLines: string[] = [];
  for (let i = 0; i < filtered.length; i++) {
    if (isChainHeader(filtered[i]!) && foldedChains.has(i)) {
      displayLines.push(filtered[i]!);
      let j = i + 1;
      let count = 0;
      while (j < filtered.length && !isChainHeader(filtered[j]!)) {
        count++;
        j++;
      }
      displayLines.push(`  [${count} lines folded - press 'u' to unfold]`);
      i = j - 1;
    } else {
      displayLines.push(filtered[i]!);
    }
  }

  const totalLines = displayLines.length;
  const startIdx = follow
    ? Math.max(0, totalLines - MAX_VISIBLE_LINES)
    : scrollOffset;
  const endIdx = startIdx + MAX_VISIBLE_LINES;
  const visible = displayLines.slice(startIdx, endIdx);

  useInput((input, key) => {
    if (searchMode) {
      if (key.escape) {
        setSearchMode(false);
        setSearchQuery("");
        return;
      }
      if (key.return) {
        setSearchMode(false);
        return;
      }
      if (key.backspace || key.delete) {
        setSearchQuery((q) => q.slice(0, -1));
        return;
      }
      if (input && !key.ctrl && input.length === 1) {
        setSearchQuery((q) => q + input);
        return;
      }
      return;
    }

    if (key.escape || input === "q") {
      props.onClose();
      return;
    }
    if (input === "/") {
      setSearchMode(true);
      setSearchQuery("");
      return;
    }
    if (input === "f") {
      setFollow((f) => !f);
      return;
    }
    if (input === "c" && !key.ctrl) {
      copyToClipboard(lines.join("\n"));
      return;
    }
    if (input === "u") {
      setFoldedChains((prev) => {
        const next = new Set(prev);
        if (next.size > 0) next.clear();
        else {
          for (let i = 0; i < filtered.length; i++) {
            if (isChainHeader(filtered[i]!)) next.add(i);
          }
        }
        return next;
      });
      return;
    }
    if (key.downArrow || input === "j") {
      setFollow(false);
      setScrollOffset((o) => Math.min(o + 1, Math.max(0, totalLines - MAX_VISIBLE_LINES)));
      return;
    }
    if (key.upArrow || input === "k") {
      setFollow(false);
      setScrollOffset((o) => Math.max(0, o - 1));
      return;
    }
  });

  const isLoading = props.loading || streaming;
  const statusIcon = props.run.status === "running" ? "\u21bb" : props.run.exitCode === 0 ? "\u2713" : "\u2717";
  const statusColor = props.run.status === "running" ? theme.semantic.warning : props.run.exitCode === 0 ? theme.semantic.success : theme.semantic.danger;

  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.accent.focus} backgroundColor={theme.bg.elevated} paddingX={1}>
      <Box marginBottom={1} justifyContent="space-between">
        <Text color={theme.accent.focus} bold>
          {` Run #${props.run.runNumber} - ${props.run.startedAt} `}
          <Text color={statusColor}>{statusIcon} {props.run.status === "running" ? "Running" : `exit ${props.run.exitCode}`}</Text>
          {props.run.duration > 0 ? <Text color={theme.text.muted}> {props.run.duration}ms</Text> : null}
        </Text>
        <Text color={theme.text.muted}>
          {searchMode ? `/${searchQuery}` : follow ? "[Follow]" : `[${startIdx}-${endIdx}/${totalLines}]`}
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
            {isLoading ? t("board.logModalLoading") : searchQuery ? "No matches" : t("board.logModalEmpty")}
          </Text>
        ) : (
          visible.map((line, i) => {
            const realIdx = startIdx + i;
            const isFolded = isChainHeader(line) && foldedChains.has(
              filtered.indexOf(line)
            );
            return (
              <Text key={realIdx} color={colorForLine(line, props.run)} wrap="truncate">
                {isFolded ? `${line} [folded]` : line}
              </Text>
            );
          })
        )}
      </Box>

      <Box marginTop={1} justifyContent="space-between">
        <Text color={theme.text.muted}>
          {searchMode ? "Type to filter, Enter to apply, Esc to clear" : "/:search  f:follow  u:fold  c:copy  j/k:scroll"}
        </Text>
        <Text color={theme.text.muted}>{t("board.logModalEscClose")}</Text>
      </Box>
    </Box>
  );
}

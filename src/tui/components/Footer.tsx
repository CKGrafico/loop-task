import React from "react";
import { Box, Text } from "ink";
import { darkTheme as theme } from "../theme.js";
import type { Mode } from "../types.js";

interface FooterProps {
  mode: Mode;
}

function modeBadgeColor(mode: Mode): string {
  switch (mode) {
    case "normal": return "#38bdf8";
    case "search": return "#38bdf8";
    case "create": return "#38bdf8";
    case "task": return "#a78bfa";
    case "help": return "#38bdf8";
    case "confirm": return "#f87171";
    case "projects": return "#34d399";
  }
}

function modeLabelText(mode: Mode): string {
  switch (mode) {
    case "normal": return "Loops";
    case "search": return "Search";
    case "create": return "Create";
    case "task": return "Tasks";
    case "help": return "Help";
    case "confirm": return "Confirm";
    case "projects": return "Projects";
  }
}

function modeHints(mode: Mode): string {
  switch (mode) {
    case "normal": return "Tab:panel  /:search  h:help  Ctrl+C:quit";
    case "search": return "Enter:apply  Esc:cancel";
    case "create": return "Tab:next  Enter:save  Esc:cancel";
    case "task": return "Tab:next  Enter:save  Esc:cancel";
    case "help": return "Esc:close";
    case "confirm": return "arrows:choose  Enter:confirm  y/n  Esc:cancel";
    case "projects": return "Tab:navigate  n:new  e:edit  d:delete  Esc:back";
  }
}

export function Footer(props: FooterProps): React.ReactNode {
  const badgeColor = modeBadgeColor(props.mode);
  const label = modeLabelText(props.mode);
  const hints = modeHints(props.mode);

  return (
    <Box height={1} justifyContent="space-between">
      <Box>
        <Text backgroundColor={badgeColor} color={theme.bg.base} bold> {label} </Text>
      </Box>
      <Box>
        <Text color={theme.text.muted}>{hints}</Text>
      </Box>
    </Box>
  );
}

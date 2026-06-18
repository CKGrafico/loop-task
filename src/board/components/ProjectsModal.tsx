import { useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";

const ALL_ID = "all";

export function ProjectsModal(props: {
  projects: Project[];
  loops: LoopMeta[];
  currentProjectId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}): React.ReactNode {
  const { projects, loops, currentProjectId, onSelect, onClose } = props;
  const { width } = useTerminalDimensions();

  const [query, setQuery] = useState("");

  // "Show All" synthetic entry always first, then real projects sorted alphabetically
  const sorted = [...projects].sort((a, b) => a.name.localeCompare(b.name));
  const allEntry = { id: ALL_ID, name: t("project.showAll"), color: "#6b7280", isSystem: false, isDefault: false, createdAt: "" };
  const entries = [allEntry, ...sorted];

  const filtered = query
    ? entries.filter((p) => p.id === ALL_ID || p.name.toLowerCase().startsWith(query.toLowerCase()))
    : entries;

  const initialIndex = Math.max(0, filtered.findIndex((p) => p.id === currentProjectId));
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);
  const clampedIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1));

  useKeyboard((key) => {
    if (key.name === "up") {
      setSelectedIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (key.name === "down") {
      setSelectedIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      const entry = filtered[clampedIndex];
      if (entry) onSelect(entry.id);
      return;
    }
    if (key.name === "escape") {
      onClose();
      return;
    }
    if (key.name === "backspace") {
      setQuery((q) => q.slice(0, -1));
      return;
    }
    if (key.sequence && key.sequence.length === 1 && !key.ctrl && !key.meta) {
      setQuery((q) => q + key.sequence);
      setSelectedIndex(0);
    }
  });

  return (
    <box
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      <box
        title={t("project.selectProject")}
        border
        style={{
          flexDirection: "column",
          padding: 1,
          minWidth: Math.min(50, width - 4),
          backgroundColor: "#111827",
        }}
      >
        <box
          border
          style={{ height: 3, marginBottom: 1, backgroundColor: "#0b0b0b" }}
        >
          <text fg={query ? "#e5e7eb" : "#6b7280"}>{query || "type to filter..."}▎</text>
        </box>
        {filtered.length === 0 ? (
          <text fg="#9ca3af">No projects match</text>
        ) : (
          filtered.map((entry, index) => {
            const isSelected = index === clampedIndex;
            const bg = isSelected ? "#1e3a8a" : undefined;
            const loopCount = entry.id === ALL_ID
              ? loops.length
              : loops.filter((l) => (l.projectId ?? "default") === entry.id).length;
            return (
              <box
                key={entry.id}
                backgroundColor={bg}
                onMouseDown={() => onSelect(entry.id)}
                style={{ height: 1 }}
              >
                <text>
                  {isSelected ? "› " : "  "}
                  <span fg={entry.color}>●</span>
                  {` ${entry.name} `}
                  <span fg="#6b7280">{`(${loopCount})`}</span>
                </text>
              </box>
            );
          })
        )}
      </box>
    </box>
  );
}

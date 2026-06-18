import { useState } from "react";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";

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
  const [selectedIndex, setSelectedIndex] = useState(() => {
    const idx = projects.findIndex((p) => p.id === currentProjectId);
    return Math.max(0, idx);
  });

  const filtered = query
    ? projects.filter((p) => p.name.toLowerCase().startsWith(query.toLowerCase()))
    : projects;

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
      const project = filtered[clampedIndex];
      if (project) onSelect(project.id);
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
          filtered.map((project, index) => {
            const isSelected = index === clampedIndex;
            const loopCount = loops.filter((l) => (l.projectId ?? "default") === project.id).length;
            const bg = isSelected ? "#1e3a8a" : undefined;
            return (
              <box
                key={project.id}
                backgroundColor={bg}
                onMouseDown={() => onSelect(project.id)}
                style={{ height: 1 }}
              >
                <text>
                  {isSelected ? "› " : "  "}
                  <span fg={project.color}>●</span>
                  {` ${project.name} `}
                  <span fg="#6b7280">{`(${loopCount} loops)`}</span>
                </text>
              </box>
            );
          })
        )}
      </box>
    </box>
  );
}

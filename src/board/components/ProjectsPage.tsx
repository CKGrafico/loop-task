import { useState, useEffect, useRef } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { useTabNav } from "../hooks/useTabNav.js";
import { HOVER_BG, ENTITY_COLORS } from "../../config/constants.js";
import { CreateProjectModal } from "./CreateProjectModal.js";
import { EditProjectModal } from "./EditProjectModal.js";
import { DeleteProjectConfirm } from "./DeleteProjectConfirm.js";

type SubModal = "none" | "create" | "edit" | "delete";

function ProjectActionButton(props: {
  label: string;
  selected: boolean;
  onMouseDown: () => void;
}): React.ReactNode {
  const { isHovered, hoverProps } = useHoverState();
  const bg = props.selected ? "#1e3a8a" : isHovered ? HOVER_BG : undefined;
  const fg = props.selected ? "#ffffff" : isHovered ? "#e5e7eb" : "#9ca3af";
  return (
    <box
      onMouseDown={props.onMouseDown}
      style={{ backgroundColor: bg, paddingLeft: 1, paddingRight: 1, marginRight: 1 }}
      {...hoverProps}
    >
      <text fg={fg}><strong>{props.label}</strong></text>
    </box>
  );
}

export function ProjectsPage(props: {
  projects: Project[];
  loops: LoopMeta[];
  headerFocused: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onOpenCreate?: (trigger: () => void) => void;
  onEnterHeader?: (direction: "left" | "right") => void;
}): React.ReactNode {
  const { projects, loops, headerFocused, onClose, onRefresh, onOpenCreate, onEnterHeader } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subModal, setSubModal] = useState<SubModal>("none");
  const navItems = ["list", "edit", "delete"];
  const { focusIndex, setFocusIndex, focusedItem, isFocused } = useTabNav<string>(navItems, {
    onCycleOut: (dir) => {
      if (dir === "right") onEnterHeader?.("right");
      else onEnterHeader?.("left");
    },
  });

  const prevHeaderFocused = useRef(headerFocused);
  useEffect(() => {
    if (prevHeaderFocused.current && !headerFocused) {
      setFocusIndex(0);
    }
    prevHeaderFocused.current = headerFocused;
  }, [headerFocused]);

  // Expose create trigger to parent via callback
  useState(() => { onOpenCreate?.(() => setSubModal("create")); });

  const clampedIndex = Math.min(selectedIndex, Math.max(0, projects.length - 1));
  const selectedProject = projects[clampedIndex] ?? null;

  const loopCount = (projectId: string) =>
    loops.filter((l) => (l.projectId ?? "default") === projectId).length;

  function runAction(actionIndex: number): void {
    if (!selectedProject || selectedProject.isSystem) return;
    if (actionIndex === 0) setSubModal("edit");
    else if (actionIndex === 1) setSubModal("delete");
  }

  useKeyboard((key) => {
    if (subModal !== "none") return;
    if (headerFocused) return;
    if (key.name === "up" || key.name === "down") {
      if (focusedItem !== "list") {
        key.preventDefault();
        return;
      }
      if (key.name === "up") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      } else {
        setSelectedIndex((i) => Math.min(projects.length - 1, i + 1));
      }
      key.preventDefault();
      return;
    }
    if (key.name === "left" || key.name === "right") {
      key.preventDefault();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      if (focusedItem === "list") {
        setFocusIndex(1);
      } else if (focusedItem === "edit") {
        if (selectedProject && !selectedProject.isSystem) setSubModal("edit");
      } else if (focusedItem === "delete") {
        if (selectedProject && !selectedProject.isSystem) setSubModal("delete");
      }
      key.preventDefault();
      return;
    }
    if (key.name === "n") {
      setSubModal("create");
      key.preventDefault();
      return;
    }
    if (key.name === "e" && selectedProject && !selectedProject.isSystem) {
      setSubModal("edit");
      key.preventDefault();
      return;
    }
    if (key.name === "d" && selectedProject && !selectedProject.isSystem) {
      setSubModal("delete");
      key.preventDefault();
      return;
    }
    if (key.name === "escape") {
      onClose();
      key.preventDefault();
    }
  });

  const actions = [
    { key: "edit", label: t("project.editProjectLabel") },
    { key: "delete", label: t("project.deleteProjectLabel") },
  ];

  return (
    <box
      style={{ flexDirection: "row", flexGrow: 1, backgroundColor: "#0b0b0b" }}
    >
      <box
        title={t("project.projectsTitle")}
        border
        borderColor={focusedItem === "list" ? ENTITY_COLORS.project : "#1e3a2a"}
        style={{ width: "40%", flexDirection: "column", backgroundColor: "#0b0b0b", flexShrink: 0 }}
      >
        <text fg="#9ca3af">{t("project.keyNewHint")} | {t("project.keyEditHint")} | {t("project.keyDeleteHint")}</text>
        {projects.map((project, index) => {
          const isSelected = index === clampedIndex;
          const bg = isSelected ? "#1e3a8a" : undefined;
          const count = loopCount(project.id);
          return (
            <box
              key={project.id}
              backgroundColor={bg}
              onMouseDown={() => { setSelectedIndex(index); setFocusIndex(0); }}
              style={{ height: 1 }}
            >
              <text>
                {isSelected ? "› " : "  "}
                <span fg={project.color}>●</span>
                {` ${project.name} `}
                <span fg="#6b7280">{`(${count})`}</span>
              </text>
            </box>
          );
        })}
      </box>

      <box style={{ flexGrow: 1, flexDirection: "column", backgroundColor: "#0b0b0b", overflow: "hidden" }}>
        <box
          title={t("board.inspectorTitle")}
          border
          style={{ flexGrow: 1, flexDirection: "column", backgroundColor: "#0b0b0b", padding: 1 }}
        >
          {selectedProject ? (
            <>
              <text>
                <span fg={selectedProject.color}>●</span>
                {` `}
                <strong>{selectedProject.name}</strong>
              </text>
              <text fg="#6b7280">{t("project.loopCount", { count: String(loopCount(selectedProject.id)) })}</text>
              {selectedProject.isSystem ? (
                <text fg="#9ca3af">{t("project.systemLabel")}</text>
              ) : null}
            </>
          ) : (
            <text fg="#9ca3af">{t("project.noLoops")}</text>
          )}
        </box>

        <box
          border
          borderColor={focusedItem === "edit" || focusedItem === "delete" ? ENTITY_COLORS.project : undefined}
          style={{ flexDirection: "row", height: 3, flexShrink: 0, paddingLeft: 1, backgroundColor: "#0b0b0b", alignItems: "center", justifyContent: selectedProject?.isSystem ? "center" : "flex-start" }}
        >
          {selectedProject && !selectedProject.isSystem ? (
            actions.map((action, i) => (
              <ProjectActionButton
                key={action.key}
                label={action.label}
                selected={isFocused(action.key)}
                onMouseDown={() => { setFocusIndex(i + 1); runAction(i); }}
              />
            ))
          ) : (
            <text fg="#9ca3af">{t("project.systemLabel")}</text>
          )}
        </box>
      </box>

      {subModal === "create" ? (
        <CreateProjectModal
          onDone={async (project) => {
            setSubModal("none");
            await onRefresh();
            const newIndex = projects.findIndex((p) => p.id === project.id);
            if (newIndex >= 0) setSelectedIndex(newIndex);
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}

      {subModal === "edit" && selectedProject ? (
        <EditProjectModal
          project={selectedProject}
          onDone={async () => {
            setSubModal("none");
            await onRefresh();
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}

      {subModal === "delete" && selectedProject ? (
        <DeleteProjectConfirm
          project={selectedProject}
          loopCount={loopCount(selectedProject.id)}
          onDone={async () => {
            setSubModal("none");
            setSelectedIndex((i) => Math.max(0, i - 1));
            await onRefresh();
          }}
          onCancel={() => setSubModal("none")}
        />
      ) : null}
    </box>
  );
}

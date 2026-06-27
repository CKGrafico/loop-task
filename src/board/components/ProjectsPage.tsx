import { useState } from "react";
import { useKeyboard } from "@opentui/react";
import type { LoopMeta, Project } from "../../types.js";
import { t } from "../../i18n/index.js";
import { useHoverState } from "../hooks/useHoverState.js";
import { HOVER_BG, ENTITY_COLORS } from "../../config/constants.js";
import { CreateProjectModal } from "./CreateProjectModal.js";
import { EditProjectModal } from "./EditProjectModal.js";
import { DeleteProjectConfirm } from "./DeleteProjectConfirm.js";

type SubModal = "none" | "create" | "edit" | "delete";

const PROJECT_ACTION_COUNT = 2;

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
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onOpenCreate?: (trigger: () => void) => void;
  onEnterHeader?: (direction: "left" | "right") => void;
}): React.ReactNode {
  const { projects, loops, onClose, onRefresh, onOpenCreate, onEnterHeader } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [subModal, setSubModal] = useState<SubModal>("none");
  const [focusedPanel, setFocusedPanel] = useState<"list" | "actions">("list");
  const [selectedAction, setSelectedAction] = useState(0);

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
    if (key.name === "up" || key.name === "down") {
      if (focusedPanel !== "list") {
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
    if (key.name === "tab") {
      const direction = key.shift ? "left" : "right";
      if (focusedPanel === "list" && direction === "left") {
        onEnterHeader?.("left");
        key.preventDefault();
        return;
      }
      if (focusedPanel === "list" && direction === "right") {
        setSelectedAction(0);
        setFocusedPanel("actions");
      } else if (focusedPanel === "actions" && direction === "right") {
        if (selectedAction < PROJECT_ACTION_COUNT - 1) {
          setSelectedAction((a) => a + 1);
          key.preventDefault();
          return;
        }
        onEnterHeader?.("right");
      } else if (focusedPanel === "actions" && direction === "left") {
        if (selectedAction > 0) {
          setSelectedAction((a) => a - 1);
          key.preventDefault();
          return;
        }
        setFocusedPanel("list");
        key.preventDefault();
        return;
      }
      key.preventDefault();
      return;
    }
    if (key.name === "return" || key.name === "enter") {
      if (focusedPanel === "list") {
        setSelectedAction(0);
        setFocusedPanel("actions");
      } else {
        runAction(selectedAction);
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
        borderColor={focusedPanel === "list" ? ENTITY_COLORS.project : "#1e3a2a"}
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
              onMouseDown={() => { setSelectedIndex(index); setFocusedPanel("list"); }}
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
          borderColor={focusedPanel === "actions" ? ENTITY_COLORS.project : undefined}
          style={{ flexDirection: "row", height: 3, flexShrink: 0, paddingLeft: 1, backgroundColor: "#0b0b0b", alignItems: "center", justifyContent: selectedProject?.isSystem ? "center" : "flex-start" }}
        >
          {selectedProject && !selectedProject.isSystem ? (
            actions.map((action, i) => (
              <ProjectActionButton
                key={action.key}
                label={action.label}
                selected={focusedPanel === "actions" && selectedAction === i}
                onMouseDown={() => { setFocusedPanel("actions"); runAction(i); }}
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
